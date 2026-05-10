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

/** Engagement após sucesso de interpretação IA (`cached` incluído em `meta`). */
export function recordAiEngagement(
  client: SupabaseClient<Database>,
  userId: string | undefined | null,
  row: {
    route_key: string;
    topic_key: string;
    cached: boolean;
    meta?: Json;
  },
): void {
  if (!userId) return;
  const extra =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {};
  insertEngagementEvent(client, userId, {
    route_key: row.route_key,
    topic_key: row.topic_key,
    meta: { ...extra, cached: row.cached } as Json,
  });
}

const DEDUPE_WINDOW_MS = 90_000;

/** topic_keys que beneficiam de dedupe ao navegar/remontar componentes (não inclui cliques IA). */
const DEDUPE_TOPIC_KEYS = new Set<string>([
  ENGAGEMENT_TOPICS.moment_open,
  ENGAGEMENT_TOPICS.dashboard_open,
  ENGAGEMENT_TOPICS.chart_detail_open,
  ENGAGEMENT_TOPICS.transitos_open,
  ENGAGEMENT_TOPICS.synastry_view,
  ENGAGEMENT_TOPICS.prefs_saved,
]);

const lastEmittedAt = new Map<string, number>();

function metaRecord(meta: Json | undefined): Record<string, unknown> {
  return meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

/** Chave estável para dedupe (inclui dimensões relevantes em `meta`). */
export function engagementDedupeKey(
  userId: string,
  row: { route_key: string; topic_key?: string | null; meta?: Json },
): string {
  const tk = row.topic_key ?? "";
  const base = `${userId}|${row.route_key}|${tk}`;
  const m = metaRecord(row.meta);
  if (tk === ENGAGEMENT_TOPICS.chart_detail_open && m.chart_id != null) {
    return `${base}|chart:${String(m.chart_id)}`;
  }
  if (tk === ENGAGEMENT_TOPICS.synastry_view && m.synastry_id != null) {
    return `${base}|syn:${String(m.synastry_id)}`;
  }
  return base;
}

/** @internal Testes: limpar estado de dedupe entre casos. */
export function __resetEngagementDedupeForTests(): void {
  lastEmittedAt.clear();
}

/**
 * Como `insertEngagementEvent`, mas evita rajadas ao voltar à mesma vista dentro de ~90s.
 * Eventos `ai_*` não são deduplicados (duplo clique legítimo).
 */
export function insertEngagementEventDeduped(
  client: SupabaseClient<Database>,
  userId: string,
  row: { route_key: string; topic_key?: string | null; meta?: Json },
  options?: { now?: number },
): void {
  const topic = row.topic_key ?? "";
  if (!topic || !DEDUPE_TOPIC_KEYS.has(topic)) {
    insertEngagementEvent(client, userId, row);
    return;
  }
  const key = engagementDedupeKey(userId, row);
  const now = options?.now ?? Date.now();
  const prev = lastEmittedAt.get(key);
  if (prev !== undefined && now - prev < DEDUPE_WINDOW_MS) return;
  lastEmittedAt.set(key, now);
  insertEngagementEvent(client, userId, row);
}
