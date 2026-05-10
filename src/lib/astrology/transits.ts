import { eachDayOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ASPECT_LABELS, aspectMood } from "@/data/chart-detail-interpretations";
import { interpretiveHintsForAspects } from "@/data/transit-aspect-hints";
import {
  computePlanetPositionsUtc,
  natalHouseForLongitude,
  type HousePosition,
  type HouseSystemId,
  type PlanetPosition,
} from "@/lib/astrology/calculate";
import { wholeSignHouse } from "@/lib/astrology/houses";
import { computeCrossAspects } from "@/lib/astrology/synastry";
import type { SynastryCrossAspect } from "@/lib/astrology/synastry";
import { PLANETS, type PlanetKey } from "@/lib/astrology/zodiac";

const PERSONAL = new Set<PlanetKey>(["sun", "moon", "mercury", "venus", "mars"]);

/** Corpos «rápidos» em trânsito (Lua até Marte + Sol). */
export const FAST_TRANSIT_KEYS = new Set<PlanetKey>(["sun", "moon", "mercury", "venus", "mars"]);

export function filterAspectsByFastTransit(aspects: SynastryCrossAspect[]): SynastryCrossAspect[] {
  return aspects.filter((a) => FAST_TRANSIT_KEYS.has(a.planet1));
}

export function filterAspectsByPersonalNatal(
  aspects: SynastryCrossAspect[],
): SynastryCrossAspect[] {
  return aspects.filter((a) => PERSONAL.has(a.planet2));
}

/** Indicadores heurísticos 15–100 por tema (reflexão, não previsão). */
export interface TransitMoodScores {
  humor: number;
  amor: number;
  trabalho: number;
}

function transitScoresFromAspects(aspects: SynastryCrossAspect[]): TransitMoodScores {
  let humorAcc = 0;
  let humorW = 0;
  let amorAcc = 0;
  let amorW = 0;
  let trabAcc = 0;
  let trabW = 0;

  const weight = (orb: number, transitBoost: number) =>
    Math.max(0.12, ((4 - Math.min(orb, 4)) / 4) * transitBoost);

  for (const a of aspects) {
    const mood = aspectMood(a.type);
    const moodUnit = mood === "harmonic" ? 1 : mood === "desafiador" ? -1 : 0.2;
    const transitBoost = PERSONAL.has(a.planet1) ? 1.35 : 1;

    const wMoonMerc = weight(a.orb, transitBoost);
    if (a.planet2 === "moon" || a.planet2 === "mercury") {
      humorAcc += moodUnit * wMoonMerc * 11;
      humorW += wMoonMerc;
    }

    const wAmor = weight(a.orb, transitBoost);
    if (a.planet2 === "moon" || a.planet2 === "venus" || a.planet2 === "mars") {
      amorAcc += moodUnit * wAmor * 11;
      amorW += wAmor;
    }

    const wTrab = weight(
      a.orb,
      transitBoost * (a.planet2 === "saturn" || a.planet2 === "jupiter" ? 1.08 : 1),
    );
    if (
      a.planet2 === "sun" ||
      a.planet2 === "mercury" ||
      a.planet2 === "mars" ||
      a.planet2 === "saturn" ||
      a.planet2 === "jupiter"
    ) {
      trabAcc += moodUnit * wTrab * 11;
      trabW += wTrab;
    }
  }

  const finalize = (base: number, acc: number, w: number) => {
    if (w < 0.01) return base;
    const v = base + (acc / w) * 7;
    return Math.round(Math.min(100, Math.max(15, v)));
  };

  return {
    humor: finalize(52, humorAcc, humorW),
    amor: finalize(52, amorAcc, amorW),
    trabalho: finalize(52, trabAcc, trabW),
  };
}

function transitPlanetPositions(
  transitUtc: Date,
  natalHouses: HousePosition[],
  natalAscendant: number,
  houseSystem: HouseSystemId,
): PlanetPosition[] {
  const bare = computePlanetPositionsUtc(transitUtc);
  return bare.map((p) => ({
    ...p,
    house:
      houseSystem === "whole_sign"
        ? wholeSignHouse(p.longitude, natalAscendant)
        : natalHouseForLongitude(p.longitude, natalHouses),
  }));
}

function narrativeLines(aspects: SynastryCrossAspect[]): string[] {
  const meta = (k: string) => PLANETS.find((p) => p.key === k);
  const sorted = [...aspects].sort((a, b) => a.orb - b.orb);
  const lines: string[] = [];
  for (const a of sorted) {
    if (lines.length >= 6) break;
    const t = meta(a.planet1);
    const n = meta(a.planet2);
    if (!t || !n) continue;
    const prefix = PERSONAL.has(a.planet2) || PERSONAL.has(a.planet1) ? "✦ " : "· ";
    lines.push(
      `${prefix}Trânsito de ${t.name} em ${ASPECT_LABELS[a.type]} ao seu ${n.name} natal (orbe ${a.orb}°).`,
    );
  }
  if (lines.length === 0) {
    lines.push("Dia com poucos aspectos exatos aos planetas natais — ambiente mais neutro.");
  }
  return lines;
}

function dayIntensity(aspects: SynastryCrossAspect[]): number {
  if (aspects.length === 0) return 15;
  let score = 0;
  for (const a of aspects) {
    const tight = Math.max(0, 4 - a.orb);
    score += 8 + tight * 3;
    if (PERSONAL.has(a.planet1) && PERSONAL.has(a.planet2)) score += 6;
  }
  return Math.min(100, Math.round(score));
}

export interface TransitDayPayload {
  date: string;
  transitInstantUtc: string;
  aspects: SynastryCrossAspect[];
  /** planet1 = trânsito, planet2 = natal */
  transitMoonSign: string;
  intensity: number;
  narrative: string[];
  interpretiveHints: string[];
  scores: TransitMoodScores;
}

/** Meio-dia UTC no dia civil (YYYY-MM-DD em UTC). */
export function utcNoonForUtcDateString(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function analyzeTransitDay(
  dateStr: string,
  natalPlanets: PlanetPosition[],
  natalHouses: HousePosition[],
  natalAscendant: number,
  houseSystem: HouseSystemId,
): TransitDayPayload {
  const transitUtc = utcNoonForUtcDateString(dateStr);
  const transitPlanets = transitPlanetPositions(
    transitUtc,
    natalHouses,
    natalAscendant,
    houseSystem,
  );
  const aspects = computeCrossAspects(transitPlanets, natalPlanets);
  const moon = transitPlanets.find((p) => p.key === "moon");
  return {
    date: dateStr,
    transitInstantUtc: transitUtc.toISOString(),
    aspects,
    transitMoonSign: moon?.sign ?? "",
    intensity: dayIntensity(aspects),
    narrative: narrativeLines(aspects),
    interpretiveHints: interpretiveHintsForAspects(aspects, 8),
    scores: transitScoresFromAspects(aspects),
  };
}

export function analyzeTransitRange(
  startDateStr: string,
  endDateStr: string,
  natalPlanets: PlanetPosition[],
  natalHouses: HousePosition[],
  natalAscendant: number,
  houseSystem: HouseSystemId,
): TransitDayPayload[] {
  const start = utcNoonForUtcDateString(startDateStr);
  const end = utcNoonForUtcDateString(endDateStr);
  const days = eachDayOfInterval({ start, end });
  return days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return analyzeTransitDay(dateStr, natalPlanets, natalHouses, natalAscendant, houseSystem);
  });
}

export function formatTransitDayTitle(dateStr: string): string {
  const d = utcNoonForUtcDateString(dateStr);
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}
