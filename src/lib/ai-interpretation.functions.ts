import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  AI_PROMPT_VERSION,
  buildNatalFingerprintPayload,
  buildSynastryFingerprintPayload,
  buildTransitFingerprintPayload,
  formatNatalPromptContext,
  formatSynastryPromptContext,
  formatTransitPromptContext,
  sha256FingerprintHex,
  type SynastryInterpretInput,
} from "@/lib/ai/chart-summary";
import { completeChat, resolveAiProvider } from "@/lib/ai/llm-provider";
import { analyzeTransitDay } from "@/lib/astrology/transits";
import type { HouseSystemId } from "@/lib/astrology/calculate";
import type { SynastryAreaScores, SynastryCrossAspect } from "@/lib/astrology/synastry";
import { PLANETS, type PlanetKey } from "@/lib/astrology/zodiac";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Tier = Database["public"]["Enums"]["subscription_tier"];
type InterpretationKind = Database["public"]["Enums"]["interpretation_ai_kind"];

const DISCLAIMER =
  "Este texto é uma reflexão simbólica para autoconhecimento; não substitui acompanhamento profissional de saúde nem consulta astrológica individualizada.";

const SYSTEM_ASTROLOGY_PT =
  'És um assistente de astrologia psicológica. Escreve em português do Brasil (PT-BR), com tom acolhedor e respeitoso. Evita fatalismo e previsões definitivas. Promove autoconhecimento e autonomia. Usa apenas os dados astrológicos que te forem dados; não inventes posições ou datas. Produz 2 a 4 parágrafos fluidos. No final, num parágrafo separado, inclui exactamente esta frase (entre aspas ou como citação): "' +
  DISCLAIMER +
  '".';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function assertAiGenerationAllowed(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: Tier,
): Promise<void> {
  const requirePremium = process.env.AI_INTERPRETATION_REQUIRE_PREMIUM === "true";
  if (requirePremium && tier !== "PREMIUM") {
    throw jsonError(
      403,
      "PREMIUM_REQUIRED",
      "As interpretações geradas por IA estão disponíveis para utilizadores Premium.",
    );
  }

  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const max24 =
    tier === "PREMIUM"
      ? parsePositiveInt(process.env.AI_INTERPRETATION_MAX_PER_24H_PREMIUM, 40)
      : parsePositiveInt(process.env.AI_INTERPRETATION_MAX_PER_24H_FREE, 8);

  const { count: c24, error: e24 } = await supabase
    .from("interpretation_ai_cache")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since24h);

  if (e24) throw jsonError(500, "QUOTA", e24.message);
  if ((c24 ?? 0) >= max24) {
    throw jsonError(
      429,
      "RATE_LIMIT",
      "Limite de gerações nas últimas 24 horas atingido. Volta a tentar mais tarde.",
    );
  }

  if (tier === "FREE" && !requirePremium) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const maxMonth = parsePositiveInt(process.env.AI_INTERPRETATION_FREE_TRIES_PER_MONTH, 3);
    const { count: cm, error: em } = await supabase
      .from("interpretation_ai_cache")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());

    if (em) throw jsonError(500, "QUOTA", em.message);
    if ((cm ?? 0) >= maxMonth) {
      throw jsonError(
        403,
        "MONTHLY_LIMIT",
        `No plano gratuito há um limite de ${maxMonth} interpretações novas por mês (cache repetido não conta).`,
      );
    }
  }
}

function parseSynastryPayload(raw: unknown): SynastryInterpretInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.chart1Name !== "string" ||
    typeof o.chart2Name !== "string" ||
    !Array.isArray(o.aspects) ||
    !o.areas ||
    typeof o.areas !== "object"
  ) {
    return null;
  }
  return {
    chart1Name: o.chart1Name,
    chart2Name: o.chart2Name,
    aspects: o.aspects as SynastryCrossAspect[],
    areas: o.areas as SynastryAreaScores,
    highlights: Array.isArray(o.highlights) ? (o.highlights as string[]) : [],
  };
}

