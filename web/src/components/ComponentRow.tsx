import { useRef, useState } from "react";
import { type Component, type Status, computeWear } from "../lib/garage";
import { useUnits } from "../UnitsContext";

const STATUS: Record<Status, { cls: string; bar: string; txt: string }> = {
  good: { cls: "s-good", bar: "var(--green)", txt: "✓ Good" },
  warn: { cls: "s-warn", bar: "var(--amber)", txt: "⏱ Due soon" },
  over: { cls: "s-over", bar: "var(--red)", txt: "⚠ Overdue" },
};

// Width (px) of the delete action revealed by swiping the row left.
const REVEAL = 80;

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
  const sub = [component.brand, component.psi ? `${component.psi} PSI` : null]
    .filter(Boolean)
    .join(" · ");

  // Swipe-left to reveal a trash button (touch). Desktop/keyboard users get the
  // always-visible delete button in the action row.
  const [tx, setTx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTx = useRef(0);
  const axis = useRef<"h" | "v" | null>(null);
  const open = tx <= -REVEAL / 2;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTx.current = tx;
    axis.current = null;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (axis.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // ignore taps/jitter
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axis.current !== "h") return; // let vertical scroll through
    setTx(Math.max(-REVEAL, Math.min(0, startTx.current + dx)));
  };
  const onTouchEnd = () => {
    setDragging(false);
    setTx((cur) => (cur <= -REVEAL / 2 ? -REVEAL : 0));
  };

  return (
    <div className="comp-swipe">
      <button
        type="button"
        className="comp-trash"
        aria-label={`Delete ${component.label}`}
        title={`Delete ${component.label}`}
        tabIndex={open ? 0 : -1}
        onClick={onRemove}
      >
        🗑
      </button>
      <div
        className="comp"
        style={{ transform: `translateX(${tx}px)`, transition: dragging ? "none" : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="comp-top">
          <div>
            <div className="comp-label">{component.label}</div>
            {sub && <div className="comp-sub">{sub}</div>}
          </div>
          <div className={`comp-status ${s.cls}`}>{s.txt}</div>
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
          </div>
          <div className="comp-actions">
            <button type="button" className="log-btn" onClick={onService}>
              Log service
            </button>
            <button type="button" className="edit-btn" onClick={onEdit}>
              Edit
            </button>
            <button
              type="button"
              className="rm-btn"
              onClick={onRemove}
              aria-label={`Delete ${component.label}`}
              title="Delete"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
