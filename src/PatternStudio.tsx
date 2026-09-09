"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import "./pattern-studio-source.css";

type Finish = "matte" | "satin" | "gloss";
type Capacity = "1.6" | "2.0" | "145" | "1.2";
type PairMode = "none" | "319" | "318";

type TextureSettings = {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

const INITIAL_SETTINGS: TextureSettings = {
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

const WRAP_WIDTH_MM = 365.99;
const STANDARD_WRAP_HEIGHT_MM = 183;
const TWO_LITER_WRAP_HEIGHT_MM = 235;
const NEW_POT_DIAMETER_MM = 145;
const NEW_POT_BODY_HEIGHT_MM = 171;
const NEW_POT_OVERALL_HEIGHT_MM = 197.51;
const NEW_POT_WRAP_WIDTH_MM = 445.8;
const NEW_POT_WRAP_HEIGHT_MM = 145;
const POT_12_WRAP_WIDTH_MM = 454.27;
const POT_12_BODY_HEIGHT_MM = 108;
const POT_12_WRAP_HEIGHT_MM = 91;
const POT_12_PRINT_BOTTOM = 0.03;
const POT_12_BODY_TOP = 0.575;
const POT_12_PRINT_TOP = POT_12_PRINT_BOTTOM
  + (POT_12_BODY_TOP - POT_12_PRINT_BOTTOM) * (POT_12_WRAP_HEIGHT_MM / POT_12_BODY_HEIGHT_MM);
const POT_12_CENTER_Z = 0.072;
const POT_12_CAMERA_POSITION = new THREE.Vector3(0, 1.25, 7.2);
const POT_12_CAMERA_TARGET = new THREE.Vector3(0, 0.08, 0);
const PAIR_CAMERA_POSITION = new THREE.Vector3(0, 1.35, 9.4);
const PAIR_CAMERA_TARGET = new THREE.Vector3(0, 0.1, 0);
const PAIR_LOCKED_POLAR_ANGLE = Math.atan2(
  Math.hypot(PAIR_CAMERA_POSITION.x - PAIR_CAMERA_TARGET.x, PAIR_CAMERA_POSITION.z - PAIR_CAMERA_TARGET.z),
  PAIR_CAMERA_POSITION.y - PAIR_CAMERA_TARGET.y,
);
const POT_12_LOCKED_POLAR_ANGLE = Math.atan2(
  Math.hypot(POT_12_CAMERA_POSITION.x - POT_12_CAMERA_TARGET.x, POT_12_CAMERA_POSITION.z - POT_12_CAMERA_TARGET.z),
  POT_12_CAMERA_POSITION.y - POT_12_CAMERA_TARGET.y,
);
const POT_12_RADIUS_PROFILE: Array<[number, number]> = [
  [0.03, 0.334], [0.055, 0.344], [0.085, 0.347], [0.14, 0.347],
  [0.22, 0.347], [0.286, 0.344], [0.343, 0.336], [0.4, 0.321],
  [0.458, 0.299], [0.486, 0.285], [0.512, 0.267], [0.543, 0.2475],
  [0.572, 0.2425], [0.602, 0.2385],
];
// The visible joint at the upper edge of the raised ring is the single split:
// lid above, body and artwork below.
const SEAM_RING_HEIGHT_RATIO = 0;
const PRINTABLE_BODY_TOP_RATIO = 1 - SEAM_RING_HEIGHT_RATIO;
// Extend the carrier slightly past the physical joint, then clip it back to a
// perfectly horizontal plane. The source mesh has an uneven open top edge, so
// stopping at its authored boundary exposes a jagged row around the shoulder.
const PRINT_SURFACE_TOP_EXTENSION_RATIO = 0.04;
const LOCKED_POLAR_ANGLE = Math.atan2(Math.hypot(3.2, 4.8), 1.35 - 0.15);
const NEW_POT_CAMERA_POSITION = new THREE.Vector3(0, 1.35, 9.15);
const NEW_POT_CAMERA_TARGET = new THREE.Vector3(0, 0.08, 0);
const NEW_POT_LOCKED_POLAR_ANGLE = Math.atan2(
  Math.hypot(NEW_POT_CAMERA_POSITION.x - NEW_POT_CAMERA_TARGET.x, NEW_POT_CAMERA_POSITION.z - NEW_POT_CAMERA_TARGET.z),
  NEW_POT_CAMERA_POSITION.y - NEW_POT_CAMERA_TARGET.y,
);
const DEFAULT_BODY_COLOR = "#eee8d9";
const FINISH_SURFACE: Record<Finish, { roughness: number; clearcoat: number; clearcoatRoughness: number }> = {
  // A fine, molded matte finish: soft enough to avoid the white-model look,
  // while retaining broad highlights that describe the curved vessel.
  matte: { roughness: 0.5, clearcoat: 0.024, clearcoatRoughness: 0.68 },
  satin: { roughness: 0.42, clearcoat: 0.08, clearcoatRoughness: 0.5 },
  gloss: { roughness: 0.15, clearcoat: 0.68, clearcoatRoughness: 0.1 },
};

type CapacityArtwork = {
  texture: THREE.Texture;
  preview: string;
  name: string;
  aspectRatio: number | null;
};

function pot12RadiusAt(y: number) {
  for (let index = 0; index < POT_12_RADIUS_PROFILE.length - 1; index += 1) {
    const current = POT_12_RADIUS_PROFILE[index];
    const next = POT_12_RADIUS_PROFILE[index + 1];
    if (y <= next[0]) {
      const amount = (y - current[0]) / (next[0] - current[0]);
      return THREE.MathUtils.lerp(current[1], next[1], THREE.MathUtils.clamp(amount, 0, 1));
    }
  }
  return POT_12_RADIUS_PROFILE[POT_12_RADIUS_PROFILE.length - 1][1];
}

function createPot12PrintGeometry() {
  const radialSegments = 256;
  const heightSegments = 72;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= heightSegments; row += 1) {
    const v = row / heightSegments;
    const y = THREE.MathUtils.lerp(POT_12_PRINT_BOTTOM, POT_12_PRINT_TOP, v);
    const shoulderBlend = THREE.MathUtils.smoothstep(y, 0.49, 0.552);
    const shoulderOffset = THREE.MathUtils.lerp(0.0065, 0.003, shoulderBlend);
    const edgeTuck = THREE.MathUtils.smoothstep(y, 0.552, POT_12_BODY_TOP);
    const radius = pot12RadiusAt(y) + THREE.MathUtils.lerp(shoulderOffset, -0.006, edgeTuck);
    for (let column = 0; column <= radialSegments; column += 1) {
      const u = column / radialSegments;
      const angle = Math.PI + u * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, y, POT_12_CENTER_Z + Math.sin(angle) * radius);
      uvs.push(1 - u, v);
    }
  }
  for (let row = 0; row < heightSegments; row += 1) {
    for (let column = 0; column < radialSegments; column += 1) {
      const a = row * (radialSegments + 1) + column;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createSeamClippedPrintGeometry(source: THREE.BufferGeometry) {
  const position = source.getAttribute("position");
  const sourceUv = source.getAttribute("uv");
  const sourceNormal = source.getAttribute("normal");
  if (!position || !sourceUv || !sourceNormal || position.count !== sourceUv.count) return source.clone();

  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let vertex = 0; vertex < position.count; vertex++) {
    minY = Math.min(minY, position.getY(vertex));
    maxY = Math.max(maxY, position.getY(vertex));
  }
  const height = Math.max(maxY - minY, Number.EPSILON);
  let topUvTotal = 0;
  let topUvCount = 0;
  let bottomUvTotal = 0;
  let bottomUvCount = 0;
  for (let vertex = 0; vertex < position.count; vertex++) {
    const heightRatio = (position.getY(vertex) - minY) / height;
    if (heightRatio >= 0.9) {
      topUvTotal += sourceUv.getY(vertex);
      topUvCount++;
    } else if (heightRatio <= 0.1) {
      bottomUvTotal += sourceUv.getY(vertex);
      bottomUvCount++;
    }
  }
  const uvIncreasesWithHeight = (topUvTotal / Math.max(topUvCount, 1))
    > (bottomUvTotal / Math.max(bottomUvCount, 1));
  type PrintVertex = {
    position: THREE.Vector3;
    normal: THREE.Vector3;
    u: number;
    v: number;
    heightRatio: number;
  };
  const readVertex = (vertex: number): PrintVertex => {
    const sourceHeightRatio = (position.getY(vertex) - minY) / height;
    const extendedHeightRatio = sourceHeightRatio * (1 + PRINT_SURFACE_TOP_EXTENSION_RATIO);
    return {
      position: new THREE.Vector3(
        position.getX(vertex),
        minY + extendedHeightRatio * height,
        position.getZ(vertex),
      ),
      normal: new THREE.Vector3(sourceNormal.getX(vertex), sourceNormal.getY(vertex), sourceNormal.getZ(vertex)),
      u: sourceUv.getX(vertex),
      v: sourceUv.getY(vertex),
      heightRatio: extendedHeightRatio,
    };
  };
  const intersect = (from: PrintVertex, to: PrintVertex): PrintVertex => {
    const amount = (PRINTABLE_BODY_TOP_RATIO - from.heightRatio)
      / (to.heightRatio - from.heightRatio);
    return {
      position: from.position.clone().lerp(to.position, amount),
      normal: from.normal.clone().lerp(to.normal, amount).normalize(),
      u: THREE.MathUtils.lerp(from.u, to.u, amount),
      v: THREE.MathUtils.lerp(from.v, to.v, amount),
      heightRatio: PRINTABLE_BODY_TOP_RATIO,
    };
  };
  const clipTriangle = (triangle: PrintVertex[]) => {
    const clipped: PrintVertex[] = [];
    for (let index = 0; index < triangle.length; index++) {
      const from = triangle[index];
      const to = triangle[(index + 1) % triangle.length];
      const fromInside = from.heightRatio <= PRINTABLE_BODY_TOP_RATIO;
      const toInside = to.heightRatio <= PRINTABLE_BODY_TOP_RATIO;
      if (toInside) {
        if (!fromInside) clipped.push(intersect(from, to));
        clipped.push(to);
      } else if (fromInside) {
        clipped.push(intersect(from, to));
      }
    }
    return clipped;
  };

  const outputPositions: number[] = [];
  const outputNormals: number[] = [];
  const outputUvs: number[] = [];
  const emitVertex = (vertex: PrintVertex) => {
    outputPositions.push(
      vertex.position.x,
      vertex.position.y,
      vertex.position.z,
    );
    outputNormals.push(vertex.normal.x, vertex.normal.y, vertex.normal.z);
    const remappedHeight = THREE.MathUtils.clamp(
      vertex.heightRatio / PRINTABLE_BODY_TOP_RATIO,
      0,
      1,
    );
    outputUvs.push(vertex.u, uvIncreasesWithHeight ? remappedHeight : 1 - remappedHeight);
  };

  const sourceIndex = source.getIndex();
  const indexCount = sourceIndex?.count ?? position.count;
  const getVertex = (index: number) => sourceIndex ? sourceIndex.getX(index) : index;
  for (let index = 0; index + 2 < indexCount; index += 3) {
    const polygon = clipTriangle([
      readVertex(getVertex(index)),
      readVertex(getVertex(index + 1)),
      readVertex(getVertex(index + 2)),
    ]);
    for (let triangle = 1; triangle + 1 < polygon.length; triangle++) {
      emitVertex(polygon[0]);
      emitVertex(polygon[triangle]);
      emitVertex(polygon[triangle + 1]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(outputPositions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(outputNormals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(outputUvs, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createConformingBodyPrintGeometry(
  source: THREE.Mesh,
  axisX: number,
  axisZ: number,
  printBottom: number,
  printTop: number,
  radialLimit: number,
) {
  const sourceGeometry = source.geometry as THREE.BufferGeometry;
  // Give every triangle its own vertices so triangles crossing the cylindrical
  // UV seam can wrap locally instead of interpolating across the whole image.
  const workingGeometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  const position = workingGeometry.getAttribute("position");
  const normal = workingGeometry.getAttribute("normal");
  if (!position || !normal) return sourceGeometry.clone();

  const outputPositions = new Float32Array(position.count * 3);
  const outputNormals = new Float32Array(position.count * 3);
  const outputUvs = new Float32Array(position.count * 2);
  const worldPosition = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(source.matrixWorld);
  const printHeight = Math.max(printTop - printBottom, Number.EPSILON);

  for (let vertex = 0; vertex < position.count; vertex++) {
    worldPosition.fromBufferAttribute(position, vertex).applyMatrix4(source.matrixWorld);
    worldNormal.fromBufferAttribute(normal, vertex).applyMatrix3(normalMatrix).normalize();
    // Lift the copied surface a fraction above the enamel to avoid z-fighting
    // while keeping it matched to every shoulder and body curve.
    worldPosition.addScaledVector(worldNormal, 0.004);
    outputPositions.set([worldPosition.x, worldPosition.y, worldPosition.z], vertex * 3);
    outputNormals.set([worldNormal.x, worldNormal.y, worldNormal.z], vertex * 3);
    const angle = Math.atan2(worldPosition.z - axisZ, worldPosition.x - axisX);
    outputUvs.set([
      0.5 - angle / (Math.PI * 2),
      (worldPosition.y - printBottom) / printHeight,
    ], vertex * 2);
  }

  for (let vertex = 0; vertex + 2 < position.count; vertex += 3) {
    const u0 = outputUvs[vertex * 2];
    const u1 = outputUvs[(vertex + 1) * 2];
    const u2 = outputUvs[(vertex + 2) * 2];
    if (Math.max(u0, u1, u2) - Math.min(u0, u1, u2) > 0.5) {
      if (u0 < 0.5) outputUvs[vertex * 2] += 1;
      if (u1 < 0.5) outputUvs[(vertex + 1) * 2] += 1;
      if (u2 < 0.5) outputUvs[(vertex + 2) * 2] += 1;
    }
  }

  const outputIndices: number[] = [];
  for (let index = 0; index + 2 < position.count; index += 3) {
    const a = index;
    const b = index + 1;
    const c = index + 2;
    const ay = outputPositions[a * 3 + 1];
    const by = outputPositions[b * 3 + 1];
    const cy = outputPositions[c * 3 + 1];
    if (Math.max(ay, by, cy) < printBottom || Math.min(ay, by, cy) > printTop) continue;
    const centerX = (outputPositions[a * 3] + outputPositions[b * 3] + outputPositions[c * 3]) / 3;
    const centerZ = (outputPositions[a * 3 + 2] + outputPositions[b * 3 + 2] + outputPositions[c * 3 + 2]) / 3;
    if (Math.hypot(centerX - axisX, centerZ - axisZ) > radialLimit) continue;
    outputIndices.push(a, b, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(outputPositions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(outputNormals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(outputUvs, 2));
  geometry.setIndex(new THREE.Uint32BufferAttribute(outputIndices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  workingGeometry.dispose();
  return geometry;
}

function clipPrintMaterialToHeight(material: THREE.MeshBasicMaterial, printBottom: number, printTop: number) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.printBottom = { value: printBottom };
    shader.uniforms.printTop = { value: printTop };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vPrintY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPrintY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPrintY;\nuniform float printBottom;\nuniform float printTop;",
      )
      .replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif (vPrintY < printBottom || vPrintY > printTop) discard;",
      );
  };
  material.customProgramCacheKey = () => `new-pot-print-height-${printBottom}-${printTop}`;
}

function cameraDistanceToFitBox(
  camera: THREE.PerspectiveCamera,
  box: THREE.Box3,
  target: THREE.Vector3,
  viewDirection: THREE.Vector3,
  fillRatio = 0.9,
) {
  const right = new THREE.Vector3().crossVectors(camera.up, viewDirection).normalize();
  const viewUp = new THREE.Vector3().crossVectors(viewDirection, right).normalize();
  const tanHalfY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanHalfX = tanHalfY * camera.aspect;
  let distance = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const relative = new THREE.Vector3(x, y, z).sub(target);
        const towardCamera = relative.dot(viewDirection);
        distance = Math.max(
          distance,
          towardCamera + Math.abs(relative.dot(right)) / (tanHalfX * fillRatio),
          towardCamera + Math.abs(relative.dot(viewUp)) / (tanHalfY * fillRatio),
        );
      }
    }
  }
  return distance;
}

function cameraDistanceToFitObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  target: THREE.Vector3,
  viewDirection: THREE.Vector3,
  fillRatio = 0.9,
) {
  const right = new THREE.Vector3().crossVectors(camera.up, viewDirection).normalize();
  const viewUp = new THREE.Vector3().crossVectors(viewDirection, right).normalize();
  const tanHalfY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanHalfX = tanHalfY * camera.aspect;
  let distance = 0;
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const localBox = geometry.boundingBox;
    if (!localBox) return;
    for (const x of [localBox.min.x, localBox.max.x]) {
      for (const y of [localBox.min.y, localBox.max.y]) {
        for (const z of [localBox.min.z, localBox.max.z]) {
          const relative = new THREE.Vector3(x, y, z).applyMatrix4(child.matrixWorld).sub(target);
          const towardCamera = relative.dot(viewDirection);
          distance = Math.max(
            distance,
            towardCamera + Math.abs(relative.dot(right)) / (tanHalfX * fillRatio),
            towardCamera + Math.abs(relative.dot(viewUp)) / (tanHalfY * fillRatio),
          );
        }
      }
    }
  });
  return distance;
}

function extendBodyToTwoLiterLegacy(model: THREE.Object3D) {
  let printSurface: THREE.Mesh | null = null;
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name === "BODY_PRINT_365_99x183") {
      printSurface = child;
    }
  });
  if (!printSurface) return;

  const printGeometry = printSurface.geometry as THREE.BufferGeometry;
  printGeometry.computeBoundingBox();
  const printBox = printGeometry.boundingBox;
  if (!printBox) return;

  let bodyBottom = Number.POSITIVE_INFINITY;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bodyBottom = Math.min(bodyBottom, geometry.boundingBox.min.z);
  });
  const bodyTop = printBox.max.z;
  const printHeight = printBox.max.z - printBox.min.z;
  const heightScale = TWO_LITER_WRAP_HEIGHT_MM / STANDARD_WRAP_HEIGHT_MM;
  const extraHeight = printHeight * (heightScale - 1);
  const centerX = (printBox.min.x + printBox.max.x) / 2;
  const centerY = (printBox.min.y + printBox.max.y) / 2;
  const bodyRadius = Math.max(printBox.max.x - printBox.min.x, printBox.max.y - printBox.min.y) / 2;
  const outsideBodyRadius = bodyRadius * 1.12;
  const fixtureMeshes: THREE.Mesh[] = [];
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child !== printSurface) fixtureMeshes.push(child);
  });

  const printPosition = printGeometry.getAttribute("position");
  for (let index = 0; index < printPosition.count; index++) {
    const z = printPosition.getZ(index);
    printPosition.setZ(index, printBox.min.z + (z - printBox.min.z) * heightScale);
  }
  printPosition.needsUpdate = true;
  printGeometry.computeVertexNormals();
  printGeometry.computeBoundingBox();
  printGeometry.computeBoundingSphere();

  fixtureMeshes.forEach((mesh) => {
    const sourceGeometry = mesh.geometry as THREE.BufferGeometry;
    const sourcePosition = sourceGeometry.getAttribute("position");
    const sourceNormal = sourceGeometry.getAttribute("normal");
    const sourceIndex = sourceGeometry.getIndex();
    if (!sourcePosition) return;

    const bodyPositions: number[] = [];
    const bodyNormals: number[] = [];
    const fixturePositions: number[] = [];
    const fixtureNormals: number[] = [];
    const triangleCount = sourceIndex ? Math.floor(sourceIndex.count / 3) : Math.floor(sourcePosition.count / 3);

    const vertexAt = (triangle: number, corner: number) => sourceIndex
      ? sourceIndex.getX(triangle * 3 + corner)
      : triangle * 3 + corner;

    for (let triangle = 0; triangle < triangleCount; triangle++) {
      const a = vertexAt(triangle, 0);
      const b = vertexAt(triangle, 1);
      const c = vertexAt(triangle, 2);
      const centroidX = (sourcePosition.getX(a) + sourcePosition.getX(b) + sourcePosition.getX(c)) / 3;
      const centroidY = (sourcePosition.getY(a) + sourcePosition.getY(b) + sourcePosition.getY(c)) / 3;
      const centroidZ = (sourcePosition.getZ(a) + sourcePosition.getZ(b) + sourcePosition.getZ(c)) / 3;
      const radialDistance = Math.hypot(centroidX - centerX, centroidY - centerY);
      const isBodyTriangle = radialDistance <= outsideBodyRadius && centroidZ < bodyTop;
      const targetPositions = isBodyTriangle ? bodyPositions : fixturePositions;
      const targetNormals = isBodyTriangle ? bodyNormals : fixtureNormals;

      for (const vertex of [a, b, c]) {
        const x = sourcePosition.getX(vertex);
        const y = sourcePosition.getY(vertex);
        const z = sourcePosition.getZ(vertex);
        targetPositions.push(
          x,
          y,
          isBodyTriangle ? bodyBottom + (z - bodyBottom) * heightScale : z + extraHeight,
        );

        if (sourceNormal) {
          const nx = sourceNormal.getX(vertex);
          const ny = sourceNormal.getY(vertex);
          const nz = isBodyTriangle ? sourceNormal.getZ(vertex) / heightScale : sourceNormal.getZ(vertex);
          const normalLength = Math.hypot(nx, ny, nz) || 1;
          targetNormals.push(nx / normalLength, ny / normalLength, nz / normalLength);
        }
      }
    }

    const createPartGeometry = (positions: number[], normals: number[]) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      if (normals.length === positions.length) {
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      } else {
        geometry.computeVertexNormals();
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return geometry;
    };

    const bodyGeometry = createPartGeometry(bodyPositions, bodyNormals);
    const fixtureGeometry = createPartGeometry(fixturePositions, fixtureNormals);
    mesh.geometry = bodyGeometry;

    const fixtureMesh = new THREE.Mesh(fixtureGeometry, mesh.material);
    fixtureMesh.name = `${mesh.name}_TWO_LITER_FIXTURES`;
    fixtureMesh.position.copy(mesh.position);
    fixtureMesh.quaternion.copy(mesh.quaternion);
    fixtureMesh.scale.copy(mesh.scale);
    fixtureMesh.castShadow = mesh.castShadow;
    fixtureMesh.receiveShadow = mesh.receiveShadow;
    mesh.parent?.add(fixtureMesh);
    sourceGeometry.dispose();
  });
}

