import { useState } from "react";
import { type Component, type Status, computeWear } from "../lib/garage";
import { LUBE_LABEL } from "../lib/catalog";
import { useUnits } from "../UnitsContext";
import { ComponentForm } from "./ComponentForm";

const STATUS: Record<Status, { cls: string; bar: string; txt: string }> = {
  good: { cls: "s-good", bar: "var(--green)", txt: "✓ Good" },
  warn: { cls: "s-warn", bar: "var(--amber)", txt: "⏱ Due soon" },
  over: { cls: "s-over", bar: "var(--red)", txt: "⚠ Overdue" },
};

interface Props {
  component: Component;
  bikeMeters: number;
  onBack: () => void;
  // Mark the component freshly serviced (resets wear, logs an entry).
  onReset: () => void;
  // Persist edited settings; rejects so the form can stay open on failure.
  onSaveSettings: (patch: Omit<Component, "id">) => Promise<void>;
  // Persist the notes field; rejects on failure.
  onSaveNotes: (notes: string) => Promise<void>;
  onDelete: () => void;
}

export function ComponentDetail({
  component,
  bikeMeters,
  onBack,
  onReset,
  onSaveSettings,
  onSaveNotes,
  onDelete,
}: Props) {
  const { units, dist } = useUnits();
  const { wearMeters, pct, status } = computeWear(component, bikeMeters, units);
  const s = STATUS[status];
  const sub = [component.brand, component.psi ? `${component.psi} PSI` : null]
    .filter(Boolean)
    .join(" · ");

  const [editingSettings, setEditingSettings] = useState(false);
  const [notes, setNotes] = useState(component.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const notesDirty = notes !== (component.notes ?? "");

  const reset = () => {
    const ok = confirm(
      `Reset ${component.label}?\n\n` +
        "This marks it freshly serviced — wear goes back to 0 and a service-log entry is added.",
    );
    if (ok) onReset();
  };

  const del = () => {
    const ok = confirm(
      `Delete ${component.label}?\n\n` +
        "This can't be undone. All of this component's data, including its " +
        "service-log entries, will be permanently removed.",
    );
    if (ok) onDelete();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(notes.trim());
    } catch {
      // The caller surfaces the failure; keep the edited text so it can be retried.
    } finally {
      setSavingNotes(false);
    }
  };

  // Close the editor only once the save actually lands.
  const saveSettings = async (patch: Omit<Component, "id">) => {
    await onSaveSettings(patch);
    setEditingSettings(false);
  };

  return (
    <>
      <div className="detail-head">
        <button type="button" className="back" aria-label="Back" onClick={onBack}>
          ‹
        </button>
        <div>
          <div className="detail-name">{component.label}</div>
          {sub && <div className="detail-dist">{sub}</div>}
        </div>
      </div>

      <div className="cd-card">
        <div className="cd-status-row">
          <span className={`cd-status ${s.cls}`}>{s.txt}</span>
        </div>
        <div className="bar-track cd-bar">
          <div
            className="bar-fill"
            style={{ width: `${Math.min(pct * 100, 100)}%`, background: s.bar }}
          />
        </div>
        <div className="cd-meta">
          {dist(wearMeters)} / {dist(component.intervalMeters)} {units}
        </div>
      </div>

      <button type="button" className="cd-reset" onClick={reset}>
        Reset
      </button>

      <div className="cd-section">
        <div className="cd-section-title">Notes</div>
        <textarea
          className="cd-notes"
          rows={3}
          placeholder="Add notes — e.g. install date, brand details, how it's holding up…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="cd-notes-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={!notesDirty || savingNotes}
            onClick={saveNotes}
          >
            {savingNotes ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="cd-section">
        <div className="cd-section-head">
          <div className="cd-section-title">Settings</div>
          {!editingSettings && (
            <button type="button" className="edit-btn" onClick={() => setEditingSettings(true)}>
              Edit
            </button>
          )}
        </div>
        {editingSettings ? (
          <ComponentForm
            bikeId={component.bikeId}
            bikeMeters={bikeMeters}
            initial={component}
            onSubmit={saveSettings}
            onCancel={() => setEditingSettings(false)}
          />
        ) : (
          <div className="cd-settings">
            <div className="cd-setting">
              <span>Service interval</span>
              <span>
                {dist(component.intervalMeters)} {units}
              </span>
            </div>
            {component.lube && (
              <div className="cd-setting">
                <span>Lube</span>
                <span>{LUBE_LABEL[component.lube]}</span>
              </div>
            )}
            {component.brand && (
              <div className="cd-setting">
                <span>Brand / model</span>
                <span>{component.brand}</span>
              </div>
            )}
            {component.psi != null && (
              <div className="cd-setting">
                <span>Target PSI</span>
                <span>{component.psi}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <button type="button" className="cd-delete" onClick={del}>
        Delete component
      </button>
    </>
  );
}
