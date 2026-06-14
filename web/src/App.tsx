import { useEffect, useState, useCallback } from "react";
import type { Athlete, Bike, Session } from "./types";
import { loadAuth, saveAuth, clearAuth, sessionFromHash } from "./lib/auth";
import { fetchAthlete } from "./lib/strava";
import { Login } from "./components/Login";
import { TopBar } from "./components/TopBar";
import { Garage } from "./components/Garage";
import { BikeDetail } from "./components/BikeDetail";
import { GarageProvider } from "./GarageContext";

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!loadAuth());
  const [loginError, setLoginError] = useState<string | undefined>();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [bikes, setBikes] = useState<Bike[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBike, setOpenBike] = useState<Bike | null>(null);

  // Capture tokens the API left in the URL fragment after the OAuth redirect.
  useEffect(() => {
    const h = sessionFromHash();
    if (h && "error" in h) {
      setLoginError(h.error);
    } else if (h) {
      saveAuth(h as Session);
      setAuthed(true);
    }
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }, []);

  const load = useCallback(async (isSync: boolean) => {
    if (isSync) setSyncing(true);
    else setLoading((prev) => prev || bikes === null);
    setError(null);
    try {
      const a = await fetchAthlete();
      setAthlete(a);
      const list = (a.bikes || [])
        .slice()
        .sort((x, y) => Number(y.primary) - Number(x.primary) || y.distance - x.distance);
      setBikes(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg === "unauthorized" || msg === "no_token") setAuthed(false);
      else setError(msg);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [bikes]);

  useEffect(() => {
    if (authed) load(false);
    // load only when auth state flips; sync is manual afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const disconnect = () => {
    if (!confirm("Disconnect from Strava?")) return;
    clearAuth();
    setAuthed(false);
    setAthlete(null);
    setBikes(null);
    setOpenBike(null);
  };

  if (!authed) return <Login error={loginError} />;

  return (
    <GarageProvider>
      <TopBar
        athlete={athlete}
        syncing={syncing}
        onSync={() => load(true)}
        onDisconnect={disconnect}
      />
      <div className="screen">
        {openBike ? (
          <BikeDetail bike={openBike} onBack={() => setOpenBike(null)} />
        ) : (
          <Garage
            bikes={bikes}
            loading={loading}
            error={error}
            onRetry={() => load(true)}
            onOpen={setOpenBike}
          />
        )}
      </div>
    </GarageProvider>
  );
}
