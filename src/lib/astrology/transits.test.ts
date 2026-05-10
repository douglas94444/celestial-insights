import { describe, expect, it } from "vitest";
import type { HousePosition, PlanetPosition } from "@/lib/astrology/calculate";
import {
  analyzeTransitDay,
  analyzeTransitRange,
  filterAspectsByFastTransit,
  filterAspectsByPersonalNatal,
} from "@/lib/astrology/transits";
import type { SynastryCrossAspect } from "@/lib/astrology/synastry";
import { PLANETS, signFromLongitude } from "@/lib/astrology/zodiac";

function stubNatalPlanets(): PlanetPosition[] {
  return PLANETS.map((p, i) => {
    const longitude = (33 + i * 19) % 360;
    return {
      key: p.key,
      name: p.name,
      symbol: p.symbol,
      longitude,
      sign: signFromLongitude(longitude),
      signIndex: Math.floor(longitude / 30),
      degreeInSign: longitude % 30,
      house: (i % 12) + 1,
      retrograde: false,
    };
  });
}

function stubHouses(ascendantDeg: number): HousePosition[] {
  return Array.from({ length: 12 }, (_, i) => {
    const cusp = (ascendantDeg + i * 30) % 360;
    return {
      number: i + 1,
      cusp,
      sign: signFromLongitude(cusp),
    };
  });
}

describe("analyzeTransitDay", () => {
  it("returns payload shape for a fixed date", () => {
    const day = analyzeTransitDay(
      "2026-06-15",
      stubNatalPlanets(),
      stubHouses(120),
      120,
      "whole_sign",
    );
    expect(day.date).toBe("2026-06-15");
    expect(Array.isArray(day.aspects)).toBe(true);
    expect(Array.isArray(day.narrative)).toBe(true);
    expect(Array.isArray(day.interpretiveHints)).toBe(true);
    expect(day.scores.humor).toBeGreaterThanOrEqual(15);
    expect(day.scores.humor).toBeLessThanOrEqual(100);
    expect(day.scores.amor).toBeGreaterThanOrEqual(15);
    expect(day.scores.trabalho).toBeGreaterThanOrEqual(15);
    expect(day.intensity).toBeGreaterThanOrEqual(0);
    expect(day.intensity).toBeLessThanOrEqual(100);
    expect(day.transitMoonSign?.length ?? 0).toBeGreaterThan(0);
  });

  it("texto narrativo alinha-se com linhas curtas para cartão Momento", () => {
    const day = analyzeTransitDay("2026-03-01", stubNatalPlanets(), stubHouses(15), 15, "placidus");
    expect(day.narrative.length).toBeGreaterThan(0);
    expect(day.narrative.every((line) => typeof line === "string" && line.length > 3)).toBe(true);
  });
});

describe("analyzeTransitRange", () => {
  it("returns seven days inclusive", () => {
    const days = analyzeTransitRange(
      "2026-06-01",
      "2026-06-07",
      stubNatalPlanets(),
      stubHouses(90),
      90,
      "whole_sign",
    );
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe("2026-06-01");
    expect(days[6]?.date).toBe("2026-06-07");
  });
});

describe("aspect filters", () => {
  const aspects: SynastryCrossAspect[] = [
    {
      planet1: "jupiter",
      planet2: "sun",
      type: "trigono",
      exactAngle: 120,
      orb: 1,
    },
    {
      planet1: "mars",
      planet2: "moon",
      type: "sextil",
      exactAngle: 60,
      orb: 2,
    },
  ];

  it("filterAspectsByFastTransit keeps Sun–Mars transit", () => {
    const out = filterAspectsByFastTransit(aspects);
    expect(out.some((a) => a.planet1 === "mars")).toBe(true);
    expect(out.some((a) => a.planet1 === "jupiter")).toBe(false);
  });

  it("filterAspectsByPersonalNatal filters by natal planet", () => {
    const out = filterAspectsByPersonalNatal(aspects);
    expect(out).toHaveLength(2);
    expect(out.every((a) => ["sun", "moon", "mercury", "venus", "mars"].includes(a.planet2))).toBe(
      true,
    );
  });
});