async function fetchSynastryOwned(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: { synastryId?: string; chart1Id?: string; chart2Id?: string },
) {
  if (input.synastryId) {
    const { data, error } = await supabase
      .from("synastries")
      .select("*")
      .eq("id", input.synastryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw jsonError(500, "FETCH", error.message);
    return data;
  }
  const a = input.chart1Id!;
  const b = input.chart2Id!;
  async function tryPair(c1: string, c2: string) {
    const { data, error } = await supabase
      .from("synastries")
      .select("*")
      .eq("user_id", userId)
      .eq("chart1_id", c1)
      .eq("chart2_id", c2)
      .maybeSingle();
    if (error) throw jsonError(500, "FETCH", error.message);
    return data;
  }
  return (await tryPair(a, b)) ?? (await tryPair(b, a));
}

const planetKeyEnum = z.enum(PLANETS.map((p) => p.key) as [PlanetKey, ...PlanetKey[]]);

const chartIdSchema = z.object({
  chartId: z.string().uuid(),
});

const natalPlanetSchema = z.object({
  chartId: z.string().uuid(),
  planetKey: planetKeyEnum,
});

const synastryNarrativeSchema = z
  .object({
    synastryId: z.string().uuid().optional(),
    chart1Id: z.string().uuid().optional(),
    chart2Id: z.string().uuid().optional(),
  })
  .refine((d) => Boolean(d.synastryId) || (Boolean(d.chart1Id) && Boolean(d.chart2Id)), {
    message: "Indica synastryId ou chart1Id e chart2Id.",
  });

const transitDaySchema = z.object({
  chartId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const generateNatalExecutiveSummaryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = chartIdSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const kind: InterpretationKind = "natal_summary";

    const [{ data: profile, error: profileErr }, { data: chart, error: chartErr }] =
      await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
        supabase.from("charts").select("*").eq("id", data.chartId).eq("user_id", userId).single(),
      ]);

    if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);
    if (chartErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

    const tier = profile?.subscription_tier ?? "FREE";
    const fpPayload = buildNatalFingerprintPayload(chart, "natal_summary");
    const fingerprint = await sha256FingerprintHex(fpPayload);

    const { data: cached, error: cacheErr } = await supabase
      .from("interpretation_ai_cache")
      .select("content")
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
    if (cached?.content) return { cached: true as const, content: cached.content };

    await assertAiGenerationAllowed(supabase, userId, tier);

    if (!resolveAiProvider()) {
      throw jsonError(
        503,
        "LLM_NOT_CONFIGURED",
        "Serviço de IA não configurado no servidor (chaves em falta).",
      );
    }

    const chartData = chartRowToChartData(chart);
    const ctx = formatNatalPromptContext(chart, chartData);
    const userPrompt = `Com base nos dados seguintes, escreve uma interpretação integrada do mapa natal para alguém sem formação em astrologia.\n\n${ctx}`;

    const t0 = Date.now();
    let completion;
    try {
      completion = await completeChat(SYSTEM_ASTROLOGY_PT, userPrompt);
    } catch (e) {
      console.error("[ai-interpretation] natal_summary LLM", e);
      throw jsonError(
        503,
        "LLM_UNAVAILABLE",
        e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
      );
    }
    console.info(
      `[ai-interpretation] kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} ms=${Date.now() - t0}`,
    );

    const { error: insertErr } = await supabase.from("interpretation_ai_cache").insert({
      user_id: userId,
      kind,
      fingerprint,
      chart_id: chart.id,
      synastry_id: null,
      transit_date: null,
      prompt_version: AI_PROMPT_VERSION,
      model: completion.model,
      content: completion.text,
      tokens_in: completion.tokensIn ?? null,
      tokens_out: completion.tokensOut ?? null,
    });

    if (insertErr?.code === "23505") {
      const { data: row } = await supabase
        .from("interpretation_ai_cache")
        .select("content")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      if (row?.content) return { cached: true as const, content: row.content };
    }
    if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

    return { cached: false as const, content: completion.text };
  });

export const generateNatalPlanetInsightFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = natalPlanetSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const kind: InterpretationKind = "natal_planet";

    const [{ data: profile, error: profileErr }, { data: chart, error: chartErr }] =
      await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
        supabase.from("charts").select("*").eq("id", data.chartId).eq("user_id", userId).single(),
      ]);

    if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);
    if (chartErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

    const tier = profile?.subscription_tier ?? "FREE";
    const fpPayload = buildNatalFingerprintPayload(chart, "natal_planet", data.planetKey);
    const fingerprint = await sha256FingerprintHex(fpPayload);

    const { data: cached, error: cacheErr } = await supabase
      .from("interpretation_ai_cache")
      .select("content")
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
    if (cached?.content) return { cached: true as const, content: cached.content };

    await assertAiGenerationAllowed(supabase, userId, tier);

    if (!resolveAiProvider()) {
      throw jsonError(
        503,
        "LLM_NOT_CONFIGURED",
        "Serviço de IA não configurado no servidor (chaves em falta).",
      );
    }

    const chartData = chartRowToChartData(chart);
    const ctx = formatNatalPromptContext(chart, chartData);
    const meta = PLANETS.find((p) => p.key === data.planetKey);
    const planetLabel = meta?.name ?? data.planetKey;
    const userPrompt = `Contexto geral do mapa:\n${ctx}\n\nAprofunda sobretudo o significado psicológico e existencial de ${planetLabel} (${data.planetKey}) neste mapa — como se articula com casas, signo e aspectos listados. Não contradigas os dados; não cries posições novas.`;

    const t0 = Date.now();
    let completion;
    try {
      completion = await completeChat(SYSTEM_ASTROLOGY_PT, userPrompt);
    } catch (e) {
      console.error("[ai-interpretation] natal_planet LLM", e);
      throw jsonError(
        503,
        "LLM_UNAVAILABLE",
        e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
      );
    }
    console.info(
      `[ai-interpretation] kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} ms=${Date.now() - t0}`,
    );

    const { error: insertErr } = await supabase.from("interpretation_ai_cache").insert({
      user_id: userId,
      kind,
      fingerprint,
      chart_id: chart.id,
      synastry_id: null,
      transit_date: null,
      prompt_version: AI_PROMPT_VERSION,
      model: completion.model,
      content: completion.text,
      tokens_in: completion.tokensIn ?? null,
      tokens_out: completion.tokensOut ?? null,
    });

    if (insertErr?.code === "23505") {
      const { data: row } = await supabase
        .from("interpretation_ai_cache")
        .select("content")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      if (row?.content) return { cached: true as const, content: row.content };
    }
    if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

    return { cached: false as const, content: completion.text };
  });

export const generateSynastryNarrativeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = synastryNarrativeSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const kind: InterpretationKind = "synastry";

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);
    const tier = profile?.subscription_tier ?? "FREE";

    const row = await fetchSynastryOwned(supabase, userId, data);
    if (!row) throw jsonError(404, "NOT_FOUND", "Sinastria não encontrada.");

    const parsedPayload = parseSynastryPayload(row.compatibility_data);
    if (!parsedPayload) {
      throw jsonError(500, "INVALID_DATA", "Dados de compatibilidade inválidos.");
    }

    const fpPayload = buildSynastryFingerprintPayload(row, parsedPayload);
    const fingerprint = await sha256FingerprintHex(fpPayload);

    const { data: cached, error: cacheErr } = await supabase
      .from("interpretation_ai_cache")
      .select("content")
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
    if (cached?.content) return { cached: true as const, content: cached.content };

    await assertAiGenerationAllowed(supabase, userId, tier);

    if (!resolveAiProvider()) {
      throw jsonError(
        503,
        "LLM_NOT_CONFIGURED",
        "Serviço de IA não configurado no servidor (chaves em falta).",
      );
    }

    const ctx = formatSynastryPromptContext(row, parsedPayload);
    const userPrompt = `Escreve uma narrativa de sinastria (relação entre duas pessoas) em linguagem acessível, integrando tensões e recursos. Evita julgar a relação como «boa» ou «má».\n\n${ctx}`;

    const t0 = Date.now();
    let completion;
    try {
      completion = await completeChat(SYSTEM_ASTROLOGY_PT, userPrompt);
    } catch (e) {
      console.error("[ai-interpretation] synastry LLM", e);
      throw jsonError(
        503,
        "LLM_UNAVAILABLE",
        e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
      );
    }
    console.info(
      `[ai-interpretation] kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} ms=${Date.now() - t0}`,
    );

    const { error: insertErr } = await supabase.from("interpretation_ai_cache").insert({
      user_id: userId,
      kind,
      fingerprint,
      chart_id: null,
      synastry_id: row.id,
      transit_date: null,
      prompt_version: AI_PROMPT_VERSION,
      model: completion.model,
      content: completion.text,
      tokens_in: completion.tokensIn ?? null,
      tokens_out: completion.tokensOut ?? null,
    });

    if (insertErr?.code === "23505") {
      const { data: again } = await supabase
        .from("interpretation_ai_cache")
        .select("content")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      if (again?.content) return { cached: true as const, content: again.content };
    }
    if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

    return { cached: false as const, content: completion.text };
  });

