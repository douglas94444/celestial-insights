import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeTransitRange } from "@/lib/astrology/transits";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { calculateTransitsInputSchema } from "@/lib/schemas/server-fns";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { assertRolloutGate, fetchProfileRolloutState } from "@/lib/subscription-rollout";

/** Limite de dias no intervalo [startDate, endDate] (inclusive). */
const MAX_RANGE_DAYS = 186;

/** Trânsitos diários (meio-dia UTC): aspectos planetas em movimento × mapa natal. */
export const calculateTransitsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = calculateTransitsInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("calculateTransitsFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const startMs = Date.parse(`${data.startDate}T12:00:00.000Z`);
      const endMs = Date.parse(`${data.endDate}T12:00:00.000Z`);
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
        throw jsonError(400, "DATES", "Intervalo de datas inválido.");
      }
      const spanDays = Math.ceil((endMs - startMs) / 86_400_000) + 1;
      if (spanDays > MAX_RANGE_DAYS) {
        throw jsonError(
          400,
          "RANGE",
          `O intervalo pode ter no máximo ${MAX_RANGE_DAYS} dias (inclusive). Reduza a janela.`,
        );
      }

      const rollout = await fetchProfileRolloutState(supabase, userId);
      assertRolloutGate(rollout.applies, rollout.gates.transits, "transits", rollout.dayIndex);

      const { data: chart, error } = await supabase
        .from("charts")
        .select("*")
        .eq("id", data.chartId)
        .eq("user_id", userId)
        .single();

      if (error || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

      const chartData = chartRowToChartData(chart);
      const days = analyzeTransitRange(
        data.startDate,
        data.endDate,
        chartData.planets,
        chartData.houses,
        chartData.ascendant,
        chart.house_system as "placidus" | "equal" | "whole_sign",
      );

      return {
        chartId: chart.id,
        chartName: chart.name,
        startDate: data.startDate,
        endDate: data.endDate,
        days,
      };
    }),
  );