function extendBodyToTwoLiter(model: THREE.Object3D) {
  let printSurface: THREE.Mesh | null = null;
  const fixtureMeshes: THREE.Mesh[] = [];
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.name === "BODY_PRINT_365_99x183") printSurface = child;
    else fixtureMeshes.push(child);
  });
  if (!printSurface) return;

  const printGeometry = printSurface.geometry as THREE.BufferGeometry;
  printGeometry.computeBoundingBox();
  const printBox = printGeometry.boundingBox;
  if (!printBox) return;

  let bodyBottomHeight = Number.POSITIVE_INFINITY;
  fixtureMeshes.forEach((mesh) => {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bodyBottomHeight = Math.min(bodyBottomHeight, -geometry.boundingBox.max.z);
  });

  const printBottomHeight = printBox.min.y;
  const bodyTopHeight = printBox.max.y;
  const printHeight = bodyTopHeight - printBottomHeight;
  const heightScale = TWO_LITER_WRAP_HEIGHT_MM / STANDARD_WRAP_HEIGHT_MM;
  const extraHeight = printHeight * (heightScale - 1);
  const centerX = (printBox.min.x + printBox.max.x) / 2;
  const centerY = (printBox.min.z + printBox.max.z) / 2;
  const bodyRadius = Math.max(printBox.max.x - printBox.min.x, printBox.max.z - printBox.min.z) / 2;
  const outsideBodyRadius = bodyRadius * 1.35;

  const printPosition = printGeometry.getAttribute("position");
  for (let index = 0; index < printPosition.count; index++) {
    const height = printPosition.getY(index);
    const extendedHeight = printBottomHeight + (height - printBottomHeight) * heightScale;
    printPosition.setY(index, extendedHeight);
  }
  printPosition.needsUpdate = true;
  printGeometry.computeVertexNormals();
  printGeometry.computeBoundingBox();
  printGeometry.computeBoundingSphere();

  fixtureMeshes.forEach((mesh) => {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    const meshIndex = geometry.getIndex();
    if (!position || !meshIndex) return;

    const parent = new Int32Array(position.count);
    const rank = new Uint8Array(position.count);
    for (let vertex = 0; vertex < parent.length; vertex++) parent[vertex] = vertex;

    const findRoot = (vertex: number) => {
      let root = vertex;
      while (parent[root] !== root) root = parent[root];
      while (parent[vertex] !== vertex) {
        const next = parent[vertex];
        parent[vertex] = root;
        vertex = next;
      }
      return root;
    };
    const join = (left: number, right: number) => {
      let leftRoot = findRoot(left);
      let rightRoot = findRoot(right);
      if (leftRoot === rightRoot) return;
      if (rank[leftRoot] < rank[rightRoot]) [leftRoot, rightRoot] = [rightRoot, leftRoot];
      parent[rightRoot] = leftRoot;
      if (rank[leftRoot] === rank[rightRoot]) rank[leftRoot]++;
    };

    for (let index = 0; index + 2 < meshIndex.count; index += 3) {
      const a = meshIndex.getX(index);
      const b = meshIndex.getX(index + 1);
      const c = meshIndex.getX(index + 2);
      join(a, b);
      join(b, c);
    }

    type ComponentStats = { count: number; sumX: number; sumY: number; sumHeight: number };
    const statsByRoot = new Map<number, ComponentStats>();
    for (let vertex = 0; vertex < position.count; vertex++) {
      const root = findRoot(vertex);
      const stats = statsByRoot.get(root) ?? { count: 0, sumX: 0, sumY: 0, sumHeight: 0 };
      stats.count++;
      stats.sumX += position.getX(vertex);
      stats.sumY += position.getY(vertex);
      stats.sumHeight += -position.getZ(vertex);
      statsByRoot.set(root, stats);
    }

    const modeByRoot = new Map<number, "scale" | "shift">();
    statsByRoot.forEach((stats, root) => {
      const componentX = stats.sumX / stats.count;
      const componentY = stats.sumY / stats.count;
      const componentHeight = stats.sumHeight / stats.count;
      const radialDistance = Math.hypot(componentX - centerX, componentY - centerY);
      const preservePart = radialDistance > outsideBodyRadius || componentHeight >= bodyTopHeight;
      const mode = preservePart ? "shift" : "scale";
      modeByRoot.set(root, mode);
    });

    for (let vertex = 0; vertex < position.count; vertex++) {
      const height = -position.getZ(vertex);
      const extendedHeight = modeByRoot.get(findRoot(vertex)) === "shift"
        ? height + extraHeight
        : bodyBottomHeight + (height - bodyBottomHeight) * heightScale;
      position.setZ(vertex, -extendedHeight);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  });
}

