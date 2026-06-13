import type { Bike } from "../types";
import { km } from "../lib/format";

export function BikeDetail({ bike, onBack }: { bike: Bike; onBack: () => void }) {
  return (
    <>
      <div className="detail-head">
        <div className="back" onClick={onBack}>
          ‹
        </div>
        <div>
          <div className="detail-name">{bike.name || "Bike"}</div>
          <div className="detail-dist">{km(bike.distance)} km total</div>
        </div>
      </div>
      <div className="card">
        <div className="soon">
          <b>Component tracking is next.</b>
          <br />
          Here you'll add this bike's components — chain, cassette, tires, brake pads, rotors — and
          VeloGarage will track wear from its {km(bike.distance)} km, telling you what's due.
          (Phase 3, saved to your Upstash database.)
        </div>
      </div>
    </>
  );
}
