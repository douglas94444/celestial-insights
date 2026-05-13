import { describe, expect, it } from "vitest";
import { wrapQuoteLines } from "@/data/daily-moment-fallback";

describe("wrapQuoteLines", () => {
  it("retorna vazio para texto vazio", () => {
    expect(wrapQuoteLines("  \n\t ")).toEqual([]);
  });

  it("mantém uma linha curta num único segmento", () => {
    expect(wrapQuoteLines("Olá mundo curto")).toEqual(["Olá mundo curto"]);
  });

  it("não perde palavras com texto muito longo (maxLines 4)", () => {
    const words = Array.from({ length: 80 }, (_, i) => `w${i}`);
    const text = words.join(" ");
    const lines = wrapQuoteLines(text, 4);
    const recovered = lines.join(" ").split(/\s+/).filter(Boolean);
    expect(recovered).toEqual(words);
    expect(lines.length).toBeLessThanOrEqual(4);
  });

  it("respeita no máximo maxLines", () => {
    const long = "a ".repeat(100).trim();
    expect(wrapQuoteLines(long, 2).length).toBeLessThanOrEqual(2);
  });

  it("com maxLines 1 junta todas as palavras numa linha", () => {
    const text = "um dois três quatro cinco";
    expect(wrapQuoteLines(text, 1)).toEqual([text]);
  });
});
