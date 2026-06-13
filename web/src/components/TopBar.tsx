import type { Athlete } from "../types";

interface Props {
  athlete: Athlete | null;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}

export function TopBar({ athlete, syncing, onSync, onDisconnect }: Props) {
  const initial = (athlete?.firstname || "?")[0];
  const photo = athlete?.profile_medium;
  return (
    <div className="topbar">
      <div className="brand">
        🚲 <span>Velo</span>Garage
      </div>
      <div className="top-right">
        <button className={`sync${syncing ? " spin" : ""}`} onClick={onSync}>
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
