import { API } from "./api";
import { getToken, clearAuth } from "./auth";
import { MOCK, mockAthlete } from "./mock";
import type { Athlete } from "../types";

export async function fetchAthlete(): Promise<Athlete> {
  if (MOCK) return mockAthlete;

  const token = await getToken();
  if (!token) throw new Error("no_token");

  const r = await fetch(`${API}/api/strava/athlete`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!r.ok) throw new Error("fetch_failed");
  return r.json();
}
