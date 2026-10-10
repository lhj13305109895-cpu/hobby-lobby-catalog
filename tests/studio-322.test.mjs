import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as model322 from '../src/studio-model-322.ts';

const bytes = fs.readFileSync(new URL('../public/pot-322.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');

test('322 physical dimensions and 100 mm artwork leave 51 mm blank', () => {
  assert.equal(model322.POT_322_WRAP_WIDTH_MM, 364.11);
  assert.equal(model322.POT_322_BODY_HEIGHT_MM, 151);
  assert.equal(model322.POT_322_DIAMETER_MM, 364.11 / 3.1415926);
  assert.equal(model322.infer322ArtworkPrintHeight(36411, 10000), 100);
  assert.equal(151 - model322.infer322ArtworkPrintHeight(36411, 10000), 51);
  assert.equal(model322.infer322ArtworkPrintHeight(36411, 15100), 151);
  assert.equal(model322.infer322ArtworkPrintHeight(36411, 20000), 151);
  assert.equal(model322.infer322ArtworkPrintHeight(72822, 20000), 100);
});

test('322 GLB loads as original body and fixtures, without extra overlay', () => {
  assert.equal(gltf.scene.children.length, 2);
  const body = gltf.scene.getObjectByName('BODY_PRINT_364_11x151');
  const fixtures = gltf.scene.getObjectByName('322_LID_HANDLE_SPOUT');
  assert.ok(body?.isMesh && fixtures?.isMesh);
  assert.equal((body.geometry.index.count + fixtures.geometry.index.count) / 3, 500000);
  assert.equal(gltf.parser.json.images, undefined, 'No baked scan texture');
  assert.equal(gltf.parser.json.extras.printHeightMm, 151);
  assert.equal(gltf.parser.json.extras.printBottom, 0, 'Full-height artwork begins at the body base');
  assert.ok(Math.abs((gltf.parser.json.extras.printTop - gltf.parser.json.extras.printBottom) * 1000 - 151) < 1e-8);
  assert.deepEqual(body.position.toArray(), [0, 0, 0]);
  assert.deepEqual(body.scale.toArray(), [1, 1, 1]);
  const positions = body.geometry.getAttribute('position');
  const diameters = [];
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) > 0.03 && positions.getY(i) < 0.12) {
      diameters.push(2 * Math.hypot(positions.getX(i), positions.getZ(i)) * 1000);
    }
  }
  diameters.sort((a, b) => a - b);
  assert.ok(Math.abs(diameters[Math.floor(diameters.length / 2)] - model322.POT_322_DIAMETER_MM) < 0.15,
    'The actual scanned body, not just its metadata, matches the requested diameter');
});

test('322 UVs are continuous across every wrap triangle and calibrated in height', () => {
  const geometry = gltf.scene.getObjectByName('BODY_PRINT_364_11x151').geometry;
  const uv = geometry.getAttribute('uv');
  const position = geometry.getAttribute('position');
  const { printTop, printBottom } = gltf.parser.json.extras;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const u = [0, 1, 2].map(offset => uv.getX(geometry.index.getX(i + offset)));
    assert.ok(Math.max(...u) - Math.min(...u) <= 0.500001);
  }
  for (let i = 0; i < uv.count; i++) {
    assert.ok(Math.abs(uv.getY(i) - (position.getY(i) - printBottom) / (printTop - printBottom)) < 1e-6);
  }
});

test('short-art shader remaps only its band, composites transparency onto solid body', () => {
  const material = new THREE.MeshPhysicalMaterial();
  model322.configure322BodyPrint(material, 100);
  const shader = {
    uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  };
  material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.print322HeightRatio.value, 100 / 151);
  assert.ok(shader.vertexShader.includes('uv.y / print322HeightRatio'));
  assert.ok(shader.fragmentShader.includes('coverage * printColor.a'));
  assert.ok(!shader.fragmentShader.includes('#include <map_fragment>'));
  assert.equal(material.transparent, false, 'Transparent artwork must not cut holes in the vessel');
  assert.equal(material.polygonOffset, false, 'The print stays on the original surface');
  model322.configure322BodyPrint(material, 151);
  assert.equal(material.customProgramCacheKey(), '322-direct-body-source-color-v2-1');
});

test('322 source artwork bypasses lighting and tone mapping, but not output colour conversion', () => {
  const material = new THREE.MeshPhysicalMaterial({ color: '#fff5db' });
  model322.configure322BodyPrint(material, 151);
  const shader = {
    uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  };
  material.onBeforeCompile(shader);
  const fragment = shader.fragmentShader;
  const composite = fragment.indexOf('gl_FragColor.rgb = mix(gl_FragColor.rgb, printColor.rgb, coverage * printColor.a)');
  assert.ok(composite > fragment.indexOf('#include <opaque_fragment>'));
  assert.ok(composite > fragment.indexOf('#include <tonemapping_fragment>'));
  assert.ok(composite < fragment.indexOf('#include <colorspace_fragment>'));
  assert.ok(!fragment.includes('diffuseColor.rgb = mix'), 'Do not light/tone-map the artwork a second time');
  assert.equal(material.toneMapped, true, 'The unprinted vessel still receives physical lighting/tone mapping');
  assert.equal(material.transparent, false);
});

