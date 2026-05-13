import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildAnnualForecast } from "@/lib/astrology/annual-forecast";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { annualForecastInputSchema } from "@/lib/schemas/server-fns";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { assertRolloutGate, fetchProfileRolloutState } from "@/lib/subscription-rollout";

export const generateAnnualForecastFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = annualForecastInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateAnnualForecastFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const rollout = await fetchProfileRolloutState(supabase, userId);
      assertRolloutGate(
        rollout.applies,
        rollout.gates.annualForecast,
        "annualForecast",
        rollout.dayIndex,
        { tier: rollout.tier },
      );

      const { data: chart, error } = await supabase
        .from("charts")
        .select("*")
        .eq("id", data.chartId)
        .eq("user_id", userId)
        .single();

      if (error || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

      const chartData = chartRowToChartData(chart);
      const houseSystem = chart.house_system as "placidus" | "equal" | "whole_sign";

      const months = buildAnnualForecast(
        data.year,
        chartData.planets,
        chartData.houses,
        chartData.ascendant,
        houseSystem,
      );

      return {
        chartId: chart.id,
        chartName: chart.name,
        year: data.year,
        months,
      };
    }),
  );
