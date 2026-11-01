import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Consume pending drag deltas through the public controls API before placing
// a reset camera. Otherwise damping keeps rotating it after the reset click.
export function clearOrbitMomentum(controls: OrbitControls) {
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = damping;
}
