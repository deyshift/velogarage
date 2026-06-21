import { API } from "./api";
import { getToken } from "./auth";
import { componentLabel } from "./catalog";
import { type Units, fromMeters } from "./units";

export type ComponentType =
  | "chain"
  | "cassette"
  | "chainring"
  | "tire"
  | "brakePads"
  | "rotors"
  // Whole-bike / frame reminders tracked on a calendar (days) cadence rather
  // than mileage — see CATALOG entries with `defaultDays`.
  | "torque"
  | "inspection";

export type LubeType = "wax" | "dry" | "wet" | "ceramic";

export interface Component {
  id: string;
  bikeId: string;
  type: ComponentType;
  label: string;
  lube?: LubeType;
  brand?: string; // tires: brand/model, free text
  psiFront?: number; // tires: target front pressure
  psiRear?: number; // tires: target rear pressure
  notes?: string; // rider's free-text notes, edited in the component detail view
  installMeters: number; // bike lifetime distance at install / last service
  intervalMeters: number; // service interval
  // Time-based reminders (e.g. torque check, annual service) track a calendar
  // cadence instead of mileage. When `intervalDays` is set the component is
  // time-based: progress is measured in days since `installDate`, and the
  // meters fields are unused.
  intervalDays?: number; // service interval in days
  installDate?: string; // ISO timestamp of last service / install
}

export interface LogEntry {
  id: string;
  bikeId: string;
  componentId?: string;
  label: string;
  atMeters: number; // bike odometer at time of service
  date: string; // ISO timestamp
}

export interface Garage {
  components: Component[];
  log: LogEntry[];
  // Bike ids whose automatic frame reminders have already been seeded, so a
  // reminder the rider deletes doesn't reappear on the next visit.
  seededBikes: string[];
}

export const emptyGarage = (): Garage => ({ components: [], log: [], seededBikes: [] });

// Bring stored components up to date with the current catalog/shape:
//  - Labels are derived from the component type (and lube), not user-editable,
//    so always refresh them. This picks up renames like "Chain (Wax)" → "Clean
//    & wax drivetrain" and "Tires" → "Inflate and Inspect Tires".
//  - Older tires stored a single `psi`; carry it onto both front and rear so
//    existing garages keep showing a pressure after the split.
function migrateComponent(c: Component & { psi?: number }): Component {
  const out: Component & { psi?: number } = { ...c, label: componentLabel(c.type, c.lube) };
  if (out.type === "tire" && out.psi != null && out.psiFront == null && out.psiRear == null) {
    out.psiFront = out.psi;
    out.psiRear = out.psi;
  }
  delete out.psi;
  return out;
}

export async function getGarage(): Promise<Garage> {
  const token = await getToken();
  if (!token) throw new Error("no_token");
  const r = await fetch(`${API}/api/garage`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`garage_load_${r.status}`);
  const data = await r.json();
  return {
    components: (data.components ?? []).map(migrateComponent),
    log: data.log ?? [],
    seededBikes: data.seededBikes ?? [],
  };
}

/** Short front/rear PSI summary for a tire, or null if neither is set. */
export function psiSummary(c: Component): string | null {
  const { psiFront: f, psiRear: r } = c;
  if (f != null && r != null) return f === r ? `${f} PSI` : `${f}/${r} PSI`;
  if (f != null) return `${f} PSI front`;
  if (r != null) return `${r} PSI rear`;
  return null;
}

export async function putGarage(g: Garage): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("no_token");
  const r = await fetch(`${API}/api/garage`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(g),
  });
  if (!r.ok) throw new Error(`garage_save_${r.status}`);
}

export type Status = "good" | "warn" | "over";

export interface Wear {
  timeBased: boolean;
  wearMeters: number; // distance-based progress (0 for time-based)
  elapsedDays: number; // time-based progress (0 for distance-based)
  pct: number; // 0..(>1)
  status: Status;
}

const MS_PER_DAY = 86_400_000;

export function computeWear(
  component: Component,
  bikeMeters: number,
  units: Units,
  now: number = Date.now(),
): Wear {
  // Time-based reminder: measure whole days since the last service.
  if (component.intervalDays != null) {
    const interval = component.intervalDays;
    // A missing or unparseable install date falls back to "now" (0 days
    // elapsed) so a corrupt value can't poison the status with NaN.
    const parsed = component.installDate ? new Date(component.installDate).getTime() : now;
    const start = Number.isFinite(parsed) ? parsed : now;
    const elapsedDays = Math.max(0, Math.floor((now - start) / MS_PER_DAY));
    const pct = interval > 0 ? elapsedDays / interval : 0;
    const over = interval > 0 && elapsedDays >= interval;
    const status: Status = over ? "over" : pct >= 0.8 ? "warn" : "good";
    return { timeBased: true, wearMeters: 0, elapsedDays, pct, status };
  }

  const interval = component.intervalMeters;
  const wearMeters = Math.max(0, bikeMeters - component.installMeters);
  const pct = interval > 0 ? wearMeters / interval : 0;
  // Judge "overdue" at the precision the UI shows (whole mi/km): a component
  // displayed as "62 / 62" should read as overdue (red), not "service soon"
  // (yellow), even though its raw ratio is a hair under 1 from rounding.
  const wearShown = Math.round(fromMeters(wearMeters, units));
  const intervalShown = Math.round(fromMeters(interval, units));
  const over = interval > 0 && (pct >= 1 || (intervalShown > 0 && wearShown >= intervalShown));
  const status: Status = over ? "over" : pct >= 0.8 ? "warn" : "good";
  return { timeBased: false, wearMeters, elapsedDays: 0, pct, status };
}

/** Worst status among a set of components, for the garage list badge. */
export function worstStatus(
  components: Component[],
  bikeMeters: number,
  units: Units,
): Status | null {
  let worst: Status | null = null;
  const rank = { good: 0, warn: 1, over: 2 } as const;
  for (const c of components) {
    const s = computeWear(c, bikeMeters, units).status;
    if (worst === null || rank[s] > rank[worst]) worst = s;
  }
  return worst;
}
