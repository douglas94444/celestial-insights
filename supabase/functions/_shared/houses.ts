/**
 * Sistemas de casas: Placidus (port das rotinas Asc1/Asc2 + loop principal de swehouse.c do Swiss Ephemeris),
 * casas iguais e signo inteiro.
 */
import { signFromLongitude } from "./zodiac.ts";

export type HouseSystemId = "placidus" | "equal" | "whole_sign";

const VERY_SMALL = 1e-15;
/** Igual a VERY_SMALL_PLAC_ITER no Swiss Ephemeris */
const VERY_SMALL_PLAC_ITER = 1 / 360000;
const NITER_MAX = 100;

function degNorm(x: number): number {
  let y = x % 360;
  if (y < 0) y += 360;
  return y;
}

function sind(d: number) {
  return Math.sin((d * Math.PI) / 180);
}
function cosd(d: number) {
  return Math.cos((d * Math.PI) / 180);
}
function tand(d: number) {
  return Math.tan((d * Math.PI) / 180);
}
function asind(x: number) {
  return (Math.asin(Math.max(-1, Math.min(1, x))) * 180) / Math.PI;
}
function atand(x: number) {
  return (Math.atan(x) * 180) / Math.PI;
}

function difDeg2n(a: number, b: number): number {
  let x = a - b;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

/**
 * Swiss Asc2 — x e f em graus; sine/cose = sin/cos da oblíquidade.
 */
function asc2(x: number, f: number, sine: number, cose: number): number {
  let ass = -tand(f) * sine + cose * cosd(x);
  if (Math.abs(ass) < VERY_SMALL) ass = 0;
  let sinx = sind(x);
  if (Math.abs(sinx) < VERY_SMALL) sinx = 0;
  if (sinx === 0) {
    if (ass < 0) ass = -VERY_SMALL;
    else ass = VERY_SMALL;
  } else if (ass === 0) {
    if (sinx < 0) ass = -90;
    else ass = 90;
  } else {
    ass = atand(sinx / ass);
  }
  if (ass < 0) ass += 180;
  return ass;
}

/** Swiss Asc1 — cruza eclíptica com grande círculo de altura polar f; x1 ao longo do equador. */
function asc1(x1: number, f: number, sine: number, cose: number): number {
  const x = degNorm(x1);
  const n = Math.floor(x / 90) + 1;
  if (Math.abs(90 - f) < VERY_SMALL) return 180;
  if (Math.abs(90 + f) < VERY_SMALL) return 0;
  let ass: number;
  if (n === 1) ass = asc2(x, f, sine, cose);
  else if (n === 2) ass = 180 - asc2(180 - x, -f, sine, cose);
  else if (n === 3) ass = 180 + asc2(x - 180, -f, sine, cose);
  else ass = 360 - asc2(360 - x, f, sine, cose);
  ass = degNorm(ass);
  if (Math.abs(ass - 90) < VERY_SMALL) ass = 90;
  if (Math.abs(ass - 180) < VERY_SMALL) ass = 180;
  if (Math.abs(ass - 270) < VERY_SMALL) ass = 270;
  if (Math.abs(ass - 360) < VERY_SMALL) ass = 0;
  return ass;
}

function mcFromRamc(th: number, cose: number): number {
  if (Math.abs(th - 90) <= VERY_SMALL) return 90;
  if (Math.abs(th - 270) <= VERY_SMALL) return 270;
  const tant = tand(th);
  let mc = atand(tant / cose);
  if (th > 90 && th <= 270) mc = degNorm(mc + 180);
  return degNorm(mc);
}

export interface HouseCuspRow {
  number: number;
  cusp: number;
  sign: string;
}

function row(n: number, cusp: number): HouseCuspRow {
  return { number: n, cusp: degNorm(cusp), sign: signFromLongitude(cusp) };
}

/** RAMC = arco retificado do MC (graus), fi = latitude, ekl = oblíquidade média (graus). */
function placidusCusps(
  th: number,
  fi: number,
  ekl: number,
): {
  cusp: number[];
  usedFallback: boolean;
} {
  let lat = fi;
  const sine = sind(ekl);
  const cose = cosd(ekl);
  const tane = tand(ekl);
  if (Math.abs(Math.abs(lat) - 90) < VERY_SMALL) {
    lat = lat < 0 ? -90 + VERY_SMALL : 90 - VERY_SMALL;
  }
  const tanfi = tand(lat);

  const mc = mcFromRamc(th, cose);
  const ac = asc1(th + 90, lat, sine, cose);

  /* Polo polar: Placidus indefinido — usa casas iguais a partir do Asc calculado por Asc1 */
  if (Math.abs(lat) >= 90 - ekl - 1e-6) {
    const houses: number[] = [];
    for (let i = 0; i < 12; i++) houses.push(degNorm(ac + i * 30));
    return { cusp: houses, usedFallback: true };
  }

  const a = asind(tand(lat) * tane);
  const fh1 = atand(sind(a / 3) / tane);
  const fh2 = atand(sind((a * 2) / 3) / tane);

  const hsp: number[] = [];
  for (let i = 0; i <= 13; i++) hsp[i] = 0;
  hsp[1] = ac;
  hsp[10] = mc;

  type Triplet = { rect: number; ih: number; div: number; fh: number };
  const blocks: Triplet[] = [
    { rect: degNorm(30 + th), ih: 11, div: 3, fh: fh1 },
    { rect: degNorm(60 + th), ih: 12, div: 1.5, fh: fh2 },
    { rect: degNorm(120 + th), ih: 2, div: 1.5, fh: fh2 },
    { rect: degNorm(150 + th), ih: 3, div: 3, fh: fh1 },
  ];

  for (const b of blocks) {
    const rectasc = b.rect;
    const ih = b.ih;
    const div = b.div;
    const fh = b.fh;
    let tantInit = tand(asind(sine * sind(asc1(rectasc, fh, sine, cose))));
    let cuspsv = 0;

    if (Math.abs(tantInit) < VERY_SMALL) {
      hsp[ih] = rectasc;
    } else {
      let f = atand(sind(asind(tanfi * tantInit) / div) / tantInit);
      hsp[ih] = asc1(rectasc, f, sine, cose);
      for (let iter = 1; iter <= NITER_MAX; iter++) {
        tantInit = tand(asind(sine * sind(hsp[ih])));
        if (Math.abs(tantInit) < VERY_SMALL) {
          hsp[ih] = rectasc;
          break;
        }
        f = atand(sind(asind(tanfi * tantInit) / div) / tantInit);
        hsp[ih] = asc1(rectasc, f, sine, cose);
        if (iter > 1 && Math.abs(difDeg2n(hsp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER) break;
        cuspsv = hsp[ih];
      }
    }
  }

  hsp[4] = degNorm(hsp[10] + 180);
  hsp[5] = degNorm(hsp[11] + 180);
  hsp[6] = degNorm(hsp[12] + 180);
  hsp[7] = degNorm(hsp[1] + 180);
  hsp[8] = degNorm(hsp[2] + 180);
  hsp[9] = degNorm(hsp[3] + 180);

  const out: number[] = [];
  for (let i = 1; i <= 12; i++) out.push(hsp[i]);
  return { cusp: out, usedFallback: false };
}

function equalFromAsc(asc: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 12; i++) out.push(degNorm(asc + i * 30));
  return out;
}

/** Signo inteiro: cúspides no início de cada signo; casa 1 começa no signo do Ascendente. */
function wholeSignCusps(asc: number): number[] {
  const start = Math.floor(degNorm(asc) / 30) * 30;
  const out: number[] = [];
  for (let i = 0; i < 12; i++) out.push(degNorm(start + i * 30));
  return out;
}

/** Casa (1–12) em signo inteiro a partir da longitude e do Ascendente. */
export function wholeSignHouse(longitude: number, ascendant: number): number {
  const ps = Math.floor(degNorm(longitude) / 30);
  const ascS = Math.floor(degNorm(ascendant) / 30);
  return ((ps - ascS + 12) % 12) + 1;
}

export interface HousesResult {
  houses: HouseCuspRow[];
  ascendant: number;
  midheaven: number;
  /** True se Placidus caiu no fallback polar */
  placidusFallback?: boolean;
}

export function computeHouses(
  ramcDeg: number,
  latitude: number,
  obliquityDeg: number,
  system: HouseSystemId,
): HousesResult {
  const th = degNorm(ramcDeg);
  const fi = latitude;
  const ekl = obliquityDeg;
  const sine = sind(ekl);
  const cose = cosd(ekl);

  const mc = mcFromRamc(th, cose);
  const ac = asc1(th + 90, fi, sine, cose);

  let cuspLon: number[];
  let placidusFallback: boolean | undefined;

  if (system === "placidus") {
    const p = placidusCusps(th, fi, ekl);
    cuspLon = p.cusp;
    placidusFallback = p.usedFallback;
  } else if (system === "equal") {
    cuspLon = equalFromAsc(ac);
  } else {
    cuspLon = wholeSignCusps(ac);
  }

  const houses: HouseCuspRow[] = cuspLon.map((c, idx) => row(idx + 1, c));

  /** Ascendente horário e MC no meridiano (RAMC) — consistentes com o arco da roda. */
  return {
    houses,
    ascendant: degNorm(ac),
    midheaven: degNorm(mc),
    placidusFallback,
  };
}

export const HOUSE_SYSTEM_LABELS: Record<HouseSystemId, string> = {
  placidus: "Placidus",
  equal: "Casas iguais",
  whole_sign: "Signo inteiro",
};
