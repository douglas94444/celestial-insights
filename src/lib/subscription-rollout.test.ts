import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  assertPaidRolloutAiAccess,
  buildRolloutGatesForDay,
  calendarDaysBetweenYmd,
  fetchProfileRolloutState,
  FREE_ROLLOUT_LOCKED_MESSAGE,
  FULL_ROLLOUT_GATES,
  getRolloutDayIndexSp,
  MAPA_ROLLOUT_LOCKED_MESSAGE,
  paidRolloutApplies,
  rolloutGateEnforcementActive,
  rolloutGatesForTier,
  rolloutLockedMessage,
  rolloutLockedMessageForTier,
  ymdSaoPaulo,
} from "@/lib/subscription-rollout";

function mockSupabaseForRollout(opts: {
  admin: boolean;
  tier?: Database["public"]["Enums"]["subscription_tier"];
  /** Contagem simulada para `countInterpretationsUtcMonth` (interpretation_ai_cache). */
  aiMonthCount?: number;
}): SupabaseClient<Database> {
  const tier = opts.tier ?? "FREE";
  return {
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { subscription_tier: tier, created_at: "2026-01-01T12:00:00.000Z" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.admin ? { user_id: "user-1" } : null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "interpretation_ai_cache") {
        return {
          select: () => ({
            eq: () => ({
              gte: async () => ({
                count: opts.aiMonthCount ?? 0,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

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

  it("rolloutGatesForTier MAPA is fixed MAPA gates regardless of day", () => {
    const g0 = rolloutGatesForTier("MAPA", 0);
    const g99 = rolloutGatesForTier("MAPA", 99);
    expect(g0).toEqual(g99);
    expect(g0.transits).toBe(false);
    expect(g0.extraCharts).toBe(false);
    expect(g0.digestEmail).toBe(false);
  });

  it("rolloutGatesForTier MENSAL day 0 matches ramp", () => {
    expect(rolloutGatesForTier("MENSAL", 0)).toEqual(buildRolloutGatesForDay(0));
  });

  it("rolloutGateEnforcementActive is true for FREE always", () => {
    expect(rolloutGateEnforcementActive("FREE", 0)).toBe(true);
    expect(rolloutGateEnforcementActive("FREE", 99)).toBe(true);
  });

  it("rolloutGateEnforcementActive is true for MAPA always", () => {
    expect(rolloutGateEnforcementActive("MAPA", 0)).toBe(true);
    expect(rolloutGateEnforcementActive("MAPA", 100)).toBe(true);
  });

  it("rolloutGateEnforcementActive for MENSAL matches paid ramp only", () => {
    expect(rolloutGateEnforcementActive("MENSAL", 0)).toBe(true);
    expect(rolloutGateEnforcementActive("MENSAL", 7)).toBe(false);
  });

  it("rolloutLockedMessageForTier MAPA returns Premium upsell message", () => {
    expect(rolloutLockedMessageForTier("MAPA", "transits", 99)).toBe(MAPA_ROLLOUT_LOCKED_MESSAGE);
  });

  it("rolloutLockedMessageForTier FREE returns free tier message", () => {
    expect(rolloutLockedMessageForTier("FREE", "synastry", 0)).toBe(FREE_ROLLOUT_LOCKED_MESSAGE);
  });

  it("rolloutLockedMessageForTier MENSAL uses day ramp message", () => {
    expect(rolloutLockedMessageForTier("MENSAL", "transits", 0)).toBe(
      rolloutLockedMessage("transits", 0),
    );
  });

  it("fetchProfileRolloutState for admin returns full gates and applies false", async () => {
    const supabase = mockSupabaseForRollout({ admin: true, tier: "FREE" });
    const state = await fetchProfileRolloutState(supabase, "user-1");
    expect(state.gates).toEqual(FULL_ROLLOUT_GATES);
    expect(state.applies).toBe(false);
    expect(state.tier).toBe("FREE");
  });

  it("fetchProfileRolloutState for non-admin FREE keeps FREE gates and applies enforcement", async () => {
    const supabase = mockSupabaseForRollout({ admin: false, tier: "FREE" });
    const state = await fetchProfileRolloutState(supabase, "user-1");
    expect(state.gates).toEqual(rolloutGatesForTier("FREE", state.dayIndex));
    expect(state.applies).toBe(true);
  });

  it("assertPaidRolloutAiAccess allows any kind for admin on MAPA tier", async () => {
    const supabase = mockSupabaseForRollout({ admin: true, tier: "MAPA" });
    await expect(
      assertPaidRolloutAiAccess(supabase, "user-1", "MAPA", "2026-01-01T12:00:00.000Z", "synastry"),
    ).resolves.toBeUndefined();
  });

  it("assertPaidRolloutAiAccess blocks non-natal kinds for MAPA when not admin", async () => {
    const supabase = mockSupabaseForRollout({ admin: false, tier: "MAPA" });
    await expect(
      assertPaidRolloutAiAccess(supabase, "user-1", "MAPA", "2026-01-01T12:00:00.000Z", "synastry"),
    ).rejects.toSatisfy((r: unknown) => r instanceof Response && (r as Response).status === 403);
  });

  it("assertPaidRolloutAiAccess allows natal kind for FREE when under monthly cap", async () => {
    const supabase = mockSupabaseForRollout({ admin: false, tier: "FREE", aiMonthCount: 0 });
    await expect(
      assertPaidRolloutAiAccess(
        supabase,
        "user-1",
        "FREE",
        "2026-01-01T12:00:00.000Z",
        "natal_summary",
      ),
    ).resolves.toBeUndefined();
  });

  it("assertPaidRolloutAiAccess blocks non-natal kinds for FREE", async () => {
    const supabase = mockSupabaseForRollout({ admin: false, tier: "FREE", aiMonthCount: 0 });
    await expect(
      assertPaidRolloutAiAccess(supabase, "user-1", "FREE", "2026-01-01T12:00:00.000Z", "synastry"),
    ).rejects.toSatisfy((r: unknown) => r instanceof Response && (r as Response).status === 403);
  });

  it("assertPaidRolloutAiAccess blocks FREE when monthly natal cap reached", async () => {
    const supabase = mockSupabaseForRollout({ admin: false, tier: "FREE", aiMonthCount: 3 });
    await expect(
      assertPaidRolloutAiAccess(
        supabase,
        "user-1",
        "FREE",
        "2026-01-01T12:00:00.000Z",
        "natal_planet",
      ),
    ).rejects.toSatisfy((r: unknown) => r instanceof Response && (r as Response).status === 403);
  });
});
