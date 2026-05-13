import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeCompositeChart } from "@/lib/astrology/composite";
import type { CalculateInput, ChartData, HouseSystemId } from "@/lib/astrology/calculate";
import { chartRowToChartData, type ChartRow } from "@/lib/chart-from-row";
import { saveSynastryInputSchema } from "@/lib/schemas/server-fns";
import { parseTimezoneLabelToMinutes } from "@/lib/timezone-br";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { assertRolloutGate, fetchProfileRolloutState } from "@/lib/subscription-rollout";

export function birthInputFromChartRow(chart: ChartRow): CalculateInput {
  const offset =
    chart.timezone_offset_minutes ?? parseTimezoneLabelToMinutes(chart.timezone ?? "") ?? -180;
  return {
    birthDate: chart.birth_date,
    birthTime: chart.birth_time,
    latitude: chart.latitude,
    longitude: chart.longitude,
    timezoneOffset: offset,
    houseSystem: chart.house_system as HouseSystemId,
  };
}

export const calculateCompositeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = saveSynastryInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("calculateCompositeFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const rollout = await fetchProfileRolloutState(supabase, userId);
      assertRolloutGate(rollout.applies, rollout.gates.composite, "composite", rollout.dayIndex, {
        tier: rollout.tier,
      });

      if (data.chart1Id === data.chart2Id) {
        throw jsonError(400, "SAME", "Escolha dois mapas diferentes.");
      }

      const { data: rows, error } = await supabase
        .from("charts")
        .select("*")
        .eq("user_id", userId)
        .in("id", [data.chart1Id, data.chart2Id]);

      if (error || !rows || rows.length !== 2) {
        throw jsonError(404, "NOT_FOUND", "Um ou ambos os mapas não foram encontrados.");
      }

      const chartA = rows.find((r) => r.id === data.chart1Id)!;
      const chartB = rows.find((r) => r.id === data.chart2Id)!;

      const houseSystem = chartA.house_system as HouseSystemId;

      const dataA = chartRowToChartData(chartA);
      const dataB = chartRowToChartData(chartB);
      const birthA = birthInputFromChartRow(chartA);
      const birthB = birthInputFromChartRow(chartB);

      const composite: ChartData = computeCompositeChart(dataA, dataB, birthA, birthB, houseSystem);

      return {
        chart1Id: chartA.id,
        chart2Id: chartB.id,
        chart1Name: chartA.name,
        chart2Name: chartB.name,
        composite,
      };
    }),
  );
