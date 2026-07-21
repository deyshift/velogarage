import { describe, expect, it } from "vitest";
import {
  catalogEntry,
  componentLabel,
  defaultInterval,
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
