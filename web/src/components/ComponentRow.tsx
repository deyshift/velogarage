import { type Component, type Status, computeWear, psiSummary, wearMeta } from "../lib/garage";
import { useUnits } from "../UnitsContext";

const STATUS: Record<Status, { cls: string; bar: string; txt: string }> = {
  good: { cls: "s-good", bar: "var(--green)", txt: "✓ Good" },
  warn: { cls: "s-warn", bar: "var(--amber)", txt: "⏱ Due soon" },
  over: { cls: "s-over", bar: "var(--red)", txt: "⚠ Overdue" },
};

interface Props {
  component: Component;
  bikeMeters: number;
  onOpen: () => void;
}

// The whole row is a button that opens the component's detail view, where
// service (reset), notes, settings, and delete now live.
export function ComponentRow({ component, bikeMeters, onOpen }: Props) {
  const { units, dist } = useUnits();
  const wear = computeWear(component, bikeMeters, units);
  const { pct, status } = wear;
  const s = STATUS[status];
  const sub = [component.brand, psiSummary(component)].filter(Boolean).join(" · ");
  const meta = wearMeta(component, wear, dist, units);

  return (
    <button type="button" className="comp comp-tap" onClick={onOpen}>
      <div className="comp-top">
        <div>
          <div className="comp-label">{component.label}</div>
          {sub && <div className="comp-sub">{sub}</div>}
        </div>
        <div className={`comp-status ${s.cls}`}>{s.txt}</div>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${Math.min(pct * 100, 100)}%`, background: s.bar }}
        />
      </div>
      <div className="comp-foot">
        <div className="comp-meta">{meta}</div>
        <div className="comp-chev">›</div>
      </div>
    </button>
  );
}
