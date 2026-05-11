import { describe, expect, it } from "vitest";
import { SIGNS } from "@/lib/astrology/zodiac";
import {
  ALL_SIGN_NAMES,
  buildSyntheticChartForSunSign,
  findSyntheticBirthDateForSunSign,
} from "@/lib/admin-instagram-sign-cards";

describe("admin-instagram-sign-cards", () => {
  it("findSyntheticBirthDateForSunSign devolve ISO YYYY-MM-DD", () => {
    const d = findSyntheticBirthDateForSunSign("Leão");
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("para cada signo, o Sol do mapa sintético coincide com o signo pedido", () => {
    for (const sign of ALL_SIGN_NAMES) {
      const chart = buildSyntheticChartForSunSign(sign);
      const sun = chart.planets.find((p) => p.key === "sun");
      expect(sun, sign).toBeDefined();
      expect(sun!.sign, sign).toBe(sign);
    }
    expect(ALL_SIGN_NAMES.length).toBe(SIGNS.length);
  });
});
