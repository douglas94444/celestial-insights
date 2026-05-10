import { describe, expect, it } from "vitest";
import { excerptInterpretation, MOON_IN_SIGN } from "@/data/interpretations";

describe("excerptInterpretation", () => {
  it("returns full text when under limit", () => {
    const short = "Uma frase curta.";
    expect(excerptInterpretation(short, 280)).toBe(short);
  });

  it("truncates long Moon text with ellipsis", () => {
    const full = MOON_IN_SIGN["Áries"];
    const out = excerptInterpretation(full, 80);
    expect(out.length).toBeLessThanOrEqual(82);
    expect(out.endsWith("…")).toBe(true);
  });
});
