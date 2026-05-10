import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

/** Valores estáveis para `route_key` (evitar typos nos inserts). */
export const ENGAGEMENT_ROUTES = {
  momento: "momento",
  dashboard: "dashboard",
  mapas_detail: "mapas_detail",
  transitos: "transitos",
  compatibilidade: "compatibilidade",
  configuracoes: "configuracoes",
} as const;

/** Valores estáveis para `topic_key` + documentação do histórico agregado. */
export const ENGAGEMENT_TOPICS = {
  moment_open: "moment_open",
  dashboard_open: "dashboard_open",
  chart_detail_open: "chart_detail_open",
  transitos_open: "transitos_open",
  synastry_view: "synastry_view",
  prefs_saved: "prefs_saved",
  ai_transit_momento: "ai_transit_momento",
  ai_morning_deep: "ai_morning_deep",
  ai_synastry_narrative: "ai_synastry_narrative",
  ai_synastry_deep: "ai_synastry_deep",
  ai_transit_transitos: "ai_transit_transitos",
  ai_natal_executive: "ai_natal_executive",
  ai_natal_planet: "ai_natal_planet",
} as const;

/** Registo fire-and-forget de utilização (RLS: apenas o próprio utilizador). */
export function insertEngagementEvent(
  client: SupabaseClient<Database>,
  userId: string,
  row: { route_key: string; topic_key?: string | null; meta?: Json },
): void {
  void client.from("user_engagement_events").insert({
    user_id: userId,
    route_key: row.route_key,
    topic_key: row.topic_key ?? null,
    meta: row.meta ?? {},
  });
}
