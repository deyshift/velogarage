import { describe, expect, it } from "vitest";
import {
  catalogEntry,
  componentLabel,
  defaultInterval,
  defaultIntervalDays,
  isHybrid,
  isTimeBased,
} from "./catalog";

// Di2 electronic-drivetrain components (issue #77). These are opt-in — most
// bikes are mechanical — so they must stay out of the auto-seeded set, and the
// two cadences (mileage for the battery, calendar for the shifters) must map to
// the researched defaults.
describe("Di2 catalog entries", () => {
  it("charges the main battery on a mileage cadence (~1000 km)", () => {
    const e = catalogEntry("di2Battery");
    expect(e.label).toBe("Charge Di2 battery");
    expect(e.defaultKm).toBe(1000);
    expect(e.defaultDays).toBeUndefined();
    expect(isTimeBased("di2Battery")).toBe(false);
    // defaultInterval returns meters for distance-based types.
    expect(defaultInterval("di2Battery")).toBe(1_000_000);
    expect(componentLabel("di2Battery")).toBe("Charge Di2 battery");
  });

  it("checks the shifter batteries on a yearly calendar cadence", () => {
    const e = catalogEntry("di2Shifter");
    expect(e.label).toBe("Check Di2 shifter batteries");
    expect(e.defaultDays).toBe(365);
    expect(e.defaultKm).toBeUndefined();
    expect(isTimeBased("di2Shifter")).toBe(true);
    // defaultInterval returns days for time-based types.
    expect(defaultInterval("di2Shifter")).toBe(365);
    expect(componentLabel("di2Shifter")).toBe("Check Di2 shifter batteries");
  });

  it("keeps both Di2 components opt-in (never auto-seeded)", () => {
    expect(catalogEntry("di2Battery").autoAdd).toBeFalsy();
    expect(catalogEntry("di2Shifter").autoAdd).toBeFalsy();
  });
});

// Tires run on a hybrid cadence — 62 mi OR 4 days, whichever comes first (#78).
describe("tire hybrid cadence", () => {
  const MI = 1.609344;

  it("carries both a mileage and a 4-day calendar interval", () => {
    const e = catalogEntry("tire");
    expect(e.defaultKm).toBeCloseTo(62 * MI, 6);
    expect(e.defaultDays).toBe(4);
  });

  it("is hybrid — neither purely time-based nor a plain wear part", () => {
    expect(isHybrid("tire")).toBe(true);
    expect(isTimeBased("tire")).toBe(false);
  });

  it("resolves its distance interval (meters) via defaultInterval", () => {
    // Hybrid types keep a distance primary interval; days come separately.
    expect(defaultInterval("tire")).toBeCloseTo(62 * MI * 1000, 3);
  });

  it("resolves its calendar interval (days) via defaultIntervalDays", () => {
    expect(defaultIntervalDays("tire")).toBe(4);
  });

  it("stays auto-seeded as a wear part", () => {
    expect(catalogEntry("tire").autoAdd).toBe(true);
  });
});
