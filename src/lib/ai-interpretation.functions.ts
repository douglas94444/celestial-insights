import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_PROMPT_VERSION,
  MORNING_DEEP_PROMPT_VERSION,
  NATAL_ESSENCE_PROMPT_VERSION,
  SYNASTRY_DEEP_PROMPT_VERSION,
  buildMorningDeepFingerprintPayload,
  buildNatalEssenceFingerprintPayload,
  buildSynastryDeepFingerprintPayload,
  buildNatalFingerprintPayload,
  buildSynastryFingerprintPayload,
  buildTransitFingerprintPayload,
  formatNatalPromptContext,
  formatSynastryPromptContext,
  formatTransitPromptContext,
  patternsFingerprintCompact,
  sha256FingerprintHex,
  type SynastryInterpretInput,
} from "@/lib/ai/chart-summary";
import { extractFirstJsonObject } from "@/lib/ai/json-response";
import { completeChat, resolveAiProvider } from "@/lib/ai/llm-provider";
import type { HouseSystemId } from "@/lib/astrology/calculate";
import type { SynastryAreaScores, SynastryCrossAspect } from "@/lib/astrology/synastry";
import { analyzeTransitDay } from "@/lib/astrology/transits";
import { PLANETS } from "@/lib/astrology/zodiac";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { deriveChartPatterns } from "@/lib/chart-patterns";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  parseSynastryDeepCached,
  synastryDeepFromLlm,
  SYNASTRY_COMPOSITE_MVP_PT,
} from "@/lib/ai/synastry-deep-parse";
import {
  morningDeepOutputSchema,
  natalEssenceOutputSchema,
  type MorningDeepOutput,
} from "@/lib/schemas/personalization-ai";
import {
  morningDeepMessageInputSchema,
  natalEssenceInputSchema,
  natalExecutiveSummaryInputSchema,
  natalPlanetInsightInputSchema,
  synastryDeepNarrativeInputSchema,
  synastryNarrativeInputSchema,
  transitDayNarrativeInputSchema,
} from "@/lib/schemas/server-fns";
import {
  compactReadingHistoryForFingerprint,
  fetchReadingHistorySummary,
} from "@/lib/reading-history";
import {
  buildUserAstroProfile,
  parseFocusAreasFromProfileJson,
  userAstroProfileLuminariesNote,
} from "@/lib/user-astro-profile";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";

type Tier = Database["public"]["Enums"]["subscription_tier"];
type InterpretationKind = Database["public"]["Enums"]["interpretation_ai_kind"];

const DISCLAIMER =
  "Este texto é uma reflexão simbólica para autoconhecimento; não substitui acompanhamento profissional de saúde nem consulta astrológica individualizada.";

const SYSTEM_ASTROLOGY_PT =
  'És um assistente de astrologia psicológica. Escreve em português do Brasil (PT-BR), com tom acolhedor e respeitoso. Evita fatalismo e previsões definitivas. Promove autoconhecimento e autonomia. Usa apenas os dados astrológicos que te forem dados; não inventes posições ou datas. Produz 2 a 4 parágrafos fluidos. No final, num parágrafo separado, inclui exactamente esta frase (entre aspas ou como citação): "' +
  DISCLAIMER +
  '".';

const SYSTEM_ASTROLOGY_STRUCTURED_PT =
  "És um assistente de astrologia psicológica. Escreve em português do Brasil (PT-BR). " +
  "Responde APENAS com um único objeto JSON válido UTF-8 (sem markdown nem texto extra). " +
  "Evita fatalismo; não inventes posições nem horários exactos não fornecidos. " +
  'Inclui sempre textualmente em `closing_note` (mensagem profunda do dia) ou `integration_summary` (sinastria profunda) o aviso: "' +
  DISCLAIMER +
  '".';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type ChartsRow = Database["public"]["Tables"]["charts"]["Row"];

