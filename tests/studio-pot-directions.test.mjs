import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPotDirections, attachPotTurntables, setPotDirection, applyPotTurnDrag, directionIndexForObject, normalizePotAngle } from '../src/studio-pot-directions.ts';
import { getPairCapacities } from '../src/studio-palettes.ts';

function products(count = 2) {
  const row = new THREE.Group();
  const items = [];
  for (let i = 0; i < count; i++) {
    const root = new THREE.Group();
    root.name = `POT_SLOT_${i}`;
    root.position.set(i * 3 - 2, 0.1, -0.2);
    root.scale.setScalar(i === 0 ? 0.62 : 0.75);
    root.rotation.y = -Math.PI / 2;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2, 16), new THREE.MeshBasicMaterial());
    body.name = 'BODY_PRINT_TEST';
    body.position.set(-0.2, 0.3, 0.1);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.3), new THREE.MeshBasicMaterial());
    handle.position.set(0.9, 0.3, 0.1);
    root.add(body, handle); row.add(root); items.push({root,body,handle});
  }
  row.updateMatrixWorld(true);
  return {row,items};
}

test('zero-angle turntables preserve placement, scale, source geometry and artwork transforms', () => {
  const {row,items} = products(4);
  const before = items.map(({body,handle}) => ({body:body.matrixWorld.clone(),handle:handle.matrixWorld.clone(),geometry:body.geometry.attributes.position.array.slice()}));
  const directions = createPotDirections();
  attachPotTurntables(row, items.map((_,slot) => ({capacity:'1.2',slot})), directions);
  row.updateMatrixWorld(true);
  items.forEach(({body,handle},i) => {
    body.matrixWorld.elements.forEach((value,j) => assert.ok(Math.abs(value-before[i].body.elements[j])<1e-10));
    handle.matrixWorld.elements.forEach((value,j) => assert.ok(Math.abs(value-before[i].handle.elements[j])<1e-10));
    assert.deepEqual(body.geometry.attributes.position.array,before[i].geometry);
  });
});

for (const family of ['318','319','322']) {
  test(`${family} mixed pair turns only the chosen body and preserves its physical body axis`, () => {
    const {row,items} = products();
    const directions = createPotDirections();
    const keys = getPairCapacities(family).map(capacity => ({capacity,slot:0}));
    const turns = attachPotTurntables(row,keys,directions);
    row.updateMatrixWorld(true);
    const sibling = items[1].body.matrixWorld.clone();
    const axis = new THREE.Box3().setFromObject(items[0].body).getCenter(new THREE.Vector3());
    setPotDirection(turns,directions,keys[0],90);
    row.updateMatrixWorld(true);
    assert.deepEqual(items[1].body.matrixWorld.elements,sibling.elements);
    assert.ok(new THREE.Box3().setFromObject(items[0].body).getCenter(new THREE.Vector3()).distanceTo(axis)<1e-10);
    assert.equal(directions[keys[1].capacity][0],0);
    assert.equal(turns[1].pivot.rotation.y,0);
    setPotDirection(turns,directions,keys[1],-45);
    assert.equal(turns[0].pivot.rotation.y,Math.PI/2);
    assert.equal(directions[keys[0].capacity][0],90);
    // Rebuilds for model selection, artwork height and pair/single mode changes
    // consume the same saved per-capacity/slot directions.
    const rebuilt = products();
    const restored = attachPotTurntables(rebuilt.row,keys,directions);
    assert.equal(restored[0].pivot.rotation.y,Math.PI/2);
    assert.equal(restored[1].pivot.rotation.y,-Math.PI/4);
  });
}

test('four same-size slots and other capacities retain separate directions on reset and rebuild', () => {
  const {row,items} = products(4);
  const directions = createPotDirections();
  const keys = items.map((_,slot) => ({capacity:'1.6',slot}));
  const turns = attachPotTurntables(row,keys,directions);
  keys.forEach((key,i) => setPotDirection(turns,directions,key,30+i*25));
  setPotDirection(turns,directions,keys[2],0);
  assert.deepEqual(directions['1.6'],[30,55,0,105]);
  assert.deepEqual(directions['2.0'],[0,0,0,0]);
  const rebuilt = products(4);
  const restored = attachPotTurntables(rebuilt.row,keys,directions);
  restored.forEach(({pivot},i) => assert.equal(pivot.rotation.y,THREE.MathUtils.degToRad(directions['1.6'][i])));
});

test('picking body or handle identifies only its own turntable and ignores hidden artwork carriers', () => {
  const {row,items} = products();
  attachPotTurntables(row,[{capacity:'322-1.0',slot:0},{capacity:'322',slot:0}],createPotDirections());
  assert.equal(directionIndexForObject(items[0].body),0);
  assert.equal(directionIndexForObject(items[1].handle),1);
  items[0].body.visible=false;
  assert.equal(directionIndexForObject(items[0].body),null);
  assert.equal(directionIndexForObject(row),null);
});

test('continuous dragging wraps cleanly through the full horizontal rotation', () => {
  assert.equal(normalizePotAngle(195),-165);
  assert.equal(normalizePotAngle(-195),165);
  assert.equal(normalizePotAngle(360),0);
  assert.equal(normalizePotAngle(180),180);
  assert.equal(normalizePotAngle(725),5);
});

test('blank-canvas dragging turns the entire set in place by an equal delta, preserving relative angles', () => {
  const {row,items} = products(4);
  const directions = createPotDirections();
  const keys = items.map((_,slot) => ({capacity:'1.6',slot}));
  const turns = attachPotTurntables(row,keys,directions);
  const original = [175,-30,0,90];
  original.forEach((angle,i) => setPotDirection(turns,directions,keys[i],angle));
  row.updateMatrixWorld(true);
  const positions = turns.map(({pivot}) => pivot.getWorldPosition(new THREE.Vector3()));
  const starts = original.map((angle,index) => ({index,angle}));
  applyPotTurnDrag(turns,directions,starts,20);
  assert.deepEqual(directions['1.6'],[-165,-10,20,110]);
  applyPotTurnDrag(turns,directions,starts,40);
  assert.deepEqual(directions['1.6'],[-145,10,40,130], 'Every move uses pointer-down angles, without accumulating prior moves');
  row.updateMatrixWorld(true);
  turns.forEach(({pivot},i) => assert.ok(pivot.getWorldPosition(new THREE.Vector3()).distanceTo(positions[i])<1e-10));
  assert.deepEqual(directions['2.0'],[0,0,0,0]);
  // The identical drag code with a hit vessel leaves all partners unchanged.
  applyPotTurnDrag(turns,directions,[{index:1,angle:10}],15);
  assert.deepEqual(directions['1.6'],[-145,25,40,130]);
});
