import { useState } from "react";
import type { Athlete } from "../types";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";

interface Props {
  athlete: Athlete | null;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}

export function TopBar({ athlete, syncing, onSync, onDisconnect }: Props) {
  const { units, setUnits } = useUnits();
  const { garage, setBikeHidden } = useGarage();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (athlete?.firstname || "?")[0];
  const photo = athlete?.profile_medium;

  // Interim home for unhiding bikes until the Settings screen (#26) absorbs it.
  // Names come from the athlete's Strava gear; ids are matched against the
  // persisted hidden set.
  const hiddenIds = new Set(garage.hiddenBikeIds.map(String));
  const hidden = (athlete?.bikes || []).filter((b) => hiddenIds.has(String(b.id)));

  const unhide = (bikeId: string) => {
    setBikeHidden(bikeId, false).catch(() =>
      alert("Couldn't unhide that bike. Please try again."),
    );
  };

  return (
    <div className="topbar">
      <div className="brand">
        🚲 <span>Velo</span>Garage
      </div>
      <div className="top-right">
        <div className="units" role="group" aria-label="Distance units">
          <button
            type="button"
            className={units === "mi" ? "on" : ""}
            aria-pressed={units === "mi"}
            onClick={() => setUnits("mi")}
          >
            mi
          </button>
          <button
            type="button"
            className={units === "km" ? "on" : ""}
            aria-pressed={units === "km"}
            onClick={() => setUnits("km")}
          >
            km
          </button>
        </div>
        {hidden.length > 0 && (
          <div className="hidden-menu">
            <button
              type="button"
              className="hidden-menu-btn"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={`Hidden bikes (${hidden.length})`}
              onClick={() => setMenuOpen((v) => !v)}
            >
              🚲<span className="hidden-count">{hidden.length}</span>
            </button>
            {menuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="hidden-menu-panel">
                  <div className="hidden-menu-title">Hidden bikes</div>
                  {hidden.map((b) => (
                    <div className="hidden-menu-row" key={b.id}>
                      <span className="hidden-menu-name">{b.name || "Bike"}</span>
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => unhide(String(b.id))}
                      >
                        Unhide
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          className={`sync${syncing ? " spin" : ""}`}
          onClick={onSync}
          aria-label="Sync"
        >
          <span className="dot" />
          {syncing ? "Syncing…" : "Sync"}
        </button>
        {photo && photo !== "None" ? (
          <img className="avatar" src={photo} alt="" onClick={onDisconnect} />
        ) : (
          <div className="avatar avatar-fallback" onClick={onDisconnect}>
            {initial}
          </div>
        )}
      </div>
    </div>
  );
}
