// Local mock mode: lets `npm run mock` (vite --mode mock) serve the full app
// on localhost with fake Strava data, so the UI can be exercised without the
// OAuth round-trip or the live API. Enabled only when VITE_MOCK=1 (see
// .env.mock); in a normal build MOCK is a constant false and every guarded
// branch below is dead-code-eliminated.
import type { Athlete, Bike, Session } from "../types";
import type { Garage } from "./garage";
import { saveAuth } from "./auth";

export const MOCK = import.meta.env.VITE_MOCK === "1";

const bikes: Bike[] = [
  { id: "mock-1", name: "Canyon Endurace CF", distance: 4_820_000, primary: true },
  { id: "mock-2", name: "Specialized Chisel", distance: 2_140_000, primary: false },
];

export const mockAthlete: Athlete = {
  firstname: "Dev",
  lastname: "Rider",
  bikes,
};

// A far-future expiry so getToken() never attempts a network refresh.
const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_at: 4_102_444_800, // 2100-01-01
};

// Stand in for the OAuth redirect: persist a fake session and reload into the
// authenticated app. Disconnecting in Settings clears it and returns to login.
export function mockSignIn(): void {
  saveAuth(mockSession);
  location.reload();
}

// The mock garage is kept in localStorage so edits (adding components, hiding
// bikes, changing defaults) persist across reloads like the real backend.
const GARAGE_LS = "velogarage_mock_garage";

export function loadMockGarage(): Garage {
  try {
    const raw = localStorage.getItem(GARAGE_LS);
    if (raw) return JSON.parse(raw) as Garage;
  } catch {
    // fall through to an empty garage
  }
  return { components: [], log: [], hiddenBikeIds: [], seededBikes: {}, settings: {} };
}

export function saveMockGarage(g: Garage): void {
  try {
    localStorage.setItem(GARAGE_LS, JSON.stringify(g));
  } catch {
    // storage unavailable — edits just won't persist this session
  }
}
