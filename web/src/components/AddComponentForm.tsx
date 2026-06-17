import { useEffect, useRef, useState } from "react";
import { CATALOG, LUBE_KM, LUBE_LABEL, catalogEntry } from "../lib/catalog";
import type { Component, ComponentType, LubeType } from "../lib/garage";
import { useUnits } from "../UnitsContext";
import { fromMeters, toMeters } from "../lib/units";

interface Props {
  bikeId: string;
  bikeMeters: number;
  onAdd: (c: Omit<Component, "id">) => Promise<void>;
  onCancel: () => void;
}

// Parse a free-text numeric input; blank/invalid -> 0.
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export function AddComponentForm({ bikeId, bikeMeters, onAdd, onCancel }: Props) {
  const { units } = useUnits();
  const [type, setType] = useState<ComponentType>("chain");
  const [lube, setLube] = useState<LubeType>("wax");
  // Kept as strings so the fields can be cleared/edited freely (a numeric 0
  // value can't be backspaced away on a controlled number input).
  const [interval, setInterval] = useState<string>(() =>
    String(Math.round(fromMeters(400 * 1000, units))),
  );
  const [alreadyRidden, setAlreadyRidden] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // If the units toggle changes while the form is open, convert the typed
  // values to the new unit so submit() (which reads the current unit) is correct.
  const prevUnits = useRef(units);
  useEffect(() => {
    const prev = prevUnits.current;
    if (prev === units) return;
    const convert = (s: string) =>
      s.trim() === "" ? "" : String(Math.round(fromMeters(toMeters(num(s), prev), units)));
    setInterval(convert);
    setAlreadyRidden(convert);
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
    setInterval(defaultIntervalFor(t, lube));
  };
  const changeLube = (l: LubeType) => {
    setLube(l);
    setInterval(defaultIntervalFor(type, l));
  };

  async function submit() {
    setSaving(true);
    const label = entry.hasLube ? `${entry.label} (${LUBE_LABEL[lube]})` : entry.label;
    try {
      await onAdd({
        bikeId,
        type,
        label,
        lube: entry.hasLube ? lube : undefined,
        installMeters: Math.max(0, bikeMeters - toMeters(num(alreadyRidden), units)),
        intervalMeters: toMeters(num(interval), units),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form">
      <div className="form-row">
        <label>Component</label>
        <select value={type} onChange={(e) => changeType(e.target.value as ComponentType)}>
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
        <label>Already ridden ({units})</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={alreadyRidden}
          onChange={(e) => setAlreadyRidden(e.target.value)}
        />
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
          {saving ? "Adding…" : "Add component"}
        </button>
      </div>
    </div>
  );
}
