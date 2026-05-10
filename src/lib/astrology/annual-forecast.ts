import type { HousePosition, HouseSystemId, PlanetPosition } from "@/lib/astrology/calculate";
import { computePlanetPositionsUtc } from "@/lib/astrology/calculate";
import { analyzeTransitRange, utcNoonForUtcDateString } from "@/lib/astrology/transits";
import type { PlanetKey } from "@/lib/astrology/zodiac";

/** Planetas lentos para alertas de ingresso em signo (meio-dia UTC). */
export const INGRESS_PLANETS: PlanetKey[] = ["jupiter", "saturn", "uranus", "neptune", "pluto"];

const INNER_RETRO: PlanetKey[] = ["mercury", "venus", "mars"];

export interface MonthForecast {
  month: number;
  year: number;
  avgIntensity: number;
  peakDays: { date: string; intensity: number }[];
  ingresses: { planet: PlanetKey; intoSign: string; date: string }[];
  retrogradePeriods: { planet: PlanetKey; startDate: string; endDate: string }[];
}

export type AnnualForecast = MonthForecast[];

export function daysInMonthUtc(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatYmdUtc(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthYmds(year: number, month: number): string[] {
  const n = daysInMonthUtc(year, month);
  return Array.from({ length: n }, (_, i) => formatYmdUtc(year, month, i + 1));
}

function addDaysToYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y!, m! - 1, d! + deltaDays);
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function planetSignAt(planet: PlanetKey, ymd: string): string {
  const u = utcNoonForUtcDateString(ymd);
  return computePlanetPositionsUtc(u).find((p) => p.key === planet)?.sign ?? "";
}

/** Primeiro dia civil do mês em que o planeta já está no signo do último dia (ingresso durante o mês). */
function findIngressIntoMonthEndSign(
  year: number,
  month: number,
  planet: PlanetKey,
): { date: string; intoSign: string } | null {
  const ym = monthYmds(year, month);
  const startSign = planetSignAt(planet, ym[0]!);
  const endSign = planetSignAt(planet, ym[ym.length - 1]!);
  if (startSign === endSign || !endSign) return null;
  const targetSign = endSign;
  let lo = 0;
  let hi = ym.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const sm = planetSignAt(planet, ym[mid]!);
    if (sm === targetSign) hi = mid;
    else lo = mid + 1;
  }
  return { date: ym[lo]!, intoSign: targetSign };
}

function innerRetroPeriodsForMonth(
  year: number,
  month: number,
): MonthForecast["retrogradePeriods"] {
  const ymds = monthYmds(year, month);
  const out: MonthForecast["retrogradePeriods"] = [];
  const runStart: Partial<Record<PlanetKey, string>> = {};

  for (const d of ymds) {
    const u = utcNoonForUtcDateString(d);
    const pos = computePlanetPositionsUtc(u);
    for (const planet of INNER_RETRO) {
      const r = pos.find((p) => p.key === planet)?.retrograde ?? false;
      if (r && !runStart[planet]) runStart[planet] = d;
      if (!r && runStart[planet]) {
        out.push({
          planet,
          startDate: runStart[planet]!,
          endDate: addDaysToYmd(d, -1),
        });
        delete runStart[planet];
      }
    }
  }

  for (const planet of INNER_RETRO) {
    if (runStart[planet]) {
      out.push({
        planet,
        startDate: runStart[planet]!,
        endDate: ymds[ymds.length - 1]!,
      });
    }
  }

  return out;
}

export function buildAnnualForecast(
  year: number,
  natalPlanets: PlanetPosition[],
  natalHouses: HousePosition[],
  natalAscendant: number,
  houseSystem: HouseSystemId,
): AnnualForecast {
  const months: MonthForecast[] = [];

  for (let month = 1; month <= 12; month++) {
    const ymds = monthYmds(year, month);
    const start = ymds[0]!;
    const end = ymds[ymds.length - 1]!;
    const days = analyzeTransitRange(
      start,
      end,
      natalPlanets,
      natalHouses,
      natalAscendant,
      houseSystem,
    );

    const avgIntensity =
      days.length === 0
        ? 0
        : Math.round((days.reduce((acc, d) => acc + d.intensity, 0) / days.length) * 10) / 10;

    const peakDays = [...days]
      .sort((a, b) => b.intensity - a.intensity || a.date.localeCompare(b.date))
      .slice(0, 3)
      .map((d) => ({ date: d.date, intensity: d.intensity }));

    const ingresses: MonthForecast["ingresses"] = [];
    for (const planet of INGRESS_PLANETS) {
      const ing = findIngressIntoMonthEndSign(year, month, planet);
      if (ing) ingresses.push({ planet, intoSign: ing.intoSign, date: ing.date });
    }

    months.push({
      month,
      year,
      avgIntensity,
      peakDays,
      ingresses,
      retrogradePeriods: innerRetroPeriodsForMonth(year, month),
    });
  }

  return months;
}
