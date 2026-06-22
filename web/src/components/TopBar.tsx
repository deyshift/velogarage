import type { Athlete } from "../types";
import { useUnits } from "../UnitsContext";

interface Props {
  athlete: Athlete | null;
  syncing: boolean;
  onSync: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ athlete, syncing, onSync, onOpenSettings }: Props) {
  const { units, setUnits } = useUnits();
  const initial = (athlete?.firstname || "?")[0];
  const photo = athlete?.profile_medium;

  return (
    <div className="topbar">
      <div className="brand">
        <span>Velo</span>Garage
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
        <button
          type="button"
          className={`sync${syncing ? " spin" : ""}`}
          onClick={onSync}
          aria-label="Sync"
        >
          <span className="dot" />
          {syncing ? "Syncing…" : "Sync"}
        </button>
        {/* The avatar opens Settings (account, defaults, hidden bikes). A real
            button keeps it keyboard- and assistive-tech-reachable. */}
        <button
          type="button"
          className="avatar-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          {photo && photo !== "None" ? (
            <img className="avatar" src={photo} alt="" />
          ) : (
            <span className="avatar avatar-fallback">{initial}</span>
          )}
        </button>
      </div>
    </div>
  );
}
