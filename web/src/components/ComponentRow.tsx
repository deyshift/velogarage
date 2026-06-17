import { type Component, type Status, computeWear } from "../lib/garage";
import { useUnits } from "../UnitsContext";

const STATUS: Record<Status, { cls: string; bar: string; txt: string }> = {
  good: { cls: "s-good", bar: "var(--green)", txt: "✓ Good" },
  warn: { cls: "s-warn", bar: "var(--amber)", txt: "⏱ Due soon" },
  over: { cls: "s-over", bar: "var(--red)", txt: "⚠ Overdue" },
};

interface Props {
  component: Component;
  bikeMeters: number;
  onService: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

export function ComponentRow({ component, bikeMeters, onService, onEdit, onRemove }: Props) {
  const { units, dist } = useUnits();
  const { wearMeters, pct, status } = computeWear(component, bikeMeters);
  const s = STATUS[status];
  const overdueMeters = wearMeters - component.intervalMeters;
  // toDistance rounds to whole mi/km, so a small overage would read as "0";
  // show "<1" in that case so the callout always conveys it's past interval.
  const overdueLabel = dist(overdueMeters) === "0" ? "<1" : dist(overdueMeters);
  return (
    <div className="comp">
      <div className="comp-top">
        <div className="comp-label">{component.label}</div>
        <div className={`comp-status ${s.cls}`}>
          {s.txt}
          {status === "over" && ` · ${Math.round(pct * 100)}%`}
        </div>
      </div>
      <div className="bar-track">
        <div
          className={`bar-fill${status === "over" ? " bar-over" : ""}`}
          style={{ width: `${Math.min(pct * 100, 100)}%`, background: s.bar }}
        />
      </div>
      <div className="comp-foot">
        <div className="comp-meta">
          {dist(wearMeters)} / {dist(component.intervalMeters)} {units}
          {status === "over" && overdueMeters > 0 && (
            <span className="comp-overdue">
              {" · "}Overdue by {overdueLabel} {units}
            </span>
          )}
        </div>
        <div className="comp-actions">
          <button type="button" className="log-btn" onClick={onService}>
            Log service
          </button>
          <button type="button" className="edit-btn" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="rm-btn" onClick={onRemove} aria-label="Remove component">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
