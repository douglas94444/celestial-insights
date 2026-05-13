import { useMemo } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useUserIsAdmin } from "@/hooks/use-user-is-admin";
import {
  FULL_ROLLOUT_GATES,
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
  const adminGate = useUserIsAdmin();

  return useMemo(() => {
    if (!profile) return null;
    if (adminGate.isPending) return null;
    const dayIndex = getRolloutDayIndexSp(profile.created_at);
    if (adminGate.data === true) {
      return {
        dayIndex,
        gates: FULL_ROLLOUT_GATES,
        active: false,
        freeRestricted: false,
      };
    }
    const isFree = isFreeTier(profile.subscription_tier);
    const gates = rolloutGatesForTier(profile.subscription_tier, dayIndex);
    const active = rolloutGateEnforcementActive(profile.subscription_tier, dayIndex);
    return { dayIndex, gates, active, freeRestricted: isFree };
  }, [profile, adminGate.isPending, adminGate.data]);
}
