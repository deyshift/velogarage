import type { ComponentType, LubeType } from "./garage";

export interface CatalogEntry {
  type: ComponentType;
  label: string;
  defaultKm: number; // default service interval, km
  hasLube?: boolean;
}

// Tires are tracked as a single combined "Tires" entry on a short
// inspect-and-inflate cadence (pressure bleeds off over ~a week of riding),
// not a replacement-mileage interval. 62 mi ≈ 100 km; we store the exact
// mile-equivalent so the default reads as "62 mi" (and "100 km").
const TIRE_INSPECT_KM = 62 * 1.609344;

// Defaults from the README's interval table.
export const CATALOG: CatalogEntry[] = [
  { type: "chain", label: "Chain", defaultKm: 400, hasLube: true },
  { type: "cassette", label: "Cassette", defaultKm: 8000 },
  { type: "chainring", label: "Chainring", defaultKm: 15000 },
  { type: "tire", label: "Tires", defaultKm: TIRE_INSPECT_KM },
  { type: "brakePads", label: "Brake pads", defaultKm: 2000 },
  { type: "rotors", label: "Rotors", defaultKm: 10000 },
];

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

// The recurring service action. Tires get an inspect-and-inflate prompt since
// their cadence is about checking pressure, not replacing rubber.
export function serviceActionLabel(type: ComponentType): string {
  return type === "tire" ? "Inspect and inflate tires" : "Reset";
}
