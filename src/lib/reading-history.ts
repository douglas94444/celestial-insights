import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const WINDOW_DAYS = 30;

export interface ReadingHistorySummary {
  window_days: number;
  topic_counts: Record<string, number>;
  recent_route_keys: string[];
}

export async function fetchReadingHistorySummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ReadingHistorySummary> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  const { data, error } = await supabase
    .from("user_engagement_events")
    .select("route_key, topic_key, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error || !data) {
    return { window_days: WINDOW_DAYS, topic_counts: {}, recent_route_keys: [] };
  }

  const topic_counts: Record<string, number> = {};
  for (const row of data) {
    if (row.topic_key) {
      topic_counts[row.topic_key] = (topic_counts[row.topic_key] ?? 0) + 1;
    }
  }
  const recent_route_keys = [...new Set(data.map((r) => r.route_key))].slice(0, 16);
  return { window_days: WINDOW_DAYS, topic_counts, recent_route_keys };
}

/** Payload estável para fingerprint de prompts IA. */
export function compactReadingHistoryForFingerprint(
  h: ReadingHistorySummary,
): Record<string, unknown> {
  const keys = Object.keys(h.topic_counts).sort();
  const tc: Record<string, number> = {};
  for (const k of keys) tc[k] = h.topic_counts[k]!;
  return {
    window_days: h.window_days,
    topic_counts: tc,
    recent_route_keys: [...h.recent_route_keys],
  };
}
