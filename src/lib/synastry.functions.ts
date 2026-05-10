import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { analyzeSynastry } from "@/lib/astrology/synastry";

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const saveSynastryInputSchema = z.object({
  chart1Id: z.string().uuid(),
  chart2Id: z.string().uuid(),
});

/** Calcula sinastria entre dois mapas do utilizador e persiste em `synastries`. */
export const calculateAndSaveSynastryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = saveSynastryInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

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

    const analysis = analyzeSynastry(payload1.planets, payload2.planets, chart1.name, chart2.name);

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
  });
