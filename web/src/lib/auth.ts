import { API } from "./api";
import type { Session } from "../types";

const LS = "velogarage_auth";

export const loginUrl = `${API}/api/auth/login`;

export function loadAuth(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(LS) || "null");
  } catch {
    return null;
  }
}

export function saveAuth(s: Session) {
  localStorage.setItem(LS, JSON.stringify(s));
}

export function clearAuth() {
  localStorage.removeItem(LS);
}

/** Read tokens the API placed in the URL fragment after an OAuth redirect. */
export function sessionFromHash(): Session | { error: string } | null {
  if (!location.hash || location.hash.length < 2) return null;
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get("error")) return { error: p.get("error")! };
  const access = p.get("access_token");
  if (!access) return null;
  return {
    access_token: access,
    refresh_token: p.get("refresh_token") || "",
    expires_at: Number(p.get("expires_at")),
    athlete_id: p.get("athlete_id") || undefined,
    athlete_name: p.get("athlete_name") || undefined,
    athlete_photo: p.get("athlete_photo") || undefined,
  };
}

/** Return a valid access token, refreshing it via the API if near expiry. */
export async function getToken(): Promise<string | null> {
  const stored = loadAuth();
  if (!stored?.access_token) return null;
  let auth: Session = stored;

  const now = Math.floor(Date.now() / 1000);
  if (auth.expires_at && now >= auth.expires_at - 300 && auth.refresh_token) {
    try {
      const r = await fetch(`${API}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: auth.refresh_token }),
      });
      if (r.ok) {
        const d = await r.json();
        auth = { ...auth, ...d };
        saveAuth(auth);
      }
    } catch {
      // network blip — fall back to the existing token
    }
  }
  return auth.access_token;
}
