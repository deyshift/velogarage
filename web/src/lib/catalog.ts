import type { ComponentType, LubeType } from "./garage";

export interface CatalogEntry {
  type: ComponentType;
  label: string;
  defaultKm: number; // default service interval, km
  hasLube?: boolean;
}

const MI = 1.609344; // km per mile

// --- Chain service intervals -------------------------------------------------
// Chain wear is what actually matters (replace ~0.5% for 11/12-spd), but riders
// can't measure that when adding a component, so we pre-fill a researched,
// attribute-aware mileage they can override. The dominant signal a rider knows
// up front is their lube (and, for hot wax, which Silca additive "chip" is in
// the pot), so the heuristic keys off those. Values are in miles — that's how
// the manufacturer/community guidance is published — and converted to km here.
//
// Sources (see README + PR):
// - Wax: Silca Secret Chain Blend hot-melt averages ~250–350 mi per application
//   (we use 320). https://silca.cc/products/secret-chain-wax-blend
// - Wax + EnduranceChip: Silca claims up to ~800 mi; we use a conservative 465.
// - Wax + SpeedChip: race-day additive, ~up to 200 km / 125 mi per Silca.
//   https://silca.cc/products/performance-chips
// - Dry lube: reapply every ~100–150 mi in dry conditions (we use 125).
// - Wet lube: 182 mi. Ceramic: long-life wet lube, ~405 mi (legacy 650 km).
export const LUBE_MI: Record<LubeType, number> = {
  wax: 320,
  dry: 125,
  wet: 182,
  ceramic: 405,
};

// Silca hot-wax additives. They're mutually exclusive (you drop one chip in the
// pot), so the form offers a single picker rather than two checkboxes. Only
// meaningful with `wax`; ignored for other lubes.
export type ChainAdditive = "none" | "endurance" | "speed";
const WAX_ADDITIVE_MI: Record<Exclude<ChainAdditive, "none">, number> = {
  endurance: 465,
  speed: 125,
};
export const ADDITIVE_LABEL: Record<ChainAdditive, string> = {
  none: "None",
  endurance: "Endurance chip",
  speed: "Speed chip",
};

// Smart default chain interval (km) from lube + optional wax additive.
export function chainIntervalKm(lube: LubeType, additive: ChainAdditive = "none"): number {
  const mi = lube === "wax" && additive !== "none" ? WAX_ADDITIVE_MI[additive] : LUBE_MI[lube];
  return mi * MI;
}

// Tires are tracked as a single combined "Tires" entry on a short
// inspect-and-inflate cadence (pressure bleeds off over ~a week of riding),
// not a replacement-mileage interval. 62 mi ≈ 100 km; we store the exact
// mile-equivalent so the default reads as "62 mi" (and "100 km"). Because this
// cadence is about checking pressure (independent of compound/use), tires don't
// take an attribute-aware replacement default — see #42 discussion / README.
const TIRE_INSPECT_KM = 62 * MI;

// Defaults from the README's interval table.
export const CATALOG: CatalogEntry[] = [
  { type: "chain", label: "Chain", defaultKm: chainIntervalKm("wax"), hasLube: true },
  { type: "cassette", label: "Cassette", defaultKm: 8000 },
  { type: "chainring", label: "Chainring", defaultKm: 15000 },
  { type: "tire", label: "Tires", defaultKm: TIRE_INSPECT_KM },
  { type: "brakePads", label: "Brake pads", defaultKm: 2000 },
  { type: "rotors", label: "Rotors", defaultKm: 10000 },
];

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
// their cadence is about checking pressure, not replacing rubber; chains get a
// clean-and-lube prompt since that's the actual wrenching task.
export function serviceActionLabel(type: ComponentType): string {
  if (type === "tire") return "Inspect and inflate tires";
  if (type === "chain") return "Clean & lube drivetrain";
  return "Reset";
}