/** Mapa garantidamente do utilizador (`404` se não existir ou não pertencer ao user). */
async function fetchChartOwnedByUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  chartId: string,
): Promise<ChartsRow> {
  const { data: chart, error: chartErr } = await supabase
    .from("charts")
    .select("*")
    .eq("id", chartId)
    .eq("user_id", userId)
    .single();
  if (chartErr || !chart) throw jsonError(404, "NOT_FOUND", "Mapa não encontrado.");
  return chart;
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
      "As interpretações geradas por IA estão disponíveis para usuários Premium.",
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

function parseMorningDeepCached(content: string): MorningDeepOutput | null {
  try {
    const o = JSON.parse(content) as unknown;
    const p = morningDeepOutputSchema.safeParse(o);
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

function parseMorningDeepFromLlm(text: string): MorningDeepOutput {
  try {
    const raw = extractFirstJsonObject(text);
    const p = morningDeepOutputSchema.safeParse(raw);
    if (p.success) return p.data;
  } catch {
    /* ignore */
  }
  return {
    greeting: "Olá",
    main_message: text.trim().slice(0, 4200),
    practical_tip: "Reserva um momento calmo para integrar o dia.",
    affirmation: "Posso escolher como respondo ao que o dia pede.",
    closing_note: DISCLAIMER,
  };
}

function parseNatalEssenceCached(content: string): string | null {
  try {
    const o = JSON.parse(content) as unknown;
    const p = natalEssenceOutputSchema.safeParse(o);
    return p.success ? p.data.essence : null;
  } catch {
    return null;
  }
}

function parseNatalEssenceFromLlm(text: string): string {
  try {
    const raw = extractFirstJsonObject(text);
    const p = natalEssenceOutputSchema.safeParse(raw);
    if (p.success) return p.data.essence;
  } catch {
    /* ignore */
  }
  const t = text.replace(/^["']|["']$/g, "").trim();
  return t.slice(0, 220) || "Presença entre o céu interior e o mundo.";
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

export const generateNatalExecutiveSummaryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = natalExecutiveSummaryInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateNatalExecutiveSummaryFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      const kind: InterpretationKind = "natal_summary";

      const [{ data: profile, error: profileErr }, chart] = await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
        fetchChartOwnedByUser(supabase, userId, data.chartId),
      ]);

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const tier = profile?.subscription_tier ?? "FREE";
      const fpPayload = buildNatalFingerprintPayload(chart, "natal_summary");
      const fingerprint = await sha256FingerprintHex(fpPayload);

      const { data: cached, error: cacheErr } = await supabase
        .from("interpretation_ai_cache")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      if (cached?.content)
        return {
          cached: true as const,
          content: cached.content,
          cached_at: cached.created_at ?? null,
        };

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
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        if (row?.content)
          return {
            cached: true as const,
            content: row.content,
            cached_at: row.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, content: completion.text };
    }),
  );

export const generateNatalPlanetInsightFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = natalPlanetInsightInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateNatalPlanetInsightFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      const kind: InterpretationKind = "natal_planet";

      const [{ data: profile, error: profileErr }, chart] = await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
        fetchChartOwnedByUser(supabase, userId, data.chartId),
      ]);

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const tier = profile?.subscription_tier ?? "FREE";
      const fpPayload = buildNatalFingerprintPayload(chart, "natal_planet", data.planetKey);
      const fingerprint = await sha256FingerprintHex(fpPayload);

      const { data: cached, error: cacheErr } = await supabase
        .from("interpretation_ai_cache")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      if (cached?.content)
        return {
          cached: true as const,
          content: cached.content,
          cached_at: cached.created_at ?? null,
        };

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
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        if (row?.content)
          return {
            cached: true as const,
            content: row.content,
            cached_at: row.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, content: completion.text };
    }),
  );

export const generateSynastryNarrativeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = synastryNarrativeInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateSynastryNarrativeFn", async ({ data, context }) => {
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
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      if (cached?.content)
        return {
          cached: true as const,
          content: cached.content,
          cached_at: cached.created_at ?? null,
        };

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
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        if (again?.content)
          return {
            cached: true as const,
            content: again.content,
            cached_at: again.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, content: completion.text };
    }),
  );

export const generateTransitDayNarrativeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = transitDayNarrativeInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateTransitDayNarrativeFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      const kind: InterpretationKind = "transit_day";

      const [{ data: profile, error: profileErr }, chart] = await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", userId).single(),
        fetchChartOwnedByUser(supabase, userId, data.chartId),
      ]);

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

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
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      if (cached?.content)
        return {
          cached: true as const,
          content: cached.content,
          cached_at: cached.created_at ?? null,
        };

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
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        if (again?.content)
          return {
            cached: true as const,
            content: again.content,
            cached_at: again.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, content: completion.text };
    }),
  );

