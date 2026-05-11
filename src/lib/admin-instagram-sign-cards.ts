import type { ChartData } from "@/lib/astrology/calculate";
import {
  calculateChart,
  computePlanetPositionsUtc,
  type CalculateInput,
} from "@/lib/astrology/calculate";
import { SIGNS, type SignName } from "@/lib/astrology/zodiac";
import { buildShareCardDailyExtras } from "@/data/share-card-daily";
import { pickMomentFallbackQuote, signLabelPt } from "@/data/daily-moment-fallback";
import { buildPersonalizedMomentInsights, primarySunMoonAsc } from "@/lib/personalized-moment";
import { buildMomentQuoteLines } from "@/lib/moment-quote";
import { getInstagramBrandHandle, getSharePublicUrl } from "@/lib/app-branding";

/** Chaves alinhadas a `CARD_THEMES` em `ShareableMomentCard` (evita `lib` importar `components`). */
export const ADMIN_CARD_THEME_KEYS = ["noturno", "crepusculo", "cosmos"] as const;
export type AdminCardTheme = (typeof ADMIN_CARD_THEME_KEYS)[number];

/** Coordenadas de referência (São Paulo) para casas no mapa sintético. */
const SYNTH_LAT = -23.5505;
const SYNTH_LON = -46.6333;
const SYNTH_TZ_OFFSET_MINUTES = 0;
const SYNTH_BIRTH_TIME = "12:00";
const SYNTH_YEAR = 2000;

function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickThemeKey(seriesSalt: string, sign: SignName): AdminCardTheme {
  const idx = hash32(`${seriesSalt}|${sign}|theme`) % ADMIN_CARD_THEME_KEYS.length;
  return ADMIN_CARD_THEME_KEYS[idx]!;
}

/**
 * Encontra uma data civil (UTC) em que o Sol, ao meio-dia UTC, está no signo pedido.
 * Usa o ano de referência `SYNTH_YEAR` (varredura determinística).
 */
export function findSyntheticBirthDateForSunSign(sign: SignName): string {
  const targetIdx = SIGNS.findIndex((s) => s.name === sign);
  if (targetIdx < 0) throw new Error(`Signo inválido: ${sign}`);

  const start = Date.UTC(SYNTH_YEAR, 0, 1, 12, 0, 0);
  const oneDay = 86_400_000;
  for (let d = 0; d < 370; d++) {
    const utc = new Date(start + d * oneDay);
    const bare = computePlanetPositionsUtc(utc);
    const sun = bare.find((p) => p.key === "sun");
    if (!sun) continue;
    if (sun.sign === sign) {
      const y = utc.getUTCFullYear();
      const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
      const day = String(utc.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  throw new Error(`Não foi possível localizar data com Sol em ${sign} em ${SYNTH_YEAR}.`);
}

function syntheticCalculateInput(sign: SignName): CalculateInput {
  return {
    birthDate: findSyntheticBirthDateForSunSign(sign),
    birthTime: SYNTH_BIRTH_TIME,
    latitude: SYNTH_LAT,
    longitude: SYNTH_LON,
    timezoneOffset: SYNTH_TZ_OFFSET_MINUTES,
    houseSystem: "placidus",
  };
}

export function buildSyntheticChartForSunSign(sign: SignName): ChartData {
  return calculateChart(syntheticCalculateInput(sign));
}

export type AdminShareCardModel = {
  sign: SignName;
  displayName: string;
  identityLine: string;
  quoteLines: string[];
  dominantElement: string;
  purposeLine: string;
  luckToday?: string;
  todayColor?: { label: string; hex: string };
  astroBullets: string[];
  brandHandle: string;
  shareCtaUrl?: string;
  wheelData: ChartData;
  themeKey: AdminCardTheme;
};

export function buildAdminShareCardModel(
  sign: SignName,
  opts: { civilDateStr: string; seriesSalt: string; namePrefix?: string },
): AdminShareCardModel {
  const wheelData = buildSyntheticChartForSunSign(sign);
  const planets = wheelData.planets;
  const houses = wheelData.houses;
  const sma = primarySunMoonAsc(planets, houses);

  const fmt = (s: string | undefined, sym: string) => {
    const name = s ?? "—";
    return `${sym} ${name}`;
  };
  const identityLine = [
    fmt(sma.sunSign, sma.sunGlyph),
    fmt(sma.moonSign, sma.moonGlyph),
    fmt(sma.ascSign, sma.ascGlyph),
  ].join(" · ");

  const insights = buildPersonalizedMomentInsights(planets, houses, null);
  const prefix = (opts.namePrefix ?? "Momento").trim() || "Momento";
  const displayName = `${prefix} ${sign}`;

  const fallbackSeed = hash32(`${opts.seriesSalt}|${sign}|quote`);
  const fallbackParagraph = pickMomentFallbackQuote(
    {
      nome: prefix,
      sol: signLabelPt(sma.sunSign),
      lua: signLabelPt(sma.moonSign),
      ascendente: signLabelPt(sma.ascSign),
      luaCasa: sma.moonHouse,
      elemento: insights.dominantElement,
    },
    fallbackSeed,
  );

  const quoteLines = buildMomentQuoteLines({
    aiText: null,
    transitNarrative: [],
    fallbackParagraph,
  });

  const extras = buildShareCardDailyExtras(
    sign,
    opts.civilDateStr,
    `admin|${opts.seriesSalt}|${sign}`,
  );

  return {
    sign,
    displayName,
    identityLine,
    quoteLines,
    dominantElement: insights.dominantElement,
    purposeLine: insights.purposeLine,
    luckToday: extras?.luckLine,
    todayColor: extras ? { label: extras.colorLabel, hex: extras.colorHex } : undefined,
    astroBullets: insights.astroBullets,
    brandHandle: getInstagramBrandHandle(),
    shareCtaUrl: getSharePublicUrl() || undefined,
    wheelData,
    themeKey: pickThemeKey(opts.seriesSalt, sign),
  };
}

/** Lista dos 12 signos na ordem do zodíaco. */
export const ALL_SIGN_NAMES: SignName[] = SIGNS.map((s) => s.name);
