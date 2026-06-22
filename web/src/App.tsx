import { useEffect, useState, useCallback } from "react";
import type { Athlete, Bike, Session } from "./types";
import { loadAuth, saveAuth, clearAuth, sessionFromHash } from "./lib/auth";
import { fetchAthlete } from "./lib/strava";
import { Login } from "./components/Login";
import { TopBar } from "./components/TopBar";
import { Garage } from "./components/Garage";
import { BikeDetail } from "./components/BikeDetail";
import { Log } from "./components/Log";
import { Settings } from "./components/Settings";
import { GarageProvider } from "./GarageContext";

type View = "garage" | "log";

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!loadAuth());
  const [loginError, setLoginError] = useState<string | undefined>();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [bikes, setBikes] = useState<Bike[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openBike, setOpenBike] = useState<Bike | null>(null);
  const [view, setView] = useState<View>("garage");
  const [showSettings, setShowSettings] = useState(false);

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
    setShowSettings(false);
    setView("garage");
  };

  // Tapping a nav tab; the Garage tab also pops back to the bike list.
  const go = (v: View) => {
    if (v === "garage") setOpenBike(null);
    setView(v);
  };

  if (!authed) return <Login error={loginError} />;

  return (
    <GarageProvider>
      {showSettings ? (
        <Settings
          athlete={athlete}
          bikes={bikes}
          onDisconnect={disconnect}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <>
          <TopBar
            athlete={athlete}
            syncing={syncing}
            onSync={() => load(true)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <div className="screen">
            {view === "log" ? (
              <Log bikes={bikes} />
            ) : openBike ? (
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
          <nav className="bottom-nav" aria-label="Main">
            <button
              type="button"
              className={view === "garage" ? "on" : ""}
              aria-current={view === "garage" ? "page" : undefined}
              onClick={() => go("garage")}
            >
              🚲<span>Garage</span>
            </button>
            <button
              type="button"
              className={view === "log" ? "on" : ""}
              aria-current={view === "log" ? "page" : undefined}
              onClick={() => go("log")}
            >
              🔧<span>Log</span>
            </button>
          </nav>
        </>
      )}
    </GarageProvider>
  );
}
