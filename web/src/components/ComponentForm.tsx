import { useEffect, useRef, useState } from "react";
import { CATALOG, LUBE_KM, LUBE_LABEL, TIRE_DEFAULT_KM, catalogEntry } from "../lib/catalog";
import type { Component, ComponentType, LubeType, TirePosition } from "../lib/garage";
import { tireLabel } from "../lib/garage";
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
  const [position, setPosition] = useState<TirePosition>(initial?.position ?? "rear");
  const [brand, setBrand] = useState<string>(initial?.brand ?? "");
  const [psi, setPsi] = useState<string>(initial?.psi != null ? String(initial.psi) : "");
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
  const isTire = type === "tire";

  const defaultIntervalFor = (t: ComponentType, l: LubeType, pos: TirePosition) => {
    const e = catalogEntry(t);
    const kmVal = t === "tire" ? TIRE_DEFAULT_KM[pos] : e.hasLube ? LUBE_KM[l] : e.defaultKm;
    return String(Math.round(fromMeters(kmVal * 1000, units)));
  };

  const changeType = (t: ComponentType) => {
    setType(t);
    setInterval(defaultIntervalFor(t, lube, position)); // add mode only (type is locked when editing)
  };
  const changeLube = (l: LubeType) => {
    setLube(l);
    if (!isEdit) setInterval(defaultIntervalFor(type, l, position)); // don't clobber a custom interval on edit
  };
  const changePosition = (p: TirePosition) => {
    setPosition(p);
    if (!isEdit) setInterval(defaultIntervalFor("tire", lube, p));
  };

  async function submit() {
    setSaving(true);
    const label = isTire
      ? tireLabel(position)
      : entry.hasLube
        ? `${entry.label} (${LUBE_LABEL[lube]})`
        : entry.label;
    try {
      await onSubmit({
        bikeId,
        type,
        label,
        lube: entry.hasLube ? lube : undefined,
        position: isTire ? position : undefined,
        brand: isTire && brand.trim() ? brand.trim() : undefined,
        psi: isTire && num(psi) > 0 ? num(psi) : undefined,
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

      {isTire && (
        <>
          <div className="form-row">
            <label>Position</label>
            <select
              value={position}
              onChange={(e) => changePosition(e.target.value as TirePosition)}
            >
              <option value="front">Front</option>
              <option value="rear">Rear</option>
            </select>
          </div>
          <div className="form-row">
            <label>Brand / model</label>
            <input
              type="text"
              placeholder="e.g. Continental GP5000"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Target PSI</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="optional"
              value={psi}
              onChange={(e) => setPsi(e.target.value)}
            />
          </div>
        </>
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
