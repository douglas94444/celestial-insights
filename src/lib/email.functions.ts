import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chartRowToChartData } from "@/lib/chart-from-row";
import type { HouseSystemId } from "@/lib/astrology/calculate";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import { analyzeTransitDay, formatTransitDayTitle } from "@/lib/astrology/transits";
import { ASPECT_LABELS } from "@/data/chart-detail-interpretations";
import { PLANETS } from "@/lib/astrology/zodiac";

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SP_TZ = "America/Sao_Paulo";

const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Hora civil e weekday em São Paulo para digest automático. */
export function saoPauloDigestContext(d = new Date()): {
  dateStr: string;
  hour: number;
  weekday: number;
} {
  const dateStr = d.toLocaleDateString("en-CA", { timeZone: SP_TZ });
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SP_TZ,
      hour: "2-digit",
      hour12: false,
    }).format(d),
    10,
  );
  const wdLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: SP_TZ,
    weekday: "short",
  }).format(d);
  const idx = WEEKDAY_SHORT_EN.indexOf(wdLabel as (typeof WEEKDAY_SHORT_EN)[number]);
  return { dateStr, hour: Number.isNaN(hour) ? 12 : hour, weekday: idx === -1 ? 0 : idx };
}

function planetPt(k: string) {
  return PLANETS.find((p) => p.key === k)?.name ?? k;
}

export function buildTransitDigestHtml(chartName: string, day: TransitDayPayload): string {
  const title = formatTransitDayTitle(day.date);
  const aspectLines = day.aspects.slice(0, 12).map((a) => {
    return `<li>${planetPt(a.planet1)} (trânsito) ${ASPECT_LABELS[a.type]} ${planetPt(
      a.planet2,
    )} natal — orbe ${a.orb}°</li>`;
  });
  const hintsBlock =
    day.interpretiveHints.length > 0
      ? `<h2>Sugestões para reflexão</h2><ul>${day.interpretiveHints
          .slice(0, 5)
          .map((h) => `<li>${h}</li>`)
          .join("")}</ul>`
      : "";
  return `
      <h1>Trânsitos — ${chartName}</h1>
      <p><strong>${title}</strong></p>
      <p>Lua em trânsito: ${day.transitMoonSign || "—"} · Intensidade do dia (indicador): ${day.intensity}/100</p>
      <p>Sinais do dia (heurística — só reflexão): humor ${day.scores.humor}/100 · relações ${day.scores.amor}/100 · trabalho ${day.scores.trabalho}/100</p>
      <h2>Destaques</h2>
      <ul>${day.narrative.map((n) => `<li>${n}</li>`).join("")}</ul>
      ${hintsBlock}
      <h2>Aspectos trânsito × natal</h2>
      <ul>${aspectLines.join("")}</ul>
      <p style="margin-top:24px;font-size:12px;color:#666;">AstroMap · indicadores para reflexão, não substituem orientação profissional.</p>
    `;
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
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

    const html = buildTransitDigestHtml(chart.name, day);

    await sendViaResend({
      apiKey,
      from,
      to: authUser.user.email,
      subject: `Trânsitos ${day.date} — ${chart.name}`,
      html,
    });

    return { ok: true as const, to: authUser.user.email, date: day.date };
  });

const cronTransitDigestSchema = z.object({
  cronSecret: z.string().min(16),
});

/**
 * Digest automático: utilizadores com `transit_digest_auto` e horário/dias coincidentes (fus São Paulo).
 * Chamar por cron HTTP POST com JSON `{ "cronSecret": "<TRANSIT_DIGEST_CRON_SECRET>" }`.
 * Requer SUPABASE_SERVICE_ROLE_KEY e RESEND_API_KEY no servidor.
 */
export const processTransitDigestCronFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const parsed = cronTransitDigestSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Payload inválido");
    }
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const expected = process.env.TRANSIT_DIGEST_CRON_SECRET;
    if (!expected || data.cronSecret !== expected) {
      throw jsonError(401, "UNAUTHORIZED", "Credencial de cron inválida ou não configurada.");
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL ?? "AstroMap <onboarding@resend.dev>";
    if (!apiKey) {
      throw jsonError(
        503,
        "EMAIL_DISABLED",
        "RESEND_API_KEY não configurada — não é possível enviar digest.",
      );
    }

    const { dateStr, hour, weekday } = saoPauloDigestContext();

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, transit_digest_hour, transit_digest_weekdays, email_notifications")
      .eq("transit_digest_auto", true)
      .eq("email_notifications", true);

    if (profErr) throw jsonError(500, "PROFILES", profErr.message);

    let sent = 0;
    let skipped = 0;

    for (const row of profiles ?? []) {
      if (row.transit_digest_hour !== hour) {
        skipped++;
        continue;
      }
      const days = row.transit_digest_weekdays ?? [];
      if (!days.includes(weekday)) {
        skipped++;
        continue;
      }

      const { data: chartRows } = await supabaseAdmin
        .from("charts")
        .select("*")
        .eq("user_id", row.id)
        .order("is_primary", { ascending: false })
        .limit(1);

      const chart = chartRows?.[0];
      if (!chart) {
        skipped++;
        continue;
      }

      const { data: authRow, error: authErr } = await supabaseAdmin.auth.admin.getUserById(row.id);
      const email = authRow?.user?.email;
      if (authErr || !email) {
        skipped++;
        continue;
      }

      const cd = chartRowToChartData(chart);
      const houseSystem = (chart.house_system as HouseSystemId | undefined) ?? "placidus";
      const day = analyzeTransitDay(dateStr, cd.planets, cd.houses, cd.ascendant, houseSystem);
      const html = buildTransitDigestHtml(chart.name, day);

      try {
        await sendViaResend({
          apiKey,
          from,
          to: email,
          subject: `Trânsitos ${day.date} — ${chart.name}`,
          html,
        });
        sent++;
      } catch (e) {
        console.error("[transit-digest-cron]", row.id, e);
        skipped++;
      }
    }

    return {
      ok: true as const,
      dateStr,
      hour,
      weekday,
      sent,
      skipped,
      scanned: profiles?.length ?? 0,
    };
  });
