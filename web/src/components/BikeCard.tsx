import type { Bike } from "../types";
import { km } from "../lib/format";

export function BikeCard({ bike, onClick }: { bike: Bike; onClick: () => void }) {
  return (
    <div className="bike-card" onClick={onClick}>
      <div className="bike-emoji">🚲</div>
      <div className="bike-info">
        <div className="bike-name">{bike.name || "Bike"}</div>
        <div className="bike-dist">{km(bike.distance)} km total</div>
      </div>
      {bike.primary && <span className="badge">Primary</span>}
      <span className="chev">›</span>
    </div>
  );
}
