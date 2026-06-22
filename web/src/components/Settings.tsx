import { useEffect, useState } from "react";
import type { Athlete, Bike } from "../types";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";
import {
  CATALOG,
  LUBE_LABEL,
  catalogEntry,
  chainIntervalKm,
  defaultInterval,
  isTimeBased,
} from "../lib/catalog";
import type { ComponentType, GarageSettings, LubeType } from "../lib/garage";
import { fromMeters, toMeters } from "../lib/units";
import type { Units } from "../lib/units";

interface Props {
  athlete: Athlete | null;
  bikes: Bike[] | null;
  onDisconnect: () => void;
  onClose: () => void;
}

const LUBES = Object.keys(LUBE_LABEL) as LubeType[];
// Distance-based components a rider sets defaults for; the chain is handled
// separately (per-lube) and the time-based reminders get their own section.
const DISTANCE_TYPES = CATALOG.filter((e) => e.type !== "chain" && !isTimeBased(e.type));
const TIME_TYPES = CATALOG.filter((e) => isTimeBased(e.type));

// Parse a free-text numeric input; blank/invalid -> 0.
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

// Round a meters value to whole units, the precision the inputs edit in. Used
// to compare an edited value against the catalog default so we only persist a
// genuine override.
const showDist = (meters: number, units: Units) => Math.round(fromMeters(meters, units));

// Draft is keyed by component type, with chain split into one key per lube
// (`chain:wax`, …). Distance values are in the rider's current unit; time
// values are in days.
type Draft = Record<string, string>;

function seedDraft(settings: GarageSettings, units: Units): Draft {
  const d: Draft = {};
  for (const lube of LUBES) {
    d[`chain:${lube}`] = String(showDist(defaultInterval("chain", settings, lube, "none"), units));
  }
  for (const e of DISTANCE_TYPES) {
    d[e.type] = String(showDist(defaultInterval(e.type, settings), units));
  }
  for (const e of TIME_TYPES) {
    d[e.type] = String(defaultInterval(e.type, settings));
  }
  return d;
}

// Build the persisted settings from the draft, keeping only values that differ
// from the catalog default so catalog improvements still reach uncustomized
// types (and the stored doc stays minimal).
function buildSettings(draft: Draft, units: Units): GarageSettings {
  const intervals: Partial<Record<ComponentType, number>> = {};
  const chainIntervals: Partial<Record<LubeType, number>> = {};

  for (const lube of LUBES) {
    const v = num(draft[`chain:${lube}`]);
    if (v <= 0) continue;
    const catalog = chainIntervalKm(lube, "none") * 1000;
    if (showDist(toMeters(v, units), units) !== showDist(catalog, units)) {
      chainIntervals[lube] = toMeters(v, units);
    }
  }
  for (const e of DISTANCE_TYPES) {
    const v = num(draft[e.type]);
    if (v <= 0) continue;
    const catalog = (e.defaultKm ?? 0) * 1000;
    if (showDist(toMeters(v, units), units) !== showDist(catalog, units)) {
      intervals[e.type] = toMeters(v, units);
    }
  }
  for (const e of TIME_TYPES) {
    const v = num(draft[e.type]);
    if (v <= 0) continue;
    if (v !== e.defaultDays) intervals[e.type] = v;
  }

  const out: GarageSettings = {};
  if (Object.keys(intervals).length) out.intervals = intervals;
  if (Object.keys(chainIntervals).length) out.chainIntervals = chainIntervals;
  return out;
}

