import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const studio = fs.readFileSync(new URL('../src/PatternStudio.tsx', import.meta.url), 'utf8');

test('all studio bodies and plastic fixtures default to RGB 255, 238, 194', () => {
  const body = studio.match(/const DEFAULT_BODY_COLOR = "(#[a-f0-9]{6})";/)?.[1];
  const lid = studio.match(/const DEFAULT_LID_COLOR = "(#[a-f0-9]{6})";/)?.[1];
  assert.equal(body, '#ffeec2');
  assert.equal(lid, '#ffeec2');
  assert.deepEqual(body.slice(1).match(/../g).map(channel => parseInt(channel, 16)), [255, 238, 194]);
  assert.ok(studio.includes('useState(DEFAULT_BODY_COLOR)'), 'Direct URLs use the new body default');
  assert.ok(studio.includes('useState(DEFAULT_LID_COLOR)'), 'Direct URLs use the new plastic default');
  assert.ok(studio.includes('createCapacityPalettes(DEFAULT_BODY_COLOR, DEFAULT_LID_COLOR)'), 'Every unsaved product starts at the supplied defaults');
  assert.ok(studio.includes('setBodyColorState(nextPalette.bodyColor)'), 'Switching restores this product palette');
  assert.ok(studio.includes('setLidColorState(nextPalette.lidColor)'));
});

test('default colour change retains custom pickers, independent artwork and nonmetal materials', () => {
  assert.ok(studio.includes('onChange={(event) => setBodyColor(event.target.value)}'));
  assert.ok(studio.includes('onChange={(event) => setLidColor(event.target.value)}'));
  assert.ok(studio.includes('configure322FixtureColor(fixtureMaterial, lidColor)'));
  assert.ok(studio.includes('capacityArtworksRef.current[targetCapacity]'));
  assert.ok(studio.includes('printMaterial.toneMapped = false'));
  assert.ok(!studio.includes('studio-steel-environment'));
});
