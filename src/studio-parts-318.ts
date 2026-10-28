import * as THREE from "three";

export type Capacity318 = "1.2" | "145";

// Coordinates of the original, unscaled scans after their authored node
// transforms. Follow the actual mould joint, not the printable artwork edge.
export const PART_REGIONS_318 = {
  "1.2": {
    center: [0, 0.072], top: 0.575,
    radius: [[0, 0.35], [0.08, 0.36], [0.22, 0.36], [0.286, 0.357],
      [0.343, 0.349], [0.4, 0.334], [0.458, 0.312], [0.486, 0.298],
      [0.512, 0.28], [0.543, 0.261], [0.575, 0.256]],
  },
  "145": {
    center: [-0.0479, 0.00045], top: 0.7342,
    radius: [[0, 0.313], [0.4, 0.313], [0.5, 0.305], [0.55, 0.295],
      [0.6, 0.28], [0.65, 0.262], [0.7, 0.243], [0.7342, 0.23]],
  },
} as const;

export function is318Capacity(capacity: string): capacity is Capacity318 {
  return capacity === "1.2" || capacity === "145";
}

export function is318BodyPoint(point: THREE.Vector3, capacity: Capacity318) {
  const region = PART_REGIONS_318[capacity];
  let radius: number = region.radius[0][1];
  for (let i = 1; i < region.radius.length; i++) {
    const [y0, r0] = region.radius[i - 1], [y1, r1] = region.radius[i];
    if (point.y >= y0) radius = THREE.MathUtils.lerp(r0, r1, THREE.MathUtils.clamp((point.y - y0) / (y1 - y0), 0, 1));
  }
  return point.y <= region.top
    && Math.hypot(point.x - region.center[0], point.z - region.center[1]) <= radius;
}

// Colour partition only: preserve every original position, normal, index and
// UV. A model-space varying makes the partition independent of group placement,
// export camera, product rotation and scaling. Artwork remains on its existing
// carrier with its original source colours.
export function configure318PartColors(
  material: THREE.MeshPhysicalMaterial,
  source: THREE.Mesh,
  model: THREE.Object3D,
  capacity: Capacity318,
  lidColor: string,
) {
  const region = PART_REGIONS_318[capacity];
  const meshToModel = new THREE.Matrix4().copy(model.matrixWorld).invert().multiply(source.matrixWorld);
  const fixtureColor = { value: new THREE.Color(lidColor) };
  material.userData.fixture318Color = fixtureColor;
  const profile = region.radius.map(([y, radius], index) => {
    if (!index) return `float part318Radius = ${radius.toFixed(7)};`;
    const [lastY, lastRadius] = region.radius[index - 1];
    return `if (v318PartPoint.y >= ${lastY.toFixed(7)}) part318Radius = mix(${lastRadius.toFixed(7)}, ${radius.toFixed(7)}, clamp((v318PartPoint.y - ${lastY.toFixed(7)}) / ${(y - lastY).toFixed(7)}, 0.0, 1.0));`;
  }).join("\n");
  material.onBeforeCompile = (shader) => {
    shader.uniforms.u318MeshToModel = { value: meshToModel };
    shader.uniforms.u318FixtureColor = fixtureColor;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
uniform mat4 u318MeshToModel;
varying vec3 v318PartPoint;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
v318PartPoint = (u318MeshToModel * vec4(position, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform vec3 u318FixtureColor;
varying vec3 v318PartPoint;`)
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", `
${profile}
float part318HeightAA = max(fwidth(v318PartPoint.y) * 0.75, 0.00001);
float part318HeightMask = 1.0 - smoothstep(${region.top.toFixed(7)} - part318HeightAA, ${region.top.toFixed(7)} + part318HeightAA, v318PartPoint.y);
float part318RadialDistance = length(v318PartPoint.xz - vec2(${region.center[0].toFixed(7)}, ${region.center[1].toFixed(7)}));
float part318RadialAA = max(fwidth(part318RadialDistance) * 0.75, 0.00001);
float part318Body = part318HeightMask * (1.0 - smoothstep(part318Radius - part318RadialAA, part318Radius + part318RadialAA, part318RadialDistance));
vec4 diffuseColor = vec4(mix(u318FixtureColor, diffuse, part318Body), opacity);`);
  };
  material.customProgramCacheKey = () => `318-independent-part-colors-v1-${capacity}`;
  material.needsUpdate = true;
}

export function update318FixtureColor(material: THREE.MeshPhysicalMaterial, color: string) {
  const uniform = material.userData.fixture318Color as { value: THREE.Color } | undefined;
  if (uniform) uniform.value.set(color);
}
