import { useState } from "react";
import type { Bike } from "../types";
import { useGarage } from "../GarageContext";
import { BikeCard } from "./BikeCard";

interface Props {
  bikes: Bike[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (b: Bike) => void;
}

export function Garage({ bikes, loading, error, onRetry, onOpen }: Props) {
  const { garage, setBikeHidden } = useGarage();
  const [showHidden, setShowHidden] = useState(false);

  if (loading) {
    return (
      <div className="state">
        <div className="spinner" />
        Loading your garage…
        <br />
        <span className="hint">(first load can take ~30s while the server wakes up)</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="state">
        Couldn't load your bikes ({error}).
        <br />
        <button className="btn-ghost" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (!bikes || bikes.length === 0) {
    return (
      <div className="state">
        No bikes found on your Strava account.
        <br />
        Add a bike in Strava (Settings → My Gear), then sync.
        <br />
        <button className="btn-ghost" onClick={onRetry}>
          Refresh
        </button>
      </div>
    );
  }

  const hiddenIds = new Set(garage.hiddenBikeIds.map(String));
  const visible = bikes.filter((b) => !hiddenIds.has(String(b.id)));
  const hidden = bikes.filter((b) => hiddenIds.has(String(b.id)));

  const unhide = (b: Bike) => {
    setBikeHidden(b.id, false).catch(() => alert("Couldn't unhide that bike. Please try again."));
  };

  return (
    <>
      <div className="screen-label">
        My Garage · {visible.length} {visible.length === 1 ? "bike" : "bikes"}
      </div>

      {visible.length === 0 ? (
        <div className="empty-note">
          All your bikes are hidden. Unhide one below to start tracking it again.
        </div>
      ) : (
        visible.map((b) => <BikeCard key={b.id} bike={b} onClick={() => onOpen(b)} />)
      )}

      {hidden.length > 0 && (
        <div className="hidden-bikes">
          <button
            type="button"
            className="hidden-toggle"
            aria-expanded={showHidden}
            onClick={() => setShowHidden((v) => !v)}
          >
            <span>Hidden ({hidden.length})</span>
            <span className="hidden-chev">{showHidden ? "▴" : "▾"}</span>
          </button>
          {showHidden &&
            hidden.map((b) => (
              <div className="hidden-row" key={b.id}>
                <span className="hidden-name">{b.name || "Bike"}</span>
                <button type="button" className="edit-btn" onClick={() => unhide(b)}>
                  Unhide
                </button>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
