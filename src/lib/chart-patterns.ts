import type { Aspect, ChartData, PlanetPosition } from "@/lib/astrology/calculate";
import { SIGNS, type SignName } from "@/lib/astrology/zodiac";

export type DominantElement = "FOGO" | "TERRA" | "AR" | "ÁGUA";
export type DominantModality = "CARDINAL" | "FIXO" | "MUTÁVEL";

export type StelliumKind = "sign" | "house";

export interface StelliumInfo {
  kind: StelliumKind;
  sign?: SignName;
  house?: number;
  planets: string[];
}

const MODALITY_BY_SIGN: Record<SignName, DominantModality> = {
  Áries: "CARDINAL",
  Touro: "FIXO",
  Gêmeos: "MUTÁVEL",
  Câncer: "CARDINAL",
  Leão: "FIXO",
  Virgem: "MUTÁVEL",
  Libra: "CARDINAL",
  Escorpião: "FIXO",
  Sagitário: "MUTÁVEL",
  Capricórnio: "CARDINAL",
  Aquário: "FIXO",
  Peixes: "MUTÁVEL",
};

const STELLIUM_KEYS = new Set([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north_node",
]);

function elementForSign(sign: string): DominantElement {
  const row = SIGNS.find((s) => s.name === sign);
  const el = row?.element ?? "Ar";
  if (el === "Fogo") return "FOGO";
  if (el === "Terra") return "TERRA";
  if (el === "Água") return "ÁGUA";
  return "AR";
}

function modalityCounts(planets: PlanetPosition[]): Record<DominantModality, number> {
  const c: Record<DominantModality, number> = { CARDINAL: 0, FIXO: 0, MUTÁVEL: 0 };
  for (const p of planets) {
    if (!STELLIUM_KEYS.has(p.key)) continue;
    const m = MODALITY_BY_SIGN[p.sign as SignName];
    if (m) c[m] += 1;
  }
  return c;
}

export function dominantElementFromChart(planets: PlanetPosition[]): DominantElement {
  const counts: Record<DominantElement, number> = { FOGO: 0, TERRA: 0, AR: 0, ÁGUA: 0 };
  for (const p of planets) {
    if (!STELLIUM_KEYS.has(p.key)) continue;
    counts[elementForSign(p.sign)] += 1;
  }
  let best: DominantElement = "AR";
  let n = -1;
  for (const [k, v] of Object.entries(counts) as [DominantElement, number][]) {
    if (v > n) {
      n = v;
      best = k;
    }
  }
  return best;
}

export function dominantModalityFromChart(planets: PlanetPosition[]): DominantModality {
  const c = modalityCounts(planets);
  let best: DominantModality = "MUTÁVEL";
  let n = -1;
  for (const k of ["CARDINAL", "FIXO", "MUTÁVEL"] as DominantModality[]) {
    if (c[k] > n) {
      n = c[k];
      best = k;
    }
  }
  return best;
}

/** ≥3 planetas nucleares no mesmo signo ou na mesma casa. */
export function findStelliums(planets: PlanetPosition[]): StelliumInfo[] {
  const core = planets.filter((p) => STELLIUM_KEYS.has(p.key));
  const bySign = new Map<SignName, PlanetPosition[]>();
  const byHouse = new Map<number, PlanetPosition[]>();
  for (const p of core) {
    const s = p.sign as SignName;
    const list = bySign.get(s) ?? [];
    list.push(p);
    bySign.set(s, list);
    const h = p.house;
    if (h >= 1 && h <= 12) {
      const lh = byHouse.get(h) ?? [];
      lh.push(p);
      byHouse.set(h, lh);
    }
  }
  const out: StelliumInfo[] = [];
  for (const [sign, ps] of bySign) {
    if (ps.length >= 3) {
      out.push({
        kind: "sign",
        sign,
        planets: ps.map((x) => x.key),
      });
    }
  }
  for (const [house, ps] of byHouse) {
    if (ps.length >= 3) {
      out.push({
        kind: "house",
        house,
        planets: ps.map((x) => x.key),
      });
    }
  }
  return out;
}