export const generateTransitDayNarrativeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = transitDaySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Dados inválidos");
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const kind: InterpretationKind = "transit_day";

    const [{ data: profile, error: profileErr }, { data: chart, error: chartErr }] =
      await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
        supabase.from("charts").select("*").eq("id", data.chartId).eq("user_id", userId).single(),
      ]);

    if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);
    if (chartErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");

    const tier = profile?.subscription_tier ?? "FREE";
    const chartData = chartRowToChartData(chart);
    const houseSystem = (chart.house_system as HouseSystemId | undefined) ?? "placidus";
    const dayPayload = analyzeTransitDay(
      data.date,
      chartData.planets,
      chartData.houses,
      chartData.ascendant,
      houseSystem,
    );

    const fpPayload = buildTransitFingerprintPayload(chart, dayPayload);
    const fingerprint = await sha256FingerprintHex(fpPayload);

    const { data: cached, error: cacheErr } = await supabase
      .from("interpretation_ai_cache")
      .select("content")
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
    if (cached?.content) return { cached: true as const, content: cached.content };

    await assertAiGenerationAllowed(supabase, userId, tier);

    if (!resolveAiProvider()) {
      throw jsonError(
        503,
        "LLM_NOT_CONFIGURED",
        "Serviço de IA não configurado no servidor (chaves em falta).",
      );
    }

    const ctx = formatTransitPromptContext(chart, dayPayload);
    const userPrompt = `Explica em linguagem simples o «clima simbólico» deste dia para a pessoa deste mapa, usando apenas os trânsitos e aspectos indicados. Evita alarmismo.\n\n${ctx}`;

    const t0 = Date.now();
    let completion;
    try {
      completion = await completeChat(SYSTEM_ASTROLOGY_PT, userPrompt);
    } catch (e) {
      console.error("[ai-interpretation] transit_day LLM", e);
      throw jsonError(
        503,
        "LLM_UNAVAILABLE",
        e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
      );
    }
    console.info(
      `[ai-interpretation] kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} ms=${Date.now() - t0}`,
    );

    const { error: insertErr } = await supabase.from("interpretation_ai_cache").insert({
      user_id: userId,
      kind,
      fingerprint,
      chart_id: chart.id,
      synastry_id: null,
      transit_date: data.date,
      prompt_version: AI_PROMPT_VERSION,
      model: completion.model,
      content: completion.text,
      tokens_in: completion.tokensIn ?? null,
      tokens_out: completion.tokensOut ?? null,
    });

    if (insertErr?.code === "23505") {
      const { data: again } = await supabase
        .from("interpretation_ai_cache")
        .select("content")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();
      if (again?.content) return { cached: true as const, content: again.content };
    }
    if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

    return { cached: false as const, content: completion.text };
  });
