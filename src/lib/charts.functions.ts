import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { calculateChart } from "@/lib/astrology/calculate";
import { birthChartInputSchema } from "@/lib/schemas/birth-chart";

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Cria mapa natal no banco após cálculo no servidor; respeita limite FREE (1 mapa). */
export const createChartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = birthChartInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("subscription_tier")
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
    const computed = calculateChart({
      birthDate: data.birthDate,
      birthTime,
      latitude: data.latitude,
      longitude: data.longitude,
      timezoneOffset: data.timezoneOffsetMinutes,
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
        planets_data: computed.planets as unknown as Json,
        houses_data: computed.houses as unknown as Json,
        aspects_data: computed.aspects as unknown as Json,
        is_primary: wantPrimary,
      })
      .select()
      .single();

    if (insertErr) throw jsonError(500, "INSERT", insertErr.message);

    return { chart: row, computed };
  });
