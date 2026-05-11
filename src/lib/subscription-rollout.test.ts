import { describe, expect, it } from "vitest";
import {
  buildRolloutGatesForDay,
  calendarDaysBetweenYmd,
  getRolloutDayIndexSp,
  paidRolloutApplies,
  ymdSaoPaulo,
} from "@/lib/subscription-rollout";

describe("subscription-rollout", () => {
  it("calendarDaysBetweenYmd same day is 0", () => {
    expect(calendarDaysBetweenYmd("2026-03-10", "2026-03-10")).toBe(0);
  });

  it("calendarDaysBetweenYmd counts forward", () => {
    expect(calendarDaysBetweenYmd("2026-03-10", "2026-03-17")).toBe(7);
  });

  it("getRolloutDayIndexSp matches calendar difference in SP", () => {
    const created = "2026-05-01T15:00:00.000Z";
    const now = new Date("2026-05-03T15:00:00.000Z");
    const anchor = ymdSaoPaulo(created, new Date(created));
    const today = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    expect(getRolloutDayIndexSp(created, now)).toBe(calendarDaysBetweenYmd(anchor, today));
  });

  it("buildRolloutGatesForDay 0 only allows natal-era features", () => {
    const g = buildRolloutGatesForDay(0);
    expect(g.transits).toBe(false);
    expect(g.extraCharts).toBe(false);
    expect(g.synastry).toBe(false);
    expect(g.composite).toBe(false);
    expect(g.annualForecast).toBe(false);
    expect(g.pdfExport).toBe(false);
    expect(g.moodAdvanced).toBe(false);
    expect(g.digestEmail).toBe(false);
    expect(g.aiFullKinds).toBe(false);
  });

  it("buildRolloutGatesForDay 6 unlocks digest and full AI", () => {
    const g = buildRolloutGatesForDay(6);
    expect(g.digestEmail).toBe(true);
    expect(g.aiFullKinds).toBe(true);
    expect(g.moodAdvanced).toBe(true);
  });

  it("buildRolloutGatesForDay 7 is full", () => {
    const g = buildRolloutGatesForDay(7);
    expect(g.transits && g.extraCharts && g.synastry && g.composite).toBe(true);
  });

  it("paidRolloutApplies for MENSAL only under 7 days", () => {
    expect(paidRolloutApplies("MENSAL", 0)).toBe(true);
    expect(paidRolloutApplies("MENSAL", 6)).toBe(true);
    expect(paidRolloutApplies("MENSAL", 7)).toBe(false);
    expect(paidRolloutApplies("FREE", 0)).toBe(false);
  });
});
