import { addDays, format, parseISO } from "date-fns";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeTransitDay } from "@/lib/astrology/transits";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { getMoodHistoryInputSchema, upsertMoodInputSchema } from "@/lib/schemas/server-fns";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { fetchProfileRolloutState } from "@/lib/subscription-rollout";
import type { HouseSystemId } from "@/lib/astrology/calculate";

function eachYmdInClosedRange(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = parseISO(`${startYmd}T12:00:00.000Z`);
  const end = parseISO(`${endYmd}T12:00:00.000Z`);
  while (cur.getTime() <= end.getTime()) {
    out.push(format(cur, "yyyy-MM-dd"));
    cur = addDays(cur, 1);
  }
  return out;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function correlationBlurb(
  moodsRows: { ymd: string; mood_score: number }[],
  intensityByYmd: Record<string, number>,
): string | null {
  const paired = moodsRows
    .map((r) => {
      const ins = intensityByYmd[r.ymd];
      return ins !== undefined ? { mood: r.mood_score, ins } : null;
    })
    .filter((x): x is { mood: number; ins: number } => x !== null);
  if (paired.length < 8) return null;
  const intensities = paired.map((p) => p.ins).sort((a, b) => a - b);
  const mid = intensities[Math.floor(intensities.length / 2)]!;
  const highs = paired.filter((p) => p.ins >= mid);
  const lows = paired.filter((p) => p.ins < mid);
  if (highs.length < 3 || lows.length < 3) return null;
  const uh = mean(highs.map((p) => p.mood));
  const ul = mean(lows.map((p) => p.mood));
  if (uh > ul + 0.4) {
    return "Nos dias com trânsitos mais intensos, seu humor tende a subir em média.";
  }
  if (uh < ul - 0.4) {
    return "Nos dias com trânsitos mais intensos, seu humor tende a cair em média.";
  }
  return "Humor e intensidade dos trânsitos aparecem equilibrados na média destes registos.";
}

export const upsertMoodFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = upsertMoodInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("upsertMoodFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      let chartId: string | null = data.chartId ?? null;
      if (chartId) {
        const { data: ch, error } = await supabase
          .from("charts")
          .select("id")
          .eq("id", chartId)
          .eq("user_id", userId)
          .maybeSingle();
        if (error || !ch) chartId = null;
      }

      const { error } = await supabase.from("mood_logs").upsert(
        {
          user_id: userId,
          chart_id: chartId,
          ymd: data.ymd,
          mood_score: data.moodScore,
          emotions: data.emotions,
          note: data.note ?? null,
        },
        { onConflict: "user_id,ymd" },
      );
      if (error) throw jsonError(400, "UPSERT", error.message);
      return { ok: true as const };
    }),
  );

export const getMoodHistoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = getMoodHistoryInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("getMoodHistoryFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const rollout = await fetchProfileRolloutState(supabase, userId);

      const startMs = Date.parse(`${data.startYmd}T12:00:00.000Z`);
      const endMs = Date.parse(`${data.endYmd}T12:00:00.000Z`);
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
        throw jsonError(400, "DATES", "Intervalo de datas inválido.");
      }

      const { data: chart, error: chartErr } = await supabase
        .from("charts")
        .select("*")
        .eq("id", data.chartId)
        .eq("user_id", userId)
        .single();
      if (chartErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

      const chartData = chartRowToChartData(chart);
      const houseSystem = chart.house_system as HouseSystemId;
      const ascendant = chartData.ascendant;

      const ymRange = eachYmdInClosedRange(data.startYmd, data.endYmd);
      const intensityByYmd: Record<string, number> = {};
      if (rollout.gates.transits || !rollout.applies) {
        for (const ymd of ymRange) {
          const day = analyzeTransitDay(
            ymd,
            chartData.planets,
            chartData.houses,
            ascendant,
            houseSystem,
          );
          intensityByYmd[ymd] = day.intensity;
        }
      }

      const { data: rows, error: qErr } = await supabase
        .from("mood_logs")
        .select("ymd, mood_score, emotions, note")
        .eq("user_id", userId)
        .gte("ymd", data.startYmd)
        .lte("ymd", data.endYmd)
        .order("ymd", { ascending: true });

      if (qErr) throw jsonError(400, "QUERY", qErr.message);

      const entries =
        rows?.map((r) => ({
          ymd: r.ymd,
          mood_score: r.mood_score,
          emotions: r.emotions ?? [],
          note: r.note ?? null,
        })) ?? [];

      const correlationNote =
        rollout.applies && !rollout.gates.moodAdvanced
          ? null
          : correlationBlurb(
              entries.map((e) => ({ ymd: e.ymd, mood_score: e.mood_score })),
              intensityByYmd,
            );

      return {
        entries,
        intensityByYmd,
        correlationNote,
      };
    }),
  );
