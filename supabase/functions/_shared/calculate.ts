import * as Astronomy from "npm:astronomy-engine@2.1.19";
import {
  chironGeocentricLongitude,
  meanNorthNodeLongitude,
  meanSouthNodeLongitude,
} from "./extra-bodies.ts";
import { computeHouses, wholeSignHouse, type HouseSystemId } from "./houses.ts";
import { PLANETS, signFromLongitude, signIndexFromLongitude, type PlanetKey } from "./zodiac.ts";

export type { HouseSystemId } from "./houses.ts";

export interface PlanetPosition {
  key: PlanetKey;
  name: string;
  symbol: string;
  longitude: number; // 0-360 ecliptic longitude
  sign: string;
  signIndex: number;
  degreeInSign: number;
  house: number;
  retrograde: boolean;
}

export interface HousePosition {
  number: number;
  cusp: number; // ecliptic longitude
  sign: string;
}

export type AspectType = "conjuncao" | "oposicao" | "trigono" | "quadratura" | "sextil";

export interface Aspect {
  planet1: PlanetKey;
  planet2: PlanetKey;
  type: AspectType;
  exactAngle: number;
  orb: number;
}

export interface ChartData {
  ascendant: number;
  midheaven: number;
  planets: PlanetPosition[];
  houses: HousePosition[];
  aspects: Aspect[];
}

const ASPECT_DEFS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjuncao", angle: 0, orb: 8 },
  { type: "oposicao", angle: 180, orb: 8 },
  { type: "trigono", angle: 120, orb: 6 },
  { type: "quadratura", angle: 90, orb: 6 },
  { type: "sextil", angle: 60, orb: 4 },
];

const BODY_MAP: Partial<Record<PlanetKey, Astronomy.Body>> = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto,
};

function norm360(d: number) {
  return ((d % 360) + 360) % 360;
}

/** Compute ecliptic longitude (0-360) of a body in geocentric apparent coordinates. */
function eclipticLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Moon) {
    const ecl = Astronomy.EclipticGeoMoon(date);
    return norm360(ecl.lon);
  }
  // GeoVector returns equatorial coordinates; convert to ecliptic
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return norm360(ecl.elon);
}

function isRetrograde(body: Astronomy.Body, date: Date): boolean {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false;
  const t1 = new Date(date.getTime() - 24 * 3600 * 1000);
  const t2 = new Date(date.getTime() + 24 * 3600 * 1000);
  const lon1 = eclipticLongitude(body, t1);
  const lon2 = eclipticLongitude(body, t2);
  let diff = lon2 - lon1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

function isRetrogradeLongitude(lonFn: (d: Date) => number, date: Date): boolean {
  const t1 = new Date(date.getTime() - 24 * 3600 * 1000);
  const t2 = new Date(date.getTime() + 24 * 3600 * 1000);
  let diff = lonFn(t2) - lonFn(t1);
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

/** Mean obliquity of the ecliptic at a given date (degrees). */
function obliquity(date: Date): number {
  const T = (date.getTime() / 86400000 - 10957.5) / 36525; // Julian centuries from J2000
  // IAU 2006 mean obliquity
  const eps = 23.43929111 - (46.815 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
  return eps;
}

/** Greenwich Sidereal Time in degrees. */
function gstDegrees(date: Date): number {
  const t = Astronomy.SiderealTime(date); // returns hours
  return norm360(t * 15);
}

/** Casa natal (cúspides) onde cai uma longitude eclíptica. */
export function natalHouseForLongitude(longitude: number, houses: HousePosition[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i++) {
    const start = houses[i].cusp;
    const end = houses[(i + 1) % 12].cusp;
    let span = end - start;
    if (span <= 0) span += 360;
    let offset = lon - start;
    if (offset < 0) offset += 360;
    if (offset >= 0 && offset < span) return i + 1;
  }
  return 1;
}

/** Posições planetárias geocêntricas num instante UTC (sem casas). Útil para trânsitos. */
export function computePlanetPositionsUtc(date: Date): Omit<PlanetPosition, "house">[] {
  return PLANETS.map((p) => {
    const body = BODY_MAP[p.key];
    let lon: number;
    let retro: boolean;
    if (body !== undefined) {
      lon = eclipticLongitude(body, date);
      retro = isRetrograde(body, date);
    } else if (p.key === "chiron") {
      lon = chironGeocentricLongitude(date);
      retro = isRetrogradeLongitude(chironGeocentricLongitude, date);
    } else if (p.key === "north_node") {
      lon = meanNorthNodeLongitude(date);
      retro = isRetrogradeLongitude(meanNorthNodeLongitude, date);
    } else {
      lon = meanSouthNodeLongitude(date);
      retro = isRetrogradeLongitude(meanSouthNodeLongitude, date);
    }
    return {
      key: p.key,
      name: p.name,
      symbol: p.symbol,
      longitude: lon,
      sign: signFromLongitude(lon),
      signIndex: signIndexFromLongitude(lon),
      degreeInSign: lon % 30,
      retrograde: retro,
    };
  });
}

function computeAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i].longitude;
      const b = planets[j].longitude;
      let diff = Math.abs(a - b);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            planet1: planets[i].key,
            planet2: planets[j].key,
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

export interface CalculateInput {
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  latitude: number;
  longitude: number;
  timezoneOffset: number; // minutes east of UTC at the moment of birth
  /** Default no servidor: placidus (perfil do utilizador ou coluna do mapa). */
  houseSystem?: HouseSystemId;
}

/** Instant UTC do nascimento a partir da hora local + offset fixo (histórico). */
export function utcBirthInstant(input: CalculateInput): Date {
  const [y, mo, d] = input.birthDate.split("-").map(Number);
  const [h, mi] = input.birthTime.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - input.timezoneOffset * 60_000);
}

/** Meio do Céu (MC) e Ascendente — alinhado ao sistema de casas escolhido. */
export function computeAngles(input: CalculateInput): { ascendant: number; midheaven: number } {
  const date = utcBirthInstant(input);
  const ramc = norm360(gstDegrees(date) + input.longitude);
  const hr = computeHouses(ramc, input.latitude, obliquity(date), input.houseSystem ?? "placidus");
  return { ascendant: hr.ascendant, midheaven: hr.midheaven };
}

export function calculateChart(input: CalculateInput): ChartData {
  const date = utcBirthInstant(input);
  const sys = input.houseSystem ?? "placidus";
  const ramc = norm360(gstDegrees(date) + input.longitude);
  const obl = obliquity(date);
  const hr = computeHouses(ramc, input.latitude, obl, sys);

  const ascendant = hr.ascendant;
  const midheaven = hr.midheaven;
  const houses: HousePosition[] = hr.houses.map((h) => ({
    number: h.number,
    cusp: h.cusp,
    sign: signFromLongitude(h.cusp),
  }));

  const bare = computePlanetPositionsUtc(date);
  const planets: PlanetPosition[] = bare.map((p) => ({
    ...p,
    house:
      sys === "whole_sign"
        ? wholeSignHouse(p.longitude, ascendant)
        : natalHouseForLongitude(p.longitude, houses),
  }));

  const aspects = computeAspects(planets);

  return { ascendant, midheaven, planets, houses, aspects };
}
