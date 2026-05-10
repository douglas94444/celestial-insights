import type { AspectType, PlanetPosition } from "./calculate.ts";
import type { PlanetKey } from "./zodiac.ts";

const ASPECT_DEFS: { type: AspectType; angle: number; orb: number }[] = [
  { type: "conjuncao", angle: 0, orb: 8 },
  { type: "oposicao", angle: 180, orb: 8 },
  { type: "trigono", angle: 120, orb: 6 },
  { type: "quadratura", angle: 90, orb: 6 },
  { type: "sextil", angle: 60, orb: 4 },
];

export interface SynastryCrossAspect {
  planet1: PlanetKey;
  planet2: PlanetKey;
  type: AspectType;
  exactAngle: number;
  orb: number;
}

/** Aspectos entre corpos do mapa de trânsito e corpos natais. */
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
