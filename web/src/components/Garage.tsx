import type { Bike } from "../types";
import { BikeCard } from "./BikeCard";

interface Props {
  bikes: Bike[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (b: Bike) => void;
}

export function Garage({ bikes, loading, error, onRetry, onOpen }: Props) {
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
  return (
    <>
      <div className="screen-label">
        My Garage · {bikes.length} {bikes.length === 1 ? "bike" : "bikes"}
      </div>
      {bikes.map((b) => (
        <BikeCard key={b.id} bike={b} onClick={() => onOpen(b)} />
      ))}
    </>
  );
}