export function Settings({ athlete, bikes, onDisconnect, onClose }: Props) {
  const { units, setUnits } = useUnits();
  const { garage, updateSettings, setBikeHidden } = useGarage();

  // Seed the editable defaults from persisted settings; re-seed when those or
  // the unit toggle change so the inputs always show the live effective values.
  const [draft, setDraft] = useState<Draft>(() => seedDraft(garage.settings, units));
  useEffect(() => {
    setDraft(seedDraft(garage.settings, units));
  }, [garage.settings, units]);

  // Commit on blur: rebuild the full settings from the draft and persist only
  // if something actually changed (avoids redundant network writes).
  const commit = () => {
    const next = buildSettings(draft, units);
    if (JSON.stringify(next) === JSON.stringify(garage.settings)) return;
    updateSettings(next).catch(() => alert("Couldn't save defaults. Please try again."));
  };

  const setField = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const resetDefaults = () => {
    if (Object.keys(garage.settings).length === 0) return;
    if (!confirm("Reset all service-interval defaults to the recommended values?")) return;
    updateSettings({}).catch(() => alert("Couldn't reset defaults. Please try again."));
  };

  const hiddenIds = new Set(garage.hiddenBikeIds.map(String));
  const hidden = (bikes || []).filter((b) => hiddenIds.has(String(b.id)));
  const unhide = (bikeId: string) =>
    setBikeHidden(bikeId, false).catch(() => alert("Couldn't unhide that bike. Please try again."));

  const photo = athlete?.profile_medium;
  const hasPhoto = photo && photo !== "None";
  const name = [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ") || "Strava athlete";

  const distLabel = `interval (${units})`;

  return (
    <div className="screen settings">
      <div className="detail-head">
        <button type="button" className="back" onClick={onClose} aria-label="Back">
          ←
        </button>
        <div className="detail-name">Settings</div>
      </div>

      {/* Account */}
      <div className="settings-section">
        <div className="settings-title">Account</div>
        <div className="settings-account">
          {hasPhoto ? (
            <img className="avatar" src={photo} alt="" />
          ) : (
            <div className="avatar avatar-fallback">{(athlete?.firstname || "?")[0]}</div>
          )}
          <div className="settings-name">{name}</div>
          <button type="button" className="btn-danger" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      {/* Units */}
      <div className="settings-section">
        <div className="settings-title">Units</div>
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
      </div>

      {/* Default service intervals */}
      <div className="settings-section">
        <div className="settings-title">Default service intervals</div>
        <div className="settings-hint">
          Newly-added components start from these. The chain's default depends on the lube you pick.
        </div>

        <div className="settings-subtitle">Drivetrain (by lube)</div>
        {LUBES.map((lube) => (
          <div className="form-row settings-field" key={lube}>
            <label htmlFor={`def-chain-${lube}`}>
              {LUBE_LABEL[lube]} <span className="settings-unit">{distLabel}</span>
            </label>
            <input
              id={`def-chain-${lube}`}
              type="number"
              inputMode="numeric"
              value={draft[`chain:${lube}`] ?? ""}
              onChange={(e) => setField(`chain:${lube}`, e.target.value)}
              onBlur={commit}
            />
          </div>
        ))}

        {DISTANCE_TYPES.map((e) => (
          <div className="form-row settings-field" key={e.type}>
            <label htmlFor={`def-${e.type}`}>
              {catalogEntry(e.type).label} <span className="settings-unit">{distLabel}</span>
            </label>
            <input
              id={`def-${e.type}`}
              type="number"
              inputMode="numeric"
              value={draft[e.type] ?? ""}
              onChange={(e2) => setField(e.type, e2.target.value)}
              onBlur={commit}
            />
          </div>
        ))}

        {TIME_TYPES.map((e) => (
          <div className="form-row settings-field" key={e.type}>
            <label htmlFor={`def-${e.type}`}>
              {catalogEntry(e.type).label} <span className="settings-unit">interval (days)</span>
            </label>
            <input
              id={`def-${e.type}`}
              type="number"
              inputMode="numeric"
              value={draft[e.type] ?? ""}
              onChange={(e2) => setField(e.type, e2.target.value)}
              onBlur={commit}
            />
          </div>
        ))}

        <button type="button" className="btn-ghost settings-reset" onClick={resetDefaults}>
          Reset to recommended
        </button>
      </div>

      {/* Hidden bikes */}
      <div className="settings-section">
        <div className="settings-title">Hidden bikes</div>
        {hidden.length === 0 ? (
          <div className="settings-hint">
            No hidden bikes. Hide a bike from its detail page to keep it out of your garage.
          </div>
        ) : (
          hidden.map((b) => (
            <div className="settings-row" key={b.id}>
              <span className="settings-row-name">{b.name || "Bike"}</span>
              <button type="button" className="edit-btn" onClick={() => unhide(String(b.id))}>
                Unhide
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
