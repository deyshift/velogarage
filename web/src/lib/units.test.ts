import { describe, expect, it } from "vitest";
import { fromMeters, toDistance, toMeters } from "./units";

describe("toMeters / fromMeters", () => {
  it("converts miles to meters", () => {
    expect(toMeters(1, "mi")).toBeCloseTo(1609.344, 3);
    expect(toMeters(10, "mi")).toBeCloseTo(16093.44, 2);
  });

  it("converts kilometers to meters", () => {
    expect(toMeters(1, "km")).toBe(1000);
    expect(toMeters(5, "km")).toBe(5000);
  });

  it("round-trips through fromMeters", () => {
    for (const units of ["mi", "km"] as const) {
      expect(fromMeters(toMeters(42, units), units)).toBeCloseTo(42, 6);
    }
  });
});

describe("toDistance", () => {
  it("formats meters in the chosen unit, rounded", () => {
    expect(toDistance(1609.344, "mi")).toBe("1");
    expect(toDistance(1000, "km")).toBe("1");
    expect(toDistance(4828.032, "mi")).toBe("3"); // 3 miles
  });

  it("treats undefined distance as zero", () => {
    expect(toDistance(undefined, "mi")).toBe("0");
    expect(toDistance(undefined, "km")).toBe("0");
  });
});
