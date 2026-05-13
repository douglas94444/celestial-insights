import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ASPECT_LABELS } from "@/data/chart-detail-interpretations";
import type { HouseSystemId } from "@/lib/astrology/calculate";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import { analyzeTransitDay, formatTransitDayTitle } from "@/lib/astrology/transits";
import { getPlanetName, type SignName } from "@/lib/astrology/zodiac";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { buildShareCardDailyExtras, buildTransitLuckFingerprint } from "@/data/share-card-daily";
import { assertCronCallerIpAllowed } from "@/lib/cron-caller-guard";
import { escapeHtml } from "@/lib/html-escape";
import { cronTransitDigestSchema, sendTransitDigestInputSchema } from "@/lib/schemas/server-fns";
import { jsonError, secretsMatchConstantTime, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import {
  assertRolloutGate,
  getRolloutDayIndexSp,
  rolloutGateEnforcementActive,
  rolloutGatesForTier,
} from "@/lib/subscription-rollout";

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

export function buildTransitDigestHtml(chartName: string, day: TransitDayPayload): string {
  const title = formatTransitDayTitle(day.date);
  const aspectLines = day.aspects.slice(0, 12).map((a) => {
    const p1 = escapeHtml(getPlanetName(a.planet1));
    const p2 = escapeHtml(getPlanetName(a.planet2));
    const aspectLabel = escapeHtml(ASPECT_LABELS[a.type] ?? String(a.type));
    const orb = escapeHtml(String(a.orb));
    return `<li>${p1} (trânsito) ${aspectLabel} ${p2} natal — orbe ${orb}°</li>`;
  });
  const hintsBlock =
    day.interpretiveHints.length > 0
      ? `<h2>Sugestões para reflexão</h2><ul>${day.interpretiveHints
          .slice(0, 5)
          .map((h) => `<li>${escapeHtml(h)}</li>`)
          .join("")}</ul>`
      : "";
  const moon = escapeHtml(day.transitMoonSign || "—");
  return `
      <h1>Trânsitos — ${escapeHtml(chartName)}</h1>
      <p><strong>${escapeHtml(title)}</strong></p>
      <p>Lua em trânsito: ${moon} · Intensidade do dia (indicador): ${day.intensity}/100</p>
      <p>Sinais do dia (heurística — só reflexão): humor ${day.scores.humor}/100 · relações ${day.scores.amor}/100 · trabalho ${day.scores.trabalho}/100</p>
      <h2>Destaques</h2>
      <ul>${day.narrative.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      ${hintsBlock}
      <h2>Aspectos trânsito × natal</h2>
      <ul>${aspectLines.join("")}</ul>
      <p style="margin-top:24px;font-size:12px;color:#666;">AstroMap · indicadores para reflexão, não substituem orientação profissional.</p>
    `;
}

export function buildMomentDailyDigestHtml(opts: {
  greetingName: string;
  chartName: string;
  dateStr: string;
  luckLine: string;
  colorLabel: string;
  colorHex: string;
  transitMoonSign: string;
  intensity: number;
  narrativePreview: string;
  appBaseUrl: string;
}): string {
  const base = opts.appBaseUrl.replace(/\/$/, "");
  const linkHref = base ? `${base}/momento` : "";
  const linkBlock = linkHref
    ? `<p><a href="${escapeHtml(linkHref)}">Abrir o seu Momento</a></p>`
    : "<p>Abra o AstroMap e vá à página Momento.</p>";
  return `
      <h1>Olá, ${escapeHtml(opts.greetingName)}</h1>
      <p><strong>${escapeHtml(opts.dateStr)}</strong> · mapa ${escapeHtml(opts.chartName)}</p>
      <p><strong>Sorte do dia:</strong> ${escapeHtml(opts.luckLine)}</p>
      <p><strong>Cor sugerida:</strong> ${escapeHtml(opts.colorLabel)} (${escapeHtml(opts.colorHex)})</p>
      <p>Lua em trânsito: ${escapeHtml(opts.transitMoonSign)} · Intensidade ${opts.intensity}/100</p>
      <blockquote style="margin:16px 0;padding-left:12px;border-left:3px solid #9370db;">${escapeHtml(opts.narrativePreview)}</blockquote>
      ${linkBlock}
      <p style="margin-top:24px;font-size:12px;color:#666;">AstroMap · reflexão simbólica; não substitui apoio profissional.</p>
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

/** Envia um resumo de trânsitos por email (Resend). Requer RESEND_API_KEY e RESEND_FROM_EMAIL opcional. */
export const sendTransitDigestEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = sendTransitDigestInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("sendTransitDigestEmailFn", async ({ data, context }) => {
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
          supabase
            .from("profiles")
            .select("email_notifications, subscription_tier, created_at")
            .eq("id", userId)
            .single(),
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
      const tier = profile?.subscription_tier ?? "MENSAL";
      const dayIdx = getRolloutDayIndexSp(profile?.created_at ?? new Date().toISOString());
      const applies = rolloutGateEnforcementActive(tier, dayIdx);
      const gates = rolloutGatesForTier(tier, dayIdx);
      assertRolloutGate(applies, gates.digestEmail, "digestEmail", dayIdx, { tier });
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

      // Rate limit: 1 manual digest per chart per date (prevents accidental spam)
      const since24h = new Date(Date.now() - 86_400_000).toISOString();
      const { count: recentCount } = await supabase
        .from("user_engagement_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("topic_key", "transit_digest_sent")
        .eq("route_key", data.chartId)
        .gte("created_at", since24h);
      if ((recentCount ?? 0) > 0) {
        throw jsonError(
          429,
          "ALREADY_SENT",
          "Digest para este mapa já foi enviado hoje. Tente novamente amanhã.",
        );
      }

      const html = buildTransitDigestHtml(chart.name, day);

      await sendViaResend({
        apiKey,
        from,
        to: authUser.user.email,
        subject: `Trânsitos ${day.date} — ${chart.name}`,
        html,
      });

      // Record the send so the rate limit check above works
      void supabase.from("user_engagement_events").insert({
        user_id: userId,
        route_key: data.chartId,
        topic_key: "transit_digest_sent",
        meta: { date: day.date } as unknown as import("@/integrations/supabase/types").Json,
      });

      return { ok: true as const, to: authUser.user.email, date: day.date };
    }),
  );

/**
 * Digest automático: utilizadores com `transit_digest_auto` e horário/dias coincidentes (fus São Paulo).
 * Chamar por cron HTTP POST com JSON `{ "cronSecret": "<TRANSIT_DIGEST_CRON_SECRET>" }`.
 * Requer SUPABASE_SERVICE_ROLE_KEY e RESEND_API_KEY no servidor.
 */
export const processTransitDigestCronFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const parsed = cronTransitDigestSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("processTransitDigestCronFn", async ({ data }) => {
      const expected = process.env.TRANSIT_DIGEST_CRON_SECRET;
      if (!expected || !secretsMatchConstantTime(String(data.cronSecret), String(expected))) {
        throw jsonError(401, "UNAUTHORIZED", "Credencial de cron inválida ou não configurada.");
      }

      assertCronCallerIpAllowed();

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
        .select(
          "id, transit_digest_hour, transit_digest_weekdays, email_notifications, subscription_tier, created_at",
        )
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

        const dIdx = getRolloutDayIndexSp(row.created_at);
        const t = row.subscription_tier ?? "MENSAL";
        if (rolloutGateEnforcementActive(t, dIdx) && !rolloutGatesForTier(t, dIdx).digestEmail) {
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

        const { data: authRow, error: authErr } = await supabaseAdmin.auth.admin.getUserById(
          row.id,
        );
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
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[transit-digest-cron] email failed", row.id, msg.slice(0, 200));
          skipped++;
        }
      }

      const appBaseUrl = process.env.APP_PUBLIC_URL ?? "";

      const { data: momentProfiles, error: mpErr } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, name, transit_digest_hour, transit_digest_weekdays, email_notifications, subscription_tier, created_at",
        )
        .eq("moment_daily_email", true)
        .eq("email_notifications", true);

      if (mpErr) throw jsonError(500, "PROFILES_MOMENT", mpErr.message);

      let momentSent = 0;
      let momentSkipped = 0;

      for (const row of momentProfiles ?? []) {
        if (row.transit_digest_hour !== hour) {
          momentSkipped++;
          continue;
        }
        const days = row.transit_digest_weekdays ?? [];
        if (!days.includes(weekday)) {
          momentSkipped++;
          continue;
        }

        const dIdxM = getRolloutDayIndexSp(row.created_at);
        const tM = row.subscription_tier ?? "MENSAL";
        if (
          rolloutGateEnforcementActive(tM, dIdxM) &&
          !rolloutGatesForTier(tM, dIdxM).digestEmail
        ) {
          momentSkipped++;
          continue;
        }

        const { data: chartRowsM } = await supabaseAdmin
          .from("charts")
          .select("*")
          .eq("user_id", row.id)
          .order("is_primary", { ascending: false })
          .limit(1);

        const chartM = chartRowsM?.[0];
        if (!chartM) {
          momentSkipped++;
          continue;
        }

        const { data: authRowM, error: authErrM } = await supabaseAdmin.auth.admin.getUserById(
          row.id,
        );
        const emailM = authRowM?.user?.email;
        if (authErrM || !emailM) {
          momentSkipped++;
          continue;
        }

        const cdM = chartRowToChartData(chartM);
        const houseSystemM = (chartM.house_system as HouseSystemId | undefined) ?? "placidus";
        const dayM = analyzeTransitDay(
          dateStr,
          cdM.planets,
          cdM.houses,
          cdM.ascendant,
          houseSystemM,
        );
        const sun = cdM.planets.find((p) => p.key === "sun");
        const sunSign = (sun?.sign as SignName | undefined) ?? null;
        const fp = buildTransitLuckFingerprint({
          date: dayM.date,
          transitMoonSign: dayM.transitMoonSign,
          intensity: dayM.intensity,
        });
        const extras = buildShareCardDailyExtras(sunSign, dateStr, fp);
        if (!extras) {
          momentSkipped++;
          continue;
        }

        const greetingName = row.name?.trim().split(/\s+/)[0] ?? chartM.name ?? "Olá";
        const narrativePreview =
          dayM.narrative[0]?.replace(/^✦\s*/, "").trim().slice(0, 320) ??
          "Reserve alguns minutos para ver o seu mapa de hoje.";

        const htmlM = buildMomentDailyDigestHtml({
          greetingName,
          chartName: chartM.name,
          dateStr: dayM.date,
          luckLine: extras.luckLine,
          colorLabel: extras.colorLabel,
          colorHex: extras.colorHex,
          transitMoonSign: dayM.transitMoonSign || "—",
          intensity: dayM.intensity,
          narrativePreview,
          appBaseUrl,
        });

        try {
          await sendViaResend({
            apiKey,
            from,
            to: emailM,
            subject: `Seu Momento — ${dayM.date}`,
            html: htmlM,
          });
          momentSent++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[moment-daily-email-cron] email failed", row.id, msg.slice(0, 200));
          momentSkipped++;
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
        momentSent,
        momentSkipped,
        momentScanned: momentProfiles?.length ?? 0,
      };
    }),
  );
