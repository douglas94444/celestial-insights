import { z } from "zod";
import type { Aspect, HousePosition, PlanetPosition } from "@/lib/astrology/calculate";
import type { Json } from "@/integrations/supabase/types";
import { PLANETS, type PlanetKey } from "@/lib/astrology/zodiac";

const PLANET_KEYS = PLANETS.map((p) => p.key) as [PlanetKey, ...PlanetKey[]];

export const planetKeySchema = z.enum(PLANET_KEYS);

export const planetPositionSchema = z.object({
  key: planetKeySchema,
  name: z.string(),
  symbol: z.string(),
  longitude: z.number(),
  sign: z.string(),
  signIndex: z.number(),
  degreeInSign: z.number(),
  house: z.number(),
  retrograde: z.boolean(),
});

export const housePositionSchema = z.object({
  number: z.number(),
  cusp: z.number(),
  sign: z.string(),
});

export const aspectTypeSchema = z.enum([
  "conjuncao",
  "oposicao",
  "trigono",
  "quadratura",
  "sextil",
]);

export const aspectSchema = z.object({
  planet1: planetKeySchema,
  planet2: planetKeySchema,
  type: aspectTypeSchema,
  exactAngle: z.number(),
  orb: z.number(),
});

export const planetsDataSchema = z.array(planetPositionSchema);
export const housesDataSchema = z.array(housePositionSchema);
export const aspectsDataSchema = z.array(aspectSchema);

export type ParsedChartGeometry = {
  planets: PlanetPosition[];
  houses: HousePosition[];
  aspects: Aspect[];
};

/** Valida JSON armazenado em `charts.*_data`. Falha em runtime se corrupto. */
export function parseStoredChartGeometry(chart: {
  planets_data: unknown;
  houses_data: unknown;
  aspects_data: unknown;
}): ParsedChartGeometry {
  const pr = planetsDataSchema.safeParse(chart.planets_data);
  const hr = housesDataSchema.safeParse(chart.houses_data);
  const ar = aspectsDataSchema.safeParse(chart.aspects_data);
  if (!pr.success) {
    throw new Error(`INVALID_CHART_GEOMETRY: planets_data — ${pr.error.message}`);
  }
  if (!hr.success) {
    throw new Error(`INVALID_CHART_GEOMETRY: houses_data — ${hr.error.message}`);
  }
  if (!ar.success) {
    throw new Error(`INVALID_CHART_GEOMETRY: aspects_data — ${ar.error.message}`);
  }
  return { planets: pr.data, houses: hr.data, aspects: ar.data };
}

/** Igual a `parseStoredChartGeometry`, mas devolve `null` em vez de lançar (UI / hooks). */
export function tryParseStoredChartGeometry(chart: {
  planets_data: unknown;
  houses_data: unknown;
  aspects_data: unknown;
}): ParsedChartGeometry | null {
  try {
    return parseStoredChartGeometry(chart);
  } catch {
    return null;
  }
}

/** Valida geometria calculada com o mesmo schema da leitura antes de `insert`/`update` na BD. */
export function chartGeometryToSupabaseJson(geometry: ParsedChartGeometry): {
  planets_data: Json;
  houses_data: Json;
  aspects_data: Json;
} {
  const parsed = parseStoredChartGeometry({
    planets_data: geometry.planets,
    houses_data: geometry.houses,
    aspects_data: geometry.aspects,
  });
  return {
    planets_data: parsed.planets as unknown as Json,
    houses_data: parsed.houses as unknown as Json,
    aspects_data: parsed.aspects as unknown as Json,
  };
}
