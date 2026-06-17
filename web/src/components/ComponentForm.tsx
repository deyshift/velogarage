import { useEffect, useRef, useState } from "react";
import { CATALOG, LUBE_KM, LUBE_LABEL, catalogEntry } from "../lib/catalog";
import type { Component, ComponentType, LubeType } from "../lib/garage";
import { useUnits } from "../UnitsContext";
import { fromMeters, toMeters } from "../lib/units";

interface Props {
  bikeId: string;
  bikeMeters: number;
  initial?: Component; // present = edit mode
  onSubmit: (fields: Omit<Component, "id">) => Promise<void>;
  onCancel: () => void;
}

// Parse a free-text numeric input; blank/invalid -> 0.
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export function ComponentForm({ bikeId, bikeMeters, initial, onSubmit, onCancel }: Props) {
  const { units } = useUnits();
  const isEdit = !!initial;

  const [type, setType] = useState<ComponentType>(initial?.type ?? "chain");
  const [lube, setLube] = useState<LubeType>(initial?.lube ?? "wax");
  // Strings so the fields can be cleared/edited freely.
  const [interval, setInterval] = useState<string>(() =>
    String(Math.round(fromMeters((initial?.intervalMeters ?? 400 * 1000) || 0, units))),
  );
  const [wear, setWear] = useState<string>(() =>
    initial ? String(Math.round(fromMeters(Math.max(0, bikeMeters - initial.installMeters), units))) : "",
  );
  const [saving, setSaving] = useState(false);

  // Convert the typed values if the mi/km toggle changes while the form is open.
  const prevUnits = useRef(units);
  useEffect(() => {
    const prev = prevUnits.current;
    if (prev === units) return;
    const convert = (s: string) =>
      s.trim() === "" ? "" : String(Math.round(fromMeters(toMeters(num(s), prev), units)));
    setInterval(convert);
    setWear(convert);
    prevUnits.current = units;
  }, [units]);

  const entry = catalogEntry(type);

  const defaultIntervalFor = (t: ComponentType, l: LubeType) => {
    const e = catalogEntry(t);
    const kmVal = e.hasLube ? LUBE_KM[l] : e.defaultKm;
    return String(Math.round(fromMeters(kmVal * 1000, units)));
  };

  const changeType = (t: ComponentType) => {
    setType(t);
    setInterval(defaultIntervalFor(t, lube)); // add mode only (type is locked when editing)
  };
  const changeLube = (l: LubeType) => {
    setLube(l);
    if (!isEdit) setInterval(defaultIntervalFor(type, l)); // don't clobber a custom interval on edit
  };

  async function submit() {
    setSaving(true);
    const label = entry.hasLube ? `${entry.label} (${LUBE_LABEL[lube]})` : entry.label;
    try {
      await onSubmit({
        bikeId,
        type,
        label,
        lube: entry.hasLube ? lube : undefined,
        installMeters: Math.max(0, bikeMeters - toMeters(num(wear), units)),
        intervalMeters: toMeters(num(interval), units),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form">
      <div className="form-title">{isEdit ? "Edit component" : "Add component"}</div>

      <div className="form-row">
        <label>Component</label>
        <select
          value={type}
          disabled={isEdit}
          onChange={(e) => changeType(e.target.value as ComponentType)}
        >
          {CATALOG.map((c) => (
            <option key={c.type} value={c.type}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {entry.hasLube && (
        <div className="form-row">
          <label>Lube</label>
          <select value={lube} onChange={(e) => changeLube(e.target.value as LubeType)}>
            {(Object.keys(LUBE_LABEL) as LubeType[]).map((l) => (
              <option key={l} value={l}>
                {LUBE_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-row">
        <label>Service interval ({units})</label>
        <input
          type="number"
          inputMode="numeric"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>{isEdit ? `Current wear (${units})` : `Already ridden (${units})`}</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={wear}
          onChange={(e) => setWear(e.target.value)}
        />
        {isEdit && <div className="form-hint">Set to 0 to reset (e.g. freshly waxed).</div>}
      </div>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={saving || num(interval) <= 0}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add component"}
        </button>
      </div>
    </div>
  );
}
