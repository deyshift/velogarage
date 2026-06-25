import { describe, expect, it } from "vitest";
import { computeWear, type Component } from "./garage";

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
