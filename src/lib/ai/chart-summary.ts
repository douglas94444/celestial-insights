import type { Database } from "@/integrations/supabase/types";
import type { Aspect, ChartData, PlanetPosition } from "@/lib/astrology/calculate";
import { chartRowToChartData } from "@/lib/chart-from-row";
import type { DerivedChartPatterns } from "@/lib/chart-patterns";
import type { SynastryAreaScores, SynastryCrossAspect } from "@/lib/astrology/synastry";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import type { PlanetKey } from "@/lib/astrology/zodiac";

export type ChartRow = Database["public"]["Tables"]["charts"]["Row"];
export type SynastryRow = Database["public"]["Tables"]["synastries"]["Row"];

/** Versão do prompt incluída no fingerprint para invalidar cache ao mudar instruções. */
export const AI_PROMPT_VERSION = "v1";

export const MORNING_DEEP_PROMPT_VERSION = "md-v1";
export const NATAL_ESSENCE_PROMPT_VERSION = "ne-v1";
export const SYNASTRY_DEEP_PROMPT_VERSION = "sd-v1";

export function patternsFingerprintCompact(patterns: DerivedChartPatterns) {
  return {
    dominant_element: patterns.dominant_element,
    dominant_modality: patterns.dominant_modality,
    chart_shape: patterns.chart_shape,
    stelliums: patterns.stelliums.map((s) => ({
      kind: s.kind,
      sign: s.sign,
      house: s.house,
      planets: [...s.planets].sort(),
    })),
    life_purpose: patterns.life_purpose,
    main_challenges: patterns.main_challenges,
    natural_talents: patterns.natural_talents,
    grand_trines: patterns.grand_trines.map((g) => ({
      planets: [...g.planets].sort(),
      element: g.element,
    })),
    t_squares: patterns.t_squares.map((t) => ({
      apex: t.apex,
      opposition: [...t.opposition].sort(),
    })),
    grand_crosses: patterns.grand_crosses.map((g) => ({
      planets: [...g.planets].sort(),
    })),
    yods: patterns.yods.map((y) => ({
      apex: y.apex,
      sextile: [...y.sextile].sort(),
    })),
  };
}

export type PatternsFingerprintCompact = ReturnType<typeof patternsFingerprintCompact>;

export function buildMorningDeepFingerprintPayload(args: {
  chart: ChartRow;
  dateYmd: string;
  tone: string;
  gender: string | null;
  focusAreas: string[];
  patternsCompact: PatternsFingerprintCompact;
  readingHistoryCompact: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    pv: MORNING_DEEP_PROMPT_VERSION,
    chartUpdatedAt: args.chart.updated_at,
    date: args.dateYmd,
    tone: args.tone,
    gender: args.gender,
    focus: [...args.focusAreas].sort(),
    patterns: args.patternsCompact,
    reading: args.readingHistoryCompact,
  };
}

export function buildNatalEssenceFingerprintPayload(args: {
  chart: ChartRow;
  tone: string;
  gender: string | null;
  focusAreas: string[];
  patternsCompact: PatternsFingerprintCompact;
}): Record<string, unknown> {
  return {
    pv: NATAL_ESSENCE_PROMPT_VERSION,
    chartUpdatedAt: args.chart.updated_at,
    tone: args.tone,
    gender: args.gender,
    focus: [...args.focusAreas].sort(),
    patterns: args.patternsCompact,
  };
}

export function buildSynastryDeepFingerprintPayload(
  synastry: SynastryRow,
  payload: SynastryInterpretInput,
  prefs: { tone: string; gender: string | null; focusAreas: string[] },
): Record<string, unknown> {
  const core = buildSynastryFingerprintPayload(synastry, payload);
  return {
    ...core,
    kind: "synastry_deep",
    pv: SYNASTRY_DEEP_PROMPT_VERSION,
    prefsTone: prefs.tone,
    prefsGender: prefs.gender,
    prefsFocus: [...prefs.focusAreas].sort(),
  };
}

function round(n: number, dec: number): number {
  const p = 10 ** dec;
  return Math.round(n * p) / p;
}

