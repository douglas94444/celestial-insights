import type { Database } from "@/integrations/supabase/types";
import type { ChartData } from "@/lib/astrology/calculate";
import { computeAngles, type HouseSystemId } from "@/lib/astrology/calculate";
import { parseStoredChartGeometry } from "@/lib/schemas/chart-payload";
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
  const { planets, houses, aspects } = parseStoredChartGeometry(chart);
  const ascendant = houses[0]?.cusp ?? angles.ascendant;
  return {
    ascendant,
    midheaven: angles.midheaven,
    planets,
    houses,
    aspects,
  };
}
