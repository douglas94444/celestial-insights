import { type DependencyList, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { insertEngagementEventDeduped } from "@/lib/engagement";
import { useAuth } from "@/hooks/use-auth";

interface UsePageEngagementOptions {
  meta?: Record<string, unknown>;
  enabled?: boolean;
}

export function usePageEngagement(
  routeKey: string,
  topicKey: string,
  options?: UsePageEngagementOptions,
  deps?: DependencyList,
): void {
  const { user } = useAuth();
  const enabled = options?.enabled ?? true;
  const meta = options?.meta;

  useEffect(() => {
    if (!user?.id || !enabled) return;
    insertEngagementEventDeduped(supabase, user.id, {
      route_key: routeKey,
      topic_key: topicKey,
      meta: meta as Parameters<typeof insertEngagementEventDeduped>[2]["meta"],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, enabled, ...(deps ?? [])]);
}
