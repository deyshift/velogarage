import { useEffect, useRef, useState } from "react";
import {
  ADDITIVE_LABEL,
  CATALOG,
  LUBE_LABEL,
  additiveFromLabel,
  catalogEntry,
  chainIntervalKm,
  componentLabel,
  isTimeBased,
  type ChainAdditive,
} from "../lib/catalog";
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

const MS_PER_DAY = 86_400_000;

// Parse a free-text numeric input; blank/invalid -> 0.
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

// Whole days since an ISO timestamp (0 if unset, unparseable, or in the future).
const daysSince = (iso?: string) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / MS_PER_DAY));
};

export function ComponentForm({ bikeId, bikeMeters, initial, onSubmit, onCancel }: Props) {
  const { units } = useUnits();
  const isEdit = !!initial;

  const [type, setType] = useState<ComponentType>(initial?.type ?? "chain");
  const [lube, setLube] = useState<LubeType>(initial?.lube ?? "wax");
  // Wax-only additive; drives the pre-filled interval but isn't persisted (the
  // resulting interval is). On edit, recover it from the saved label so we don't
  // silently strip the chip from the label on save.
  const [additive, setAdditive] = useState<ChainAdditive>(() => additiveFromLabel(initial?.label));
  const [brand, setBrand] = useState<string>(initial?.brand ?? "");
  const [psiFront, setPsiFront] = useState<string>(
    initial?.psiFront != null ? String(initial.psiFront) : "",
  );
  const [psiRear, setPsiRear] = useState<string>(
    initial?.psiRear != null ? String(initial.psiRear) : "",
  );
  // Strings so the fields can be cleared/edited freely. For time-based
  // components the interval is in days; otherwise it's in the current distance
  // unit. Likewise `wear` is "days since last done" vs. "distance ridden".
  const [interval, setInterval] = useState<string>(() => {
    if (initial?.intervalDays != null) return String(initial.intervalDays);
    return String(
      Math.round(fromMeters((initial?.intervalMeters ?? chainIntervalKm("wax") * 1000) || 0, units)),
    );
  });
  const [wear, setWear] = useState<string>(() => {
    if (!initial) return "";
    if (initial.intervalDays != null) return String(daysSince(initial.installDate));
    return String(Math.round(fromMeters(Math.max(0, bikeMeters - initial.installMeters), units)));
  });
  const [saving, setSaving] = useState(false);

  const timeBased = isTimeBased(type);

  // Convert the typed values if the mi/km toggle changes while the form is open.
  // Time-based fields are in days, so they're left untouched.
  const prevUnits = useRef(units);
  useEffect(() => {
    const prev = prevUnits.current;
    if (prev === units) return;
    prevUnits.current = units;
    if (timeBased) return;
    const convert = (s: string) =>
      s.trim() === "" ? "" : String(Math.round(fromMeters(toMeters(num(s), prev), units)));
    setInterval(convert);
    setWear(convert);
  }, [units, timeBased]);

  const entry = catalogEntry(type);
  const isTire = type === "tire";

  const defaultIntervalFor = (t: ComponentType, l: LubeType, a: ChainAdditive) => {
    const e = catalogEntry(t);
    if (e.defaultDays != null) return String(e.defaultDays);
    const kmVal = e.hasLube ? chainIntervalKm(l, a) : (e.defaultKm ?? 0);
    return String(Math.round(fromMeters(kmVal * 1000, units)));
  };

  const changeType = (t: ComponentType) => {
    setType(t);
    setInterval(defaultIntervalFor(t, lube, additive)); // add mode only (type is locked when editing)
  };
  const changeLube = (l: LubeType) => {
    // Additives only apply to hot wax; drop the chip when leaving wax.
    const a = l === "wax" ? additive : "none";
    setLube(l);
    setAdditive(a);
    if (!isEdit) setInterval(defaultIntervalFor(type, l, a)); // don't clobber a custom interval on edit
  };
  const changeAdditive = (a: ChainAdditive) => {
    setAdditive(a);
    if (!isEdit) setInterval(defaultIntervalFor(type, lube, a));
  };

  async function submit() {
    setSaving(true);
    try {
      if (timeBased) {
        // Back-date the install so "wear" days ago reads as the last service.
        // Clamp to >= 0 so a stray negative can't push the date into the future.
        const daysAgo = Math.max(0, num(wear));
        const installDate = new Date(Date.now() - daysAgo * MS_PER_DAY).toISOString();
        await onSubmit({
          bikeId,
          type,
          label: componentLabel(type),
          installMeters: bikeMeters,
          intervalMeters: 0,
          intervalDays: num(interval),
          installDate,
        });
      } else {
        await onSubmit({
          bikeId,
          type,
          label: componentLabel(type, entry.hasLube ? lube : undefined, additive),
          lube: entry.hasLube ? lube : undefined,
          brand: brand.trim() ? brand.trim() : undefined,
          psiFront: isTire && num(psiFront) > 0 ? num(psiFront) : undefined,
          psiRear: isTire && num(psiRear) > 0 ? num(psiRear) : undefined,
          installMeters: Math.max(0, bikeMeters - toMeters(num(wear), units)),
          intervalMeters: toMeters(num(interval), units),
        });
      }
    } finally {
      setSaving(false);
    }
  }

  const intervalUnit = timeBased ? "days" : units;
  const wearLabel = timeBased
    ? "Days since last done"
    : isEdit
      ? `Current wear (${units})`
      : `Already ridden (${units})`;

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

      {entry.hasLube && lube === "wax" && (
        <div className="form-row">
          <label>Wax additive</label>
          <select value={additive} onChange={(e) => changeAdditive(e.target.value as ChainAdditive)}>
            {(Object.keys(ADDITIVE_LABEL) as ChainAdditive[]).map((a) => (
              <option key={a} value={a}>
                {ADDITIVE_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
      )}

      {!timeBased && (
        <div className="form-row">
          <label>Brand / model</label>
          <input
            type="text"
            placeholder={isTire ? "e.g. Continental GP5000" : "optional, e.g. Shimano XT"}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>
      )}

      {isTire && (
        <div className="form-row">
          <label>Target PSI</label>
          <div className="form-pair">
            <input
              type="number"
              inputMode="numeric"
              placeholder="front"
              aria-label="Front PSI"
              value={psiFront}
              onChange={(e) => setPsiFront(e.target.value)}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder="rear"
              aria-label="Rear PSI"
              value={psiRear}
              onChange={(e) => setPsiRear(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="form-row">
        <label>Service interval ({intervalUnit})</label>
        <input
          type="number"
          inputMode="numeric"
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
        />
      </div>

      <div className="form-row">
        <label>{wearLabel}</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={wear}
          onChange={(e) => setWear(e.target.value)}
        />
        {isEdit && (
          <div className="form-hint">
            {timeBased
              ? "Set to 0 to reset (just done today)."
              : "Set to 0 to reset (e.g. freshly waxed)."}
          </div>
        )}
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
