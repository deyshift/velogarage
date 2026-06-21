import type { ComponentType, LubeType } from "./garage";

export interface CatalogEntry {
  type: ComponentType;
  label: string;
  defaultKm?: number; // default service interval, km (distance-based)
  defaultDays?: number; // default service interval, days (time-based)
  hasLube?: boolean;
  // Seeded automatically per bike (whole-bike maintenance reminders).
  autoAdd?: boolean;
}

// Tires are tracked as a single combined entry on a short inspect-and-inflate
// cadence (pressure bleeds off over ~a week of riding), not a
// replacement-mileage interval. 62 mi ≈ 100 km; we store the exact
// mile-equivalent so the default reads as "62 mi" (and "100 km").
const TIRE_INSPECT_KM = 62 * 1.609344;

// Labels are phrased as the maintenance action ("Clean & lube/wax drivetrain",
// "Inflate and Inspect Tires") rather than the bare part name, so each row
// reads as the task to perform.
export const CATALOG: CatalogEntry[] = [
  { type: "chain", label: "Clean & lube/wax drivetrain", defaultKm: 400, hasLube: true },
  { type: "cassette", label: "Cassette", defaultKm: 8000 },
  { type: "chainring", label: "Chainring", defaultKm: 15000 },
  { type: "tire", label: "Inflate and Inspect Tires", defaultKm: TIRE_INSPECT_KM },
  { type: "brakePads", label: "Brake pads", defaultKm: 2000 },
  { type: "rotors", label: "Rotors", defaultKm: 10000 },
  // Whole-bike, calendar-based reminders, seeded automatically for each bike.
  { type: "torque", label: "Check and torque bolts", defaultDays: 180, autoAdd: true },
  { type: "inspection", label: "Yearly inspection and service", defaultDays: 365, autoAdd: true },
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

/** Whether a component type is tracked on a calendar (days) cadence. */
export function isTimeBased(type: ComponentType): boolean {
  return catalogEntry(type).defaultDays != null;
}

// The recurring service action shown on the detail "do it" button. Tires get an
// inspect-and-inflate prompt; time-based reminders just get marked done.
export function serviceActionLabel(type: ComponentType): string {
  if (type === "tire") return "Inspect and inflate tires";
  if (isTimeBased(type)) return "Mark done";
  return "Reset";
}
