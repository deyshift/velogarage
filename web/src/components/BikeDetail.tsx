import { useState } from "react";
import type { Bike } from "../types";
import type { Component, LogEntry } from "../lib/garage";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";
import { ComponentRow } from "./ComponentRow";
import { ComponentForm } from "./ComponentForm";
import { ComponentDetail } from "./ComponentDetail";

// How many recent service entries to show inline per bike; the full,
// cross-bike history lives in the Log tab.
const LOG_CAP = 10;

// A human label for a calendar day, used to group the inline service log.
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function BikeDetail({ bike, onBack }: { bike: Bike; onBack: () => void }) {
  const { units, dist } = useUnits();
  const {
    garage,
    loading,
    error,
    addComponent,
    updateComponent,
    serviceComponent,
    removeComponent,
    removeLogEntry,
  } = useGarage();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const bikeId = String(bike.id);
  const components = garage.components.filter((c) => String(c.bikeId) === bikeId);
  const storageDown = error?.includes("503");

  // The open component is derived from live state so resets/edits reflect
  // immediately; if it's been deleted, fall back to the component list.
  const openComponent = openId ? components.find((c) => c.id === openId) ?? null : null;

  // Bike's service log, newest first, grouped by day and capped inline.
  const bikeLog = garage.log
    .filter((l) => String(l.bikeId) === bikeId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const shown = bikeLog.slice(0, LOG_CAP);
  const groups: { label: string; items: LogEntry[] }[] = [];
  for (const l of shown) {
    const label = dayLabel(l.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(l);
    else groups.push({ label, items: [l] });
  }

  const saveError = (e: unknown) => {
    const m = e instanceof Error ? e.message : String(e);
    const status = m.match(/_(\d{3})\b/)?.[1];
    if (status === "503") {
      alert("Storage isn't configured on the server yet — your changes can't be saved.");
    } else {
      alert(`Couldn't save${status ? ` (HTTP ${status})` : ""}. Please try again.`);
    }
  };

  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      saveError(e);
    }
  };

  // Add shares the form; only close it once the save actually succeeds.
  const onAdd = async (c: Omit<Component, "id">) => {
    try {
      await addComponent(c);
      setAdding(false);
    } catch (e) {
      saveError(e);
    }
  };

  if (openComponent) {
    return (
      <ComponentDetail
        component={openComponent}
        bikeMeters={bike.distance}
        onBack={() => setOpenId(null)}
        onReset={() =>
          guard(() =>
            serviceComponent(openComponent.id, bike.distance, `${openComponent.label} serviced`),
          )
        }
        // These reject on failure so the detail view can keep the editor open.
        onSaveSettings={(patch) => updateComponent(openComponent.id, patch)}
        onSaveNotes={(notes) => updateComponent(openComponent.id, { notes: notes || undefined })}
        onDelete={() => {
          setOpenId(null);
          guard(() => removeComponent(openComponent.id));
        }}
      />
    );
  }

  return (
    <>
      <div className="detail-head">
        <div className="back" onClick={onBack}>
          ‹
        </div>
        <div>
          <div className="detail-name">{bike.name || "Bike"}</div>
          <div className="detail-dist">
            {dist(bike.distance)} {units} total
          </div>
        </div>
      </div>

      {storageDown && (
        <div className="err" style={{ marginBottom: 14 }}>
          Storage isn't configured yet, so changes won't save. Add the Upstash keys to the API.
        </div>
      )}

      {adding ? (
        <ComponentForm
          bikeId={bikeId}
          bikeMeters={bike.distance}
          onSubmit={onAdd}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="btn-add" onClick={() => setAdding(true)}>
          + Add component
        </button>
      )}

      {loading && <div className="state">Loading components…</div>}

      {!loading && components.length === 0 && !adding && (
        <div className="empty-note">
          No components yet. Add your chain, tires, cassette, etc. to start tracking wear from this
          bike's mileage.
        </div>
      )}

      {components.map((c) => (
        <ComponentRow
          key={c.id}
          component={c}
          bikeMeters={bike.distance}
          onOpen={() => setOpenId(c.id)}
        />
      ))}

      {bikeLog.length > 0 && (
        <>
          <div className="screen-label" style={{ marginTop: 24 }}>
            Service log
          </div>
          {groups.map((g) => (
            <div className="log-group" key={g.label}>
              <div className="log-day">{g.label}</div>
              {g.items.map((l) => (
                <div className="log-item" key={l.id}>
                  <div className="log-ic">🔧</div>
                  <div className="log-main">
                    <div className="log-title">{l.label}</div>
                    <div className="log-sub">
                      at {dist(l.atMeters)} {units}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rm-btn"
                    aria-label="Delete log entry"
                    onClick={() => {
                      if (confirm("Delete this log entry?")) guard(() => removeLogEntry(l.id));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ))}
          {bikeLog.length > LOG_CAP && (
            <div className="log-more">
              +{bikeLog.length - LOG_CAP} more · see the full history in the Log tab
            </div>
          )}
        </>
      )}
    </>
  );
}
