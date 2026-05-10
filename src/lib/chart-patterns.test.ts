import { describe, expect, it } from "vitest";
import type { Aspect, ChartData, HousePosition, PlanetPosition } from "@/lib/astrology/calculate";
import type { PlanetKey } from "@/lib/astrology/zodiac";
import {
  deriveChartPatterns,
  dominantElementFromChart,
  dominantModalityFromChart,
  findStelliums,
} from "@/lib/chart-patterns";

function mkPlanet(
  partial: Pick<PlanetPosition, "key" | "sign" | "house" | "longitude"> &
    Partial<Omit<PlanetPosition, "key" | "sign" | "house" | "longitude">>,
): PlanetPosition {
  const lon = partial.longitude;
  return {
    key: partial.key,
    name: partial.key,
    symbol: partial.key,
    longitude: lon,
    sign: partial.sign,
    signIndex: 0,
    degreeInSign: lon % 30,
    house: partial.house,
    retrograde: partial.retrograde ?? false,
  };
}

const BASE_CORE: PlanetKey[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];

describe("chart-patterns", () => {
  it("detects dominant modality cardinal when maioria em signos cardinais", () => {
    const planets: PlanetPosition[] = [
      mkPlanet({ key: "sun", sign: "Áries", house: 1, longitude: 10 }),
      mkPlanet({ key: "moon", sign: "Câncer", house: 4, longitude: 100 }),
      mkPlanet({ key: "mercury", sign: "Libra", house: 7, longitude: 190 }),
      mkPlanet({ key: "venus", sign: "Áries", house: 1, longitude: 15 }),
    ];
    expect(dominantModalityFromChart(planets)).toBe("CARDINAL");
  });

  it("detects stellium por signo (≥3 núcleos)", () => {
    const planets: PlanetPosition[] = [
      mkPlanet({ key: "sun", sign: "Leão", house: 5, longitude: 130 }),
      mkPlanet({ key: "moon", sign: "Leão", house: 5, longitude: 135 }),
      mkPlanet({ key: "mercury", sign: "Leão", house: 5, longitude: 140 }),
      mkPlanet({ key: "venus", sign: "Virgem", house: 6, longitude: 160 }),
      mkPlanet({ key: "mars", sign: "Virgem", house: 6, longitude: 165 }),
      mkPlanet({ key: "jupiter", sign: "Virgem", house: 6, longitude: 170 }),
      mkPlanet({ key: "saturn", sign: "Aquário", house: 11, longitude: 300 }),
    ];
    const st = findStelliums(planets);
    expect(st.some((s) => s.kind === "sign" && s.sign === "Leão" && s.planets.length >= 3)).toBe(
      true,
    );
    expect(st.some((s) => s.kind === "sign" && s.sign === "Virgem")).toBe(true);
  });

  it("deriveChartPatterns inclui desafios a partir de quadraturas", () => {
    const planets = BASE_CORE.map((key, i) =>
      mkPlanet({
        key,
        sign: "Gêmeos",
        house: 3,
        longitude: 60 + i * 4,
      }),
    );
    const houses: HousePosition[] = Array.from({ length: 12 }, (_, i) => ({
      number: i + 1,
      cusp: i * 30,
      sign: "Áries",
    }));
    const aspects: Aspect[] = [
      {
        planet1: "sun",
        planet2: "saturn",
        type: "quadratura",
        exactAngle: 90,
        orb: 1,
      },
    ];
    const data: ChartData = {
      ascendant: 0,
      midheaven: 270,
      planets,
      houses,
      aspects,
    };
    const p = deriveChartPatterns(data);
    expect(p.main_challenges.some((l) => l.includes("sun"))).toBe(true);
    expect(dominantElementFromChart(planets)).toBe("AR");
  });
});
