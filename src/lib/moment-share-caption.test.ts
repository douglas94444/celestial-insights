import { describe, expect, it } from "vitest";
import { buildMomentShareCaption, suggestedMomentHashtags } from "@/lib/moment-share-caption";

describe("buildMomentShareCaption", () => {
  const base = {
    titleFirstName: "Ana",
    luckLine: "Abrir espaço gentil.",
    colorLabel: "Índigo",
    colorHex: "#4B0082",
    brandHandle: "@astro",
    shareUrl: "https://example.com",
  };

  it("monta blocos esperados com URL e cor (médio)", () => {
    const text = buildMomentShareCaption({ ...base, preset: "medium" });
    expect(text).toContain("Momento com o céu — Ana");
    expect(text).toContain("Sorte do dia:");
    expect(text).toContain("Cor de hoje: Índigo (#4B0082)");
    expect(text).toContain("Criado em @astro");
    expect(text).toContain("Monte o seu mapa: https://example.com");
  });

  it("preset curto omite cor e CTA longo", () => {
    const text = buildMomentShareCaption({ ...base, preset: "short" });
    expect(text).toContain("Sorte: Abrir espaço gentil.");
    expect(text).not.toContain("Cor de hoje");
    expect(text).not.toContain("Monte o seu mapa");
  });

  it("preset completo acrescenta linha reflexiva extra", () => {
    const text = buildMomentShareCaption({ ...base, preset: "full" });
    expect(text).toContain("reflexão simbólica");
    expect(text).toContain("Link acima");
  });

  it("anexa hashtags quando pedido", () => {
    const text = buildMomentShareCaption({
      ...base,
      preset: "short",
      hashtags: ["TesteTag", "Astrologia"],
    });
    expect(text).toContain("#TesteTag");
    expect(text).toContain("#Astrologia");
  });

  it("omite linhas opcionais quando ausentes", () => {
    const text = buildMomentShareCaption({
      titleFirstName: "Beto",
      brandHandle: "astro.app",
      shareUrl: null,
      preset: "medium",
    });
    expect(text).not.toContain("Sorte do dia");
    expect(text).not.toContain("Monte o seu mapa");
    expect(text).toContain("Criado em astro.app");
  });
});

describe("suggestedMomentHashtags", () => {
  const seed = {
    sunSignLabel: "Leão",
    dateStr: "2026-06-01",
    transitFingerprint: "2026-06-01|Gêmeos|2",
    dominantElement: "Fogo",
    intensityBucket: 3,
  };

  it("é determinístico para o mesmo seed", () => {
    expect(suggestedMomentHashtags(seed).join(",")).toBe(suggestedMomentHashtags(seed).join(","));
  });

  it("muda quando o fingerprint muda", () => {
    const a = suggestedMomentHashtags(seed).join(",");
    const b = suggestedMomentHashtags({ ...seed, transitFingerprint: "x" }).join(",");
    expect(a).not.toBe(b);
  });
});
