export const STUDIO_CAPACITIES = ["1.6", "2.0", "1.2", "145", "322", "322-1.0"] as const;
export type PaletteCapacity = typeof STUDIO_CAPACITIES[number];
export type ProductPalette = { bodyColor: string; lidColor: string };
export type CapacityPalettes = Record<PaletteCapacity, ProductPalette>;
export const CAPACITY_LABELS: Record<PaletteCapacity, string> = {
  "1.6": "319 1.6L", "2.0": "319 2.0L", "1.2": "318 1.2L",
  "145": "318 2.0L", "322": "322 1.3L", "322-1.0": "322 1.0L",
};
const PAIR_CAPACITIES = {
  "319": ["1.6", "2.0"], "318": ["1.2", "145"], "322": ["322-1.0", "322"],
} as const;
export function getPairCapacities(mode: "none" | keyof typeof PAIR_CAPACITIES): PaletteCapacity[] {
  return mode === "none" ? [] : [...PAIR_CAPACITIES[mode]];
}
export function createCapacityPalettes(bodyColor: string, lidColor: string): CapacityPalettes {
  return Object.fromEntries(STUDIO_CAPACITIES.map(capacity => [capacity, { bodyColor, lidColor }])) as CapacityPalettes;
}
export function setPaletteColor(palettes: CapacityPalettes, capacity: PaletteCapacity, field: keyof ProductPalette, color: string) {
  palettes[capacity][field] = color;
}
type PaletteOwner = { userData: Record<string, unknown> };
export function tagPaletteMaterial(material: PaletteOwner, capacity: PaletteCapacity) {
  material.userData.paletteCapacity = capacity;
}
export function getMaterialPalette(material: PaletteOwner, palettes: CapacityPalettes, fallback: PaletteCapacity): ProductPalette {
  const owner = material.userData.paletteCapacity as PaletteCapacity | undefined;
  return palettes[owner ?? fallback] ?? palettes[fallback];
}
