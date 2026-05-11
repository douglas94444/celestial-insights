import type { Aspect, AspectType, ChartData, PlanetPosition } from "@/lib/astrology/calculate";
import { getPlanetName, SIGNS, type PlanetKey, type SignName } from "@/lib/astrology/zodiac";

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
function chartShapeLabel(data: ChartData): string {
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

function lifePurposeHeuristic(data: ChartData): string {
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

function mainChallengesFromAspects(aspects: Aspect[], limit = 5): string[] {
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

function naturalTalentsFromAspects(aspects: Aspect[], limit = 5): string[] {
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

function aspectPairKey(p1: PlanetKey, p2: PlanetKey): string {
  return p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
}

/** Mantém o aspecto de menor órbe por par (para não duplicar direções). */
function buildAspectLookup(aspects: Aspect[]): Map<string, Aspect> {
  const map = new Map<string, Aspect>();
  for (const asp of aspects) {
    const k = aspectPairKey(asp.planet1, asp.planet2);
    const prev = map.get(k);
    if (!prev || asp.orb < prev.orb) map.set(k, asp);
  }
  return map;
}

function lookupHasAspect(
  lookup: Map<string, Aspect>,
  type: AspectType,
  p1: PlanetKey,
  p2: PlanetKey,
): boolean {
  const a = lookup.get(aspectPairKey(p1, p2));
  return !!a && a.type === type;
}

const ELEMENT_PT: Record<DominantElement, string> = {
  FOGO: "Fogo",
  TERRA: "Terra",
  AR: "Ar",
  ÁGUA: "Água",
};

function grandTrineElementLabel(planets: PlanetPosition[], triple: PlanetKey[]): string {
  const els = triple.map((k) => {
    const sign = planets.find((p) => p.key === k)?.sign ?? "";
    return elementForSign(sign);
  });
  if (els[0] === els[1] && els[1] === els[2]) return ELEMENT_PT[els[0]!];
  return "misto";
}

export interface GrandTrinePattern {
  planets: PlanetKey[];
  element: string;
}

export interface TSquarePattern {
  apex: PlanetKey;
  opposition: [PlanetKey, PlanetKey];
}

export interface GrandCrossPattern {
  planets: PlanetKey[];
}

export interface YodPattern {
  apex: PlanetKey;
  sextile: [PlanetKey, PlanetKey];
}

/** Um Grão-Trígono fecha quando cada par entre os três tem trígono na lista de aspectos (orbe já aplicado no cálculo). */
export function detectGrandTrines(
  aspects: Aspect[],
  planets: PlanetPosition[],
): GrandTrinePattern[] {
  const lookup = buildAspectLookup(aspects);
  const keys = planets.map((p) => p.key);
  const seen = new Set<string>();
  const out: GrandTrinePattern[] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      for (let k = j + 1; k < keys.length; k++) {
        const a = keys[i]!;
        const b = keys[j]!;
        const c = keys[k]!;
        if (
          !lookupHasAspect(lookup, "trigono", a, b) ||
          !lookupHasAspect(lookup, "trigono", a, c) ||
          !lookupHasAspect(lookup, "trigono", b, c)
        ) {
          continue;
        }
        const trip = [a, b, c].sort((x, y) => x.localeCompare(y));
        const sk = trip.join(",");
        if (seen.has(sk)) continue;
        seen.add(sk);
        out.push({
          planets: trip as PlanetKey[],
          element: grandTrineElementLabel(planets, trip as PlanetKey[]),
        });
      }
    }
  }
  return out;
}

function detectTSquares(aspects: Aspect[], planetKeys: PlanetKey[]): TSquarePattern[] {
  const lookup = buildAspectLookup(aspects);
  const keys = [...new Set(planetKeys)];
  const seen = new Set<string>();
  const out: TSquarePattern[] = [];
  for (const asp of aspects) {
    if (asp.type !== "oposicao") continue;
    const p1 = asp.planet1;
    const p2 = asp.planet2;
    for (const c of keys) {
      if (c === p1 || c === p2) continue;
      if (
        !lookupHasAspect(lookup, "quadratura", p1, c) ||
        !lookupHasAspect(lookup, "quadratura", p2, c)
      ) {
        continue;
      }
      const opp = [p1, p2].sort((x, y) => x.localeCompare(y)) as [PlanetKey, PlanetKey];
      const sid = `${c}|${opp[0]}|${opp[1]}`;
      if (seen.has(sid)) continue;
      seen.add(sid);
      out.push({ apex: c, opposition: opp });
    }
  }
  return out;
}

/** Separação angular mínima 0–180°. */
function angularSepDegrees(lon1: number, lon2: number): number {
  let d = Math.abs(lon1 - lon2);
  if (d > 180) d = 360 - d;
  return d;
}

const YOD_QUINCUNX_ORB = 3;
const YOD_SEXTILE_ORB = 4;

function detectYods(planets: PlanetPosition[]): YodPattern[] {
  const keys = planets.map((p) => p.key);
  const lon = (k: PlanetKey) => planets.find((p) => p.key === k)?.longitude ?? 0;
  const seen = new Set<string>();
  const out: YodPattern[] = [];
  for (const f of keys) {
    for (let i = 0; i < keys.length; i++) {
      const b1 = keys[i]!;
      if (b1 === f) continue;
      for (let j = i + 1; j < keys.length; j++) {
        const b2 = keys[j]!;
        if (b2 === f) continue;
        const sepBase = angularSepDegrees(lon(b1), lon(b2));
        if (Math.abs(sepBase - 60) > YOD_SEXTILE_ORB) continue;
        if (Math.abs(angularSepDegrees(lon(b1), lon(f)) - 150) > YOD_QUINCUNX_ORB) continue;
        if (Math.abs(angularSepDegrees(lon(b2), lon(f)) - 150) > YOD_QUINCUNX_ORB) continue;
        const base = [b1, b2].sort((x, y) => x.localeCompare(y)) as [PlanetKey, PlanetKey];
        const sid = `${f}|${base[0]}|${base[1]}`;
        if (seen.has(sid)) continue;
        seen.add(sid);
        out.push({ apex: f, sextile: base });
      }
    }
  }
  return out;
}

/** Todas as permutações (fact(arr.length)). */
function permuteKeys(arr: PlanetKey[]): PlanetKey[][] {
  if (arr.length <= 1) return [[...arr]];
  const out: PlanetKey[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const first = arr[i]!;
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const tail of permuteKeys(rest)) {
      out.push([first, ...tail]);
    }
  }
  return out;
}

function permutations4(arr: PlanetKey[]): PlanetKey[][] {
  if (arr.length !== 4) return [];
  return permuteKeys(arr);
}

function detectGrandCrosses(aspects: Aspect[], planetKeys: PlanetKey[]): GrandCrossPattern[] {
  const lookup = buildAspectLookup(aspects);
  const uniq = [...new Set(planetKeys)].sort((x, y) => x.localeCompare(y));
  const seen = new Set<string>();
  const out: GrandCrossPattern[] = [];

  function hasOpp(x: PlanetKey, y: PlanetKey) {
    return lookupHasAspect(lookup, "oposicao", x, y);
  }
  function hasSq(x: PlanetKey, y: PlanetKey) {
    return lookupHasAspect(lookup, "quadratura", x, y);
  }

  function isSquareCycle(w: PlanetKey, x: PlanetKey, y: PlanetKey, z: PlanetKey) {
    return hasOpp(w, y) && hasOpp(x, z) && hasSq(w, x) && hasSq(x, y) && hasSq(y, z) && hasSq(z, w);
  }

  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      for (let k = j + 1; k < uniq.length; k++) {
        for (let l = k + 1; l < uniq.length; l++) {
          const quad = [uniq[i]!, uniq[j]!, uniq[k]!, uniq[l]!];
          let found = false;
          for (const perm of permutations4(quad)) {
            const [w, x, y, z] = perm;
            if (isSquareCycle(w, x, y, z)) {
              found = true;
              break;
            }
          }
          if (!found) continue;
          const canon = [...quad].sort((x, y) => x.localeCompare(y)).join(",");
          if (seen.has(canon)) continue;
          seen.add(canon);
          out.push({ planets: [...quad].sort((x, y) => x.localeCompare(y)) });
        }
      }
    }
  }
  return out;
}

