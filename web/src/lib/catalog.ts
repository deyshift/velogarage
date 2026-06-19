import type { ComponentType, LubeType, TirePosition } from "./garage";

export interface CatalogEntry {
  type: ComponentType;
  label: string;
  defaultKm: number; // default service interval, km
  hasLube?: boolean;
}

// Defaults from the README's interval table.
export const CATALOG: CatalogEntry[] = [
  { type: "chain", label: "Chain", defaultKm: 400, hasLube: true },
  { type: "cassette", label: "Cassette", defaultKm: 8000 },
  { type: "chainring", label: "Chainring", defaultKm: 15000 },
  { type: "tire", label: "Tire", defaultKm: 3000 },
  { type: "brakePads", label: "Brake pads", defaultKm: 2000 },
  { type: "rotors", label: "Rotors", defaultKm: 10000 },
];

// Tire life varies hugely with compound, pressure and use, and no public
// per-brand data is reliable enough to derive an interval from. The rear
// tire wears roughly faster than the front (weight bias + drive torque), so
// we seed sensible position-based defaults and let the rider override.
export const TIRE_DEFAULT_KM: Record<TirePosition, number> = { front: 4000, rear: 3000 };

export const LUBE_KM: Record<LubeType, number> = { wax: 400, dry: 175, wet: 400, ceramic: 650 };
export const LUBE_LABEL: Record<LubeType, string> = {
  wax: "Wax",
  dry: "Dry lube",
  wet: "Wet lube",
  ceramic: "Ceramic",
};

export function catalogEntry(type: ComponentType): CatalogEntry {
  return CATALOG.find((c) => c.type === type) ?? CATALOG[0];
}
