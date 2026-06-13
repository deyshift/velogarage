import type { Bike } from "../types";
import { useUnits } from "../UnitsContext";

export function BikeCard({ bike, onClick }: { bike: Bike; onClick: () => void }) {
  const { units, dist } = useUnits();
  return (
    <div className="bike-card" onClick={onClick}>
      <div className="bike-emoji">🚲</div>
      <div className="bike-info">
        <div className="bike-name">{bike.name || "Bike"}</div>
        <div className="bike-dist">
          {dist(bike.distance)} {units} total
        </div>
      </div>
      {bike.primary && <span className="badge">Primary</span>}
      <span className="chev">›</span>
    </div>
  );
}
