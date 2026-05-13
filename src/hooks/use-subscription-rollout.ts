import { useMemo } from "react";
import { useProfile } from "@/hooks/use-profile";
import {
  getRolloutDayIndexSp,
  isFreeTier,
  rolloutGateEnforcementActive,
  rolloutGatesForTier,
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
    const gates = rolloutGatesForTier(profile.subscription_tier, dayIndex);
    const active = rolloutGateEnforcementActive(profile.subscription_tier, dayIndex);
    return { dayIndex, gates, active, freeRestricted: isFree };
  }, [profile]);
}
