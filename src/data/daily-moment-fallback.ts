import type { SignName } from "@/lib/astrology/zodiac";

export type MomentFallbackVars = {
  nome: string;
  sol: string;
  lua: string;
  ascendente: string;
  luaCasa: number | null;
  elemento: string;
};

/** Frases curtas sempre interpoladas com dados reais do mapa (fallback quando não há IA). */
export const MOMENT_FALLBACK_QUOTES: ((v: MomentFallbackVars) => string)[] = [
  (v) =>
    `${v.nome}, com Sol em ${v.sol} e Lua em ${v.lua}: hoje é dia de alinhar cabeça e coração.`,
  (v) =>
    `Sua ${v.elemento} em destaque convida presença gentil — ${v.nome}, ouça o ritmo da sua Lua em ${v.lua}.`,
  (v) =>
    `${v.nome}: ${v.ascendente} na porta do mundo, ${v.sol} por dentro — caminhe com curiosidade.`,
  (v) =>
    v.luaCasa
      ? `Lua na casa ${v.luaCasa}: ${v.nome}, nutra o que esse tema pede hoje, sem pressa.`
      : `${v.nome}, Lua em ${v.lua} pede um pouco de escuta e cuidado.`,
  (v) =>
    `Um respiro consciente já muda o dia — ${v.nome}, seu mapa em ${v.sol} · ${v.lua} · ${v.ascendente} é lembrança viva.`,
];

export function pickMomentFallbackQuote(vars: MomentFallbackVars, daySeed: number): string {
  const n = MOMENT_FALLBACK_QUOTES.length;
  const base = Number.isFinite(daySeed) ? Math.floor(daySeed) : 0;
  const idx = ((base % n) + n) % n;
  return MOMENT_FALLBACK_QUOTES[idx](vars);
}

export function wrapQuoteLines(text: string, maxLines = 4): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let cur = "";
  const softMax = 42;
  for (const w of words) {
    if (lines.length >= maxLines - 1) {
      cur = cur ? `${cur} ${w}` : w;
      continue;
    }
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > softMax && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

export function signLabelPt(s: SignName | string | null | undefined): string {
  return s ?? "—";
}
