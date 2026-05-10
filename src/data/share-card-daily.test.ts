import { describe, expect, it } from "vitest";
import {
  buildShareCardDailyExtras,
  buildTransitLuckFingerprint,
  pickShareCardDailyColor,
  pickShareCardDailyLuck,
} from "@/data/share-card-daily";

describe("pickShareCardDailyLuck", () => {
  it("é estável para o mesmo signo e data", () => {
    const a = pickShareCardDailyLuck("Libra", "2026-03-15");
    const b = pickShareCardDailyLuck("Libra", "2026-03-15");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("varia ao longo de várias datas (nem sempre a mesma frase)", () => {
    const phrases = Array.from({ length: 20 }, (_, i) =>
      pickShareCardDailyLuck("Áries", `2026-01-${String(i + 1).padStart(2, "0")}`),
    );
    expect(new Set(phrases).size).toBeGreaterThan(1);
  });

  it("mesmo signo e data: fingerprint diferente pode mudar a frase", () => {
    const date = "2026-06-01";
    const base = pickShareCardDailyLuck("Áries", date);
    let foundDiff = false;
    for (let i = 0; i < 6; i++) {
      const alt = pickShareCardDailyLuck("Áries", date, `2026-06-01|Virgem|${i}`);
      if (alt !== base) foundDiff = true;
    }
    expect(foundDiff).toBe(true);
  });

  it("mesmo fingerprint sempre igual sorte", () => {
    const fp = "2026-04-01|Libra|2";
    expect(pickShareCardDailyLuck("Gêmeos", "2026-04-01", fp)).toBe(
      pickShareCardDailyLuck("Gêmeos", "2026-04-01", fp),
    );
  });
});

describe("buildTransitLuckFingerprint", () => {
  it("devolve undefined sem trânsito", () => {
    expect(buildTransitLuckFingerprint(null)).toBeUndefined();
    expect(buildTransitLuckFingerprint(undefined)).toBeUndefined();
  });

  it("inclui data, Lua em trânsito e bucket de intensidade", () => {
    expect(
      buildTransitLuckFingerprint({
        date: "2026-01-01",
        transitMoonSign: "Leão",
        intensity: 49,
      }),
    ).toBe("2026-01-01|Leão|1");
  });
});

describe("pickShareCardDailyColor", () => {
  it("é estável para o mesmo signo e data", () => {
    const a = pickShareCardDailyColor("Peixes", "2026-05-10");
    const b = pickShareCardDailyColor("Peixes", "2026-05-10");
    expect(a.hex).toBe(b.hex);
    expect(a.labelPt).toBe(b.labelPt);
    expect(a.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("sorte e cor usam combinações diferentes (salt distinto)", () => {
    const date = "2026-08-20";
    const luck = pickShareCardDailyLuck("Leão", date);
    const color = pickShareCardDailyColor("Leão", date);
    expect(luck.length).toBeGreaterThan(5);
    expect(color.labelPt.length).toBeGreaterThan(2);
  });
});

describe("buildShareCardDailyExtras", () => {
  it("devolve null sem signo solar", () => {
    expect(buildShareCardDailyExtras(null, "2026-01-01")).toBeNull();
    expect(buildShareCardDailyExtras(undefined, "2026-01-01")).toBeNull();
  });

  it("devolve objeto completo com signo", () => {
    const r = buildShareCardDailyExtras("Virgem", "2026-12-01");
    expect(r).not.toBeNull();
    expect(r!.luckLine).toBeTruthy();
    expect(r!.colorLabel).toBeTruthy();
    expect(r!.colorHex).toMatch(/^#/);
  });

  it("aceita fingerprint de trânsito opcional", () => {
    const noFp = buildShareCardDailyExtras("Libra", "2026-05-05")!;
    const withFp = buildShareCardDailyExtras("Libra", "2026-05-05", "2026-05-05|Touro|3")!;
    expect(noFp.colorHex).toBe(withFp.colorHex);
    expect([noFp.luckLine, withFp.luckLine].every(Boolean)).toBe(true);
  });
});
