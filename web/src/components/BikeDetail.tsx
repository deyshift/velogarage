import { useState } from "react";
import type { Bike } from "../types";
import type { Component } from "../lib/garage";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";
import { ComponentRow } from "./ComponentRow";
import { ComponentForm } from "./ComponentForm";
import { ComponentDetail } from "./ComponentDetail";

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
  } = useGarage();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const bikeId = String(bike.id);
  const components = garage.components.filter((c) => String(c.bikeId) === bikeId);
  const storageDown = error?.includes("503");

  // The open component is derived from live state so resets/edits reflect
  // immediately; if it's been deleted, fall back to the component list.
  const openComponent = openId ? components.find((c) => c.id === openId) ?? null : null;

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

  // Like guard, but rethrows after alerting so the detail view can keep its
  // editor open / notes dirty for a retry instead of silently swallowing.
  const reportingSave = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      saveError(e);
      throw e;
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
        // These alert and reject on failure so the detail view can keep the
        // editor open / notes dirty for a retry.
        onSaveSettings={(patch) => reportingSave(() => updateComponent(openComponent.id, patch))}
        onSaveNotes={(notes) =>
          reportingSave(() => updateComponent(openComponent.id, { notes: notes || undefined }))
        }
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
        <button type="button" className="back" aria-label="Back" onClick={onBack}>
          ‹
        </button>
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
    </>
  );
}
