import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { STUDIO_CAPACITIES, createCapacityPalettes, setPaletteColor, getPairCapacities, tagPaletteMaterial, getMaterialPalette } from '../src/studio-palettes.ts';

test('all six palettes have independent objects and the required cream defaults', () => {
  const palettes = createCapacityPalettes('#ffeec2', '#ffeec2');
  assert.equal(new Set(Object.values(palettes)).size, 6);
  for (const capacity of STUDIO_CAPACITIES) assert.deepEqual(palettes[capacity], {bodyColor:'#ffeec2',lidColor:'#ffeec2'});
  assert.deepEqual(getPairCapacities('none'), []);
  assert.deepEqual(getPairCapacities('319'), ['1.6','2.0']);
  assert.deepEqual(getPairCapacities('318'), ['1.2','145']);
  assert.deepEqual(getPairCapacities('322'), ['322-1.0','322']);
});

for (const family of ['318','319','322']) {
  test(`${family} small/large colours cannot overwrite each other or the other colour channel`, () => {
    const palettes = createCapacityPalettes('#ffeec2','#ffeec2');
    const [small, large] = getPairCapacities(family);
    const original = structuredClone(palettes);
    setPaletteColor(palettes, small, 'bodyColor', '#224466');
    setPaletteColor(palettes, small, 'lidColor', '#343630');
    assert.deepEqual(palettes[large], original[large]);
    setPaletteColor(palettes, large, 'bodyColor', '#dbe5dc');
    setPaletteColor(palettes, large, 'lidColor', '#ffffff');
    assert.deepEqual(palettes[small], {bodyColor:'#224466',lidColor:'#343630'});
    setPaletteColor(palettes, small, 'lidColor', '#b9c2ad');
    assert.equal(palettes[small].bodyColor, '#224466');
    assert.deepEqual(palettes[large], {bodyColor:'#dbe5dc',lidColor:'#ffffff'});
    for (const other of STUDIO_CAPACITIES.filter(c => c !== small && c !== large)) assert.deepEqual(palettes[other], original[other]);
    const materials = [small,large].map(capacity => {
      const material = new THREE.MeshPhysicalMaterial();
      tagPaletteMaterial(material, capacity);
      return material;
    });
    // Selection is only a fallback; tagged materials keep their own colours
    // through target switches, scene clones, source-art removal and export.
    for (const selected of [small,large,small]) {
      materials.forEach((material,index) => {
        const owner = index === 0 ? small : large;
        assert.equal(getMaterialPalette(material, palettes, selected), palettes[owner]);
        assert.equal(getMaterialPalette(material.clone(), palettes, selected), palettes[owner]);
      });
    }
  });
}

test('UI, 318 partition, 319 uniforms and 322 fixture materials route by product ownership', () => {
  const source = fs.readFileSync(new URL('../src/PatternStudio.tsx',import.meta.url),'utf8');
  assert.ok(source.includes('setPaletteColor(capacityPalettesRef.current, capacity, "bodyColor", color)'));
  assert.ok(source.includes('setPaletteColor(capacityPalettesRef.current, capacity, "lidColor", color)'));
  assert.ok(source.includes('const { bodyColor, lidColor } = capacityPalettesRef.current[kind]'));
  assert.ok(source.includes('tagPaletteMaterial(bodyMaterial, kind)'));
  assert.ok(source.includes('tagPaletteMaterial(fixtureMaterial, kind)'));
  assert.ok(source.includes('fixturePartUniforms.capacity = kind'));
  assert.ok(source.includes('capacityPalettesRef.current[uniforms.capacity ?? capacity]'));
  assert.ok(source.includes('update318FixtureColor(material, palette.lidColor)'));
  assert.ok(source.includes('material.userData.directFixtureColor ? palette.lidColor : 0xffffff'));
  assert.ok(source.includes('aria-label="选择要调色的壶"'));
  assert.ok(source.includes('const nextPalette = capacityPalettesRef.current[nextCapacity]'));
  assert.equal((source.match(/material\.color\.set\(bodyColor\)/g) || []).length, 0, 'Neither colour effects nor removing artwork may recolour both products globally');
});
