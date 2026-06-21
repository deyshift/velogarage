import { useRef, useState } from "react";
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

// Width of the trash action revealed by swiping the row left.
const ACTION_W = 76;
// Movement (px) before a gesture is locked to horizontal vs. vertical scroll.
const LOCK_SLOP = 6;

export function ComponentRow({ component, bikeMeters, onService, onEdit, onRemove }: Props) {
  const { units, dist } = useUnits();
  const { wearMeters, pct, status } = computeWear(component, bikeMeters);
  const s = STATUS[status];
  const sub = [component.brand, component.psi ? `${component.psi} PSI` : null]
    .filter(Boolean)
    .join(" · ");

  // Swipe-left-to-reveal-trash gesture (touch only).
  const [offset, setOffset] = useState(0); // current translateX of the row
  const [animating, setAnimating] = useState(true);
  const start = useRef({ x: 0, y: 0, base: 0 });
  const horizontal = useRef<boolean | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, base: offset };
    horizontal.current = null;
    setAnimating(false);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    if (horizontal.current === null) {
      if (Math.abs(dx) < LOCK_SLOP && Math.abs(dy) < LOCK_SLOP) return;
      horizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!horizontal.current) return; // let the page scroll vertically
    const next = Math.max(-ACTION_W, Math.min(0, start.current.base + dx));
    setOffset(next);
  };
  const onTouchEnd = () => {
    setAnimating(true);
    // Functional update so the snap decision uses the latest committed offset,
    // not a value captured stale from this render's closure.
    setOffset((o) => (o <= -ACTION_W / 2 ? -ACTION_W : 0));
  };
  const close = () => {
    setAnimating(true);
    setOffset(0);
  };

  return (
    <div className="comp-swipe">
      <div className="comp-delete-action" aria-hidden={offset === 0}>
        <button
          type="button"
          className="comp-trash"
          tabIndex={offset === 0 ? -1 : 0}
          aria-label="Delete component"
          onClick={() => {
            close();
            onRemove();
          }}
        >
          🗑
        </button>
      </div>
      <div
        className="comp"
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating ? "transform 0.2s ease" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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
              aria-label="Remove component"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
