import { API } from "./api";
import { getToken } from "./auth";
import { type Units, fromMeters } from "./units";

export type ComponentType =
  | "chain"
  | "cassette"
  | "chainring"
  | "tire"
  | "brakePads"
  | "rotors";

export type LubeType = "wax" | "dry" | "wet" | "ceramic";

export interface Component {
  id: string;
  bikeId: string;
  type: ComponentType;
  label: string;
  lube?: LubeType;
  brand?: string; // tires: brand/model, free text
  psi?: number; // tires: target pressure
  notes?: string; // rider's free-text notes, edited in the component detail view
  installMeters: number; // bike lifetime distance at install / last service
  intervalMeters: number; // service interval
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
}

export const emptyGarage = (): Garage => ({ components: [], log: [] });

export async function getGarage(): Promise<Garage> {
  const token = await getToken();
  if (!token) throw new Error("no_token");
  const r = await fetch(`${API}/api/garage`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`garage_load_${r.status}`);
  const data = await r.json();
  return { components: data.components ?? [], log: data.log ?? [] };
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
  wearMeters: number;
  pct: number; // 0..(>1)
  status: Status;
}

export function computeWear(component: Component, bikeMeters: number, units: Units): Wear {
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
  return { wearMeters, pct, status };
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