export const generateMorningDeepMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = morningDeepMessageInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateMorningDeepMessageFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      const kind: InterpretationKind = "morning_deep";

      const [{ data: profile, error: profileErr }, chart] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "subscription_tier, name, personalization_gender, personalization_tone, personalization_focus_areas",
          )
          .eq("id", userId)
          .single(),
        fetchChartOwnedByUser(supabase, userId, data.chartId),
      ]);

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

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

      const patterns = deriveChartPatterns(chartData);
      const patternsCompact = patternsFingerprintCompact(patterns);
      const readingHistory = await fetchReadingHistorySummary(supabase, userId);
      const readingCompact = compactReadingHistoryForFingerprint(readingHistory);

      const toneRaw = profile?.personalization_tone ?? "PRATICO";
      const genderRaw = profile?.personalization_gender ?? null;
      const focusAreas = parseFocusAreasFromProfileJson(profile?.personalization_focus_areas);

      const astroProfile = buildUserAstroProfile({
        chartRow: chart,
        chartData,
        profileDisplayName: profile?.name ?? null,
        personalizationGender: genderRaw,
        personalizationTone: toneRaw,
        personalizationFocusAreas: profile?.personalization_focus_areas ?? [],
        transitDay: dayPayload,
        readingHistory,
      });

      const fpPayload = buildMorningDeepFingerprintPayload({
        chart,
        dateYmd: data.date,
        tone: astroProfile.preferences.tone,
        gender: astroProfile.personal.gender,
        focusAreas,
        patternsCompact,
        readingHistoryCompact: readingCompact,
      });
      const fingerprint = await sha256FingerprintHex(fpPayload);

      const { data: cached, error: cacheErr } = await supabase
        .from("interpretation_ai_cache")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      const cachedParsed = cached?.content ? parseMorningDeepCached(cached.content) : null;
      if (cachedParsed)
        return {
          cached: true as const,
          morning: cachedParsed,
          cached_at: cached?.created_at ?? null,
        };

      await assertAiGenerationAllowed(supabase, userId, tier);

      if (!resolveAiProvider()) {
        throw jsonError(
          503,
          "LLM_NOT_CONFIGURED",
          "Serviço de IA não configurado no servidor (chaves em falta).",
        );
      }

      const transitCtx = formatTransitPromptContext(chart, dayPayload);
      const profileJson = JSON.stringify(astroProfile, null, 2);
      const userPrompt = `Perfil astrológico do utilizador (JSON):\n${profileJson}\n\nReferência rápida:\n${userAstroProfileLuminariesNote(astroProfile)}\n\nContexto do trânsito do dia:\n${transitCtx}\n\nTarefa: devolve um objeto JSON com as chaves exactas: greeting (saudação curta), main_message (2–4 parágrafos simbólicos integrando trânsito + padrões), secondary_theme (opcional, string curta), practical_tip (ação concreta), affirmation (uma frase), closing_note (deve incluir o aviso legal pedido no system). Tom preferido: ${astroProfile.preferences.tone}. Áreas de foco: ${focusAreas.length ? focusAreas.join(", ") : "equilíbrio geral"}.`;

      const t0 = Date.now();
      let completion;
      try {
        completion = await completeChat(SYSTEM_ASTROLOGY_STRUCTURED_PT, userPrompt, {
          maxTokens: 4096,
          maxResponseChars: 14_000,
          jsonObject: true,
        });
      } catch (e) {
        console.error("[ai-interpretation] morning_deep LLM", e);
        throw jsonError(
          503,
          "LLM_UNAVAILABLE",
          e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
        );
      }
      const morning = parseMorningDeepFromLlm(completion.text);
      console.info(
        `[ai-interpretation] kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} ms=${Date.now() - t0}`,
      );

      const serialized = JSON.stringify(morning);
      const { error: insertErr } = await supabase.from("interpretation_ai_cache").insert({
        user_id: userId,
        kind,
        fingerprint,
        chart_id: chart.id,
        synastry_id: null,
        transit_date: data.date,
        prompt_version: MORNING_DEEP_PROMPT_VERSION,
        model: completion.model,
        content: serialized,
        tokens_in: completion.tokensIn ?? null,
        tokens_out: completion.tokensOut ?? null,
      });

      if (insertErr?.code === "23505") {
        const { data: again } = await supabase
          .from("interpretation_ai_cache")
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        const p2 = again?.content ? parseMorningDeepCached(again.content) : null;
        if (p2)
          return {
            cached: true as const,
            morning: p2,
            cached_at: again?.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, morning };
    }),
  );

