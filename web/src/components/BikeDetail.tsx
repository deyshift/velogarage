import { useState } from "react";
import type { Bike } from "../types";
import type { Component } from "../lib/garage";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";
import { ComponentRow } from "./ComponentRow";
import { ComponentForm } from "./ComponentForm";

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
  const [editing, setEditing] = useState<Component | null>(null);

  const bikeId = String(bike.id);
  const components = garage.components.filter((c) => String(c.bikeId) === bikeId);
  const recent = garage.log.filter((l) => String(l.bikeId) === bikeId).slice(0, 12);
  const storageDown = error?.includes("503");

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

  // Add/edit share the form; only close it once the save actually succeeds.
  const onAdd = async (c: Omit<Component, "id">) => {
    try {
      await addComponent(c);
      setAdding(false);
    } catch (e) {
      saveError(e);
    }
  };
  const onEditSave = async (c: Omit<Component, "id">) => {
    if (!editing) return;
    try {
      await updateComponent(editing.id, c);
      setEditing(null);
    } catch (e) {
      saveError(e);
    }
  };

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

      {/* Edit takes over the form area when a component is being edited. */}
      {editing ? (
        <ComponentForm
          bikeId={bikeId}
          bikeMeters={bike.distance}
          initial={editing}
          onSubmit={onEditSave}
          onCancel={() => setEditing(null)}
        />
      ) : adding ? (
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

      {!loading && components.length === 0 && !adding && !editing && (
        <div className="empty-note">
          No components yet. Add your chain, tires, cassette, etc. to start tracking wear from this
          bike's mileage.
        </div>
      )}

      {!editing &&
        components.map((c) => (
          <ComponentRow
            key={c.id}
            component={c}
            bikeMeters={bike.distance}
            onService={() =>
              guard(() => serviceComponent(c.id, bike.distance, `${c.label} serviced`))
            }
            onEdit={() => {
              setAdding(false);
              setEditing(c);
            }}
            onRemove={() => {
              if (confirm(`Remove ${c.label}?`)) guard(() => removeComponent(c.id));
            }}
          />
        ))}

      {!editing && recent.length > 0 && (
        <>
          <div className="screen-label" style={{ marginTop: 24 }}>
            Service log
          </div>
          {recent.map((l) => (
            <div className="log-item" key={l.id}>
              <div className="log-ic">🔧</div>
              <div className="log-main">
                <div className="log-title">{l.label}</div>
                <div className="log-sub">
                  at {dist(l.atMeters)} {units}
                </div>
              </div>
              <div className="log-when">{new Date(l.date).toLocaleDateString()}</div>
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
        </>
      )}
    </>
  );
}
