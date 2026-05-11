import { describe, expect, it } from "vitest";
import {
  calculateTransitsInputSchema,
  chartIdSchema,
  cronTransitDigestSchema,
  natalExecutiveSummaryInputSchema,
  natalPlanetInsightInputSchema,
  synastryNarrativeInputSchema,
  transitDayNarrativeInputSchema,
} from "@/lib/schemas/server-fns";

describe("chartIdSchema", () => {
  it("aceita UUID", () => {
    expect(chartIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejeita texto não UUID", () => {
    expect(chartIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("calculateTransitsInputSchema", () => {
  it("aceita intervalo válido", () => {
    const r = calculateTransitsInputSchema.safeParse({
      chartId: "550e8400-e29b-41d4-a716-446655440000",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita data mal formatada", () => {
    const r = calculateTransitsInputSchema.safeParse({
      chartId: "550e8400-e29b-41d4-a716-446655440000",
      startDate: "01-01-2026",
      endDate: "2026-01-31",
    });
    expect(r.success).toBe(false);
  });
});

describe("synastryNarrativeInputSchema", () => {
  it("aceita synastryId", () => {
    expect(
      synastryNarrativeInputSchema.safeParse({
        synastryId: "550e8400-e29b-41d4-a716-446655440001",
      }).success,
    ).toBe(true);
  });

  it("aceita par de mapas", () => {
    expect(
      synastryNarrativeInputSchema.safeParse({
        chart1Id: "550e8400-e29b-41d4-a716-446655440000",
        chart2Id: "550e8400-e29b-41d4-a716-446655440001",
      }).success,
    ).toBe(true);
  });

  it("rejeita só um chartId", () => {
    expect(
      synastryNarrativeInputSchema.safeParse({
        chart1Id: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(false);
  });
});

describe("cronTransitDigestSchema", () => {
  it("exige secret com comprimento mínimo de 32 caracteres", () => {
    expect(cronTransitDigestSchema.safeParse({ cronSecret: "short" }).success).toBe(false);
    expect(cronTransitDigestSchema.safeParse({ cronSecret: "at-least-16-chars!" }).success).toBe(
      false,
    );
    expect(
      cronTransitDigestSchema.safeParse({
        cronSecret: "this-secret-is-exactly-32-chars!",
      }).success,
    ).toBe(true);
  });
});

describe("natalExecutiveSummaryInputSchema", () => {
  it("aceita chartId", () => {
    expect(
      natalExecutiveSummaryInputSchema.safeParse({
        chartId: "550e8400-e29b-41d4-a716-446655440000",
      }).success,
    ).toBe(true);
  });
});

describe("natalPlanetInsightInputSchema", () => {
  it("aceita planetKey válido", () => {
    expect(
      natalPlanetInsightInputSchema.safeParse({
        chartId: "550e8400-e29b-41d4-a716-446655440000",
        planetKey: "moon",
      }).success,
    ).toBe(true);
  });

  it("rejeita planetKey desconhecido", () => {
    expect(
      natalPlanetInsightInputSchema.safeParse({
        chartId: "550e8400-e29b-41d4-a716-446655440000",
        planetKey: "death_star",
      }).success,
    ).toBe(false);
  });
});

describe("transitDayNarrativeInputSchema", () => {
  it("aceita chartId e date", () => {
    expect(
      transitDayNarrativeInputSchema.safeParse({
        chartId: "550e8400-e29b-41d4-a716-446655440000",
        date: "2026-05-10",
      }).success,
    ).toBe(true);
  });
});