export const generateNatalEssenceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = natalEssenceInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateNatalEssenceFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      const kind: InterpretationKind = "natal_essence";

      const [{ data: profile, error: profileErr }, chart] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "subscription_tier, personalization_gender, personalization_tone, personalization_focus_areas",
          )
          .eq("id", userId)
          .single(),
        fetchChartOwnedByUser(supabase, userId, data.chartId),
      ]);

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const tier = profile?.subscription_tier ?? "FREE";
      const chartData = chartRowToChartData(chart);
      const patterns = deriveChartPatterns(chartData);
      const patternsCompact = patternsFingerprintCompact(patterns);
      const toneRaw = profile?.personalization_tone ?? "PRATICO";
      const genderRaw = profile?.personalization_gender ?? null;
      const focusAreas = parseFocusAreasFromProfileJson(profile?.personalization_focus_areas);

      const fpPayload = buildNatalEssenceFingerprintPayload({
        chart,
        tone: toneRaw,
        gender: genderRaw,
        focusAreas,
        patternsCompact,
      });
      const fingerprint = await sha256FingerprintHex(fpPayload);

      const { data: cached, error: cacheErr } = await supabase
        .from("interpretation_ai_cache")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      const essenceCached = cached?.content ? parseNatalEssenceCached(cached.content) : null;
      if (essenceCached)
        return {
          cached: true as const,
          essence: essenceCached,
          cached_at: cached?.created_at ?? null,
        };

      await assertAiGenerationAllowed(supabase, userId, tier);

      if (!resolveAiProvider()) {
        throw jsonError(
          503,
          "LLM_NOT_CONFIGURED",
          "Serviço de IA não configurado no servidor (chaves em falta).",
        );
      }

      const ctx = formatNatalPromptContext(chart, chartData);
      const userPrompt = `${ctx}\n\nTarefa: uma única linha «essência» do mapa (máx. 200 caracteres), voz activa, simbólica, sem contradizer dados. Tom preferido: ${toneRaw}. Áreas de foco: ${focusAreas.length ? focusAreas.join(", ") : "equilíbrio geral"}.\nDevolve JSON exacto: {"essence":"<texto>"}`;

      const t0 = Date.now();
      let completion;
      try {
        completion = await completeChat(SYSTEM_ASTROLOGY_STRUCTURED_PT, userPrompt, {
          maxTokens: 1024,
          maxResponseChars: 1200,
          jsonObject: true,
        });
      } catch (e) {
        console.error("[ai-interpretation] natal_essence LLM", e);
        throw jsonError(
          503,
          "LLM_UNAVAILABLE",
          e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
        );
      }
      const essence = parseNatalEssenceFromLlm(completion.text);
      const serialized = JSON.stringify({ essence });
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
        prompt_version: NATAL_ESSENCE_PROMPT_VERSION,
        model: completion.model,
        content: serialized,
        tokens_in: completion.tokensIn ?? null,
        tokens_out: completion.tokensOut ?? null,
      });

      if (insertErr?.code === "23505") {
        const { data: again } = await supabase
          .from("interpretation_ai_cache")
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        const e2 = again?.content ? parseNatalEssenceCached(again.content) : null;
        if (e2)
          return {
            cached: true as const,
            essence: e2,
            cached_at: again?.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, essence };
    }),
  );

export const generateSynastryDeepNarrativeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = synastryDeepNarrativeInputSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("generateSynastryDeepNarrativeFn", async ({ data, context }) => {
      const supabase = context.supabase;
      const userId = context.userId;
      const kind: InterpretationKind = "synastry_deep";

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select(
          "subscription_tier, personalization_gender, personalization_tone, personalization_focus_areas",
        )
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

      const toneRaw = profile?.personalization_tone ?? "PRATICO";
      const genderRaw = profile?.personalization_gender ?? null;
      const focusAreas = parseFocusAreasFromProfileJson(profile?.personalization_focus_areas);

      const fpPayload = buildSynastryDeepFingerprintPayload(row, parsedPayload, {
        tone: toneRaw,
        gender: genderRaw,
        focusAreas,
      });
      const fingerprint = await sha256FingerprintHex(fpPayload);

      const { data: cached, error: cacheErr } = await supabase
        .from("interpretation_ai_cache")
        .select("content, created_at")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("fingerprint", fingerprint)
        .maybeSingle();

      if (cacheErr) throw jsonError(500, "CACHE", cacheErr.message);
      const deepCached = cached?.content ? parseSynastryDeepCached(cached.content) : null;
      if (deepCached)
        return {
          cached: true as const,
          deep: deepCached,
          cached_at: cached?.created_at ?? null,
        };

      await assertAiGenerationAllowed(supabase, userId, tier);

      if (!resolveAiProvider()) {
        throw jsonError(
          503,
          "LLM_NOT_CONFIGURED",
          "Serviço de IA não configurado no servidor (chaves em falta).",
        );
      }

      const ctx = formatSynastryPromptContext(row, parsedPayload);
      const userPrompt = `${ctx}\n\nPontuações por área (ecoar sem contradizer): amor ${parsedPayload.areas.love}, amizade ${parsedPayload.areas.friendship}, trabalho ${parsedPayload.areas.work}, convivência ${parsedPayload.areas.convivencia}.\n\n${SYNASTRY_COMPOSITE_MVP_PT}\n\nTarefa: responde só com JSON com chaves exactas: composite_disclaimer (repete ou parafraseia a limitação do mapa composto acima), overview, emotional_dynamics, communication_styles, intimacy_attraction, conflict_repair, daily_rhythm, long_term_growth, integration_summary (inclui o aviso legal do system). Tom IA preferido: ${toneRaw}. Áreas de foco do utilizador: ${focusAreas.length ? focusAreas.join(", ") : "equilíbrio geral"}.`;

      const t0 = Date.now();
      let completion;
      try {
        completion = await completeChat(SYSTEM_ASTROLOGY_STRUCTURED_PT, userPrompt, {
          maxTokens: 4096,
          maxResponseChars: 18_000,
          jsonObject: true,
        });
      } catch (e) {
        console.error("[ai-interpretation] synastry_deep LLM", e);
        throw jsonError(
          503,
          "LLM_UNAVAILABLE",
          e instanceof Error ? e.message : "Não foi possível gerar a interpretação.",
        );
      }
      const { deep, parse_ok } = synastryDeepFromLlm(completion.text, DISCLAIMER);
      const serialized = JSON.stringify(deep);
      if (!parse_ok) {
        console.warn(
          `[ai-interpretation] synastry_deep_parse_fallback kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} response_chars=${completion.text.length}`,
        );
      }
      console.info(
        `[ai-interpretation] kind=${kind} fp=${fingerprint.slice(0, 12)} model=${completion.model} ms=${Date.now() - t0} parse_ok=${parse_ok}`,
      );

      const { error: insertErr } = await supabase.from("interpretation_ai_cache").insert({
        user_id: userId,
        kind,
        fingerprint,
        chart_id: null,
        synastry_id: row.id,
        transit_date: null,
        prompt_version: SYNASTRY_DEEP_PROMPT_VERSION,
        model: completion.model,
        content: serialized,
        tokens_in: completion.tokensIn ?? null,
        tokens_out: completion.tokensOut ?? null,
      });

      if (insertErr?.code === "23505") {
        const { data: again } = await supabase
          .from("interpretation_ai_cache")
          .select("content, created_at")
          .eq("user_id", userId)
          .eq("kind", kind)
          .eq("fingerprint", fingerprint)
          .maybeSingle();
        const d2 = again?.content ? parseSynastryDeepCached(again.content) : null;
        if (d2)
          return {
            cached: true as const,
            deep: d2,
            cached_at: again?.created_at ?? null,
          };
      }
      if (insertErr) throw jsonError(500, "CACHE_WRITE", insertErr.message);

      return { cached: false as const, deep };
    }),
  );
