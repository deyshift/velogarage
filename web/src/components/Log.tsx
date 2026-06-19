import { useMemo, useState } from "react";
import type { Bike } from "../types";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";

export function Log({ bikes }: { bikes: Bike[] | null }) {
  const { units, dist } = useUnits();
  const { garage, loading, removeLogEntry } = useGarage();
  const [bikeFilter, setBikeFilter] = useState<string>("all");

  // Map bikeId -> name so cross-bike entries are readable.
  const bikeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of bikes || []) m.set(String(b.id), b.name || "Bike");
    return m;
  }, [bikes]);

  // Newest first. Entries are prepended on service, but sort defensively.
  const entries = useMemo(() => {
    const all = garage.log
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return bikeFilter === "all" ? all : all.filter((l) => String(l.bikeId) === bikeFilter);
  }, [garage.log, bikeFilter]);

  const onDelete = (id: string) => {
    if (!confirm("Delete this log entry?")) return;
    // removeLogEntry rejects with `garage_save_<status>`; surface the same
    // context BikeDetail does (503 = storage not configured, else HTTP code).
    removeLogEntry(id).catch((e) => {
      const m = e instanceof Error ? e.message : String(e);
      const status = m.match(/_(\d{3})\b/)?.[1];
      if (status === "503") {
        alert("Storage isn't configured on the server yet — your changes can't be saved.");
      } else {
        alert(`Couldn't delete${status ? ` (HTTP ${status})` : ""}. Please try again.`);
      }
    });
  };

  return (
    <>
      <div className="log-head">
        <div className="screen-label" style={{ margin: 0 }}>
          Service history
        </div>
        {(bikes?.length ?? 0) > 1 && garage.log.length > 0 && (
          <select
            className="log-filter"
            value={bikeFilter}
            onChange={(e) => setBikeFilter(e.target.value)}
            aria-label="Filter by bike"
          >
            <option value="all">All bikes</option>
            {bikes!.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name || "Bike"}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <div className="state">Loading service history…</div>}

      {!loading && entries.length === 0 && (
        <div className="empty-note">
          {garage.log.length === 0
            ? "No service logged yet. Log service on a component to start building your history."
            : "No service entries for this bike yet."}
        </div>
      )}

      {entries.map((l) => (
        <div className="log-item" key={l.id}>
          <div className="log-ic">🔧</div>
          <div className="log-main">
            <div className="log-title">{l.label}</div>
            <div className="log-sub">
              {bikeName.get(String(l.bikeId)) || "Unknown bike"} · at {dist(l.atMeters)} {units}
            </div>
          </div>
          <div className="log-when">{new Date(l.date).toLocaleDateString()}</div>
          <button
            type="button"
            className="rm-btn"
            aria-label="Delete log entry"
            onClick={() => onDelete(l.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}
