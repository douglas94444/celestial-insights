/**
 * Pontos extras não cobertos pelo enum Body do astronomy-engine:
 * Nodo Norte médio (fórmula Ω da Lua) e Quiron (órbita elíptica J2000, elementos osculatórios).
 */
import * as Astronomy from "npm:astronomy-engine@2.1.19";

const SUN_GM = Astronomy.MassProduct(Astronomy.Body.Sun);

/** Epoca JD 2451545.5 TT ≈ 2000-01-02T00:00:00.000Z — elementos osc. Horizons Chiron. */
const CHIRON_EPOCH = Astronomy.MakeTime(new Date(Date.UTC(2000, 0, 2, 0, 0, 0)));

const CHIRON_A_AU = 13.64839646182672;
const CHIRON_E = 0.382882277664943;
const CHIRON_I = Astronomy.DEG2RAD * 6.927158076091733;
const CHIRON_OMEGA = Astronomy.DEG2RAD * 209.3822938299219;
const CHIRON_OMEGA_PERI = Astronomy.DEG2RAD * 339.6069380419948;
/**
 * Anomalia média (°) na época CHIRON_EPOCH — calibrada contra efemérides geocêntricas
 * (ex.: serennu.com, Jan/Jun 2000); o MA bruto do Horizons não fecha com este integrador simplificado.
 */
const CHIRON_M0_DEG = 27.65;

const J2000_OBL = Astronomy.DEG2RAD * 23.4392911;

function norm360(d: number) {
  return ((d % 360) + 360) % 360;
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 14; i++) {
    E = M + e * Math.sin(E);
  }
  return E;
}

/** Longitude eclíptica geocêntrica aparente do Quiron (0–360°). */
export function chironGeocentricLongitude(date: Date): number {
  const time = Astronomy.MakeTime(date);
  const dt = time.tt - CHIRON_EPOCH.tt;
  const n = Math.sqrt(SUN_GM / (CHIRON_A_AU * CHIRON_A_AU * CHIRON_A_AU));
  const M = Astronomy.DEG2RAD * CHIRON_M0_DEG + n * dt;
  const E = solveKepler(M, CHIRON_E);
  const sinE = Math.sin(E);
  const cosE = Math.cos(E);
  const nu = Math.atan2(Math.sqrt(1 - CHIRON_E * CHIRON_E) * sinE, cosE - CHIRON_E);
  const r = CHIRON_A_AU * (1 - CHIRON_E * cosE);

  const wp = CHIRON_OMEGA_PERI + nu;
  const coswp = Math.cos(wp);
  const sinwp = Math.sin(wp);
  const cosi = Math.cos(CHIRON_I);
  const sini = Math.sin(CHIRON_I);
  const cosOm = Math.cos(CHIRON_OMEGA);
  const sinOm = Math.sin(CHIRON_OMEGA);

  const X = r * (cosOm * coswp - sinOm * sinwp * cosi);
  const Y = r * (sinOm * coswp + cosOm * sinwp * cosi);
  const Z = r * (sinwp * sini);

  const xEq = X;
  const yEq = Y * Math.cos(J2000_OBL) - Z * Math.sin(J2000_OBL);
  const zEq = Y * Math.sin(J2000_OBL) + Z * Math.cos(J2000_OBL);

  const earth = Astronomy.HelioVector(Astronomy.Body.Earth, date);
  const gx = xEq - earth.x;
  const gy = yEq - earth.y;
  const gz = zEq - earth.z;
  const geo = new Astronomy.Vector(gx, gy, gz, time);
  const ecl = Astronomy.Ecliptic(geo);
  return norm360(ecl.elon);
}

/**
 * Nodo Norte médio da Lua — longitude eclíptica verdadeira do nodo ascendente médio (astrologia).
 * Mesma série que Ω em `Libration` do astronomy-engine.
 */
export function meanNorthNodeLongitude(date: Date): number {
  const t = Astronomy.MakeTime(date).tt / 36525;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const omega = 125.0445479 - 1934.1362891 * t + 0.0020754 * t2 + t3 / 467441 - t4 / 60616000;
  return norm360(omega);
}

export function meanSouthNodeLongitude(date: Date): number {
  return norm360(meanNorthNodeLongitude(date) + 180);
}
