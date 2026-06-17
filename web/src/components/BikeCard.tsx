import type { Bike } from "../types";
import type { Status } from "../lib/garage";
import { worstStatus } from "../lib/garage";
import { useUnits } from "../UnitsContext";
import { useGarage } from "../GarageContext";

const BADGE: Record<Status, { cls: string; txt: string }> = {
  good: { cls: "badge-good", txt: "Good" },
  warn: { cls: "badge-warn", txt: "Service soon" },
  over: { cls: "badge-over", txt: "Overdue" },
};

export function BikeCard({ bike, onClick }: { bike: Bike; onClick: () => void }) {
  const { units, dist } = useUnits();
  const { garage } = useGarage();
  const components = garage.components.filter((c) => String(c.bikeId) === String(bike.id));
  const status = worstStatus(components, bike.distance);

  return (
    <div className="bike-card" onClick={onClick}>
      <div className="bike-emoji">🚲</div>
      <div className="bike-info">
        <div className="bike-name">{bike.name || "Bike"}</div>
        <div className="bike-dist">
          {dist(bike.distance)} {units} total
        </div>
      </div>
      {status ? (
        <span className={`badge ${BADGE[status].cls}`}>{BADGE[status].txt}</span>
      ) : bike.primary ? (
        <span className="badge">Primary</span>
      ) : null}
      <span className="chev">›</span>
    </div>
  );
}
