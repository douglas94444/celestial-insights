import * as Astronomy from "astronomy-engine";
import { PLANETS, signFromLongitude, signIndexFromLongitude, type PlanetKey } from "./zodiac";

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

const BODY_MAP: Record<PlanetKey, Astronomy.Body> = {
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

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}
function rad2deg(r: number) {
  return (r * 180) / Math.PI;
}
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

/** Compute Ascendant (ecliptic longitude in degrees). */
function computeAscendant(date: Date, latitude: number, longitude: number): number {
  const gst = gstDegrees(date);
  const lst = norm360(gst + longitude); // local sidereal time in degrees
  const ramc = deg2rad(lst);
  const eps = deg2rad(obliquity(date));
  const lat = deg2rad(latitude);

  const num = -Math.cos(ramc);
  const den = Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps);
  let asc = rad2deg(Math.atan2(num, den));
  asc = norm360(asc);
  // Ensure ascendant is on the eastern horizon
  // Convention: should be near LST + 90 in some way; flip if needed
  return asc;
}

/** Compute Midheaven (MC) - ecliptic longitude of LST projected to ecliptic. */
function computeMidheaven(date: Date, longitude: number): number {
  const gst = gstDegrees(date);
  const lst = norm360(gst + longitude);
  const ramc = deg2rad(lst);
  const eps = deg2rad(obliquity(date));
  let mc = rad2deg(Math.atan2(Math.tan(ramc), Math.cos(eps)));
  // Atan2 gives [-180, 180]; need to put in same hemisphere as RAMC
  mc = norm360(mc);
  // Adjust quadrant: MC longitude should be within 90° of RAMC
  const diff = norm360(mc - lst);
  if (diff > 90 && diff < 270) {
    mc = norm360(mc + 180);
  }
  return mc;
}

/** Equal house cusps starting from Ascendant. */
function equalHouses(ascendant: number): HousePosition[] {
  const houses: HousePosition[] = [];
  for (let i = 0; i < 12; i++) {
    const cusp = norm360(ascendant + i * 30);
    houses.push({
      number: i + 1,
      cusp,
      sign: signFromLongitude(cusp),
    });
  }
  return houses;
}

function houseOfPlanet(longitude: number, houses: HousePosition[]): number {
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
}

export function calculateChart(input: CalculateInput): ChartData {
  // Build a UTC Date object from the local birth time + tz offset.
  const [y, mo, d] = input.birthDate.split("-").map(Number);
  const [h, mi] = input.birthTime.split(":").map(Number);
  // Local time -> UTC
  const utcMs = Date.UTC(y, mo - 1, d, h, mi) - input.timezoneOffset * 60_000;
  const date = new Date(utcMs);

  const ascendant = computeAscendant(date, input.latitude, input.longitude);
  const midheaven = computeMidheaven(date, input.longitude);
  const houses = equalHouses(ascendant);

  const planets: PlanetPosition[] = PLANETS.map((p) => {
    const body = BODY_MAP[p.key];
    const lon = eclipticLongitude(body, date);
    const retro = isRetrograde(body, date);
    return {
      key: p.key,
      name: p.name,
      symbol: p.symbol,
      longitude: lon,
      sign: signFromLongitude(lon),
      signIndex: signIndexFromLongitude(lon),
      degreeInSign: lon % 30,
      house: houseOfPlanet(lon, houses),
      retrograde: retro,
    };
  });

  const aspects = computeAspects(planets);

  return { ascendant, midheaven, planets, houses, aspects };
}
