import { useMemo } from "react";
import { useProfile } from "@/hooks/use-profile";
import {
  buildRolloutGatesForDay,
  FREE_TIER_GATES,
  getRolloutDayIndexSp,
  isFreeTier,
  paidRolloutApplies,
  type RolloutGates,
} from "@/lib/subscription-rollout";

export type SubscriptionRollout = {
  dayIndex: number;
  gates: RolloutGates;
  /** Rampa activa: plano pago e ainda dentro dos primeiros 7 dias civis (SP). */
  active: boolean;
  /** Tier FREE: features avançadas bloqueadas permanentemente até comprar o mapa. */
  freeRestricted: boolean;
};

export function useSubscriptionRollout(): SubscriptionRollout | null {
  const { data: profile } = useProfile();

  return useMemo(() => {
    if (!profile) return null;
    const dayIndex = getRolloutDayIndexSp(profile.created_at);
    const isFree = isFreeTier(profile.subscription_tier);
    const gates = isFree ? FREE_TIER_GATES : buildRolloutGatesForDay(dayIndex);
    const active = paidRolloutApplies(profile.subscription_tier, dayIndex);
    return { dayIndex, gates, active, freeRestricted: isFree };
  }, [profile]);
}
