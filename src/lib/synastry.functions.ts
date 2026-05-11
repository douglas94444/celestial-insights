import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { analyzeSynastry } from "@/lib/astrology/synastry";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { saveSynastryInputSchema } from "@/lib/schemas/server-fns";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { assertRolloutGate, fetchProfileRolloutState } from "@/lib/subscription-rollout";

/** Calcula sinastria entre dois mapas do utilizador e persiste em `synastries`. */
export const calculateAndSaveSynastryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = saveSynastryInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("calculateAndSaveSynastryFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const rollout = await fetchProfileRolloutState(supabase, userId);
      assertRolloutGate(rollout.applies, rollout.gates.synastry, "synastry", rollout.dayIndex);

      if (data.chart1Id === data.chart2Id) {
        throw jsonError(400, "SAME_CHART", "Escolha dois mapas diferentes.");
      }

      const { data: rows, error: fetchErr } = await supabase
        .from("charts")
        .select("*")
        .in("id", [data.chart1Id, data.chart2Id])
        .eq("user_id", userId);

      if (fetchErr) throw jsonError(500, "FETCH", fetchErr.message);
      if (!rows || rows.length !== 2) {
        throw jsonError(404, "NOT_FOUND", "Um ou dois mapas não foram encontrados.");
      }

      const chart1 = rows.find((r) => r.id === data.chart1Id)!;
      const chart2 = rows.find((r) => r.id === data.chart2Id)!;

      const payload1 = chartRowToChartData(chart1);
      const payload2 = chartRowToChartData(chart2);

      const analysis = analyzeSynastry(
        payload1.planets,
        payload2.planets,
        chart1.name,
        chart2.name,
      );

      const compatibility_data = {
        chart1Name: chart1.name,
        chart2Name: chart2.name,
        aspects: analysis.aspects,
        areas: analysis.areas,
        highlights: analysis.highlights,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("synastries")
        .insert({
          user_id: userId,
          chart1_id: chart1.id,
          chart2_id: chart2.id,
          compatibility_score: analysis.overallScore,
          compatibility_data: compatibility_data as unknown as Json,
        })
        .select()
        .single();

      if (insertErr) throw jsonError(500, "INSERT", insertErr.message);

      return {
        synastry: inserted,
        analysis,
        baseChart: payload1,
        overlayChart: payload2,
      };
    }),
  );

/** Remove uma sinastria guardada (apenas o dono). */
export const deleteSynastryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = z.string().uuid().safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("deleteSynastryFn", async ({ data: synastryId, context }) => {
      const { supabase, userId } = context;
      const { error } = await supabase
        .from("synastries")
        .delete()
        .eq("id", synastryId)
        .eq("user_id", userId);
      if (error) throw jsonError(500, "DELETE", error.message);
      return { ok: true };
    }),
  );
