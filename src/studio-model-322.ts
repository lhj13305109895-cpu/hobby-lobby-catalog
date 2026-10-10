import type * as THREE from "three";

export const POT_322_WRAP_WIDTH_MM = 364.11;
export const POT_322_BODY_HEIGHT_MM = 151;
export const POT_322_DIAMETER_MM = POT_322_WRAP_WIDTH_MM / 3.1415926;
export const POT_322_VARIANTS = {
  "322": { label: "322 1.3L", bodyHeightMm: POT_322_BODY_HEIGHT_MM },
  "322-1.0": { label: "322 1.0L", bodyHeightMm: 119 },
} as const;
export type Pot322Capacity = keyof typeof POT_322_VARIANTS;

export function is322Capacity(capacity?: string | null): capacity is Pot322Capacity {
  return capacity === "322" || capacity === "322-1.0";
}

export function get322BodyHeightMm(capacity: string) {
  return is322Capacity(capacity) ? POT_322_VARIANTS[capacity].bodyHeightMm : POT_322_BODY_HEIGHT_MM;
}

export function infer322ArtworkPrintHeight(width: number, height: number, bodyHeightMm = POT_322_BODY_HEIGHT_MM) {
  return Math.min(bodyHeightMm, Math.max(1,
    Math.round(POT_322_WRAP_WIDTH_MM * height / width * 10) / 10,
  ));
}

// Reuse the production 1.3L scan for the same-width 1.0L vessel. Remove 32 mm
// from the straight wall only: retain the rounded base/shoulder and translate
// the entire lid/spout/handle rigidly downward, without shrinking the handle.
export function configure322ModelHeight(model: THREE.Object3D, bodyHeightMm: number) {
  if (bodyHeightMm === POT_322_BODY_HEIGHT_MM || model.userData.pot322BodyHeightMm === bodyHeightMm) return;
  const heightDelta = (POT_322_BODY_HEIGHT_MM - bodyHeightMm) / 1000;
  const straightBottom = 0.012;
  const straightTop = 0.12;
  const straightScale = (straightTop - straightBottom - heightDelta) / (straightTop - straightBottom);
  if (straightScale <= 0) throw new Error("322 body height is too short for its preserved base and shoulder");
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone();
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    const uv = geometry.getAttribute("uv");
    const isBody = mesh.name === "BODY_PRINT_364_11x151";
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      // The fixture mesh also contains unprinted underside/interior triangles.
      // Only those within the vessel radius follow the body. In this scan all
      // handle vertices below the lid are outside 60 mm; they stay rigid.
      const followsBody = isBody || (Math.hypot(x, z) < 0.06 && y < straightTop);
      const inStraightWall = followsBody && y > straightBottom && y < straightTop;
      const nextY = !followsBody || y >= straightTop ? y - heightDelta
        : y <= straightBottom ? y : straightBottom + (y - straightBottom) * straightScale;
      position.setY(i, nextY);
      if (normal && inStraightWall) {
        const nx = normal.getX(i), ny = normal.getY(i) / straightScale, nz = normal.getZ(i);
        const length = Math.hypot(nx, ny, nz);
        normal.setXYZ(i, nx / length, ny / length, nz / length);
      }
      if (isBody && uv) uv.setY(i, nextY / (bodyHeightMm / 1000));
    }
    position.needsUpdate = true;
    if (normal) normal.needsUpdate = true;
    if (uv) uv.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.geometry = geometry;
  });
  model.userData.pot322BodyHeightMm = bodyHeightMm;
  model.updateMatrixWorld(true);
}

// Print on the original vessel triangles, never an offset carrier. Masking
// height per fragment avoids a jagged triangle boundary and keeps short
// artwork bottom-aligned while its UVs retain the source aspect ratio.
export function configure322BodyPrint(material: THREE.MeshPhysicalMaterial, heightMm: number, bodyHeightMm = POT_322_BODY_HEIGHT_MM) {
  const heightRatio = heightMm / bodyHeightMm;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.print322HeightRatio = { value: heightRatio };
    shader.vertexShader = `uniform float print322HeightRatio;\nvarying float v322BodyV;\n${shader.vertexShader}`
      .replace("#include <uv_vertex>", `#include <uv_vertex>
        v322BodyV = uv.y;
        #ifdef USE_MAP
          vMapUv = (mapTransform * vec3(uv.x, uv.y / print322HeightRatio, 1.0)).xy;
        #endif
      `);
    shader.fragmentShader = `uniform float print322HeightRatio;\nvarying float v322BodyV;\n${shader.fragmentShader}`
      .replace("#include <map_fragment>", `
        #ifdef USE_MAP
          vec4 printColor = texture2D(map, vMapUv);
          float edge = max(fwidth(v322BodyV), 0.00001);
          float coverage = smoothstep(-edge, edge, v322BodyV)
            * (1.0 - smoothstep(print322HeightRatio - edge, print322HeightRatio + edge, v322BodyV));
        #endif
      `)
      .replace("#include <tonemapping_fragment>", `#include <tonemapping_fragment>
        #ifdef USE_MAP
          // The sRGB texture is sampled in linear space. Composite after the
          // vessel's lighting/tone mapping, before output colour conversion,
          // so ink retains its source colour just like the 318/319 previews.
          // Alpha reveals the shaded vessel; it never makes geometry transparent.
          gl_FragColor.rgb = mix(gl_FragColor.rgb, printColor.rgb, coverage * printColor.a);
        #endif
      `);
  };
  material.customProgramCacheKey = () => `322-direct-body-source-color-v2-${heightRatio}`;
  material.needsUpdate = true;
}

export function configure322FixtureColor(material: THREE.MeshPhysicalMaterial, color: string) {
  // The shared studio colour effect uses this flag for independently coloured
  // plastic parts, rather than the shader-partitioned 319 vessel/fixture mesh.
  material.userData.directFixtureColor = true;
  material.color.set(color);
}
