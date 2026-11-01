import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clearOrbitMomentum } from '../src/studio-view-controls.ts';

test('a frontal camera reset stays frontal even while a damped turn is pending', () => {
  const camera = new THREE.PerspectiveCamera();
  const frontal = new THREE.Vector3(0, 1, 6);
  camera.position.copy(frontal);
  const controls = new OrbitControls(camera);
  controls.enableDamping = true;
  // Auto-rotation produces the same pending angular delta through the public
  // API, allowing this race to be tested without private controls properties.
  controls.autoRotate = true;
  controls.update(1 / 60);
  controls.autoRotate = false;
  camera.position.copy(frontal);
  controls.update();
  assert.ok(Math.abs(camera.position.x) > 0.00001, 'Placing the camera alone does not clear pending rotation');
  clearOrbitMomentum(controls);
  camera.position.copy(frontal);
  for (let frame = 0; frame < 30; frame++) controls.update(1 / 60);
  assert.ok(camera.position.distanceTo(frontal) < 1e-10, 'No drift after reset/front-view');
  assert.equal(controls.enableDamping, true, 'Keep smooth manual orbit available');
  controls.enableDamping = false;
  clearOrbitMomentum(controls);
  assert.equal(controls.enableDamping, false);
});
