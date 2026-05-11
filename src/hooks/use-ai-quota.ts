import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

const FREE_MONTHLY_LIMIT = 3;

export type AiQuota = {
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
  nearLimit: boolean;
};

async function fetchAiUsageThisMonth(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("interpretation_ai_cache")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) return 0;
  return count ?? 0;
}

export function useAiQuota(): AiQuota | null {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const tier = profile?.subscription_tier;
  const isPremium = tier === "MENSAL" || tier === "ANUAL" || tier === "PREMIUM";

  const { data: used = 0 } = useQuery({
    queryKey: ["ai-quota-month", user?.id],
    queryFn: () => fetchAiUsageThisMonth(user!.id),
    enabled: !!user && !isPremium,
    staleTime: 5 * 60_000,
  });

  if (!user || !profile) return null;

  if (isPremium) {
    return { used: 0, limit: Infinity, remaining: Infinity, isPremium: true, nearLimit: false };
  }

  const limit = FREE_MONTHLY_LIMIT;
  const remaining = Math.max(0, limit - used);
  const nearLimit = remaining <= 1;

  return { used, limit, remaining, isPremium, nearLimit };
}
