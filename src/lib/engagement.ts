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
  assinatura: "assinatura",
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
  /** Vista `/assinatura` (dedupe ~90s por utilizador + produto). */
  checkout_view: "checkout_view",
  /** CPF e telefone válidos para pagamento (dedupe na mesma janela). */
  checkout_billing_ready: "checkout_billing_ready",
  /** Clique para gerar Pix (mensal, anual ou mapa). */
  checkout_initiate_pix: "checkout_initiate_pix",
  /** Redireccionamento Checkout Pro Mercado Pago. */
  checkout_initiate_mp_checkout_pro: "checkout_initiate_mp_checkout_pro",
  /** Pagamento com cartão transparente concluído (callback do brick). */
  checkout_payment_confirmed_mp_transparent: "checkout_payment_confirmed_mp_transparent",
  /** Webhook / polling confirmou pagamento (Pix SyncPay ou MP Pro). */
  checkout_payment_confirmed: "checkout_payment_confirmed",
} as const;

/** Registo fire-and-forget de utilização (RLS: apenas o próprio utilizador). */
function insertEngagementEvent(
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
  ENGAGEMENT_TOPICS.checkout_view,
  ENGAGEMENT_TOPICS.checkout_billing_ready,
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
  if (tk === ENGAGEMENT_TOPICS.checkout_view && m.produto != null) {
    const cr = m.checkoutReady === true ? "1" : "0";
    const tr = m.mpTransparent === true ? "1" : "0";
    const cp = m.mpCheckoutPro === true ? "1" : "0";
    return `${base}|prod:${String(m.produto)}|cr:${cr}|tr:${tr}|cp:${cp}`;
  }
  if (tk === ENGAGEMENT_TOPICS.checkout_billing_ready && m.produto != null) {
    return `${base}|prod:${String(m.produto)}`;
  }
  return base;
}

/** Evento de funil no checkout (sem dedupe; usar para cliques e confirmações). */
export function recordCheckoutEngagement(
  client: SupabaseClient<Database>,
  userId: string | undefined | null,
  topicKey: string,
  meta?: Json,
): void {
  if (!userId) return;
  insertEngagementEvent(client, userId, {
    route_key: ENGAGEMENT_ROUTES.assinatura,
    topic_key: topicKey,
    meta: meta ?? {},
  });
}

/** Primeira vista da página de checkout (~90s dedupe por utilizador + produto). */
export function recordCheckoutPageViewDeduped(
  client: SupabaseClient<Database>,
  userId: string | undefined | null,
  meta: {
    produto: "premium" | "mapa";
    checkoutReady: boolean;
    mpTransparent: boolean;
    mpCheckoutPro: boolean;
  },
): void {
  if (!userId) return;
  insertEngagementEventDeduped(client, userId, {
    route_key: ENGAGEMENT_ROUTES.assinatura,
    topic_key: ENGAGEMENT_TOPICS.checkout_view,
    meta: meta as Json,
  });
}

/** Cobrança válida para activar botões de pagamento (dedupe por utilizador + produto). */
export function recordCheckoutBillingReadyDeduped(
  client: SupabaseClient<Database>,
  userId: string | undefined | null,
  meta: { produto: "premium" | "mapa" },
): void {
  if (!userId) return;
  insertEngagementEventDeduped(client, userId, {
    route_key: ENGAGEMENT_ROUTES.assinatura,
    topic_key: ENGAGEMENT_TOPICS.checkout_billing_ready,
    meta: meta as Json,
  });
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
