import { API } from "./api";
import { getToken } from "./auth";

export type ComponentType =
  | "chain"
  | "cassette"
  | "chainring"
  | "tire"
  | "brakePads"
  | "rotors";

export type TirePosition = "front" | "rear";

export type LubeType = "wax" | "dry" | "wet" | "ceramic";

export interface Component {
  id: string;
  bikeId: string;
  type: ComponentType;
  label: string;
  lube?: LubeType;
  position?: TirePosition; // tires: front/rear
  brand?: string; // tires: brand/model, free text
  psi?: number; // tires: target pressure
  installMeters: number; // bike lifetime distance at install / last service
  intervalMeters: number; // service interval
}

/**
 * Bring a stored component up to the current model. The old fixed `frontTire`/
 * `rearTire` types become a single `tire` type carrying a `position`, so
 * previously-saved garages keep working (and upgrade on the next save).
 */
function migrateComponent(c: Component): Component {
  // `type` is parsed JSON; legacy tire values predate the unified `tire` type.
  const legacy = c.type as string;
  if (legacy === "frontTire" || legacy === "rearTire") {
    const position: TirePosition = legacy === "frontTire" ? "front" : "rear";
    return { ...c, type: "tire", position, label: tireLabel(position) };
  }
  return c;
}

/** Canonical display label for a tire by position. */
export function tireLabel(position: TirePosition): string {
  return position === "front" ? "Front tire" : "Rear tire";
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
  const components = (data.components ?? []).map(migrateComponent);
  return { components, log: data.log ?? [] };
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

export function computeWear(component: Component, bikeMeters: number): Wear {
  const wearMeters = Math.max(0, bikeMeters - component.installMeters);
  const pct = component.intervalMeters > 0 ? wearMeters / component.intervalMeters : 0;
  const status: Status = pct >= 1 ? "over" : pct >= 0.8 ? "warn" : "good";
  return { wearMeters, pct, status };
}

/** Worst status among a set of components, for the garage list badge. */
export function worstStatus(components: Component[], bikeMeters: number): Status | null {
  let worst: Status | null = null;
  const rank = { good: 0, warn: 1, over: 2 } as const;
  for (const c of components) {
    const s = computeWear(c, bikeMeters).status;
    if (worst === null || rank[s] > rank[worst]) worst = s;
  }
  return worst;
}
