import { describe, expect, it } from "vitest";
import { midpointLongitude } from "@/lib/astrology/composite";

describe("composite midpointLongitude", () => {
  it("10° e 350° → ~0° (lado curto do círculo)", () => {
    expect(midpointLongitude(10, 350)).toBeCloseTo(0, 5);
  });

  it("0° e 180° → 90°", () => {
    expect(midpointLongitude(0, 180)).toBeCloseTo(90, 5);
  });
});
