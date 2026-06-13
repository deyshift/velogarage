export type Units = "mi" | "km";

const LS = "velogarage_units";
const METERS_PER = { mi: 1609.344, km: 1000 } as const;

export function loadUnits(): Units {
  try {
    const v = localStorage.getItem(LS);
    return v === "km" || v === "mi" ? v : "mi"; // default to miles
  } catch {
    return "mi"; // storage unavailable (private mode, disabled) — use default
  }
}

export function saveUnits(u: Units) {
  try {
    localStorage.setItem(LS, u);
  } catch {
    // storage unavailable / quota — preference just won't persist this session
  }
}

/** Strava distances are in meters; format to the chosen unit (number only). */
export function toDistance(meters: number | undefined, units: Units): string {
  return Math.round((meters || 0) / METERS_PER[units]).toLocaleString();
}
