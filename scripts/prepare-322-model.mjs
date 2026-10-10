// Preserve the supplied production surface; partition its triangles into
// printable vessel and fixtures, with no new shell or surface clearance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const sourcePath = process.argv[2];
const outputPath = process.argv[3] ?? 'public/pot-322.glb';
if (!sourcePath) throw new Error('Usage: node scripts/prepare-322-model.mjs source.glb [output.glb]');
const source = fs.readFileSync(sourcePath);
assert.equal(source.readUInt32LE(0), 0x46546c67);
const jsonLength = source.readUInt32LE(12);
const input = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const sourceBin = source.subarray(28 + jsonLength);
const components = { SCALAR: 1, VEC2: 2, VEC3: 3 };
function accessor(index) {
  const a = input.accessors[index];
  const view = input.bufferViews[a.bufferView];
  assert.ok(!view.byteStride, 'Expected tightly packed source attributes');
  const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const bytes = sourceBin.subarray(start, start + a.count * components[a.type] * 4);
  const copy = Uint8Array.from(bytes).buffer;
  return a.componentType === 5126 ? new Float32Array(copy) : new Uint32Array(copy);
}
const primitive = input.meshes[0].primitives[0];
const positions = accessor(primitive.attributes.POSITION);
const normals = accessor(primitive.attributes.NORMAL);
const indices = accessor(primitive.indices);
const widthMm = 364.11;
const diameterMm = widthMm / 3.1415926;
const heightMm = 151;
const bodyRadius = 0.2815;
const axisX = -0.0535;
const axisZ = -0.000419;
const sourceBodyTop = 0.740;
// Calibrate glTF metres to both requested measurements. The tiny difference
// in vertical/horizontal scale corrects the scan's dimensions consistently
// across body and fixtures, without moving the print off the real surface.
const horizontalScale = diameterMm / (bodyRadius * 2) / 1000;
const verticalScale = heightMm / sourceBodyTop / 1000;
const printBottom = 0;
const printTop = heightMm / 1000;
const printHeight = printTop - printBottom;
const profile = [
  [0, 0.2815], [0.65, 0.2815], [0.67, 0.2811], [0.68, 0.2791],
  [0.69, 0.2762], [0.70, 0.2724], [0.71, 0.2675], [0.72, 0.2611],
  [0.73, 0.2533], [0.74, 0.2435], [0.75, 0.2422],
];
function radiusAt(y) {
  for (let i = 1; i < profile.length; i++) {
    if (y <= profile[i][0]) {
      const [a, ra] = profile[i - 1];
      const [b, rb] = profile[i];
      return ra + (rb - ra) * Math.max(0, (y - a) / (b - a));
    }
  }
  return profile.at(-1)[1];
}
function vertex(id) {
  // Bake the source node's +90 degree X rotation. Recenter on vessel axis.
  return [positions[id * 3] - axisX, -positions[id * 3 + 2], positions[id * 3 + 1] - axisZ];
}
const parts = [true, false].map(printable => ({ printable, positions: [], normals: [], uv: [], indices: [], vertices: new Map() }));
for (let triangle = 0; triangle < indices.length; triangle += 3) {
  const ids = Array.from(indices.subarray(triangle, triangle + 3));
  const points = ids.map(vertex);
  const ys = points.map(p => p[1]);
  const centerY = ys.reduce((a, b) => a + b) / 3;
  const radial = points.reduce((sum, p) => sum + Math.hypot(p[0], p[2]), 0) / 3;
  const us = points.map(p => 0.5 - Math.atan2(p[2], p[0]) / (2 * Math.PI));
  const seam = Math.max(...us) - Math.min(...us) > 0.5;
  const localUs = us.map(u => seam && u < 0.5 ? u + 1 : u);
  // Keep triangles crossing the height boundary intact. The material masks
  // the exact print height per fragment, avoiding a triangle-shaped edge.
  const printable = Math.max(...ys) >= 0 && Math.min(...ys) <= sourceBodyTop
    && radial <= radiusAt(centerY) + 0.007
    && radial >= radiusAt(centerY) * 0.8
    // Bottom-centre/pole triangles are not the cylindrical vessel wall.
    && Math.max(...localUs) - Math.min(...localUs) <= 0.5;
  const part = parts[printable ? 0 : 1];
  ids.forEach((id, corner) => {
    const shift = printable && seam && us[corner] < 0.5 ? 1 : 0;
    const key = `${id}:${shift}`;
    if (!part.vertices.has(key)) {
      part.vertices.set(key, part.positions.length / 3);
      const p = points[corner];
      part.positions.push(p[0] * horizontalScale, p[1] * verticalScale, p[2] * horizontalScale);
      const normal = [normals[id * 3] / horizontalScale, -normals[id * 3 + 2] / verticalScale, normals[id * 3 + 1] / horizontalScale];
      const normalLength = Math.hypot(...normal);
      part.normals.push(...normal.map(value => value / normalLength));
      part.uv.push(printable ? us[corner] + shift : 0, printable ? p[1] / sourceBodyTop : 0);
    }
    part.indices.push(part.vertices.get(key));
  });
}
assert.equal(parts.reduce((n, p) => n + p.indices.length, 0), indices.length);
assert.ok(parts.every(p => p.indices.length > 0));
for (let i = 0; i < parts[0].indices.length; i += 3) {
  const u = parts[0].indices.slice(i, i + 3).map(id => parts[0].uv[id * 2]);
  assert.ok(Math.max(...u) - Math.min(...u) <= 0.500001, 'UV seam triangle must unwrap locally');
}
assert.ok(Math.abs(printHeight * 1000 - heightMm) < 1e-10);
assert.ok(Math.abs(bodyRadius * 2 * horizontalScale * 1000 - diameterMm) < 1e-10);
const output = {
  asset: { version: '2.0', generator: '322 surface-preserving print preparation' },
  scene: 0, scenes: [{ nodes: [0, 1] }], nodes: [], meshes: [],
  materials: [{ name: 'Blank vessel', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.5 }, doubleSided: true }],
  buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [],
  extras: { model: '322', circumferenceMm: widthMm, diameterMm, bodyHeightMm: heightMm, printHeightMm: heightMm, printBottom, printTop },
};
const chunks = [];
let byteLength = 0;
function addAccessor(array, type, componentType, target) {
  const buffer = Buffer.from(array.buffer);
  const viewIndex = output.bufferViews.length;
  output.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: buffer.length, target });
  chunks.push(buffer);
  byteLength += buffer.length;
  const entry = { bufferView: viewIndex, componentType, count: array.length / components[type], type };
  if (type === 'VEC3' && target === 34962) {
    entry.min = [Infinity, Infinity, Infinity]; entry.max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < array.length; i++) {
      entry.min[i % 3] = Math.min(entry.min[i % 3], array[i]);
      entry.max[i % 3] = Math.max(entry.max[i % 3], array[i]);
    }
  }
  output.accessors.push(entry);
  return output.accessors.length - 1;
}
parts.forEach((part, i) => {
  const name = part.printable ? 'BODY_PRINT_364_11x151' : '322_LID_HANDLE_SPOUT';
  const attributes = {
    POSITION: addAccessor(new Float32Array(part.positions), 'VEC3', 5126, 34962),
    NORMAL: addAccessor(new Float32Array(part.normals), 'VEC3', 5126, 34962),
    TEXCOORD_0: addAccessor(new Float32Array(part.uv), 'VEC2', 5126, 34962),
  };
  output.meshes.push({ name, primitives: [{ attributes, indices: addAccessor(new Uint32Array(part.indices), 'SCALAR', 5125, 34963), material: 0 }] });
  output.nodes.push({ name, mesh: i });
});
output.buffers[0].byteLength = byteLength;
let json = Buffer.from(JSON.stringify(output));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const binary = Buffer.concat(chunks);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + binary.length, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binary.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, Buffer.concat([header, json, binHeader, binary]));
console.log(JSON.stringify({ outputPath, bytes: fs.statSync(outputPath).size, originalTriangles: indices.length / 3, printableTriangles: parts[0].indices.length / 3, diameterMm, bodyHeightMm: heightMm, printBottom, printTop }, null, 2));
