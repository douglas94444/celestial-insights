import { describe, expect, it } from "vitest";
import type { PlanetPosition } from "@/lib/astrology/calculate";
import {
  buildPersonalizedMomentInsights,
  detectStelliumLines,
  dominantElementFromPlanets,
  resolveMomentDisplayName,
} from "@/lib/personalized-moment";

function fakePlanet(key: PlanetPosition["key"], sign: string, house: number): PlanetPosition {
  return {
    key,
    name: key,
    symbol: "",
    longitude: 0,
    sign,
    signIndex: 0,
    degreeInSign: 0,
    house,
    retrograde: false,
  };
}

describe("dominantElementFromPlanets", () => {
  it("prefere o elemento mais frequente no núcleo", () => {
    const planets = [
      fakePlanet("sun", "Gêmeos", 1),
      fakePlanet("moon", "Libra", 2),
      fakePlanet("mercury", "Aquário", 3),
      fakePlanet("venus", "Áries", 4),
      fakePlanet("mars", "Leão", 5),
      fakePlanet("jupiter", "Virgem", 6),
      fakePlanet("saturn", "Touro", 7),
    ];
    const { label } = dominantElementFromPlanets(planets);
    expect(label).toBe("Ar");
  });
});

describe("detectStelliumLines", () => {
  it("detecta 3+ planetas núcleo no mesmo signo", () => {
    const planets = [
      fakePlanet("sun", "Aquário", 1),
      fakePlanet("moon", "Gêmeos", 2),
      fakePlanet("mercury", "Aquário", 3),
      fakePlanet("venus", "Aquário", 4),
      fakePlanet("mars", "Peixes", 5),
      fakePlanet("jupiter", "Aquário", 6),
      fakePlanet("saturn", "Câncer", 7),
    ];
    expect(detectStelliumLines(planets)).toContain("Stellium em Aquário");
  });
});

describe("resolveMomentDisplayName", () => {
  it("usa nome do perfil", () => {
    expect(resolveMomentDisplayName({ name: "Marina Silva" }, null, undefined)).toBe(
      "Marina Silva",
    );
  });

  it("usa nome do mapa quando não há perfil", () => {
    expect(resolveMomentDisplayName(null, { name: "Eu" }, "x@y.com")).toBe("Eu");
  });

  it("usa parte local do email", () => {
    expect(resolveMomentDisplayName(null, null, "ana.beta@test.com")).toBe("ana beta");
  });
});

describe("buildPersonalizedMomentInsights", () => {
  it("usa primeira narrativa de trânsito quando existir", () => {
    const planets = [
      fakePlanet("sun", "Leão", 10),
      fakePlanet("moon", "Câncer", 4),
      fakePlanet("mercury", "Gêmeos", 3),
      fakePlanet("venus", "Virgem", 6),
      fakePlanet("mars", "Áries", 1),
      fakePlanet("jupiter", "Sagitário", 9),
      fakePlanet("saturn", "Capricórnio", 7),
    ];
    const t = {
      narrative: ["Lua gentil aspectando seu Mercúrio."],
    };
    const r = buildPersonalizedMomentInsights(
      planets,
      [],
      t as import("@/lib/astrology/transits").TransitDayPayload,
    );
    expect(r.purposeLine).toContain("Lua gentil");
  });
});