/** Heurística simples de ocupação em longitude e hemisférios pelo Ascendente. */
export function chartShapeLabel(data: ChartData): string {
  const asc = data.ascendant;
  const westernStart = (asc + 90) % 360;
  const easternEnd = (asc + 270) % 360;
  let east = 0;
  let west = 0;
  const core = data.planets.filter((p) => STELLIUM_KEYS.has(p.key));
  const longitudes = core.map((p) => p.longitude).sort((a, b) => a - b);
  if (longitudes.length < 3) return "Distribuição em análise";

  function inArc(lon: number, start: number, end: number): boolean {
    if (start <= end) return lon >= start && lon <= end;
    return lon >= start || lon <= end;
  }

  for (const p of core) {
    if (inArc(p.longitude, westernStart, easternEnd)) east += 1;
    else west += 1;
  }

  let maxGap = 0;
  const n = longitudes.length;
  for (let i = 0; i < n; i++) {
    const a = longitudes[i]!;
    const b = longitudes[(i + 1) % n]!;
    const gap = i === n - 1 ? 360 - (a - b) : b - a;
    maxGap = Math.max(maxGap, gap);
  }

  const span = 360 - maxGap;
  if (span <= 120 && core.length >= 5) return "Bundle (planetas concentrados — heurística)";
  if (east >= west + 2) return "Ênfase no hemisfério oriental (casas de emergência)";
  if (west >= east + 2) return "Ênfase no hemisfério ocidental (relação/contexto)";
  if (maxGap >= 90) return "Locomotiva (intervalo vazio largo — heurística)";
  return "Distribuição equilibrada";
}

function planet(data: ChartData, key: string): PlanetPosition | undefined {
  return data.planets.find((p) => p.key === key);
}

function mcSign(data: ChartData): SignName {
  const lon = data.midheaven;
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return SIGNS[idx].name;
}

export function lifePurposeHeuristic(data: ChartData): string {
  const nn = planet(data, "north_node");
  const mc = mcSign(data);
  if (nn) {
    return `Eixo de crescimento ligado ao Nodo Norte em ${nn.sign} combina com MC em ${mc} (leitura simbólica).`;
  }
  return `Propósito visível (MC em ${mc}) como âncora de vocação simbólica.`;
}

function isHard(t: Aspect["type"]): boolean {
  return t === "quadratura" || t === "oposicao";
}

function isSoft(t: Aspect["type"]): boolean {
  return t === "trigono" || t === "sextil";
}

export function mainChallengesFromAspects(aspects: Aspect[], limit = 5): string[] {
  const scored = aspects.filter((a) => isHard(a.type)).sort((a, b) => a.orb - b.orb);
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const a of scored) {
    const k = `${a.planet1}:${a.planet2}:${a.type}`;
    if (seen.has(k)) continue;
    seen.add(k);
    lines.push(`Tensão ${a.planet1}–${a.planet2} (${a.type}, órbe ${a.orb.toFixed(1)}°)`);
    if (lines.length >= limit) break;
  }
  if (lines.length === 0)
    return ["Poucos aspectos tensos fechados na lista — observar progressões no tempo."];
  return lines;
}

export function naturalTalentsFromAspects(aspects: Aspect[], limit = 5): string[] {
  const scored = aspects.filter((a) => isSoft(a.type)).sort((a, b) => a.orb - b.orb);
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const a of scored) {
    const k = `${a.planet1}:${a.planet2}:${a.type}`;
    if (seen.has(k)) continue;
    seen.add(k);
    lines.push(`Facilidade ${a.planet1}–${a.planet2} (${a.type})`);
    if (lines.length >= limit) break;
  }
  if (lines.length === 0)
    return ["Recursos simbólicos dispersos — destacar planetas angulares no mapa."];
  return lines;
}

export interface DerivedChartPatterns {
  dominant_element: DominantElement;
  dominant_modality: DominantModality;
  stelliums: StelliumInfo[];
  chart_shape: string;
  life_purpose: string;
  main_challenges: string[];
  natural_talents: string[];
}

export function deriveChartPatterns(data: ChartData): DerivedChartPatterns {
  return {
    dominant_element: dominantElementFromChart(data.planets),
    dominant_modality: dominantModalityFromChart(data.planets),
    stelliums: findStelliums(data.planets),
    chart_shape: chartShapeLabel(data),
    life_purpose: lifePurposeHeuristic(data),
    main_challenges: mainChallengesFromAspects(data.aspects),
    natural_talents: naturalTalentsFromAspects(data.aspects),
  };
}
