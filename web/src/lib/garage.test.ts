import { describe, expect, it } from "vitest";
import { computeWear, wearMeta, type Component } from "./garage";

// A distance-based component (100 km service interval, installed at 0).
function distanceComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: "c1",
    bikeId: "b1",
    type: "chain",
    label: "Chain",
    installMeters: 0,
    intervalMeters: 100_000, // 100 km
    ...overrides,
  };
}

// A time-based component (30 day cadence).
function timeComponent(installDate: string): Component {
  return {
    id: "c2",
    bikeId: "b1",
    type: "torque",
    label: "Torque check",
    installMeters: 0,
    intervalMeters: 0,
    intervalDays: 30,
    installDate,
  };
}

const DAY = 86_400_000;

describe("computeWear — distance thresholds", () => {
  it("is 'good' below 0.8 of the interval", () => {
    expect(computeWear(distanceComponent(), 50_000, "km").status).toBe("good");
    expect(computeWear(distanceComponent(), 79_000, "km").status).toBe("good");
  });

  it("is 'warn' from 0.8 up to (but not at) 1.0", () => {
    expect(computeWear(distanceComponent(), 80_000, "km").status).toBe("warn");
    expect(computeWear(distanceComponent(), 99_000, "km").status).toBe("warn");
  });

  it("is 'over' at or beyond the interval", () => {
    expect(computeWear(distanceComponent(), 100_000, "km").status).toBe("over");
    expect(computeWear(distanceComponent(), 150_000, "km").status).toBe("over");
  });

  it("exposes wear distance and percentage", () => {
    const w = computeWear(distanceComponent(), 40_000, "km");
    expect(w.timeBased).toBe(false);
    expect(w.wearMeters).toBe(40_000);
    expect(w.pct).toBeCloseTo(0.4, 6);
  });
});

describe("computeWear — time thresholds", () => {
  const now = Date.UTC(2026, 0, 31); // fixed reference point

  it("is 'good' early in the cycle", () => {
    const w = computeWear(timeComponent(new Date(now - 10 * DAY).toISOString()), 0, "km", now);
    expect(w.timeBased).toBe(true);
    expect(w.elapsedDays).toBe(10);
    expect(w.status).toBe("good");
  });

  it("is 'warn' past 0.8 of the cadence", () => {
    const w = computeWear(timeComponent(new Date(now - 25 * DAY).toISOString()), 0, "km", now);
    expect(w.status).toBe("warn");
  });

  it("is 'over' once the cadence elapses", () => {
    const w = computeWear(timeComponent(new Date(now - 30 * DAY).toISOString()), 0, "km", now);
    expect(w.status).toBe("over");
  });
});

// A tire runs on a *hybrid* cadence — 100 km OR 4 days, whichever comes first
// (#78). It carries both an interval in meters and one in days.
function tireComponent(installDate: string, overrides: Partial<Component> = {}): Component {
  return {
    id: "c3",
    bikeId: "b1",
    type: "tire",
    label: "Inflate and Inspect Tires",
    installMeters: 0,
    intervalMeters: 100_000, // 100 km
    intervalDays: 4,
    installDate,
    ...overrides,
  };
}

describe("computeWear — hybrid (tire) cadence", () => {
  const now = Date.UTC(2026, 0, 31);
  const fresh = new Date(now).toISOString(); // installed today (0 days elapsed)

  it("reports hybrid and exposes both progress ratios", () => {
    const w = computeWear(tireComponent(new Date(now - 1 * DAY).toISOString()), 50_000, "km", now);
    expect(w.hybrid).toBe(true);
    expect(w.timeBased).toBe(false);
    expect(w.distancePct).toBeCloseTo(0.5, 6);
    expect(w.timePct).toBeCloseTo(0.25, 6);
    // The bar tracks whichever side is further along.
    expect(w.pct).toBeCloseTo(0.5, 6);
    expect(w.status).toBe("good");
  });

  it("goes 'over' on miles even when barely any days have passed", () => {
    const w = computeWear(tireComponent(fresh), 100_000, "km", now);
    expect(w.status).toBe("over");
    expect(w.elapsedDays).toBe(0);
  });

  it("goes 'over' on days even when unridden", () => {
    const w = computeWear(tireComponent(new Date(now - 4 * DAY).toISOString()), 0, "km", now);
    expect(w.status).toBe("over");
    expect(w.wearMeters).toBe(0);
    expect(w.elapsedDays).toBe(4);
  });

  it("warns as either side approaches its interval", () => {
    // 3 of 4 days (0.75) but 85 of 100 km (0.85) → warn from the mileage side.
    expect(computeWear(tireComponent(new Date(now - 3 * DAY).toISOString()), 85_000, "km", now).status).toBe(
      "warn",
    );
    // Unridden but 0.8 into the day cadence → warn from the calendar side. (A
    // 4-day default can't warn — 3 whole days is 0.75, 4 is already over — so
    // this uses a longer day interval to exercise the band.)
    const w = tireComponent(new Date(now - 8 * DAY).toISOString(), { intervalDays: 10 });
    expect(computeWear(w, 0, "km", now).status).toBe("warn");
  });

  it("stays dormant on the calendar side when a legacy tire has no install date", () => {
    const w = computeWear(tireComponent(undefined as unknown as string), 0, "km", now);
    expect(w.elapsedDays).toBe(0);
    expect(w.status).toBe("good");
  });
});

describe("wearMeta", () => {
  const dist = (m: number) => String(Math.round(m / 1000)); // meters → km, whole
  const now = Date.UTC(2026, 0, 31);

  it("shows a distance line for a wear part", () => {
    const w = computeWear(distanceComponent(), 40_000, "km");
    expect(wearMeta(distanceComponent(), w, dist, "km")).toBe("40 / 100 km");
  });

  it("shows a days line for a calendar reminder", () => {
    const c = timeComponent(new Date(now - 10 * DAY).toISOString());
    const w = computeWear(c, 0, "km", now);
    expect(wearMeta(c, w, dist, "km")).toBe("10 / 30 days");
  });

  it("shows both lines for a hybrid tire", () => {
    const c = tireComponent(new Date(now - 2 * DAY).toISOString());
    const w = computeWear(c, 30_000, "km", now);
    expect(wearMeta(c, w, dist, "km")).toBe("30 / 100 km · 2 / 4 days");
  });
});
