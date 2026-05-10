import { describe, expect, it } from "vitest";
import {
  chartGeometryToSupabaseJson,
  parseStoredChartGeometry,
  tryParseStoredChartGeometry,
} from "@/lib/schemas/chart-payload";

const minimalPlanet = {
  key: "sun" as const,
  name: "Sol",
  symbol: "☉",
  longitude: 10,
  sign: "Áries",
  signIndex: 0,
  degreeInSign: 10,
  house: 1,
  retrograde: false,
};

const minimalHouse = { number: 1, cusp: 0, sign: "Áries" };

const minimalAspect = {
  planet1: "sun" as const,
  planet2: "moon" as const,
  type: "conjuncao" as const,
  exactAngle: 0,
  orb: 2,
};

describe("parseStoredChartGeometry", () => {
  it("aceita payload válido", () => {
    const g = parseStoredChartGeometry({
      planets_data: [minimalPlanet],
      houses_data: [minimalHouse],
      aspects_data: [minimalAspect],
    });
    expect(g.planets).toHaveLength(1);
    expect(g.houses).toHaveLength(1);
    expect(g.aspects).toHaveLength(1);
  });

  it("tryParse devolve null se inválido", () => {
    expect(
      tryParseStoredChartGeometry({
        planets_data: [{}],
        houses_data: [],
        aspects_data: [],
      }),
    ).toBeNull();
  });
});

describe("chartGeometryToSupabaseJson", () => {
  it("valida geometria calculada e permite round-trip como colunas charts.*_data", () => {
    const geometry = {
      planets: [minimalPlanet],
      houses: [minimalHouse],
      aspects: [minimalAspect],
    };
    const cols = chartGeometryToSupabaseJson(geometry);
    const again = parseStoredChartGeometry(cols);
    expect(again).toEqual(geometry);
  });
});
