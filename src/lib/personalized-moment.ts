import type { TransitDayPayload } from "@/lib/astrology/transits";
import type { HousePosition, PlanetPosition } from "@/lib/astrology/calculate";
import { SIGNS, type SignName } from "@/lib/astrology/zodiac";

/** Planetas usados na dominância elemental e ênfase de casas (heurística legível). */
export const MOMENT_CORE_KEYS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
] as const;

export type MomentCorePlanetKey = (typeof MOMENT_CORE_KEYS)[number];

const HOUSE_PURPOSE: Record<number, string> = {
  1: "Afirmar quem você é",
  2: "Valorizar raízes e talentos",
  3: "Dar voz a ideias e vínculos próximos",
  4: "Nutrir lar e pertencimento",
  5: "Criar, jogar e expressar",
  6: "Organizar rotina com propósito",
  7: "Honrar parcerias verdadeiras",
  8: "Investigar transformações profundas",
  9: "Expandir sabedoria e horizontes",
  10: "Construir legado visível",
  11: "Servir redes e causas",
  12: "Ouvir intuição e descanso criativo",
};

function elementForSign(sign: string): string {
  const row = SIGNS.find((s) => s.name === sign);
  return row?.element ?? "Ar";
}

function countHouseLoads(planets: PlanetPosition[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of planets) {
    if (!MOMENT_CORE_KEYS.includes(p.key as MomentCorePlanetKey)) continue;
    const h = p.house;
    if (h < 1 || h > 12) continue;
    m.set(h, (m.get(h) ?? 0) + 1);
  }
  return m;
}

export function dominantElementFromPlanets(planets: PlanetPosition[]): {
  label: string;
  counts: Record<string, number>;
} {
  const counts: Record<string, number> = { Fogo: 0, Ar: 0, Terra: 0, Água: 0 };
  for (const p of planets) {
    if (!MOMENT_CORE_KEYS.includes(p.key as MomentCorePlanetKey)) continue;
    const el = elementForSign(p.sign);
    if (el in counts) counts[el] += 1;
  }
  let best: string = "Ar";
  let bestN = -1;
  for (const [k, v] of Object.entries(counts)) {
    if (v > bestN) {
      bestN = v;
      best = k;
    }
  }
  return { label: best, counts };
}

function purposeFromHouseLoads(loads: Map<number, number>): string {
  if (loads.size === 0) return "Integrar mapa e intenção no dia a dia";

  const angular = new Set([1, 4, 7, 10]);
  let bestH = 1;
  let bestC = -1;
  for (const [h, c] of loads) {
    if (c > bestC) {
      bestC = c;
      bestH = h;
    } else if (c === bestC && angular.has(h) && !angular.has(bestH)) {
      bestH = h;
    }
  }

  return HOUSE_PURPOSE[bestH] ?? "Integrar mapa e intenção no dia a dia";
}

export function detectStelliumLines(planets: PlanetPosition[]): string[] {
  const bySign = new Map<string, PlanetPosition[]>();
  for (const p of planets) {
    if (!MOMENT_CORE_KEYS.includes(p.key as MomentCorePlanetKey)) continue;
    const list = bySign.get(p.sign) ?? [];
    list.push(p);
    bySign.set(p.sign, list);
  }
  const lines: string[] = [];
  for (const [sign, list] of bySign) {
    if (list.length >= 3) {
      lines.push(`Stellium em ${sign}`);
    }
  }
  return lines;
}

export interface PersonalizedMomentInsights {
  dominantElement: string;
  purposeLine: string;
  astroBullets: string[];
}

export function buildPersonalizedMomentInsights(
  planets: PlanetPosition[],
  _houses: HousePosition[],
  transitToday: TransitDayPayload | null,
): PersonalizedMomentInsights {
  const { label: dominantElement } = dominantElementFromPlanets(planets);
  const loads = countHouseLoads(planets);
  const purposeLine =
    transitToday?.narrative[0]?.replace(/^✦\s*/, "").slice(0, 120) || purposeFromHouseLoads(loads);

  const moon = planets.find((p) => p.key === "moon");
  const venus = planets.find((p) => p.key === "venus");

  const bullets: string[] = [];

  for (const line of detectStelliumLines(planets)) {
    bullets.push(line);
    if (bullets.length >= 3) break;
  }

  if (moon && bullets.length < 3) {
    bullets.push(`Lua na Casa ${moon.house}`);
  }

  if (venus && bullets.length < 3) {
    bullets.push(`Vênus em ${venus.sign}`);
  }

  if (bullets.length < 3 && moon) {
    bullets.push(`Lua em ${moon.sign}`);
  }

  if (bullets.length < 3) {
    const sun = planets.find((p) => p.key === "sun");
    if (sun) bullets.push(`Sol em ${sun.sign}`);
  }

  return {
    dominantElement,
    purposeLine,
    astroBullets: bullets.slice(0, 3),
  };
}

export function resolveMomentDisplayName(
  profile: { name: string | null } | null | undefined,
  chart: { name: string } | null | undefined,
  email: string | undefined,
): string {
  const pn = profile?.name?.trim();
  if (pn) return pn;
  const cn = chart?.name?.trim();
  if (cn) return cn;
  if (email?.includes("@")) {
    const local = email.split("@")[0]?.trim();
    if (local) return local.replace(/\./g, " ");
  }
  return "Você";
}

export function primarySunMoonAsc(planets: PlanetPosition[], houses: HousePosition[]) {
  const sunSign = planets.find((p) => p.key === "sun")?.sign as SignName | undefined;
  const moonSign = planets.find((p) => p.key === "moon")?.sign as SignName | undefined;
  const ascSign = houses[0]?.sign as SignName | undefined;
  const moonHouse = planets.find((p) => p.key === "moon")?.house ?? null;

  const glyph = (s: SignName | undefined) =>
    (s ? SIGNS.find((x) => x.name === s)?.symbol : undefined) ?? "·";

  return {
    sunSign,
    moonSign,
    ascSign,
    moonHouse,
    sunGlyph: glyph(sunSign),
    moonGlyph: glyph(moonSign),
    ascGlyph: glyph(ascSign),
  };
}
