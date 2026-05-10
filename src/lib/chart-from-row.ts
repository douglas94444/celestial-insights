import type { Database } from "@/integrations/supabase/types";
import type { Aspect, ChartData, HousePosition, PlanetPosition } from "@/lib/astrology/calculate";
import { computeAngles, type HouseSystemId } from "@/lib/astrology/calculate";
import { parseTimezoneLabelToMinutes } from "@/lib/timezone-br";

export type ChartRow = Database["public"]["Tables"]["charts"]["Row"];

/** Reconstrói dados para roda natal a partir da linha `charts` (mesma lógica da página do mapa). */
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
  const planets = chart.planets_data as unknown as PlanetPosition[];
  const houses = chart.houses_data as unknown as HousePosition[];
  const aspects = chart.aspects_data as unknown as Aspect[];
  const ascendant = houses[0]?.cusp ?? angles.ascendant;
  return {
    ascendant,
    midheaven: angles.midheaven,
    planets,
    houses,
    aspects,
  };
}
