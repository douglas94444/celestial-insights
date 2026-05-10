import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chartRowToChartData } from "@/lib/chart-from-row";
import type { HouseSystemId } from "@/lib/astrology/calculate";
import { analyzeTransitDay, formatTransitDayTitle } from "@/lib/astrology/transits";
import { ASPECT_LABELS } from "@/data/chart-detail-interpretations";
import { PLANETS } from "@/lib/astrology/zodiac";

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sendTransitDigestInputSchema = z.object({
  chartId: z.string().uuid(),
  /** YYYY-MM-DD; default hoje UTC+offset não aplicado — use data local no cliente */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Envia um resumo de trânsitos por email (Resend). Requer RESEND_API_KEY e RESEND_FROM_EMAIL opcional. */
export const sendTransitDigestEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = sendTransitDigestInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "AstroMap <onboarding@resend.dev>";

    if (!apiKey) {
      throw jsonError(
        503,
        "EMAIL_DISABLED",
        "Envio de email não está configurado. Defina RESEND_API_KEY no ambiente do servidor.",
      );
    }

    const supabase = context.supabase;
    const userId = context.userId;

    const [{ data: profile, error: profileErr }, { data: authUser, error: authErr }] =
      await Promise.all([
        supabase.from("profiles").select("email_notifications").eq("id", userId).single(),
        supabase.auth.getUser(),
      ]);

    if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);
    if (!profile?.email_notifications) {
      throw jsonError(
        400,
        "OPT_OUT",
        "Ative «Receber atualizações por email» nas Preferências para enviar o resumo.",
      );
    }
    if (authErr || !authUser.user?.email) {
      throw jsonError(400, "NO_EMAIL", "Não foi possível obter o email da sua conta.");
    }

    const { data: chart, error: chartErr } = await supabase
      .from("charts")
      .select("*")
      .eq("id", data.chartId)
      .eq("user_id", userId)
      .single();

    if (chartErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

    const dateStr =
      data.date ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD

    const cd = chartRowToChartData(chart);
    const houseSystem = (chart.house_system as HouseSystemId | undefined) ?? "placidus";
    const day = analyzeTransitDay(dateStr, cd.planets, cd.houses, cd.ascendant, houseSystem);

    const title = formatTransitDayTitle(day.date);
    const planet = (k: string) => PLANETS.find((p) => p.key === k)?.name ?? k;

    const aspectLines = day.aspects.slice(0, 12).map((a) => {
      return `<li>${planet(a.planet1)} (trânsito) ${ASPECT_LABELS[a.type]} ${planet(a.planet2)} natal — orbe ${a.orb}°</li>`;
    });

    const html = `
      <h1>Trânsitos — ${chart.name}</h1>
      <p><strong>${title}</strong></p>
      <p>Lua em trânsito: ${day.transitMoonSign || "—"} · Intensidade do dia (indicador): ${day.intensity}/100</p>
      <h2>Destaques</h2>
      <ul>${day.narrative.map((n) => `<li>${n}</li>`).join("")}</ul>
      <h2>Aspectos trânsito × natal</h2>
      <ul>${aspectLines.join("")}</ul>
      <p style="margin-top:24px;font-size:12px;color:#666;">AstroMap · indicadores para reflexão, não substituem orientação profissional.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [authUser.user.email],
        subject: `Trânsitos ${day.date} — ${chart.name}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Resend]", res.status, errText);
      throw jsonError(
        502,
        "RESEND",
        "Falha ao enviar email. Verifique o domínio remetente na Resend.",
      );
    }

    return { ok: true as const, to: authUser.user.email, date: day.date };
  });
