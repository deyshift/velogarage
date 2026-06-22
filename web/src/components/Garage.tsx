import type { Bike } from "../types";
import { useGarage } from "../GarageContext";
import { useUnits } from "../UnitsContext";
import { computeWear } from "../lib/garage";
import { BikeCard } from "./BikeCard";

interface Props {
  bikes: Bike[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (b: Bike) => void;
}

export function Garage({ bikes, loading, error, onRetry, onOpen }: Props) {
  const { garage } = useGarage();
  const { units, dist } = useUnits();

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

  // Garage-wide totals for the summary header: combined distance and how many
  // components across all visible bikes are overdue vs. coming due soon.
  const totalMeters = visible.reduce((sum, b) => sum + (b.distance || 0), 0);
  let overdue = 0;
  let soon = 0;
  for (const b of visible) {
    for (const c of garage.components) {
      if (String(c.bikeId) !== String(b.id)) continue;
      const s = computeWear(c, b.distance, units).status;
      if (s === "over") overdue++;
      else if (s === "warn") soon++;
    }
  }

  const serviceLine =
    overdue && soon
      ? `${overdue} overdue · ${soon} due soon`
      : overdue
        ? `${overdue} ${overdue === 1 ? "service" : "services"} overdue`
        : soon
          ? `${soon} ${soon === 1 ? "service" : "services"} due soon`
          : "All up to date";
  const serviceClass = overdue ? "gs-over" : soon ? "gs-soon" : "gs-good";

  return (
    <>
      <div className="screen-label">My Garage</div>

      {visible.length === 0 ? (
        <div className="empty-note">
          All your bikes are hidden. Open Settings (tap your avatar) to unhide one.
        </div>
      ) : (
        <>
          <div className="garage-summary">
            <div className="gs-totals">
              {visible.length} {visible.length === 1 ? "bike" : "bikes"} · {dist(totalMeters)}{" "}
              {units}
            </div>
            <div className={`gs-services ${serviceClass}`}>{serviceLine}</div>
          </div>
          {visible.map((b) => (
            <BikeCard key={b.id} bike={b} onClick={() => onOpen(b)} />
          ))}
        </>
      )}
    </>
  );
}
