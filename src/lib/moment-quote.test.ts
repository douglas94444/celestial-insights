import { describe, expect, it } from "vitest";
import { buildMomentQuoteLines } from "@/lib/moment-quote";

describe("buildMomentQuoteLines", () => {
  it("prefere texto da IA quando existe", () => {
    const lines = buildMomentQuoteLines({
      aiText: "  Olá mundo belo  ",
      transitNarrative: ["✦ ignorado"],
      fallbackParagraph: "fallback",
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((l) => /Olá\s+mundo\s+belo/.test(l))).toBe(true);
  });

  it("usa trânsitos quando não há IA", () => {
    const lines = buildMomentQuoteLines({
      aiText: null,
      transitNarrative: ["✦ Lua em aspecto suave.", "✦ Segunda linha."],
      fallbackParagraph: "fallback",
    });
    expect(lines.some((l) => l.includes("Lua em aspecto"))).toBe(true);
  });

  it("cai no fallback quando não há IA nem trânsitos úteis", () => {
    const lines = buildMomentQuoteLines({
      aiText: "",
      transitNarrative: [],
      fallbackParagraph: "Frase de segurança curta.",
    });
    expect(lines.some((l) => l.includes("segurança"))).toBe(true);
  });
});
