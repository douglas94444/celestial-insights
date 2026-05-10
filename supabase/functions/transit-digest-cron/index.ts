import { createClient } from "jsr:@supabase/supabase-js@2";
import type { HouseSystemId } from "../_shared/calculate.ts";
import { chartRowToChartData, type ChartRow } from "../_shared/chart-from-row.ts";
import { secretsMatchConstantTime, saoPauloDigestContext } from "../_shared/cron-utils.ts";
import { buildTransitDigestHtml } from "../_shared/digest-html.ts";
import { analyzeTransitDay } from "../_shared/transits.ts";

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
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
    throw new Error(`RESEND_${res.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ code: "METHOD", message: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedSecret = Deno.env.get("TRANSIT_DIGEST_CRON_SECRET") ?? "";
  let cronSecret = "";
  try {
    const body = (await req.json()) as { cronSecret?: unknown };
    cronSecret = typeof body.cronSecret === "string" ? body.cronSecret : "";
  } catch {
    /* ignore */
  }

  if (!expectedSecret || !secretsMatchConstantTime(cronSecret, expectedSecret)) {
    return new Response(
      JSON.stringify({
        code: "UNAUTHORIZED",
        message: "Credencial de cron inválida ou não configurada.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "AstroMap <onboarding@resend.dev>";
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        code: "EMAIL_DISABLED",
        message: "RESEND_API_KEY não configurada — não é possível enviar digest.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({
        code: "MISSING_CONFIG",
        message: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta no ambiente da função.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { dateStr, hour, weekday } = saoPauloDigestContext();

  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("id, transit_digest_hour, transit_digest_weekdays, email_notifications")
    .eq("transit_digest_auto", true)
    .eq("email_notifications", true);

  if (profErr) {
    return new Response(JSON.stringify({ code: "PROFILES", message: profErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

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

    const { data: chartRows } = await admin
      .from("charts")
      .select("*")
      .eq("user_id", row.id)
      .order("is_primary", { ascending: false })
      .limit(1);

    const chart = chartRows?.[0] as ChartRow | undefined;
    if (!chart) {
      skipped++;
      continue;
    }

    const { data: authRow, error: authErr } = await admin.auth.admin.getUserById(row.id);
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

  return new Response(
    JSON.stringify({
      ok: true,
      dateStr,
      hour,
      weekday,
      sent,
      skipped,
      scanned: profiles?.length ?? 0,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