export function planetKeysLabelPt(keys: PlanetKey[]): string {
  return keys.map(getPlanetName).join(", ");
}

export const SPECIAL_GEOMETRY_BLURBS = {
  grand_trine:
    "Fluxo natural entre três pontos — talentos que se apoiam com pouco atrito (evite complacência).",
  t_square:
    "Tensão focada no vértice — forte motor de mudança quando o desafio é nomeado e canalizado.",
  grand_cross:
    "Quatro frentes em tensão — pede equilíbrio entre áreas da vida e decisões conscientes.",
  yod: "Ajuste fino em torno do vértice — picos de destino ou mudança quando integra a base em sextil.",
} as const;

export interface DerivedChartPatterns {
  dominant_element: DominantElement;
  dominant_modality: DominantModality;
  stelliums: StelliumInfo[];
  chart_shape: string;
  life_purpose: string;
  main_challenges: string[];
  natural_talents: string[];
  grand_trines: GrandTrinePattern[];
  t_squares: TSquarePattern[];
  grand_crosses: GrandCrossPattern[];
  yods: YodPattern[];
}

export function deriveChartPatterns(data: ChartData): DerivedChartPatterns {
  const planetKeys = data.planets.map((p) => p.key);
  return {
    dominant_element: dominantElementFromChart(data.planets),
    dominant_modality: dominantModalityFromChart(data.planets),
    stelliums: findStelliums(data.planets),
    chart_shape: chartShapeLabel(data),
    life_purpose: lifePurposeHeuristic(data),
    main_challenges: mainChallengesFromAspects(data.aspects),
    natural_talents: naturalTalentsFromAspects(data.aspects),
    grand_trines: detectGrandTrines(data.aspects, data.planets),
    t_squares: detectTSquares(data.aspects, planetKeys),
    grand_crosses: detectGrandCrosses(data.aspects, planetKeys),
    yods: detectYods(data.planets),
  };
}
