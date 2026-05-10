import type { Aspect, ChartData, HousePosition, PlanetPosition } from "./calculate.ts";
import { computeAngles, type HouseSystemId } from "./calculate.ts";
import { parseTimezoneLabelToMinutes } from "./timezone-br.ts";

/** Campos mínimos da linha `charts` usados pelo digest. */
export interface ChartRow {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  birth_time_known: boolean;
  timezone: string;
  timezone_offset_minutes: number | null;
  latitude: number;
  longitude: number;
  house_system: string;
  planets_data: unknown;
  houses_data: unknown;
  aspects_data: unknown;
  is_primary?: boolean;
}

/** Reconstrói dados para trânsitos a partir da linha `charts`. */
export function chartRowToChartData(chart: ChartRow): ChartData {
  const offset =
    chart.timezone_offset_minutes ?? parseTimezoneLabelToMinutes(chart.timezone ?? "") ?? -180;
  const storedHouseSystem = (chart.house_system as HouseSystemId | undefined) ?? "placidus";
  const angles = computeAngles({
    birthDate: chart.birth_date,
    birthTime: chart.birth_time,
    latitude: chart.latitude,
    longitude: chart.longitude,
    timezoneOffset: offset,
    houseSystem: storedHouseSystem,
  });
  const planets = chart.planets_data as PlanetPosition[];
  const houses = chart.houses_data as HousePosition[];
  const aspects = chart.aspects_data as Aspect[];
  const ascendant = houses[0]?.cusp ?? angles.ascendant;
  return {
    ascendant,
    midheaven: angles.midheaven,
    planets,
    houses,
    aspects,
  };
}
