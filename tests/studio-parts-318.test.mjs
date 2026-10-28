import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { configure318PartColors, update318FixtureColor, is318BodyPoint, is318Capacity } from '../src/studio-parts-318.ts';

const studio = fs.readFileSync(new URL('../src/PatternStudio.tsx', import.meta.url), 'utf8');

function sourceMesh(filename) {
  // Read geometry directly: the 2L scan's baked image textures need browser
  // APIs, but neither geometry nor this colour partition depends on them.
  const bytes = fs.readFileSync(new URL(`../public/${filename}`, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const bin = bytes.subarray(28 + jsonLength);
  const primitive = json.meshes[0].primitives[0];
  const geometry = new THREE.BufferGeometry();
  for (const [attribute, key] of [['POSITION','position'], ['NORMAL','normal'], ['TEXCOORD_0','uv']]) {
    const accessor = json.accessors[primitive.attributes[attribute]];
    const view = json.bufferViews[accessor.bufferView];
    const size = accessor.type === 'VEC2' ? 2 : 3;
    const values = new Float32Array(accessor.count * size);
    for (let i = 0; i < accessor.count; i++) for (let c = 0; c < size; c++) {
      values[i * size + c] = bin.readFloatLE((view.byteOffset || 0) + (accessor.byteOffset || 0) + i * (view.byteStride || size * 4) + c * 4);
    }
    geometry.setAttribute(key, new THREE.BufferAttribute(values, size));
  }
  const accessor = json.accessors[primitive.indices], view = json.bufferViews[accessor.bufferView];
  const indices = new Uint32Array(accessor.count);
  for (let i = 0; i < indices.length; i++) {
    const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    indices[i] = accessor.componentType === 5125 ? bin.readUInt32LE(offset + i * 4) : bin.readUInt16LE(offset + i * 2);
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: '#ffeec2', metalness: 0 }));
  const node = json.nodes.find(n => n.mesh === 0);
  if (node.matrix) mesh.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
  else if (node.rotation) mesh.quaternion.fromArray(node.rotation);
  const model = new THREE.Group();
  model.add(mesh);
  model.updateMatrixWorld(true);
  return { model, mesh };
}

for (const [capacity, filename] of [['1.2','pot-454.glb'], ['145','pot-145.glb']]) {
  test(`318 ${capacity} has independently updateable fixture colour without altering any scan geometry`, () => {
    const { model, mesh } = sourceMesh(filename);
    const geometry = mesh.geometry;
    const before = Object.fromEntries(Object.entries(geometry.attributes).map(([key, attr]) => [key, attr.array.slice()]));
    const indices = geometry.index.array.slice();
    // The runtime normalizes the model before configuring its shared material.
    model.scale.setScalar(2.7); model.position.set(0.2, -1.16, -0.15); model.updateMatrixWorld(true);
    configure318PartColors(mesh.material, mesh, model, capacity, '#343630');
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
    mesh.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.u318FixtureColor.value.getHexString(), '343630');
    assert.equal(mesh.material.color.getHexString(), 'ffeec2');
    assert.equal(mesh.material.metalness, 0);
    update318FixtureColor(mesh.material, '#b9c2ad');
    assert.equal(shader.uniforms.u318FixtureColor.value.getHexString(), 'b9c2ad');
    assert.equal(mesh.material.color.getHexString(), 'ffeec2', 'Lid selection cannot tint the body');
    mesh.material.color.set('#dbe5dc');
    assert.equal(shader.uniforms.u318FixtureColor.value.getHexString(), 'b9c2ad', 'Body selection cannot tint the plastic');
    assert.ok(shader.fragmentShader.includes('mix(u318FixtureColor, diffuse, part318Body)'));
    assert.ok(shader.fragmentShader.includes('fwidth(v318PartPoint.y)'), 'Anti-aliased joint, not triangle cuts');
    assert.ok(shader.fragmentShader.includes('#include <map_fragment>'), 'Do not change artwork sampling');
    const expected = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(mesh.matrixWorld);
    assert.deepEqual(shader.uniforms.u318MeshToModel.value.elements, expected.elements);
    for (const [key, values] of Object.entries(before)) assert.deepEqual(geometry.attributes[key].array, values);
    assert.deepEqual(geometry.index.array, indices);
    assert.equal(mesh.geometry, geometry, 'No replacement shell, vertices or surface offsets');
  });
}

test('318 calibrated regions include bodies but exclude the lid, spout and low-hanging handle', () => {
  assert.ok(is318Capacity('1.2') && is318Capacity('145'));
  assert.ok(!is318Capacity('1.6') && !is318Capacity('322'));
  const point = (x,y,z) => new THREE.Vector3(x,y,z);
  assert.ok(is318BodyPoint(point(0.34,0.2,0.072), '1.2'));
  assert.ok(is318BodyPoint(point(0.23,0.56,0.072), '1.2'));
  assert.ok(!is318BodyPoint(point(0,0.7,0.072), '1.2'));
  assert.ok(!is318BodyPoint(point(0,0.25,-0.48), '1.2'));
  assert.ok(!is318BodyPoint(point(0,0.67,0.42), '1.2'));
  assert.ok(is318BodyPoint(point(-0.34,0.25,0), '145'));
  assert.ok(is318BodyPoint(point(-0.0479,0.72,0.21), '145'));
  assert.ok(!is318BodyPoint(point(-0.0479,0.8,0.21), '145'));
  assert.ok(!is318BodyPoint(point(0.36,0.45,0), '145'));
  assert.ok(!is318BodyPoint(point(-0.32,0.7,0), '145'));
});

test('single/group/mixed-pair paths are wired and lid controls are visible for every model', () => {
  assert.ok(studio.includes('configure318PartColors(bodyMaterial, firstSurface, model, kind, lidColor)'));
  assert.ok(studio.includes('configure318PartColors(bodyMaterial, newPotSources[0], model, capacity, lidColor)'));
  assert.ok(studio.includes('update318FixtureColor(material, palette.lidColor)'));
  assert.ok(studio.includes('aria-label="选择盖子颜色"'));
  assert.ok(!studio.includes('{(!isStandaloneModel || is322) && <>'));
  assert.match(studio, /if \(!viewport\) return;\s+setReady\(false\);/, 'Reapply the palette after scene/group rebuilds');
});