test('322 plastic parts receive independent lid colour and are wired to the studio controls', () => {
  const body = new THREE.MeshPhysicalMaterial({ color: '#fff5db' });
  const fixture = new THREE.MeshPhysicalMaterial();
  model322.configure322FixtureColor(fixture, '#343630');
  assert.equal(fixture.userData.directFixtureColor, true);
  assert.equal(fixture.color.getHexString(), '343630');
  // Follow the common studio colour-update path for the next selection.
  fixture.color.set(fixture.userData.directFixtureColor ? '#b9c2ad' : 0xffffff);
  assert.equal(fixture.color.getHexString(), 'b9c2ad');
  assert.equal(body.color.getHexString(), 'fff5db', 'Plastic selection must not recolour the vessel');
  const studio = fs.readFileSync(new URL('../src/PatternStudio.tsx', import.meta.url), 'utf8');
  assert.ok(studio.includes('if (is322) configure322FixtureColor(fixtureMaterial, lidColor)'));
  assert.ok(studio.includes('{(!isStandaloneModel || is322) && <>'), 'Show the lid controls for 322 too');
  assert.ok(studio.includes('capacity === "1.6" || capacity === "2.0" || is322'), 'Keep both 322 sizes plastic matte');
});

test('322 capacities have correct names, equal widths, separate heights and short-art blank space', () => {
  assert.equal(model322.POT_322_VARIANTS['322'].label, '322 1.3L');
  assert.equal(model322.POT_322_VARIANTS['322-1.0'].label, '322 1.0L');
  assert.ok(model322.is322Capacity('322'));
  assert.ok(model322.is322Capacity('322-1.0'));
  assert.ok(!model322.is322Capacity('1.2'));
  assert.ok(!model322.is322Capacity(null));
  assert.ok(!model322.is322Capacity(undefined));
  assert.equal(model322.get322BodyHeightMm('322'), 151);
  assert.equal(model322.get322BodyHeightMm('322-1.0'), 119);
  for (const [capacity, blankAbove] of [['322', 51], ['322-1.0', 19]]) {
    const bodyHeight = model322.get322BodyHeightMm(capacity);
    const artHeight = model322.infer322ArtworkPrintHeight(36411, 10000, bodyHeight);
    assert.equal(artHeight, 100);
    assert.equal(bodyHeight - artHeight, blankAbove);
    assert.equal(model322.infer322ArtworkPrintHeight(36411, 20000, bodyHeight), bodyHeight);
  }
  const studio = fs.readFileSync(new URL('../src/PatternStudio.tsx', import.meta.url), 'utf8');
  assert.ok(studio.includes('is322Capacity(initialCapacity)'), 'A direct 1.0L URL selects that size');
  assert.ok(studio.includes('"322-1.0": Array(4).fill('), 'Separate physical heights for four short pots');
  assert.ok(studio.includes('"322-1.0": Array.from({ length: 4 }, () => ({ ...INITIAL_SETTINGS }))'), 'Independent placement settings');
  assert.ok(studio.includes('capacityArtworksRef.current[targetCapacity]'), 'Artwork storage stays keyed by exact capacity');
  assert.ok(studio.includes('const templateHeightMm = is322 ? body322HeightMm'), 'Template uses full selected body height, not current artwork height');
  assert.ok(studio.includes('<strong>322 1.0L</strong><small>364.11 × 119 mm</small>'));
  assert.ok(studio.includes('<strong>322 1.3L</strong><small>364.11 × 151 mm</small>'));
});

