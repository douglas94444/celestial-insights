import { describe, expect, it } from "vitest";
import {
  parseSynastryDeepCached,
  synastryDeepFromLlm,
  SYNASTRY_COMPOSITE_MVP_PT,
} from "@/lib/ai/synastry-deep-parse";

const LEGAL = "Aviso legal de teste.";

describe("parseSynastryDeepCached", () => {
  it("parse JSON válido", () => {
    const payload = {
      composite_disclaimer: SYNASTRY_COMPOSITE_MVP_PT,
      overview: "A",
      emotional_dynamics: "B",
      communication_styles: "C",
      intimacy_attraction: "D",
      conflict_repair: "E",
      daily_rhythm: "F",
      long_term_growth: "G",
      integration_summary: LEGAL,
    };
    const out = parseSynastryDeepCached(JSON.stringify(payload));
    expect(out?.overview).toBe("A");
    expect(out?.composite_disclaimer).toContain("mapa composto");
  });

  it("devolve null em JSON inválido", () => {
    expect(parseSynastryDeepCached("not json")).toBeNull();
    expect(parseSynastryDeepCached("{}")).toBeNull();
  });
});

describe("synastryDeepFromLlm", () => {
  it("parse objeto JSON em texto", () => {
    const blob = JSON.stringify({
      composite_disclaimer: SYNASTRY_COMPOSITE_MVP_PT,
      overview: "Visão",
      emotional_dynamics: "emo",
      communication_styles: "com",
      intimacy_attraction: "int",
      conflict_repair: "conf",
      daily_rhythm: "dia",
      long_term_growth: "long",
      integration_summary: LEGAL,
    });
    const out = synastryDeepFromLlm(blob, LEGAL);
    expect(out.parse_ok).toBe(true);
    expect(out.deep.overview).toBe("Visão");
    expect(out.deep.composite_disclaimer).toContain("mapa composto");
  });

  it("fallback mantém composite_disclaimer MVP e integration_summary legal", () => {
    const out = synastryDeepFromLlm("isto não é json válido", LEGAL);
    expect(out.parse_ok).toBe(false);
    expect(out.deep.composite_disclaimer).toBe(SYNASTRY_COMPOSITE_MVP_PT);
    expect(out.deep.integration_summary).toBe(LEGAL);
    expect(out.deep.overview.length).toBeGreaterThan(0);
    expect(out.deep.emotional_dynamics).toContain("Integra tensões");
  });
});