/** JSON determinístico para hashing (chaves ordenadas; arrays mantêm ordem). */
export function stableStringify(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(walk);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = walk(o[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export async function sha256FingerprintHex(payload: unknown): Promise<string> {
  const s = stableStringify(payload);
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sortCrossAspects(aspects: SynastryCrossAspect[]): SynastryCrossAspect[] {
  return [...aspects].sort((a, b) => {
    if (a.orb !== b.orb) return a.orb - b.orb;
    const ak = `${a.planet1}:${a.planet2}:${a.type}`;
    const bk = `${b.planet1}:${b.planet2}:${b.type}`;
    return ak.localeCompare(bk);
  });
}

function sortNatalAspects(aspects: Aspect[]): Aspect[] {
  return [...aspects].sort((a, b) => {
    if (a.orb !== b.orb) return a.orb - b.orb;
    const ak = `${a.planet1}:${a.planet2}:${a.type}`;
    const bk = `${b.planet1}:${b.planet2}:${b.type}`;
    return ak.localeCompare(bk);
  });
}

export interface SynastryInterpretInput {
  chart1Name: string;
  chart2Name: string;
  aspects: SynastryCrossAspect[];
  areas: SynastryAreaScores;
  highlights: string[];
}

export function buildNatalFingerprintPayload(
  chart: ChartRow,
  kind: "natal_summary" | "natal_planet",
  planetKey?: PlanetKey,
): Record<string, unknown> {
  const data = chartRowToChartData(chart);
  const planets = [...data.planets].sort((a, b) => a.key.localeCompare(b.key));
  const compactPlanets = planets.map((p: PlanetPosition) => ({
    k: p.key,
    s: p.sign,
    h: p.house,
    λ: round(p.longitude, 4),
  }));
  const aspectsTop = sortNatalAspects(data.aspects)
    .slice(0, 15)
    .map((a) => ({
      p1: a.planet1,
      p2: a.planet2,
      t: a.type,
      o: round(a.orb, 3),
    }));
  const base: Record<string, unknown> = {
    pv: AI_PROMPT_VERSION,
    kind,
    chartUpdatedAt: chart.updated_at,
    houseSystem: chart.house_system,
    asc: round(data.ascendant, 4),
    mc: round(data.midheaven, 4),
    planets: compactPlanets,
    aspectsTop,
  };
  if (kind === "natal_planet") {
    base.planetFocus = planetKey;
  }
  return base;
}

/** Remove padrões de prompt injection de texto livre fornecido pelo utilizador. */
export function sanitizePromptString(text: string, maxLen = 120): string {
  return text
    .replace(/[<>{}[\]]/g, "")
    .replace(/ignore\s+(all\s+)?.*instructions?/gi, "[removed]")
    .replace(/system\s*:/gi, "[removed]")
    .replace(/you\s+are\s+now/gi, "[removed]")
    .trim()
    .slice(0, maxLen);
}

/** Texto compacto para prompt (não para fingerprint). */
export function formatNatalPromptContext(chart: ChartRow, data: ChartData): string {
  const lines: string[] = [];
  lines.push(`Nome simbólico do mapa: ${sanitizePromptString(chart.name)}`);
  lines.push(
    `Data/local: ${chart.birth_date} ${chart.birth_time} · ${sanitizePromptString(chart.birth_place ?? "")}`,
  );
  lines.push(`Sistema de casas: ${chart.house_system}`);
  const planets = [...data.planets].sort((a, b) => a.key.localeCompare(b.key));
  for (const p of planets) {
    lines.push(
      `- ${p.name} (${p.key}): ${p.sign}, casa ${p.house}, longitude ${round(p.longitude, 2)}°, ${p.retrograde ? "retrógrado" : "direto"}`,
    );
  }
  lines.push(
    `Ascendente ~ ${round(data.ascendant, 2)}° · Meio do Céu ~ ${round(data.midheaven, 2)}°`,
  );
  const asp = sortNatalAspects(data.aspects).slice(0, 12);
  lines.push("Aspectos natais (órbe mais fechado primeiro):");
  for (const a of asp) {
    lines.push(`- ${a.planet1} ${a.type} ${a.planet2} · órbe ${round(a.orb, 2)}°`);
  }
  return lines.join("\n");
}

export function buildSynastryFingerprintPayload(
  synastry: SynastryRow,
  payload: SynastryInterpretInput,
): Record<string, unknown> {
  const aspectsTop = sortCrossAspects(payload.aspects)
    .slice(0, 25)
    .map((a) => ({
      p1: a.planet1,
      p2: a.planet2,
      t: a.type,
      o: round(a.orb, 3),
    }));
  const keys = Object.keys(payload.areas).sort() as (keyof SynastryAreaScores)[];
  const areasStable: Record<string, number> = {};
  for (const k of keys) {
    areasStable[k] = payload.areas[k];
  }
  return {
    pv: AI_PROMPT_VERSION,
    kind: "synastry",
    synastryCreatedAt: synastry.created_at,
    chartIds: [synastry.chart1_id, synastry.chart2_id].sort(),
    score: synastry.compatibility_score,
    namesSorted: [payload.chart1Name, payload.chart2Name].sort(),
    areas: areasStable,
    aspectsTop,
    highlightsCount: payload.highlights.length,
  };
}

export function formatSynastryPromptContext(
  synastry: SynastryRow,
  payload: SynastryInterpretInput,
): string {
  const lines: string[] = [];
  lines.push(`Mapa A: ${sanitizePromptString(payload.chart1Name)}`);
  lines.push(`Mapa B: ${sanitizePromptString(payload.chart2Name)}`);
  lines.push(`Pontuação heurística global: ${synastry.compatibility_score}/100`);
  lines.push(
    `Áreas: amor ${payload.areas.love}, amizade ${payload.areas.friendship}, trabalho ${payload.areas.work}, convivência ${payload.areas.convivencia}`,
  );
  lines.push("Aspectos principais (entre mapas):");
  for (const a of sortCrossAspects(payload.aspects).slice(0, 18)) {
    lines.push(
      `- trânsito/planeta 1: ${a.planet1} · natal/planeta 2: ${a.planet2} · ${a.type} · órbe ${round(a.orb, 2)}°`,
    );
  }
  if (payload.highlights.length) {
    lines.push("Destaques já calculados:");
    payload.highlights.slice(0, 8).forEach((h, i) => lines.push(`${i + 1}. ${h}`));
  }
  return lines.join("\n");
}

export function buildTransitFingerprintPayload(
  chart: ChartRow,
  day: TransitDayPayload,
): Record<string, unknown> {
  const aspectsTop = sortCrossAspects(day.aspects)
    .slice(0, 24)
    .map((a) => ({
      p1: a.planet1,
      p2: a.planet2,
      t: a.type,
      o: round(a.orb, 3),
    }));
  return {
    pv: AI_PROMPT_VERSION,
    kind: "transit_day",
    date: day.date,
    chartUpdatedAt: chart.updated_at,
    houseSystem: chart.house_system,
    moon: day.transitMoonSign,
    intensity: day.intensity,
    aspectsTop,
  };
}

export function formatTransitPromptContext(chart: ChartRow, day: TransitDayPayload): string {
  const lines: string[] = [];
  lines.push(`Mapa de referência: ${sanitizePromptString(chart.name)}`);
  lines.push(`Dia (UTC civil): ${day.date}`);
  lines.push(`Lua em trânsito (meio-dia UTC): ${day.transitMoonSign || "—"}`);
  lines.push(`Intensidade heurística: ${day.intensity}/100`);
  lines.push("Linhas narrativas já geradas:");
  day.narrative.slice(0, 6).forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  lines.push("Sugestões interpretativas:");
  day.interpretiveHints.slice(0, 8).forEach((n, i) => lines.push(`${i + 1}. ${n}`));
  lines.push("Aspectos trânsito→natal (órbe menor primeiro):");
  for (const a of sortCrossAspects(day.aspects).slice(0, 16)) {
    lines.push(
      `- ${a.planet1} (trânsito) ${a.type} ${a.planet2} (natal) · órbe ${round(a.orb, 2)}°`,
    );
  }
  return lines.join("\n");
}
