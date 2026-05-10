import {
  compositeAnglesInputs,
  computeAspects,
  natalHouseForLongitude,
  type CalculateInput,
  type ChartData,
  type PlanetPosition,
} from "@/lib/astrology/calculate";
import { computeHouses, wholeSignHouse, type HouseSystemId } from "@/lib/astrology/houses";
import { PLANETS, signFromLongitude, signIndexFromLongitude } from "@/lib/astrology/zodiac";

export function midpointLongitude(lon1: number, lon2: number): number {
  const diff = Math.abs(lon1 - lon2);
  const mid = diff > 180 ? ((lon1 + lon2 + 360) / 2) % 360 : (lon1 + lon2) / 2;
  return ((mid % 360) + 360) % 360;
}

/** Mapa composto (midpoint de longitudes + casas a partir do RAMC médio). */
export function computeCompositeChart(
  dataA: ChartData,
  dataB: ChartData,
  birthA: CalculateInput,
  birthB: CalculateInput,
  houseSystem: HouseSystemId,
): ChartData {
  const { ramcMid, oblMean, latMean } = compositeAnglesInputs(birthA, birthB);
  const hr = computeHouses(ramcMid, latMean, oblMean, houseSystem);

  const ascendant = hr.ascendant;
  const midheaven = hr.midheaven;

  const houses = hr.houses.map((h) => ({
    number: h.number,
    cusp: h.cusp,
    sign: signFromLongitude(h.cusp),
  }));

  const planets: PlanetPosition[] = PLANETS.map((meta) => {
    const pa = dataA.planets.find((p) => p.key === meta.key);
    const pb = dataB.planets.find((p) => p.key === meta.key);
    if (!pa || !pb) {
      throw new Error(`composite: falta planeta ${meta.key}`);
    }
    const lon = midpointLongitude(pa.longitude, pb.longitude);
    const house =
      houseSystem === "whole_sign"
        ? wholeSignHouse(lon, ascendant)
        : natalHouseForLongitude(lon, houses);

    return {
      key: meta.key,
      name: meta.name,
      symbol: meta.symbol,
      longitude: lon,
      sign: signFromLongitude(lon),
      signIndex: signIndexFromLongitude(lon),
      degreeInSign: lon % 30,
      house,
      retrograde: false,
    };
  });

  const aspects = computeAspects(planets);

  return {
    ascendant,
    midheaven,
    planets,
    houses,
    aspects,
  };
}
