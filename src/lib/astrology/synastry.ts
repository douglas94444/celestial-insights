import type { AspectType, PlanetPosition } from "@/lib/astrology/calculate";
import type { PlanetKey } from "@/lib/astrology/zodiac";
import { PLANETS } from "@/lib/astrology/zodiac";
import { ASPECT_LABELS, aspectMood } from "@/data/chart-detail-interpretations";

const ASPECT_DEFS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjuncao", angle: 0, orb: 8 },
  { type: "oposicao", angle: 180, orb: 8 },
  { type: "trigono", angle: 120, orb: 6 },
  { type: "quadratura", angle: 90, orb: 6 },
  { type: "sextil", angle: 60, orb: 4 },
];

const PERSONAL = new Set<PlanetKey>(["sun", "moon", "mercury", "venus", "mars"]);

function planetMeta(key: PlanetKey) {
  return PLANETS.find((p) => p.key === key)!;
}

export interface SynastryCrossAspect {
  planet1: PlanetKey;
  planet2: PlanetKey;
  type: AspectType;
  exactAngle: number;
  orb: number;
}

/** Aspectos entre corpos do mapa A e corpos do mapa B (sinastria). */
export function computeCrossAspects(
  planets1: PlanetPosition[],
  planets2: PlanetPosition[],
): SynastryCrossAspect[] {
  const aspects: SynastryCrossAspect[] = [];

  for (const a of planets1) {
    for (const b of planets2) {
      let diff = Math.abs(a.longitude - b.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            planet1: a.key,
            planet2: b.key,
            type: def.type,
            exactAngle: def.angle,
            orb: Math.round(orb * 100) / 100,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

export interface SynastryAreaScores {
  love: number;
  friendship: number;
  work: number;
  convivencia: number;
}

export interface SynastryAnalysis {
  aspects: SynastryCrossAspect[];
  overallScore: number;
  areas: SynastryAreaScores;
  highlights: string[];
}

function clampScore(v: number): number {
  return Math.round(Math.min(100, Math.max(28, v)));
}

function touchesLove(p1: PlanetKey, p2: PlanetKey): boolean {
  const romantic = new Set<PlanetKey>(["sun", "moon", "venus", "mars"]);
  return romantic.has(p1) && romantic.has(p2);
}

function touchesFriendship(p1: PlanetKey, p2: PlanetKey): boolean {
  const set = new Set<PlanetKey>(["moon", "mercury", "jupiter", "sun"]);
  return set.has(p1) || set.has(p2);
}

function touchesWork(p1: PlanetKey, p2: PlanetKey): boolean {
  const set = new Set<PlanetKey>(["sun", "saturn", "mercury", "mars", "jupiter"]);
  return set.has(p1) && set.has(p2);
}

function touchesConvivencia(p1: PlanetKey, p2: PlanetKey): boolean {
  const set = new Set<PlanetKey>(["moon", "venus", "mars"]);
  return set.has(p1) || set.has(p2);
}

function baseWeight(p1: PlanetKey, p2: PlanetKey): number {
  let w = 1;
  if (PERSONAL.has(p1)) w += 0.35;
  if (PERSONAL.has(p2)) w += 0.35;
  return w;
}

/**
 * Análise heurística para UI (não substitui consulta profissional).
 * Pontuações 0–100 por área + geral.
 */
export function analyzeSynastry(
  planets1: PlanetPosition[],
  planets2: PlanetPosition[],
  name1: string,
  name2: string,
): SynastryAnalysis {
  const aspects = computeCrossAspects(planets1, planets2);

  const areaHarm: Record<keyof SynastryAreaScores, number> = {
    love: 0,
    friendship: 0,
    work: 0,
    convivencia: 0,
  };
  const areaChall: Record<keyof SynastryAreaScores, number> = {
    love: 0,
    friendship: 0,
    work: 0,
    convivencia: 0,
  };

  for (const asp of aspects) {
    const mood = aspectMood(asp.type);
    const w = baseWeight(asp.planet1, asp.planet2);

    const h = mood === "harmonic" ? w : mood === "neutro" ? w * 0.4 : 0;
    const c = mood === "desafiador" ? w : mood === "neutro" ? w * 0.25 : 0;

    if (touchesLove(asp.planet1, asp.planet2)) {
      areaHarm.love += h;
      areaChall.love += c;
    }
    if (touchesFriendship(asp.planet1, asp.planet2)) {
      areaHarm.friendship += h;
      areaChall.friendship += c;
    }
    if (touchesWork(asp.planet1, asp.planet2)) {
      areaHarm.work += h;
      areaChall.work += c;
    }
    if (touchesConvivencia(asp.planet1, asp.planet2)) {
      areaHarm.convivencia += h;
      areaChall.convivencia += c;
    }
  }

  const scoreArea = (harm: number, chall: number): number => {
    if (harm === 0 && chall === 0) return 56;
    return clampScore(50 + harm * 5.5 - chall * 4.8);
  };

  const areas: SynastryAreaScores = {
    love: scoreArea(areaHarm.love, areaChall.love),
    friendship: scoreArea(areaHarm.friendship, areaChall.friendship),
    work: scoreArea(areaHarm.work, areaChall.work),
    convivencia: scoreArea(areaHarm.convivencia, areaChall.convivencia),
  };

  const overallScore = clampScore(
    (areas.love + areas.friendship + areas.work + areas.convivencia) / 4,
  );

  const sorted = [...aspects].sort((a, b) => a.orb - b.orb);
  const highlights = sorted.slice(0, 8).map((asp) => {
    const n1 = planetMeta(asp.planet1).name;
    const n2 = planetMeta(asp.planet2).name;
    return `${n1} (${name1}) ${ASPECT_LABELS[asp.type]} ${n2} (${name2}) · orbe ${asp.orb}°`;
  });

  return { aspects, overallScore, areas, highlights };
}
