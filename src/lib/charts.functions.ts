import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { HouseSystemId } from "@/lib/astrology/calculate";
import { calculateChart } from "@/lib/astrology/calculate";
import { birthChartInputSchema } from "@/lib/schemas/birth-chart";
import { recalculateChartInputSchema } from "@/lib/schemas/server-fns";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { parseTimezoneLabelToMinutes } from "@/lib/timezone-br";

/** Cria mapa natal no banco após cálculo no servidor; respeita limite FREE (1 mapa). */
export const createChartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = birthChartInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("createChartFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("subscription_tier, house_system")
        .eq("id", userId)
        .single();

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const tier = profile?.subscription_tier ?? "FREE";

      const { count, error: countErr } = await supabase
        .from("charts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (countErr) throw jsonError(500, "COUNT", countErr.message);

      const existing = count ?? 0;
      if (tier === "FREE" && existing >= 1) {
        throw jsonError(
          403,
          "FREE_LIMIT",
          "No plano gratuito você pode ter apenas um mapa. Faça upgrade para criar mais.",
        );
      }

      const birthTime = data.birthTimeKnown ? data.birthTime : "12:00";
      const houseSystem = (profile?.house_system as HouseSystemId | undefined) ?? "placidus";
      const computed = calculateChart({
        birthDate: data.birthDate,
        birthTime,
        latitude: data.latitude,
        longitude: data.longitude,
        timezoneOffset: data.timezoneOffsetMinutes,
        houseSystem,
      });

      const wantPrimary = data.setPrimary ?? existing === 0;

      if (wantPrimary) {
        await supabase.from("charts").update({ is_primary: false }).eq("user_id", userId);
      }

      const { data: row, error: insertErr } = await supabase
        .from("charts")
        .insert({
          user_id: userId,
          name: data.name,
          birth_date: data.birthDate,
          birth_time: birthTime,
          birth_time_known: data.birthTimeKnown,
          birth_place: data.birthPlace,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          timezone_offset_minutes: data.timezoneOffsetMinutes,
          house_system: houseSystem,
          planets_data: computed.planets as unknown as Json,
          houses_data: computed.houses as unknown as Json,
          aspects_data: computed.aspects as unknown as Json,
          is_primary: wantPrimary,
        })
        .select()
        .single();

      if (insertErr) throw jsonError(500, "INSERT", insertErr.message);

      return { chart: row, computed };
    }),
  );

/** Recalcula planetas, casas e aspectos (ex.: mapas antigos só com 10 corpos). */
export const recalculateChartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = recalculateChartInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("recalculateChartFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;

      const [{ data: chart, error: fetchErr }, { data: profile, error: profileErr }] =
        await Promise.all([
          supabase.from("charts").select("*").eq("id", data.chartId).eq("user_id", userId).single(),
          supabase.from("profiles").select("house_system").eq("id", userId).single(),
        ]);

      if (fetchErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");
      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const offset =
        chart.timezone_offset_minutes ?? parseTimezoneLabelToMinutes(chart.timezone) ?? -180;

      const houseSystem =
        (chart.house_system as HouseSystemId | null) ??
        (profile?.house_system as HouseSystemId | undefined) ??
        "placidus";

      const computed = calculateChart({
        birthDate: chart.birth_date,
        birthTime: chart.birth_time,
        latitude: chart.latitude,
        longitude: chart.longitude,
        timezoneOffset: offset,
        houseSystem,
      });

      const { data: updated, error: updateErr } = await supabase
        .from("charts")
        .update({
          planets_data: computed.planets as unknown as Json,
          houses_data: computed.houses as unknown as Json,
          aspects_data: computed.aspects as unknown as Json,
          timezone_offset_minutes: offset,
          house_system: houseSystem,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.chartId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateErr) throw jsonError(500, "UPDATE", updateErr.message);

      return { chart: updated, computed };
    }),
  );
