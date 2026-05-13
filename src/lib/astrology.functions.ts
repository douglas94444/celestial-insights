import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { userHasAdminRole } from "@/integrations/supabase/user-has-admin-role";
import { calculateChart } from "@/lib/astrology/calculate";
import { calculateChartPayloadSchema } from "@/lib/schemas/birth-chart";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Pré-visualização de mapa (cálculo puro). Limite por utilizador e hora via Supabase
 * (`chart_preview_calc_events`) e `CALCULATE_CHART_MAX_PER_USER_PER_HOUR` (predefinição 90).
 * Ver docs/operacao-ambiente.md.
 */
export const calculateChartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = calculateChartPayloadSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("calculateChartFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      let skipPreviewQuota = false;
      try {
        skipPreviewQuota = await userHasAdminRole(supabase, userId);
      } catch (e) {
        throw jsonError(500, "DB", e instanceof Error ? e.message : "Erro ao verificar admin.");
      }

      const maxPerHour = parsePositiveInt(process.env.CALCULATE_CHART_MAX_PER_USER_PER_HOUR, 90);
      const since = new Date(Date.now() - 3_600_000).toISOString();

      if (!skipPreviewQuota) {
        const { count, error: cntErr } = await supabase
          .from("chart_preview_calc_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", since);

        if (cntErr) throw jsonError(500, "QUOTA", cntErr.message);
        if ((count ?? 0) >= maxPerHour) {
          throw jsonError(
            429,
            "RATE_LIMIT",
            `Limite de ${maxPerHour} pré-visualizações por hora atingido. Tente mais tarde ou crie o mapa diretamente.`,
          );
        }
      }

      const result = calculateChart({
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        latitude: data.latitude,
        longitude: data.longitude,
        timezoneOffset: data.timezoneOffsetMinutes,
        houseSystem: data.houseSystem ?? "placidus",
      });

      if (!skipPreviewQuota) {
        const { error: insErr } = await supabase.from("chart_preview_calc_events").insert({
          user_id: userId,
        });
        if (insErr) {
          console.warn("[calculateChartFn] falha ao registar evento de quota:", insErr.message);
        }
      }

      return result;
    }),
  );
