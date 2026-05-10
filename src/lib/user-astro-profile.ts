import type { Aspect, ChartData } from "@/lib/astrology/calculate";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import type { ChartRow } from "@/lib/chart-from-row";
import type { DerivedChartPatterns } from "@/lib/chart-patterns";
import { deriveChartPatterns } from "@/lib/chart-patterns";
import type { ReadingHistorySummary } from "@/lib/reading-history";

export type PersonalizationTone = "MOTIVACIONAL" | "REALISTA" | "ESPIRITUAL" | "PRATICO";

export type PersonalizationGender = "M" | "F" | "NB" | "OTHER";

export type FocusAreaKey =
  | "AMOR"
  | "CARREIRA"
  | "SAUDE"
  | "FAMILIA"
  | "FINANCAS"
  | "ESPIRITUALIDADE";

const TONE_SET = new Set<string>(["MOTIVACIONAL", "REALISTA", "ESPIRITUAL", "PRATICO"]);
const GENDER_SET = new Set<string>(["M", "F", "NB", "OTHER"]);
const FOCUS_SET = new Set<string>([
  "AMOR",
  "CARREIRA",
  "SAUDE",
  "FAMILIA",
  "FINANCAS",
  "ESPIRITUALIDADE",
]);

function roundDeg(n: number, dec: number): number {
  const p = 10 ** dec;
  return Math.round(n * p) / p;
}

function normalizeTone(raw: string | null | undefined): PersonalizationTone {
  const u = (raw ?? "PRATICO").trim().toUpperCase();
  return TONE_SET.has(u) ? (u as PersonalizationTone) : "PRATICO";
}

function normalizeGender(raw: string | null | undefined): PersonalizationGender | null {
  if (!raw) return null;
  const u = raw.trim().toUpperCase();
  return GENDER_SET.has(u) ? (u as PersonalizationGender) : null;
}

export function parseFocusAreasFromProfileJson(raw: unknown): FocusAreaKey[] {
  if (!Array.isArray(raw)) return [];
  const out: FocusAreaKey[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const k = x.trim().toUpperCase();
    if (FOCUS_SET.has(k)) out.push(k as FocusAreaKey);
  }
  return [...new Set(out)].slice(0, 8);
}

function compactPlanet(p: ChartData["planets"][number]) {
  return {
    key: p.key,
    sign: p.sign,
    house: p.house,
    longitude: roundDeg(p.longitude, 4),
    retrograde: p.retrograde,
  };
}

function compactAspects(aspects: Aspect[], limit: number) {
  return [...aspects]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, limit)
    .map((a) => ({
      planet1: a.planet1,
      planet2: a.planet2,
      type: a.type,
      orb: roundDeg(a.orb, 3),
    }));
}

function transitCompact(day: TransitDayPayload) {
  return {
    date: day.date,
    transit_moon_sign: day.transitMoonSign ?? null,
    intensity: day.intensity,
    narrative: day.narrative.slice(0, 8),
    interpretive_hints: day.interpretiveHints.slice(0, 10),
    aspects_top: [...day.aspects]
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14)
      .map((a) => ({
        transit_planet: a.planet1,
        natal_planet: a.planet2,
        type: a.type,
        orb: roundDeg(a.orb, 3),
      })),
  };
}

export interface UserAstroProfile {
  personal: {
    display_name: string | null;
    gender: PersonalizationGender | null;
  };
  preferences: {
    tone: PersonalizationTone;
    focus_areas: FocusAreaKey[];
  };
  natal_chart: {
    chart_id: string;
    chart_name: string;
    birth_summary: string;
    house_system: string;
    ascendant_deg: number;
    midheaven_deg: number;
    planets: ReturnType<typeof compactPlanet>[];
    aspects_sample: ReturnType<typeof compactAspects>;
  };
  patterns: DerivedChartPatterns;
  current_transits: ReturnType<typeof transitCompact> | null;
  reading_history: ReadingHistorySummary;
}

export interface BuildUserAstroProfileArgs {
  chartRow: ChartRow;
  chartData: ChartData;
  profileDisplayName: string | null;
  personalizationGender: string | null;
  personalizationTone: string | null;
  personalizationFocusAreas: unknown;
  transitDay?: TransitDayPayload | null;
  readingHistory?: ReadingHistorySummary | null;
}

export function buildUserAstroProfile(args: BuildUserAstroProfileArgs): UserAstroProfile {
  const {
    chartRow,
    chartData,
    profileDisplayName,
    personalizationGender,
    personalizationTone,
    personalizationFocusAreas,
    transitDay,
    readingHistory,
  } = args;

  const planetsSorted = [...chartData.planets].sort((a, b) =>
    (a.key as string).localeCompare(b.key as string),
  );

  const birth_summary = `${chartRow.birth_date} ${chartRow.birth_time} · ${chartRow.birth_place}`;

  return {
    personal: {
      display_name: profileDisplayName,
      gender: normalizeGender(personalizationGender),
    },
    preferences: {
      tone: normalizeTone(personalizationTone),
      focus_areas: parseFocusAreasFromProfileJson(personalizationFocusAreas),
    },
    natal_chart: {
      chart_id: chartRow.id,
      chart_name: chartRow.name,
      birth_summary,
      house_system: chartRow.house_system,
      ascendant_deg: roundDeg(chartData.ascendant, 4),
      midheaven_deg: roundDeg(chartData.midheaven, 4),
      planets: planetsSorted.map(compactPlanet),
      aspects_sample: compactAspects(chartData.aspects, 18),
    },
    patterns: deriveChartPatterns(chartData),
    current_transits: transitDay ? transitCompact(transitDay) : null,
    reading_history: readingHistory ?? {
      window_days: 30,
      topic_counts: {},
      recent_route_keys: [],
    },
  };
}

/** Camada extra para prompts (referência rápida a Sol/Lua/Asc). */
export function userAstroProfileLuminariesNote(profile: UserAstroProfile): string {
  const sun = profile.natal_chart.planets.find((p) => p.key === "sun");
  const moon = profile.natal_chart.planets.find((p) => p.key === "moon");
  const ascDeg = profile.natal_chart.ascendant_deg;
  return [
    sun ? `Sol: ${sun.sign} (casa ${sun.house})` : null,
    moon ? `Lua: ${moon.sign} (casa ${moon.house})` : null,
    `Ascendente ~ ${ascDeg}° eclíptica`,
  ]
    .filter(Boolean)
    .join(" · ");
}