test('322 1.0L shortens only the straight vessel wall, never the handle/lid or width', () => {
  const originalBody = gltf.scene.getObjectByName('BODY_PRINT_364_11x151').geometry;
  const originalFixtures = gltf.scene.getObjectByName('322_LID_HANDLE_SPOUT').geometry;
  const short = gltf.scene.clone(true);
  model322.configure322ModelHeight(short, 119);
  const body = short.getObjectByName('BODY_PRINT_364_11x151').geometry;
  const fixtures = short.getObjectByName('322_LID_HANDLE_SPOUT').geometry;
  assert.notEqual(body, originalBody, 'Do not mutate the saved 1.3L source');
  assert.notEqual(fixtures, originalFixtures);
  assert.equal((body.index.count + fixtures.index.count) / 3, 500000, 'No overlay, missing triangles or geometry cuts');
  const before = originalBody.attributes.position;
  const after = body.attributes.position;
  const uv = body.attributes.uv;
  const normal = body.attributes.normal;
  let checkedBase = 0, checkedShoulder = 0;
  for (let i = 0; i < after.count; i++) {
    assert.equal(after.getX(i), before.getX(i), 'Width remains unchanged');
    assert.equal(after.getZ(i), before.getZ(i));
    assert.equal(uv.getX(i), originalBody.attributes.uv.getX(i), 'Keep seam-safe wrap coordinates');
    assert.ok(Math.abs(uv.getY(i) * 0.119 - after.getY(i)) < 1e-8, 'Height UVs remain calibrated in real millimetres');
    assert.ok(Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) < 1e-6);
    if (before.getY(i) <= 0.012) {
      assert.equal(after.getY(i), before.getY(i), 'Preserve the rounded base');
      checkedBase++;
    }
    if (before.getY(i) >= 0.12) {
      assert.ok(Math.abs(after.getY(i) - (before.getY(i) - 0.032)) < 1e-8, 'Preserve the shoulder curve');
      checkedShoulder++;
    }
  }
  assert.ok(checkedBase > 0 && checkedShoulder > 0);
  const oldParts = originalFixtures.attributes.position;
  const newParts = fixtures.attributes.position;
  let checkedHandle = 0, checkedLid = 0, handleBottom = Infinity;
  for (let i = 0; i < newParts.count; i++) {
    assert.equal(newParts.getX(i), oldParts.getX(i));
    assert.equal(newParts.getZ(i), oldParts.getZ(i));
    const isHandle = Math.hypot(oldParts.getX(i), oldParts.getZ(i)) > 0.075;
    const isLid = oldParts.getY(i) >= 0.151;
    if (isHandle || isLid) {
      assert.ok(Math.abs(newParts.getY(i) - (oldParts.getY(i) - 0.032)) < 1e-8,
        'Translate the plastic assembly rigidly; never vertically squash it');
      assert.equal(fixtures.attributes.normal.getY(i), originalFixtures.attributes.normal.getY(i));
    }
    if (isHandle) { checkedHandle++; handleBottom = Math.min(handleBottom, newParts.getY(i)); }
    if (isLid) checkedLid++;
  }
  assert.ok(checkedHandle > 1000 && checkedLid > 1000);
  assert.ok(handleBottom > 0, 'The unchanged handle still clears the shorter vessel base');
  assert.ok(Math.abs(body.boundingBox.max.y - originalBody.boundingBox.max.y + 0.032) < 1e-8);
  const geometryOnce = short.getObjectByName('BODY_PRINT_364_11x151').geometry;
  model322.configure322ModelHeight(short, 119);
  assert.equal(short.getObjectByName('BODY_PRINT_364_11x151').geometry, geometryOnce, 'Resizing is idempotent');
  model322.configure322ModelHeight(gltf.scene, 151);
  assert.equal(gltf.scene.getObjectByName('BODY_PRINT_364_11x151').geometry, originalBody, 'Original 1.3L geometry is untouched');
});

test('322 1.0L shader prints 100 mm at 100/119 and 119 mm as full height', () => {
  const material = new THREE.MeshPhysicalMaterial();
  const shaderForHeight = height => {
    model322.configure322BodyPrint(material, height, 119);
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
    material.onBeforeCompile(shader);
    return shader;
  };
  assert.equal(shaderForHeight(100).uniforms.print322HeightRatio.value, 100 / 119);
  assert.equal(shaderForHeight(119).uniforms.print322HeightRatio.value, 1);
  assert.equal(material.transparent, false);
  assert.equal(material.polygonOffset, false);
});

test('322 mixed pair uses equal physical scale and independently addresses each size', () => {
  const studio = fs.readFileSync(new URL('../src/PatternStudio.tsx', import.meta.url), 'utf8');
  assert.ok(studio.includes('pairMode === "322" ? ["322-1.0", "322"]'), 'Small pot left, large pot right');
  assert.ok(studio.includes('const sizingSize = reference322Size ?? rawSize'), 'Both sizes reference the unshortened scan for equal scaling');
  assert.ok(studio.includes('largeRoot.scale.setScalar(pairMode === "322" ? 1'), 'Do not enlarge the shared lid and handle');
  assert.ok(studio.includes('if (pairIs322 && printSource)'), 'Use the original vessel surface in pair mode too');
  assert.ok(studio.includes('allPrintMaterials.push(pairIs322 ? bodyMaterial : printMaterial)'));
  assert.ok(studio.includes('if (nextMode === "322") changeCapacity("322-1.0", true)'));
  assert.ok(studio.includes('pairMode !== "none" && pairMode !== "322"'), 'Choosing a different 322 size retains its pair');
  assert.ok(studio.includes('const activePrintIndex = pairMode === "322" ? (capacity === "322" ? 1 : 0)'), 'Removing an artwork targets only its selected size');
  assert.ok(studio.includes('void applyFile(selectedFiles[0], 0, "322-1.0")'));
  assert.ok(studio.includes('if (selectedFiles[1]) void applyFile(selectedFiles[1], 0, "322")'));
  assert.ok(studio.includes('if (!(is322Capacity(capacity) && is322Capacity(nextCapacity)))'), 'Switching which 322 size to edit retains the chosen plastic/body colours');
  assert.ok(studio.includes('const targetSettings = targetCapacity === capacity && targetPotIndex === activePotIndex'), 'A two-file upload retains the other capacity\'s saved placement settings');
  assert.ok(studio.includes('>322 一大一小</button>'));
});
