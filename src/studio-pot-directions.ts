import * as THREE from "three";
import { STUDIO_CAPACITIES, type PaletteCapacity } from "./studio-palettes.ts";

export type PotDirectionKey = { capacity: PaletteCapacity; slot: number };
export type PotDirections = Record<PaletteCapacity, number[]>;
export type PotTurntable = { key: PotDirectionKey; pivot: THREE.Group };

export function createPotDirections(): PotDirections {
  return Object.fromEntries(STUDIO_CAPACITIES.map(capacity => [capacity, [0, 0, 0, 0]])) as PotDirections;
}

export function normalizePotAngle(degrees: number) {
  const angle = ((degrees + 180) % 360 + 360) % 360 - 180;
  return angle === -180 && degrees > 0 ? 180 : angle;
}

// Wrap only after all products are cloned and placed. At zero yaw, attach()
// preserves their complete world transforms, scan geometry and artwork UVs.
// The body carrier gives the real vessel axis, excluding the handle/spout.
export function attachPotTurntables(group: THREE.Group, keys: PotDirectionKey[], directions: PotDirections): PotTurntable[] {
  group.updateWorldMatrix(true, true);
  return [...group.children].map((product, index) => {
    const key = keys[index];
    let body: THREE.Object3D | undefined;
    product.traverse(object => {
      if (!body && object instanceof THREE.Mesh && object.name.startsWith("BODY_PRINT")) body = object;
    });
    const axis = new THREE.Box3().setFromObject(body ?? product).getCenter(new THREE.Vector3());
    group.worldToLocal(axis);
    const pivot = new THREE.Group();
    pivot.name = `POT_DIRECTION_${index}`;
    pivot.userData.potDirectionIndex = index;
    pivot.position.set(axis.x, 0, axis.z);
    group.add(pivot);
    pivot.attach(product);
    pivot.rotation.y = THREE.MathUtils.degToRad(directions[key.capacity][key.slot]);
    return { key, pivot };
  });
}

export function setPotDirection(turntables: PotTurntable[], directions: PotDirections, key: PotDirectionKey, degrees: number) {
  const angle = normalizePotAngle(degrees);
  directions[key.capacity][key.slot] = angle;
  const target = turntables.find(item => item.key.capacity === key.capacity && item.key.slot === key.slot);
  if (target) target.pivot.rotation.y = THREE.MathUtils.degToRad(angle);
}

export function directionIndexForObject(object: THREE.Object3D): number | null {
  let target: THREE.Object3D | null = object;
  while (target) {
    if (!target.visible) return null;
    if (typeof target.userData.potDirectionIndex === "number") return target.userData.potDirectionIndex;
    target = target.parent;
  }
  return null;
}
