import { API } from "./api";
import { getToken } from "./auth";
import { additiveFromLabel, componentLabel, defaultIntervalDays, isHybrid } from "./catalog";
import { type Units, fromMeters } from "./units";

export type ComponentType =
  | "chain"
  | "cassette"
  | "chainring"
  | "tire"
  | "brakePads"
  | "rotors"
  // Electronic (Di2) drivetrain maintenance. The main/derailleur battery is
  // recharged on a mileage cadence; the shifter coin cells are checked on a
  // calendar cadence. Both are opt-in (not auto-seeded) — see CATALOG.
  | "di2Battery"
  | "di2Shifter"
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

// Rider-set default service intervals that seed ComponentForm for newly-added
// components (and the auto-added frame reminders), overriding the researched
// catalog defaults. Distance-based types are stored in meters; time-based types
// (torque, inspection) in days. The chain keeps per-lube defaults in
// `chainIntervals` instead of a single value. Only values that differ from the
// catalog default are stored, so future catalog improvements still reach riders
// who never customized a given type. See `defaultInterval` in catalog.ts.
export interface GarageSettings {
  intervals?: Partial<Record<ComponentType, number>>;
  chainIntervals?: Partial<Record<LubeType, number>>;
}

export interface Garage {
  components: Component[];
  log: LogEntry[];
  // Strava gear ids the rider has hidden from the garage (e.g. a bike-share
  // bike that doesn't need maintenance tracking). Hidden bikes can be unhidden.
  hiddenBikeIds: string[];
  // Map of bike id -> the catalog SEED_VERSION its automatic components were
  // seeded at, so a default the rider deletes doesn't reappear on the next visit
  // while a bike seeded under an older catalog still picks up newly-added
  // defaults exactly once. (Legacy data stored this as a string[] of seeded bike
  // ids; see `normalizeSeeded`.)
  seededBikes: Record<string, number>;
  // Rider-edited default service intervals (see GarageSettings).
  settings: GarageSettings;
}

export const emptyGarage = (): Garage => ({
  components: [],
  log: [],
  hiddenBikeIds: [],
  seededBikes: {},
  settings: {},
});

// `seededBikes` used to be a string[] of bike ids that had been seeded with the
// (then only) frame reminders; it's now a map of bike id -> seed version. A
// legacy array migrates to version 1 (the version that seeded only the torque
// and annual-service reminders), so those bikes still pick up the newer wear-part
// defaults once on their next visit.
function normalizeSeeded(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  // Skip prototype-polluting keys so a crafted stored id can't mutate the map's
  // prototype when these are later spread/read.
  const set = (key: string, raw: unknown) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return;
    const num = Number(raw);
    if (Number.isFinite(num)) out[key] = num;
  };
  if (Array.isArray(v)) {
    for (const id of v) set(String(id), 1);
  } else if (v && typeof v === "object") {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) set(String(k), n);
  }
  return out;
}