type FixturePartUniforms = {
  bodyColor: { value: THREE.Color };
  fixtureColor: { value: THREE.Color };
  bodyTopHeight: { value: number };
  bodyCenter: { value: THREE.Vector2 };
  fixtureRadius: { value: number };
};

function configureFixturePartMaterial(
  material: THREE.MeshPhysicalMaterial,
  printGeometry: THREE.BufferGeometry,
  bodyColorHex: number,
  fixtureColorHex: string,
  isTwoLiter: boolean,
): FixturePartUniforms | null {
  printGeometry.computeBoundingBox();
  const printBox = printGeometry.boundingBox;
  if (!printBox) return null;

  const centerX = (printBox.min.x + printBox.max.x) / 2;
  const centerY = (printBox.min.z + printBox.max.z) / 2;
  const bodyRadius = Math.max(printBox.max.x - printBox.min.x, printBox.max.z - printBox.min.z) / 2;
  const printHeight = printBox.max.y - printBox.min.y;
  const uniforms: FixturePartUniforms = {
    bodyColor: { value: new THREE.Color(bodyColorHex) },
    fixtureColor: { value: new THREE.Color(fixtureColorHex) },
    // The UV shell reaches the upper lip of the raised seam ring. The actual
    // lid/body joint is the lower lip, so include the whole ring with the lid.
    bodyTopHeight: { value: printBox.max.y - printHeight * SEAM_RING_HEIGHT_RATIO },
    bodyCenter: { value: new THREE.Vector2(centerX, centerY) },
    fixtureRadius: { value: bodyRadius * 1.12 },
  };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPartBodyColor = uniforms.bodyColor;
    shader.uniforms.uPartFixtureColor = uniforms.fixtureColor;
    shader.uniforms.uPartBodyTopHeight = uniforms.bodyTopHeight;
    shader.uniforms.uPartBodyCenter = uniforms.bodyCenter;
    shader.uniforms.uPartFixtureRadius = uniforms.fixtureRadius;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec2 uPartBodyCenter;
varying vec3 vPartLocalPosition;
varying vec3 vPartRadialViewNormal;`,
      )
      .replace(
        "#include <normal_vertex>",
        `#include <normal_vertex>
vec2 partRadialDirection = normalize(position.xy - uPartBodyCenter);
vPartRadialViewNormal = normalize(normalMatrix * vec3(partRadialDirection, 0.0));`,
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvPartLocalPosition = position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vPartLocalPosition;
varying vec3 vPartRadialViewNormal;
uniform vec3 uPartBodyColor;
uniform vec3 uPartFixtureColor;
uniform float uPartBodyTopHeight;
uniform vec2 uPartBodyCenter;
uniform float uPartFixtureRadius;`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `float partHeight = -vPartLocalPosition.z;
float partRadius = length(vPartLocalPosition.xy - uPartBodyCenter);
float partIsBody = (partHeight < uPartBodyTopHeight && partRadius <= uPartFixtureRadius) ? 1.0 : 0.0;
vec3 partSurfaceColor = mix(uPartFixtureColor, uPartBodyColor, partIsBody);
vec4 diffuseColor = vec4(partSurfaceColor, opacity);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
if (partIsBody > 0.5) {
  normal = normalize(vPartRadialViewNormal) * faceDirection;
  nonPerturbedNormal = normal;
}`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
// The product combines a cream matte vessel with slightly drier white matte
// plastic fixtures, even though both regions share this source mesh.
if (partIsBody < 0.5) {
  material.roughness = max(material.roughness, ${isTwoLiter ? "0.56" : "0.62"});
#ifdef USE_CLEARCOAT
  material.clearcoat = ${isTwoLiter ? "0.035" : "0.012"};
  material.clearcoatRoughness = ${isTwoLiter ? "0.58" : "0.76"};
#endif
}`,
      );
  };
  material.customProgramCacheKey = () => isTwoLiter
    ? "fixture-part-real-product-finish-v3"
    : "fixture-part-real-product-matte-v4";
  material.needsUpdate = true;
  return uniforms;
}

function updateFixturePartUniforms(
  targets: FixturePartUniforms[],
  bodyColorHex: number,
  fixtureColorHex: string,
) {
  const bodyColor = new THREE.Color(bodyColorHex);
  const fixtureColor = new THREE.Color(fixtureColorHex);
  targets.forEach((uniforms) => {
    uniforms.bodyColor.value.copy(bodyColor);
    uniforms.fixtureColor.value.copy(fixtureColor);
  });
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value.toFixed(step < 0.1 ? 2 : 0)}{suffix}</output>
    </label>
  );
}

export function PotStudio() {
  const initialCapacity = new URLSearchParams(window.location.search).get("capacity");
  const [capacity, setCapacity] = useState<Capacity>(
    initialCapacity === "2.0" || initialCapacity === "145" || initialCapacity === "1.2" ? initialCapacity : "1.6",
  );
  const [pairMode, setPairMode] = useState<PairMode>("none");
  const isTwoLiter = capacity === "2.0";
  const isNewPot = capacity === "145";
  const isOneTwoLiter = capacity === "1.2";
  const isStandaloneModel = isNewPot || isOneTwoLiter;
  const [newPotPrintHeightMm, setNewPotPrintHeightMm] = useState(NEW_POT_WRAP_HEIGHT_MM);
  const newPotPrintHeightsRef = useRef<Record<Capacity, number[]>>({
    "1.6": Array(4).fill(STANDARD_WRAP_HEIGHT_MM),
    "2.0": Array(4).fill(TWO_LITER_WRAP_HEIGHT_MM),
    "1.2": Array(4).fill(POT_12_WRAP_HEIGHT_MM),
    "145": Array(4).fill(NEW_POT_WRAP_HEIGHT_MM),
  });
  const wrapWidthMm = isOneTwoLiter ? POT_12_WRAP_WIDTH_MM : isNewPot ? NEW_POT_WRAP_WIDTH_MM : WRAP_WIDTH_MM;
  const wrapHeightMm = isOneTwoLiter
    ? POT_12_WRAP_HEIGHT_MM
    : isNewPot ? newPotPrintHeightMm : isTwoLiter ? TWO_LITER_WRAP_HEIGHT_MM : STANDARD_WRAP_HEIGHT_MM;
  const templateHeightMm = isNewPot ? NEW_POT_WRAP_HEIGHT_MM : wrapHeightMm;
  const capacityLabel = isOneTwoLiter ? "318 1.2L" : isNewPot ? "318 2.0L" : isTwoLiter ? "319 2.0L" : "319 1.6L";
  const displayLabel = pairMode === "319" ? "319 一大一小" : pairMode === "318" ? "318 一大一小" : capacityLabel;
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const modelMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const printMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const printSurfacesRef = useRef<THREE.Mesh[]>([]);
  const fixtureMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const fixturePartUniformsRef = useRef<FixturePartUniforms[]>([]);
  const uploadedTextureRef = useRef<THREE.Texture | null>(null);
  const uploadedAspectRatioRef = useRef<number | null>(null);
  const capacityArtworksRef = useRef<Partial<Record<Capacity, Array<CapacityArtwork | undefined>>>>({});
  const activeCapacityRef = useRef<Capacity>(capacity);
  activeCapacityRef.current = capacity;
  const [groupCount, setGroupCount] = useState(1);
  const [activePotIndex, setActivePotIndex] = useState(0);
  const activePotIndexRef = useRef(0);
  activePotIndexRef.current = activePotIndex;
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectUrlsRef = useRef<Partial<Record<Capacity, Array<string | undefined>>>>({});
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [textureName, setTextureName] = useState("");
  const [texturePreview, setTexturePreview] = useState("");
  const [textureError, setTextureError] = useState("");
  const [settings, setSettings] = useState<TextureSettings>(INITIAL_SETTINGS);
  const settingsByCapacityRef = useRef<Record<Capacity, TextureSettings[]>>({
    "1.6": Array.from({ length: 4 }, () => ({ ...INITIAL_SETTINGS })),
    "2.0": Array.from({ length: 4 }, () => ({ ...INITIAL_SETTINGS })),
    "1.2": Array.from({ length: 4 }, () => ({ ...INITIAL_SETTINGS })),
    "145": Array.from({ length: 4 }, () => ({ ...INITIAL_SETTINGS })),
  });
  const [finish, setFinish] = useState<Finish>(capacity === "2.0" ? "gloss" : "matte");
  const [bodyColor, setBodyColor] = useState(capacity === "2.0" ? "#f8f5e8" : DEFAULT_BODY_COLOR);
  const [lidColor, setLidColor] = useState(capacity === "2.0" ? "#f3f1e9" : "#f7f6f2");
  const [isDragging, setIsDragging] = useState(false);
  const [draggingPotIndex, setDraggingPotIndex] = useState<number | null>(null);

  const resetView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    if (pairMode !== "none") camera.position.copy(PAIR_CAMERA_POSITION);
    else if (isNewPot) camera.position.copy(NEW_POT_CAMERA_POSITION);
    else if (isOneTwoLiter) camera.position.copy(POT_12_CAMERA_POSITION);
    else if (isTwoLiter) camera.position.set(3.2, 1.35, 4.8);
    else camera.position.set(5.38, 2.15, 8.06);
    if (pairMode !== "none") controls.target.copy(PAIR_CAMERA_TARGET);
    else if (isNewPot) controls.target.copy(NEW_POT_CAMERA_TARGET);
    else if (isOneTwoLiter) controls.target.copy(POT_12_CAMERA_TARGET);
    else controls.target.set(0, 0.15, 0);
    if (groupCount > 1 && modelRef.current) {
      const displayBox = new THREE.Box3().setFromObject(modelRef.current);
      const visualCenter = displayBox.getCenter(new THREE.Vector3());
      if (pairMode !== "none") visualCenter.y -= 0.28;
      const centerShift = visualCenter.y - controls.target.y;
      controls.target.set(visualCenter.x, visualCenter.y, visualCenter.z);
      camera.position.y += centerShift;
      const viewDirection = camera.position.clone().sub(controls.target).normalize();
      const fittedDistance = cameraDistanceToFitBox(camera, displayBox, visualCenter, viewDirection, 0.88);
      camera.position.copy(visualCenter).addScaledVector(viewDirection, fittedDistance);
    }
    controls.update();
  }, [isTwoLiter, isOneTwoLiter, isNewPot, groupCount, pairMode]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f6);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    if (pairMode !== "none") camera.position.copy(PAIR_CAMERA_POSITION);
    else if (isNewPot) camera.position.copy(NEW_POT_CAMERA_POSITION);
    else if (isOneTwoLiter) camera.position.copy(POT_12_CAMERA_POSITION);
    else if (isTwoLiter) camera.position.set(3.2, 1.35, 4.8);
    else camera.position.set(5.38, 2.15, 8.06);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setClearColor(0xf8f8f6, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Keep the cream matte product softly exposed against the clean studio background.
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", "可旋转的壶体 3D 预览");
    viewport.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // A neutral studio environment is visible only in material reflections.
    // It adds the broad, soft highlight roll-off of a photographed product.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const studioEnvironment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    if (studioEnvironment) scene.environment = studioEnvironment.texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    const lockedPolarAngle = pairMode !== "none"
      ? PAIR_LOCKED_POLAR_ANGLE
      : isNewPot
      ? NEW_POT_LOCKED_POLAR_ANGLE
      : isOneTwoLiter ? POT_12_LOCKED_POLAR_ANGLE : LOCKED_POLAR_ANGLE;
    controls.minPolarAngle = lockedPolarAngle;
    controls.maxPolarAngle = lockedPolarAngle;
    controls.minDistance = 2.2;
    controls.maxDistance = groupCount > 1 ? 30 : isTwoLiter ? 9 : 11.5;
    if (pairMode !== "none") controls.target.copy(PAIR_CAMERA_TARGET);
    else if (isNewPot) controls.target.copy(NEW_POT_CAMERA_TARGET);
    else if (isOneTwoLiter) controls.target.copy(POT_12_CAMERA_TARGET);
    else controls.target.set(0, 0.15, 0);
    controlsRef.current = controls;

    // Use neutral, symmetrical studio lights so uploaded artwork keeps the
    // same colour on the left and right sides of the pot.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b8b8, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(4.5, 5.5, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9);
    fill.position.set(-4.5, 5.5, 4.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.7);
    rim.position.set(0, 4, -5);
    scene.add(rim);

    // Long softboxes produce the broad, readable highlight bands visible on
    // the real coated vessel, without changing the established scene exposure.
    RectAreaLightUniformsLib.init();
    const frontSoftbox = new THREE.RectAreaLight(0xffffff, 2.0, 2.4, 0.28);
    frontSoftbox.position.set(-1.7, 1.45, 3.6);
    frontSoftbox.lookAt(0, 0.05, 0);
    scene.add(frontSoftbox);
    const sideSoftbox = new THREE.RectAreaLight(0xffffff, 0.8, 1.5, 0.22);
    sideSoftbox.position.set(3.2, 0.85, 1.5);
    sideSoftbox.lookAt(0, 0, 0);
    scene.add(sideSoftbox);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(7, 96),
      isTwoLiter
        ? new THREE.MeshStandardMaterial({ color: 0xbeb7a9, roughness: 0.92 })
        : new THREE.ShadowMaterial({ color: 0x73716c, opacity: 0.08, transparent: true }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.24;
    floor.name = "studio-floor";
    floor.receiveShadow = true;
    floor.visible = false;
    scene.add(floor);

    let disposed = false;
    let dracoLoader: { dispose: () => void } | null = null;
    const loadMixedPair = async () => {
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      if (disposed) return;
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      const pairCapacities: [Capacity, Capacity] = pairMode === "319" ? ["1.6", "2.0"] : ["1.2", "145"];
      const modelPath = (kind: Capacity) => kind === "1.2" ? "/pot-454.glb" : kind === "145" ? "/pot-145.glb" : "/pot.glb";
      try {
        const gltfs = await Promise.all(pairCapacities.map((kind) => loader.loadAsync(modelPath(kind))));
        if (disposed) return;
        const allBodyMaterials: THREE.MeshPhysicalMaterial[] = [];
        const allFixtureMaterials: THREE.MeshPhysicalMaterial[] = [];
        const allPrintMaterials: THREE.MeshBasicMaterial[] = [];
        const allPrintSurfaces: THREE.Mesh[] = [];

        const makePairProduct = (gltf: { scene: THREE.Group }, kind: Capacity) => {
          const pairIsTwoLiter = kind === "2.0";
          const pairIsNewPot = kind === "145";
          const pairIsOneTwoLiter = kind === "1.2";
          const pairIsStandalone = pairIsNewPot || pairIsOneTwoLiter;
          const model = gltf.scene;
          if (pairIsTwoLiter) extendBodyToTwoLiter(model);
          const rawBox = new THREE.Box3().setFromObject(model);
          const rawSize = rawBox.getSize(new THREE.Vector3());
          const rawCenter = rawBox.getCenter(new THREE.Vector3());
          const scale = 2.55 / Math.max(rawSize.x, rawSize.y, rawSize.z);
          model.scale.setScalar(scale);
          model.position.copy(rawCenter.multiplyScalar(-scale));
          model.updateMatrixWorld(true);
          const alignedBox = new THREE.Box3().setFromObject(model);
          model.position.y += -1.16 - alignedBox.min.y;
          model.updateMatrixWorld(true);

          const surface = pairIsTwoLiter ? FINISH_SURFACE.gloss : FINISH_SURFACE.matte;
          const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: bodyColor, roughness: surface.roughness, metalness: 0, clearcoat: surface.clearcoat,
            clearcoatRoughness: surface.clearcoatRoughness, ior: 1.46, specularIntensity: 0.42,
            envMapIntensity: 0.55, side: THREE.DoubleSide,
          });
          const fixtureMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, roughness: surface.roughness, metalness: 0, clearcoat: surface.clearcoat,
            clearcoatRoughness: surface.clearcoatRoughness, ior: 1.46, specularIntensity: 0.36,
            envMapIntensity: 0.42, side: THREE.DoubleSide,
          });
          const artwork = capacityArtworksRef.current[kind]?.[0];
          const printMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, map: artwork?.texture ?? null, side: pairIsOneTwoLiter ? THREE.DoubleSide : THREE.FrontSide,
            transparent: true, alphaTest: 0.001, depthWrite: false, polygonOffset: true,
            polygonOffsetFactor: -4, polygonOffsetUnits: -4,
          });
          printMaterial.toneMapped = false;
          if (artwork) {
            artwork.texture.flipY = pairIsStandalone;
            artwork.texture.needsUpdate = true;
          }
          let printSource: THREE.Mesh | null = null;
          let firstSurface: THREE.Mesh | null = null;
          model.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            child.castShadow = false;
            child.receiveShadow = false;
            if (!pairIsStandalone && child.name === "BODY_PRINT_365_99x183") {
              child.material = bodyMaterial;
              printSource = child;
            } else if (pairIsStandalone) {
              child.material = bodyMaterial;
              if (!firstSurface) firstSurface = child;
            } else {
              child.material = fixtureMaterial;
            }
          });
          let overlay: THREE.Mesh | null = null;
          if (printSource) {
            overlay = printSource.clone(false) as THREE.Mesh;
            overlay.name = "BODY_PRINT_MIXED_PAIR_OVERLAY";
            overlay.geometry = createSeamClippedPrintGeometry(printSource.geometry as THREE.BufferGeometry);
            overlay.material = printMaterial;
            overlay.renderOrder = 2;
            overlay.visible = Boolean(artwork);
            printSource.parent?.add(overlay);
          } else if (pairIsNewPot && firstSurface) {
            const bodyBandBottom = -1.11;
            const bodyBandHeight = 2.55 * (NEW_POT_WRAP_HEIGHT_MM / NEW_POT_OVERALL_HEIGHT_MM);
            const printBottom = bodyBandBottom + bodyBandHeight * (5 / NEW_POT_BODY_HEIGHT_MM);
            const printTop = printBottom + bodyBandHeight * (newPotPrintHeightsRef.current[kind][0] / NEW_POT_BODY_HEIGHT_MM);
            const radialLimit = Math.min(rawSize.x, rawSize.z) * scale * 0.61;
            clipPrintMaterialToHeight(printMaterial, printBottom, printTop);
            overlay = new THREE.Mesh(createConformingBodyPrintGeometry(
              firstSurface, model.position.x, model.position.z, printBottom, printTop, radialLimit,
            ), printMaterial);
            overlay.name = "BODY_PRINT_MIXED_PAIR_OVERLAY";
            overlay.renderOrder = 2;
            overlay.visible = Boolean(artwork);
            model.add(overlay);
          } else if (pairIsOneTwoLiter) {
            overlay = new THREE.Mesh(createPot12PrintGeometry(), printMaterial);
            overlay.name = "BODY_PRINT_MIXED_PAIR_OVERLAY";
            overlay.renderOrder = 2;
            overlay.visible = Boolean(artwork);
            model.add(overlay);
          }
          const root = new THREE.Group();
          root.add(model);
          if (pairIsNewPot && overlay) {
            model.remove(overlay);
            root.add(overlay);
          }
          if (pairIsOneTwoLiter) root.rotation.y = -Math.PI * 0.5;
          allBodyMaterials.push(bodyMaterial);
          allFixtureMaterials.push(fixtureMaterial);
          allPrintMaterials.push(printMaterial);
          if (overlay) allPrintSurfaces.push(overlay);
          return root;
        };

        const smallRoot = makePairProduct(gltfs[0], pairCapacities[0]);
        const largeRoot = makePairProduct(gltfs[1], pairCapacities[1]);
        largeRoot.scale.setScalar(pairMode === "319" ? 1.18 : 1.22);
        const alignBase = (root: THREE.Object3D) => {
          root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(root);
          root.position.y += -1.16 - box.min.y;
        };
        alignBase(smallRoot);
        alignBase(largeRoot);
        const smallBox = new THREE.Box3().setFromObject(smallRoot);
        const largeBox = new THREE.Box3().setFromObject(largeRoot);
        const gap = 0.22;
        const rowWidth = smallBox.getSize(new THREE.Vector3()).x + largeBox.getSize(new THREE.Vector3()).x + gap;
        smallRoot.position.x = -rowWidth / 2 + smallBox.getSize(new THREE.Vector3()).x / 2;
        largeRoot.position.x = rowWidth / 2 - largeBox.getSize(new THREE.Vector3()).x / 2;
        const displayGroup = new THREE.Group();
        displayGroup.name = "POT_GROUP";
        displayGroup.add(smallRoot, largeRoot);
        const displayBox = new THREE.Box3().setFromObject(displayGroup);
        const visualCenter = displayBox.getCenter(new THREE.Vector3());
        const framingCenter = visualCenter.clone();
        // Keep both complete vessels comfortably inside the on-screen canvas;
        // the slight upward optical shift balances their tall handles.
        framingCenter.y -= 0.28;
        controls.target.copy(framingCenter);
        const viewDirection = camera.position.clone().sub(controls.target).normalize();
        const distance = cameraDistanceToFitBox(camera, displayBox, framingCenter, viewDirection, 0.72);
        camera.position.copy(framingCenter).addScaledVector(viewDirection, distance);
        controls.update();
        modelMaterialsRef.current = allBodyMaterials;
        fixtureMaterialsRef.current = allFixtureMaterials;
        fixturePartUniformsRef.current = [];
        printMaterialsRef.current = allPrintMaterials;
        printSurfacesRef.current = allPrintSurfaces;
        modelRef.current = displayGroup;
        scene.add(displayGroup);
        setReady(true);
      } catch (error) {
        console.error("Mixed pair model load failed", error);
        setLoadError(true);
      }
    };
    const loadModel = async () => {
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      if (disposed) return;
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.load(
        isOneTwoLiter ? "/pot-454.glb" : isNewPot ? "/pot-145.glb" : "/pot.glb",
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          if (isTwoLiter) extendBodyToTwoLiter(model);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const scale = 2.55 / Math.max(size.x, size.y, size.z);
          model.scale.setScalar(scale);
          model.position.copy(center.multiplyScalar(-scale));
          model.updateMatrixWorld(true);
          const scaledBox = new THREE.Box3().setFromObject(model);
          model.position.y += -1.16 - scaledBox.min.y;
          model.updateMatrixWorld(true);
          if (isNewPot) {
            const visualCenterY = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()).y;
            const centerShift = visualCenterY - controls.target.y;
            controls.target.y = visualCenterY;
            camera.position.y += centerShift;
            controls.update();
          }

          const materials: THREE.MeshPhysicalMaterial[] = [];
          const initialSurface = isTwoLiter ? FINISH_SURFACE.gloss : FINISH_SURFACE.matte;
          const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: bodyColor,
            roughness: initialSurface.roughness,
            metalness: 0,
            clearcoat: initialSurface.clearcoat,
            clearcoatRoughness: initialSurface.clearcoatRoughness,
            ior: 1.46,
            specularIntensity: 0.42,
            envMapIntensity: 0.55,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          });
          const slotZeroArtwork = capacityArtworksRef.current[capacity]?.[0];
          const printMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: slotZeroArtwork?.texture ?? null,
            // Only the outward-facing carrier is printable. Rendering its back
            // faces exposes thin open-edge triangles beyond the pot silhouette.
            side: THREE.FrontSide,
            transparent: true,
            alphaTest: 0.001,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4,
          });
          // Artwork is colour-calibrated and intentionally independent from
          // scene lighting, so every rotation keeps the same source colours.
          printMaterial.toneMapped = false;
          const fixtureMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            roughness: initialSurface.roughness,
            metalness: 0,
            clearcoat: initialSurface.clearcoat,
            clearcoatRoughness: initialSurface.clearcoatRoughness,
            ior: 1.46,
            specularIntensity: 0.36,
            envMapIntensity: 0.42,
            side: THREE.DoubleSide,
          });
          let bodyFound = isStandaloneModel;
          const printSources: THREE.Mesh[] = [];
          const newPotSources: THREE.Mesh[] = [];
          model.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            child.castShadow = false;
            // The dense 1.6L production mesh produces visible self-shadow
            // banding at normal viewing distances. Keep its floor shadow, but
            // let the studio lights describe a clean, continuous enamel skin.
            child.receiveShadow = false;
            const isPrintSurface = !isStandaloneModel && child.name === "BODY_PRINT_365_99x183";
            if (isPrintSurface) {
              child.material = bodyMaterial;
              child.renderOrder = 1;
              bodyFound = true;
              materials.push(bodyMaterial);
              printSources.push(child);
            } else if (isStandaloneModel) {
              child.material = bodyMaterial;
              child.receiveShadow = false;
              newPotSources.push(child);
            } else {
              child.material = fixtureMaterial;
            }
          });
          if (!bodyFound) {
            setLoadError(true);
            return;
          }
          const fixturePartUniforms = isStandaloneModel ? null : configureFixturePartMaterial(
            fixtureMaterial,
            printSources[0].geometry as THREE.BufferGeometry,
            new THREE.Color(bodyColor).getHex(),
            lidColor,
            isTwoLiter,
          );
          let printSurfaces = printSources.map((source) => {
            const overlay = source.clone(false) as THREE.Mesh;
            overlay.name = "BODY_PRINT_TRANSPARENT_OVERLAY";
            overlay.geometry = createSeamClippedPrintGeometry(source.geometry as THREE.BufferGeometry);
            overlay.material = printMaterial;
            overlay.castShadow = false;
            overlay.receiveShadow = false;
            overlay.renderOrder = 2;
            overlay.visible = Boolean(slotZeroArtwork);
            source.parent?.add(overlay);
            // The original UV shell is only a carrier for the artwork. Keeping
            // it visible creates a second white surface whose uneven top edge
            // can protrude above the physical lid/body seam.
            source.visible = false;
            return overlay;
          });
          if (isNewPot) {
            // The supplied GLB is a single watertight mesh. Copy its actual
            // surface within the specified body band so artwork follows the
            // bulged lower body and tapered shoulder instead of cutting through
            // them like a regular cylinder.
            // The visible lower-body carrier represents the full 171 mm body.
            // Start artwork 5 mm above the base. Its actual height is inferred
            // from the uploaded aspect ratio (or edited by the user), capped at
            // the factory's 145 mm printable maximum.
            const bodyBandBottom = -1.11;
            const bodyBandHeight = 2.55 * (NEW_POT_WRAP_HEIGHT_MM / NEW_POT_OVERALL_HEIGHT_MM);
            const printHeight = bodyBandHeight
              * (newPotPrintHeightsRef.current[capacity][0] / NEW_POT_BODY_HEIGHT_MM);
            const printBottom = bodyBandBottom + bodyBandHeight * (5 / NEW_POT_BODY_HEIGHT_MM);
            const printTop = printBottom + printHeight;
            const radialLimit = Math.min(size.x, size.z) * scale * 0.61;
            clipPrintMaterialToHeight(printMaterial, printBottom, printTop);
            const overlay = new THREE.Mesh(
              createConformingBodyPrintGeometry(
                newPotSources[0],
                model.position.x,
                model.position.z,
                printBottom,
                printTop,
                radialLimit,
              ),
              printMaterial,
            );
            overlay.name = "BODY_PRINT_445_8x145_OVERLAY";
            overlay.castShadow = false;
            overlay.receiveShadow = false;
            overlay.renderOrder = 2;
            overlay.visible = Boolean(slotZeroArtwork);
            printSurfaces = [overlay];
            materials.push(bodyMaterial);
          } else if (isOneTwoLiter) {
            printMaterial.side = THREE.DoubleSide;
            const overlay = new THREE.Mesh(createPot12PrintGeometry(), printMaterial);
            overlay.name = "BODY_PRINT_454_27x91_OVERLAY";
            overlay.castShadow = false;
            overlay.receiveShadow = false;
            overlay.renderOrder = 2;
            overlay.visible = Boolean(slotZeroArtwork);
            model.add(overlay);
            printSurfaces = [overlay];
            materials.push(bodyMaterial);
          }
          const productRoot = new THREE.Group();
          productRoot.name = "PRODUCT_ROOT";
          productRoot.add(model);
          if (isNewPot && printSurfaces[0]) productRoot.add(printSurfaces[0]);
          // This GLB's authored front points away from the handle/spout sales
          // angle. Rotate each product itself so group members remain in one
          // flat row at equal apparent size instead of receding in perspective.
          if (isOneTwoLiter) productRoot.rotation.y = -Math.PI * 0.5;

          const displayGroup = new THREE.Group();
          displayGroup.name = "POT_GROUP";
          const groupedPrintMaterials: THREE.MeshBasicMaterial[] = [];
          const groupedPrintSurfaces: THREE.Mesh[] = [];
          const productSize = new THREE.Box3().setFromObject(productRoot).getSize(new THREE.Vector3());
          const groupScale = groupCount === 1 ? 1 : groupCount === 2 ? 0.62 : groupCount === 3 ? 0.45 : 0.34;
          // The 318 1.2L GLB carries a much wider authored bounding box than its
          // visible front silhouette. Use its visible-height proportion for the
          // compact, evenly spaced sales-row composition shown in the reference.
          const spacing = isOneTwoLiter
            ? productSize.y * groupScale * 1.16
            : productSize.x * groupScale * 1.06;

          for (let slot = 0; slot < groupCount; slot += 1) {
            const root = slot === 0 ? productRoot : productRoot.clone(true);
            root.name = `POT_SLOT_${slot}`;
            const artwork = capacityArtworksRef.current[capacity]?.[slot];
            let slotSurface: THREE.Mesh | null = null;
            root.traverse((child) => {
              if (child instanceof THREE.Mesh && child.name.includes("_OVERLAY")) slotSurface = child;
            });
            if (slotSurface) {
              if (isNewPot && slot > 0) {
                const bodyBandBottom = -1.11;
                const bodyBandHeight = 2.55 * (NEW_POT_WRAP_HEIGHT_MM / NEW_POT_OVERALL_HEIGHT_MM);
                const slotHeightMm = newPotPrintHeightsRef.current[capacity][slot];
                const printBottom = bodyBandBottom + bodyBandHeight * (5 / NEW_POT_BODY_HEIGHT_MM);
                const printTop = printBottom + bodyBandHeight * (slotHeightMm / NEW_POT_BODY_HEIGHT_MM);
                const radialLimit = Math.min(size.x, size.z) * scale * 0.61;
                slotSurface.geometry = createConformingBodyPrintGeometry(
                  newPotSources[0], model.position.x, model.position.z, printBottom, printTop, radialLimit,
                );
              }
              const slotMaterial = printMaterial.clone();
              slotMaterial.map = artwork?.texture ?? null;
              if (isNewPot) {
                const bodyBandBottom = -1.11;
                const bodyBandHeight = 2.55 * (NEW_POT_WRAP_HEIGHT_MM / NEW_POT_OVERALL_HEIGHT_MM);
                const printBottom = bodyBandBottom + bodyBandHeight * (5 / NEW_POT_BODY_HEIGHT_MM);
                const printTop = printBottom + bodyBandHeight
                  * (newPotPrintHeightsRef.current[capacity][slot] / NEW_POT_BODY_HEIGHT_MM);
                clipPrintMaterialToHeight(slotMaterial, printBottom, printTop);
              }
              slotMaterial.needsUpdate = true;
              slotSurface.material = slotMaterial;
              slotSurface.visible = Boolean(artwork);
              groupedPrintMaterials.push(slotMaterial);
              groupedPrintSurfaces.push(slotSurface);
            }
            root.scale.setScalar(groupScale);
            root.position.x = (slot - (groupCount - 1) / 2) * spacing;
            displayGroup.add(root);
          }

          if (groupCount > 1) {
            const displayBox = new THREE.Box3().setFromObject(displayGroup);
            const visualCenter = displayBox.getCenter(new THREE.Vector3());
            const centerShift = visualCenter.y - controls.target.y;
            controls.target.set(visualCenter.x, visualCenter.y, visualCenter.z);
            camera.position.y += centerShift;
            const viewDirection = camera.position.clone().sub(controls.target).normalize();
            const fittedDistance = cameraDistanceToFitBox(camera, displayBox, visualCenter, viewDirection, 0.88);
            camera.position.copy(visualCenter).addScaledVector(viewDirection, fittedDistance);
            controls.update();
          }

          modelMaterialsRef.current = materials;
          printMaterialsRef.current = groupedPrintMaterials;
          printSurfacesRef.current = groupedPrintSurfaces;
          fixtureMaterialsRef.current = isStandaloneModel ? [] : [fixtureMaterial];
          fixturePartUniformsRef.current = fixturePartUniforms ? [fixturePartUniforms] : [];
          modelRef.current = displayGroup;
          scene.add(displayGroup);
          setReady(true);
        },
        (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
        (error) => {
          console.error("Pot model load failed", error);
          setLoadError(true);
        }
      );
    };
    if (pairMode === "none") void loadModel();
    else void loadMixedPair();

    const resize = () => {
      const { clientWidth, clientHeight } = viewport;
      camera.aspect = Math.max(clientWidth, 1) / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      modelRef.current = null;
      modelMaterialsRef.current = [];
      printMaterialsRef.current = [];
      printSurfacesRef.current = [];
      fixtureMaterialsRef.current = [];
      fixturePartUniformsRef.current = [];
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      dracoLoader?.dispose();
      studioEnvironment?.texture.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
    };
  }, [capacity, newPotPrintHeightMm, groupCount, pairMode]);

  useEffect(() => {
    const texture = uploadedTextureRef.current;
    if (!texture) return;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(settings.scaleX, settings.scaleY);
    texture.offset.set(settings.offsetX, settings.offsetY);
    texture.center.set(0.5, 0.5);
    texture.rotation = THREE.MathUtils.degToRad(settings.rotation);
    texture.needsUpdate = true;
  }, [settings]);

  useEffect(() => {
    const surface = isTwoLiter && finish === "matte"
      ? { roughness: 0.72, clearcoat: 0, clearcoatRoughness: 0.8 }
      : FINISH_SURFACE[finish];
    modelMaterialsRef.current.forEach((material) => {
      material.color.set(bodyColor);
      material.roughness = surface.roughness;
      material.clearcoat = surface.clearcoat;
      material.clearcoatRoughness = surface.clearcoatRoughness;
      material.needsUpdate = true;
    });
  }, [finish, bodyColor, isTwoLiter, ready]);

  useEffect(() => {
    updateFixturePartUniforms(fixturePartUniformsRef.current, new THREE.Color(bodyColor).getHex(), lidColor);
    fixtureMaterialsRef.current.forEach((material) => {
      material.color.set(0xffffff);
      const surface = isTwoLiter && finish === "matte"
        ? { roughness: 0.72, clearcoat: 0, clearcoatRoughness: 0.8 }
        : FINISH_SURFACE[finish];
      material.roughness = surface.roughness;
      material.clearcoat = surface.clearcoat;
      material.clearcoatRoughness = surface.clearcoatRoughness;
      material.needsUpdate = true;
    });
  }, [bodyColor, lidColor, finish, isTwoLiter, ready]);

  const changeCapacity = (nextCapacity: Capacity, force = false) => {
    if (!force && pairMode === "319" && nextCapacity !== "1.6" && nextCapacity !== "2.0") return;
    if (!force && pairMode === "318" && nextCapacity !== "1.2" && nextCapacity !== "145") return;
    if (nextCapacity === capacity) return;
    settingsByCapacityRef.current[capacity][activePotIndex] = settings;
    const nextArtwork = capacityArtworksRef.current[nextCapacity]?.[0];
    uploadedTextureRef.current = nextArtwork?.texture ?? null;
    uploadedAspectRatioRef.current = nextArtwork?.aspectRatio ?? null;
    if (nextArtwork) {
      nextArtwork.texture.flipY = nextCapacity === "145" || nextCapacity === "1.2";
      nextArtwork.texture.needsUpdate = true;
    }
    setTextureName(nextArtwork?.name ?? "");
    setTexturePreview(nextArtwork?.preview ?? "");
    setActivePotIndex(0);
    setSettings({ ...settingsByCapacityRef.current[nextCapacity][0] });
    setNewPotPrintHeightMm(newPotPrintHeightsRef.current[nextCapacity][0]);
    const url = new URL(window.location.href);
    if (nextCapacity === "2.0" || nextCapacity === "145" || nextCapacity === "1.2") url.searchParams.set("capacity", nextCapacity);
    else url.searchParams.delete("capacity");
    window.history.replaceState({}, "", url);
    setProgress(0);
    setLoadError(false);
    setReady(false);
    setFinish(nextCapacity === "2.0" ? "gloss" : "matte");
    setBodyColor(nextCapacity === "2.0" ? "#f8f5e8" : DEFAULT_BODY_COLOR);
    setLidColor(nextCapacity === "2.0" ? "#f3f1e9" : "#f7f6f2");
    setCapacity(nextCapacity);
  };

  const changePairMode = (nextMode: PairMode) => {
    setPairMode(nextMode);
    setActivePotIndex(0);
    setGroupCount(nextMode === "none" ? 1 : 2);
    if (nextMode === "319") changeCapacity("1.6", true);
    if (nextMode === "318") changeCapacity("1.2", true);
  };

  const selectPotSlot = (nextIndex: number) => {
    if (nextIndex === activePotIndex || nextIndex < 0 || nextIndex >= groupCount) return;
    settingsByCapacityRef.current[capacity][activePotIndex] = settings;
    const nextArtwork = capacityArtworksRef.current[capacity]?.[nextIndex];
    uploadedTextureRef.current = nextArtwork?.texture ?? null;
    uploadedAspectRatioRef.current = nextArtwork?.aspectRatio ?? null;
    setTextureName(nextArtwork?.name ?? "");
    setTexturePreview(nextArtwork?.preview ?? "");
    setTextureError("");
    setSettings({ ...settingsByCapacityRef.current[capacity][nextIndex] });
    setNewPotPrintHeightMm(newPotPrintHeightsRef.current[capacity][nextIndex]);
    setActivePotIndex(nextIndex);
  };

  const changeGroupCount = (nextCount: number) => {
    if (nextCount === groupCount) return;
    if (activePotIndex >= nextCount) {
      settingsByCapacityRef.current[capacity][activePotIndex] = settings;
      const firstArtwork = capacityArtworksRef.current[capacity]?.[0];
      uploadedTextureRef.current = firstArtwork?.texture ?? null;
      uploadedAspectRatioRef.current = firstArtwork?.aspectRatio ?? null;
      setTextureName(firstArtwork?.name ?? "");
      setTexturePreview(firstArtwork?.preview ?? "");
      setSettings({ ...settingsByCapacityRef.current[capacity][0] });
      setNewPotPrintHeightMm(newPotPrintHeightsRef.current[capacity][0]);
      setActivePotIndex(0);
    }
    setGroupCount(nextCount);
  };

  const changeNewPotPrintHeight = (value: number) => {
    const nextHeight = THREE.MathUtils.clamp(value || 1, 1, NEW_POT_WRAP_HEIGHT_MM);
    newPotPrintHeightsRef.current[capacity][activePotIndex] = nextHeight;
    setNewPotPrintHeightMm(nextHeight);
  };

  const applyFile = useCallback((file?: File, requestedPotIndex = activePotIndex) => {
    if (!file) return;
    setTextureError("");
    if (!file.type.startsWith("image/")) {
      setTextureError("文件格式不支持，请上传 JPG、PNG 或 WEBP 图片。");
      return;
    }
    const targetCapacity = capacity;
    const targetPotIndex = requestedPotIndex;
    const targetSettings = targetPotIndex === activePotIndex
      ? settings
      : settingsByCapacityRef.current[targetCapacity][targetPotIndex];
    const targetUrls = objectUrlsRef.current[targetCapacity] ?? [];
    objectUrlsRef.current[targetCapacity] = targetUrls;
    const previousUrl = targetUrls[targetPotIndex];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const url = URL.createObjectURL(file);
    targetUrls[targetPotIndex] = url;
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      const targetArtworks = capacityArtworksRef.current[targetCapacity] ?? [];
      capacityArtworksRef.current[targetCapacity] = targetArtworks;
      targetArtworks[targetPotIndex]?.texture.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      // Existing Blender-authored UVs use glTF orientation; the new pot uses
      // runtime cylindrical UVs and therefore needs the normal image flip.
      texture.flipY = isStandaloneModel;
      texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 1;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(targetSettings.scaleX, targetSettings.scaleY);
      texture.offset.set(targetSettings.offsetX, targetSettings.offsetY);
      texture.center.set(0.5, 0.5);
      texture.rotation = THREE.MathUtils.degToRad(targetSettings.rotation);
      const image = texture.image as { width?: number; height?: number };
      const aspectRatio = image.width && image.height ? image.width / image.height : null;
      targetArtworks[targetPotIndex] = { texture, preview: url, name: file.name, aspectRatio };
      if (activeCapacityRef.current !== targetCapacity || activePotIndexRef.current !== targetPotIndex) return;
      uploadedTextureRef.current = texture;
      uploadedAspectRatioRef.current = aspectRatio;
      if (targetCapacity === "145" && image.width && image.height) {
        const inferredHeight = THREE.MathUtils.clamp(
          Math.round(NEW_POT_WRAP_WIDTH_MM * image.height / image.width),
          1,
          NEW_POT_WRAP_HEIGHT_MM,
        );
        newPotPrintHeightsRef.current[targetCapacity][targetPotIndex] = inferredHeight;
        setNewPotPrintHeightMm(inferredHeight);
      }
      const activeMaterial = printMaterialsRef.current[targetPotIndex];
      if (activeMaterial) {
        activeMaterial.map = texture;
        activeMaterial.color.set(0xffffff);
        activeMaterial.needsUpdate = true;
      }
      const activeSurface = printSurfacesRef.current[targetPotIndex];
      if (activeSurface) activeSurface.visible = true;
      setTextureName(file.name);
      setTexturePreview(url);
    }, undefined, () => setTextureError("图案读取失败，请重新导出图片后再试。"));
  }, [settings, isStandaloneModel, capacity, activePotIndex]);

  useEffect(() => {
    const texture = uploadedTextureRef.current;
    if (!texture) return;
    texture.flipY = isStandaloneModel;
    texture.needsUpdate = true;
  }, [isStandaloneModel, isNewPot]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void applyFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void applyFile(event.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    const pasteImage = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.kind === "file" && entry.type.startsWith("image/"));
      const pastedFile = item?.getAsFile();
      if (!pastedFile) return;
      event.preventDefault();
      const extension = pastedFile.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const namedFile = new File([pastedFile], `粘贴图案-${Date.now()}.${extension}`, { type: pastedFile.type });
      applyFile(namedFile);
    };
    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, [applyFile]);

  const restoreOriginal = () => {
    capacityArtworksRef.current[capacity]?.[activePotIndex]?.texture.dispose();
    if (capacityArtworksRef.current[capacity]) capacityArtworksRef.current[capacity]![activePotIndex] = undefined;
    const currentUrl = objectUrlsRef.current[capacity]?.[activePotIndex];
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    if (objectUrlsRef.current[capacity]) objectUrlsRef.current[capacity]![activePotIndex] = undefined;
    uploadedTextureRef.current = null;
    uploadedAspectRatioRef.current = null;
    const activeMaterial = printMaterialsRef.current[activePotIndex];
    if (activeMaterial) {
      activeMaterial.map = null;
      activeMaterial.needsUpdate = true;
    }
    const activeSurface = printSurfacesRef.current[activePotIndex];
    if (activeSurface) activeSurface.visible = false;
    modelMaterialsRef.current.forEach((material) => {
      material.color.set(bodyColor);
      material.needsUpdate = true;
    });
    setTextureName("");
    setTexturePreview("");
    setTextureError("");
    newPotPrintHeightsRef.current[capacity][activePotIndex] = NEW_POT_WRAP_HEIGHT_MM;
    setNewPotPrintHeightMm(NEW_POT_WRAP_HEIGHT_MM);
    settingsByCapacityRef.current[capacity][activePotIndex] = { ...INITIAL_SETTINGS };
    setSettings(INITIAL_SETTINGS);
  };

  const exportImage = (singlePot = false) => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const model = modelRef.current;
    if (!renderer || !camera || !controls || !model) return;

    let sceneRoot: THREE.Object3D = model;
    while (sceneRoot.parent) sceneRoot = sceneRoot.parent;
    if (!(sceneRoot instanceof THREE.Scene)) return;

    const outputCanvas = document.createElement("canvas");
    const exportSize = 1600;
    outputCanvas.width = exportSize;
    outputCanvas.height = exportSize;
    const context = outputCanvas.getContext("2d");
    if (!context) return;

    const previousSize = renderer.getSize(new THREE.Vector2());
    const previousPixelRatio = renderer.getPixelRatio();
    const previousAspect = camera.aspect;
    const previousPosition = camera.position.clone();
    const previousTarget = controls.target.clone();
    const previousBackground = sceneRoot.background;
    const studioFloor = sceneRoot.getObjectByName("studio-floor");
    const previousFloorVisibility = studioFloor?.visible;
    const viewDirection = camera.position.clone().sub(controls.target).normalize();

    renderer.setPixelRatio(1);
    renderer.setSize(exportSize, exportSize, false);
    sceneRoot.background = new THREE.Color(0xf8f8f6);
    if (studioFloor) studioFloor.visible = false;
    camera.aspect = 1;
    // Keep the user's current rotation while applying a consistent centered
    // catalogue crop with balanced white space for both capacities.
    const selectedPot = singlePot && pairMode === "none" && groupCount > 1
      ? model.getObjectByName(`POT_SLOT_${activePotIndex}`)
      : null;
    const exportObject = selectedPot ?? model;
    const exportTarget = new THREE.Box3().setFromObject(exportObject).getCenter(new THREE.Vector3());
    // Multi-pot exports fit the actual combined silhouette rather than using
    // a one-size camera distance. This makes every set fill the square width
    // while preserving a small safe margin around spouts and handles.
    const exportDistance = singlePot
      ? cameraDistanceToFitObject(camera, exportObject, exportTarget, viewDirection, 0.72)
      : groupCount === 1
      ? 6.25
      : cameraDistanceToFitObject(
        camera,
        exportObject,
        exportTarget,
        viewDirection,
        0.96,
      );
    camera.position.copy(exportTarget).addScaledVector(viewDirection, exportDistance);
    camera.lookAt(exportTarget);
    camera.updateProjectionMatrix();
    renderer.render(sceneRoot, camera);
    context.drawImage(renderer.domElement, 0, 0, exportSize, exportSize);

    sceneRoot.background = previousBackground;
    if (studioFloor && previousFloorVisibility !== undefined) {
      studioFloor.visible = previousFloorVisibility;
    }
    camera.position.copy(previousPosition);
    controls.target.copy(previousTarget);
    camera.aspect = previousAspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(previousPixelRatio);
    renderer.setSize(previousSize.x, previousSize.y, false);
    controls.update();

    outputCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `壶身图案预览-${displayLabel}${singlePot ? `-第${activePotIndex + 1}只-高清` : pairMode !== "none" ? "-一大一小" : groupCount > 1 ? `-组合${groupCount}只` : ""}-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const downloadTemplate = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(wrapWidthMm * 4);
    canvas.height = Math.round(templateHeightMm * 4);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f5f2ea";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(33, 35, 31, .18)";
    context.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += 146.4) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 146.4) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke();
    }
    context.strokeStyle = "#c45d36";
    context.setLineDash([16, 12]);
    context.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);
    context.font = "600 30px sans-serif";
    context.fillStyle = "#3a3c36";
    context.fillText(`展开图 ${wrapWidthMm} × ${templateHeightMm} mm · 4 px/mm`, 58, 82);
    context.font = "22px sans-serif";
    context.fillStyle = "#6f7169";
    context.fillText("虚线内为建议安全区 · 左右边缘为接缝", 58, 120);
    const link = document.createElement("a");
    link.download = `壶身展开图模板-${wrapWidthMm}x${templateHeightMm}mm-${capacityLabel}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const updateSetting = (key: keyof TextureSettings, value: number) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      settingsByCapacityRef.current[capacity][activePotIndex] = next;
      return next;
    });
  };

  const resetTextureSettings = () => {
    settingsByCapacityRef.current[capacity][activePotIndex] = { ...INITIAL_SETTINGS };
    setSettings({ ...INITIAL_SETTINGS });
  };

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand-mark">器</div>
        <div>
          <h1>壶身图案试样台</h1>
          <p>{displayLabel} · 展开图即时上样 · {wrapWidthMm} × {wrapHeightMm} mm{pairMode !== "none" ? " · 一大一小组合" : groupCount > 1 ? ` · ${groupCount}只组合` : ""}</p>
        </div>
        <div className="top-actions">
          <a className="studio-back-link" href="/">返回花色目录</a>
          <button className="ghost-button" onClick={downloadTemplate}>下载展开图模板</button>
          <button className="primary-button" onClick={exportImage} disabled={!ready}>导出当前视图</button>
        </div>
      </header>

      <section className="workspace">
        <div className="viewer-panel">
          <div ref={viewportRef} className="viewport viewport-studio-clean">
            {!ready && !loadError && (
              <div className="loading-card">
                <span className="loading-ring" />
                <strong>正在加载壶体</strong>
                <p>{progress ? `${progress}%` : "准备 3D 场景…"}</p>
                <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
              </div>
            )}
            {loadError && <div className="loading-card error-card"><strong>模型加载失败</strong><p>请刷新页面后重试。</p></div>}
            <div className="viewer-hints">
              <span>拖动左右旋转</span><span>滚轮缩放</span>
            </div>
            <button className="reset-view" onClick={resetView} aria-label="重置模型视角">↺ 重置视角</button>
          </div>
          <div className="viewer-footer">
            <div><b>MODEL</b><span>壶体 GLB · UV 已识别</span></div>
            <span className="studio-export-note">1600 × 1600 · 白底居中导出</span>
          </div>
        </div>

        <aside className="control-panel">
          <section className="control-section capacity-section">
            <div className="section-title"><span>00</span><h2>选择壶型</h2></div>
            <div className="segmented capacity-segmented" role="group" aria-label="选择壶型">
              <button className={capacity === "1.6" ? "active" : ""} onClick={() => changeCapacity("1.6")}>
                <strong>319 1.6L</strong><small>365.99 × 183 mm</small>
              </button>
              <button className={capacity === "2.0" ? "active" : ""} onClick={() => changeCapacity("2.0")}>
                <strong>319 2.0L</strong><small>365.99 × 235 mm</small>
              </button>
              <button className={capacity === "1.2" ? "active" : ""} onClick={() => changeCapacity("1.2")}>
                <strong>318 1.2L</strong><small>454.27 × 91 mm</small>
              </button>
              <button className={capacity === "145" ? "active" : ""} onClick={() => changeCapacity("145")}>
                <strong>318 2.0L</strong><small>Φ145 × 171 mm</small>
              </button>
            </div>
          </section>

          <section className="control-section pair-section">
            <div className="section-title"><span>01</span><h2>一大一小组合</h2></div>
            <div className="segmented pair-segmented" role="group" aria-label="选择一大一小组合">
              <button className={pairMode === "none" ? "active" : ""} onClick={() => changePairMode("none")}>单一壶型</button>
              <button className={pairMode === "319" ? "active" : ""} onClick={() => changePairMode("319")}>319 一大一小</button>
              <button className={pairMode === "318" ? "active" : ""} onClick={() => changePairMode("318")}>318 一大一小</button>
            </div>
            {pairMode !== "none" && (
              <p className="group-note">小壶在左、大壶在右。上方切换两个对应壶型，可分别上传和调整它们各自的图案。</p>
            )}
          </section>

          <section className="control-section group-section">
            <div className="section-title"><span>02</span><h2>组合展示</h2></div>
            {pairMode === "none" && <>
              <div className="segmented group-count-segmented" role="group" aria-label="选择壶的数量">
                {[1, 2, 3, 4].map((count) => (
                  <button key={count} className={groupCount === count ? "active" : ""} onClick={() => changeGroupCount(count)}>
                    {count} 只
                  </button>
                ))}
              </div>
            {groupCount > 1 && (
              <div className="pot-slot-picker" role="group" aria-label="选择要编辑的壶">
                {Array.from({ length: groupCount }, (_, index) => {
                  const hasArtwork = Boolean(capacityArtworksRef.current[capacity]?.[index]);
                  return (
                    <button
                      key={index}
                      className={`${activePotIndex === index ? "active" : ""} ${draggingPotIndex === index ? "dragging" : ""}`.trim()}
                      onClick={() => selectPotSlot(index)}
                      onDragEnter={(event) => { event.preventDefault(); setDraggingPotIndex(index); }}
                      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDraggingPotIndex(index); }}
                      onDragLeave={() => setDraggingPotIndex((current) => current === index ? null : current)}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDraggingPotIndex(null);
                        selectPotSlot(index);
                        void applyFile(event.dataTransfer.files?.[0], index);
                      }}
                      aria-label={`第 ${index + 1} 只，${hasArtwork ? "已上传图案" : "未上传"}，可将图片拖到这里替换`}
                    >
                      <strong>第 {index + 1} 只</strong><small>{hasArtwork ? "已上传图案" : "未上传"}</small>
                    </button>
                  );
                })}
              </div>
            )}
            {groupCount > 1 && (
              <button className="export-detail-button" onClick={() => exportImage(true)} disabled={!ready}>
                导出当前壶高清图
              </button>
            )}
            <p className="group-note">每只壶的图案和位置独立保存；也可把图片直接拖到对应的壶卡片上替换。</p>
            </>}
          </section>

          <section className="control-section upload-section">
            <div className="section-title"><span>03</span><h2>上传展开图{pairMode !== "none" ? ` · ${capacityLabel}` : groupCount > 1 ? ` · 第 ${activePotIndex + 1} 只` : ""}</h2></div>
            <div
              className={`dropzone ${isDragging ? "dragging" : ""} ${texturePreview ? "has-image" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click(); }}
            >
              {texturePreview ? (
                <img src={texturePreview} alt="已上传的展开图预览" />
              ) : (
                <><b>＋</b><strong>点击、拖入或 Ctrl+V 粘贴图案</strong><span>JPG / PNG / WEBP</span></>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
            </div>
            <div className="dimension-strip">
              <div><small>展开宽度</small><strong>{wrapWidthMm} <em>mm</em></strong></div>
              <i>×</i>
              <div>
                <small>{isNewPot ? "图案实际高度" : "展开高度"}</small>
                {isNewPot ? (
                  <strong className="dimension-input"><input type="number" min="1" max={NEW_POT_WRAP_HEIGHT_MM} step="0.1" value={newPotPrintHeightMm} onChange={(event) => changeNewPotPrintHeight(Number(event.target.value))} /><em>mm</em></strong>
                ) : <strong>{wrapHeightMm} <em>mm</em></strong>}
              </div>
            </div>
            {isNewPot && <p className="dimension-note">壶身 Φ145 × 171 mm · 最大打印高度 145 mm · 当前图案 {newPotPrintHeightMm} mm</p>}
            {isOneTwoLiter && <p className="dimension-note">壶身高度 108 mm · 印刷高度 91 mm · 顶部留白 17 mm</p>}
            {textureName && <p className="file-name" title={textureName}>已上样 · {textureName}</p>}
            {textureError && <p className="file-name" role="alert">{textureError}</p>}
          </section>

          <section className="control-section">
            <div className="section-title"><span>02</span><h2>图案位置</h2></div>
            <div className="slider-stack">
              <Slider label="横向缩放" value={settings.scaleX} min={0.25} max={3} step={0.01} onChange={(value) => updateSetting("scaleX", value)} />
              <Slider label="纵向缩放" value={settings.scaleY} min={0.25} max={3} step={0.01} onChange={(value) => updateSetting("scaleY", value)} />
              <Slider label="左右位移" value={settings.offsetX} min={-1} max={1} step={0.01} onChange={(value) => updateSetting("offsetX", value)} />
              <Slider label="上下位移" value={settings.offsetY} min={-1} max={1} step={0.01} onChange={(value) => updateSetting("offsetY", value)} />
              <Slider label="旋转" value={settings.rotation} min={-180} max={180} step={1} suffix="°" onChange={(value) => updateSetting("rotation", value)} />
            </div>
            <button className="text-button" onClick={resetTextureSettings}>恢复图案位置</button>
          </section>

          <section className="control-section finish-section">
            <div className="section-title"><span>03</span><h2>表面质感</h2></div>
            <div className="segmented">
              {(["matte", "satin", "gloss"] as Finish[]).map((item) => (
                <button key={item} onClick={() => setFinish(item)} className={finish === item ? "active" : ""}>
                  {{ matte: "哑光", satin: "半哑", gloss: "亮光" }[item]}
                </button>
              ))}
            </div>
            <div className="product-color-control">
              <div>
                <strong>壶身颜色</strong>
                <small>调整图案透明区域与无图案时的壶身底色</small>
              </div>
              <label className="color-picker" title="选择壶身颜色">
                <input type="color" value={bodyColor} onChange={(event) => setBodyColor(event.target.value)} aria-label="选择壶身颜色" />
                <span style={{ background: bodyColor }} />
                <output>{bodyColor.toUpperCase()}</output>
              </label>
            </div>
            <div className="product-color-presets" aria-label="壶身常用颜色">
              {[
                ["#eee8d9", "奶油白"],
                ["#ffffff", "纯白"],
                ["#efe2c7", "奶油色"],
                ["#dbe5dc", "浅绿色"],
                ["#d9dde3", "浅灰色"],
              ].map(([color, name]) => (
                <button
                  key={color}
                  className={bodyColor === color ? "active" : ""}
                  style={{ background: color }}
                  onClick={() => setBodyColor(color)}
                  aria-label={`壶身颜色：${name}`}
                  title={name}
                />
              ))}
            </div>
            {!isStandaloneModel && <>
              <div className="product-color-control">
                <div>
                  <strong>盖子颜色</strong>
                  <small>同时调整壶嘴与把手颜色</small>
                </div>
                <label className="color-picker" title="选择盖子颜色">
                  <input type="color" value={lidColor} onChange={(event) => setLidColor(event.target.value)} aria-label="选择盖子颜色" />
                  <span style={{ background: lidColor }} />
                  <output>{lidColor.toUpperCase()}</output>
                </label>
              </div>
              <div className="product-color-presets" aria-label="盖子常用颜色">
                {[
                  ["#f7f6f2", "哑光白"],
                  ["#e3d8c6", "米杏"],
                  ["#d8ded8", "雾灰"],
                  ["#b9c2ad", "浅绿"],
                  ["#343630", "深灰"],
                ].map(([color, name]) => (
                  <button
                    key={color}
                    className={lidColor === color ? "active" : ""}
                    style={{ background: color }}
                    onClick={() => setLidColor(color)}
                    aria-label={`盖子颜色：${name}`}
                    title={name}
                  />
                ))}
              </div>
            </>}
          </section>

          <div className="panel-footer">
            <button className="secondary-button" onClick={restoreOriginal} disabled={!textureName}>查看原始模型</button>
            <p>提示：图案接缝通常位于展开图左右边缘。</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
