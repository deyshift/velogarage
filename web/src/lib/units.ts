export type Units = "mi" | "km";

const LS = "velogarage_units";
const METERS_PER = { mi: 1609.344, km: 1000 } as const;

export function loadUnits(): Units {
  const v = localStorage.getItem(LS);
  return v === "km" || v === "mi" ? v : "mi"; // default to miles
}

export function saveUnits(u: Units) {
  localStorage.setItem(LS, u);
}

/** Strava distances are in meters; format to the chosen unit (number only). */
export function toDistance(meters: number | undefined, units: Units): string {
  return Math.round((meters || 0) / METERS_PER[units]).toLocaleString();
}