// Bring stored components up to date with the current catalog/shape:
//  - Labels are derived from the component type (and lube), not user-editable,
//    so always refresh them. This picks up renames like "Chain (Wax)" → "Clean
//    & wax drivetrain" and "Tires" → "Inflate and Inspect Tires".
//  - Older tires stored a single `psi`; carry it onto both front and rear so
//    existing garages keep showing a pressure after the split.
function migrateComponent(c: Component & { psi?: number }): Component {
  const out: Component & { psi?: number } = {
    ...c,
    // Re-derive the label, preserving the wax additive chip encoded in the old
    // label so a chain's chip (and thus its interval rationale) survives.
    label: componentLabel(c.type, c.lube, additiveFromLabel(c.label)),
  };
  if (out.type === "tire" && out.psi != null && out.psiFront == null && out.psiRear == null) {
    out.psiFront = out.psi;
    out.psiRear = out.psi;
  }
  // Retrofit tires stored before they gained a calendar cadence (#78) with the
  // catalog default day interval, so they now come due on days as well as miles.
  // We don't fabricate an `installDate`: the calendar timer stays dormant (see
  // computeWear) until the tire is next serviced, so an upgrade never fires a
  // spurious "overdue" for a bike the rider hasn't touched in a week.
  if (isHybrid(out.type) && out.intervalDays == null) {
    out.intervalDays = defaultIntervalDays(out.type);
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
    hiddenBikeIds: (data.hiddenBikeIds ?? []).map(String),
    seededBikes: normalizeSeeded(data.seededBikes),
    settings: data.settings ?? {},
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
  timeBased: boolean; // true when the cadence is *purely* calendar-based
  hybrid: boolean; // true when both a mileage and a calendar cadence apply (tires)
  wearMeters: number; // distance-based progress (0 for pure time-based)
  elapsedDays: number; // time-based progress (0 for pure distance-based)
  distancePct: number; // 0..(>1) on the mileage side (0 when no distance cadence)
  timePct: number; // 0..(>1) on the calendar side (0 when no calendar cadence)
  pct: number; // overall progress that drives the bar — the worse of the two
  status: Status;
}

const MS_PER_DAY = 86_400_000;

export function computeWear(
  component: Component,
  bikeMeters: number,
  units: Units,
  now: number = Date.now(),
): Wear {
  const hasTime = component.intervalDays != null;

  // --- Calendar side (inert for pure distance components) ---
  let elapsedDays = 0;
  let timePct = 0;
  let timeOver = false;
  if (hasTime) {
    const interval = component.intervalDays as number;
    // A missing or unparseable install date falls back to "now" (0 days
    // elapsed) so a corrupt value can't poison the status with NaN. For a tire
    // migrated from before it had a calendar cadence this means the timer stays
    // dormant until the tire is next serviced (which stamps `installDate`).
    const parsed = component.installDate ? new Date(component.installDate).getTime() : now;
    const start = Number.isFinite(parsed) ? parsed : now;
    elapsedDays = Math.max(0, Math.floor((now - start) / MS_PER_DAY));
    timePct = interval > 0 ? elapsedDays / interval : 0;
    timeOver = interval > 0 && elapsedDays >= interval;
  }

  // --- Mileage side (inert for pure time-based reminders, whose interval is 0) ---
  const interval = component.intervalMeters;
  const wearMeters = Math.max(0, bikeMeters - component.installMeters);
  const distancePct = interval > 0 ? wearMeters / interval : 0;
  // Judge "overdue" at the precision the UI shows (whole mi/km): a component
  // displayed as "62 / 62" should read as overdue (red), not "service soon"
  // (yellow), even though its raw ratio is a hair under 1 from rounding.
  const wearShown = Math.round(fromMeters(wearMeters, units));
  const intervalShown = Math.round(fromMeters(interval, units));
  const distOver =
    interval > 0 && (distancePct >= 1 || (intervalShown > 0 && wearShown >= intervalShown));

  const hasDist = interval > 0;
  const hybrid = hasTime && hasDist;
  const timeBased = hasTime && !hasDist;

  // Either cadence coming due drives the status; the bar tracks whichever is
  // further along.
  const over = distOver || timeOver;
  const pct = Math.max(distancePct, timePct);
  const status: Status = over ? "over" : pct >= 0.8 ? "warn" : "good";
  return { timeBased, hybrid, wearMeters, elapsedDays, distancePct, timePct, pct, status };
}

/**
 * The progress line shown under a component — "12 / 62 mi" for a wear part,
 * "2 / 30 days" for a calendar reminder, or both joined for a hybrid tire
 * ("12 / 62 mi · 2 / 4 days"). `dist` formats meters into the caller's unit.
 */
export function wearMeta(
  component: Component,
  wear: Wear,
  dist: (meters: number) => string,
  units: Units,
): string {
  const distPart = `${dist(wear.wearMeters)} / ${dist(component.intervalMeters)} ${units}`;
  const timePart = `${wear.elapsedDays} / ${component.intervalDays} days`;
  if (wear.hybrid) return `${distPart} · ${timePart}`;
  return wear.timeBased ? timePart : distPart;
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
