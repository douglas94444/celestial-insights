import { wrapQuoteLines } from "@/data/daily-moment-fallback";

export function buildMomentQuoteLines(opts: {
  aiText: string | null;
  transitNarrative: string[];
  fallbackParagraph: string;
}): string[] {
  const trimmedAi = opts.aiText?.trim();
  if (trimmedAi) {
    const compact = trimmedAi.replace(/\s+/g, " ").trim();
    const wrapped = wrapQuoteLines(compact, 4);
    if (wrapped.length > 0) return wrapped;
  }

  const n0 = opts.transitNarrative[0]?.replace(/^✦\s*/, "").trim();
  const n1 = opts.transitNarrative[1]?.replace(/^✦\s*/, "").trim();
  if (n0) {
    const two = [n0, n1].filter(Boolean).join(" ");
    return wrapQuoteLines(two, 4);
  }

  return wrapQuoteLines(opts.fallbackParagraph, 4);
}
