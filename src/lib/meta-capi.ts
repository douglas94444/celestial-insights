/**
 * Meta Conversions API (CAPI) — só servidor (`process.env`).
 * O token (`META_CAPI_ACCESS_TOKEN`) nunca deve ir para o cliente nem para o repositório.
 */

const GRAPH_VERSION = "v21.0";

export type MetaCapiActionSource =
  | "website"
  | "app"
  | "phone_call"
  | "chat"
  | "email"
  | "other"
  | "physical_store"
  | "system_generated"
  | "business_messaging";

export type MetaCapiEventInput = {
  event_name: string;
  /** Unix em segundos */
  event_time: number;
  action_source: MetaCapiActionSource;
  event_source_url?: string;
  /** Para deduplicação com o pixel no browser */
  event_id?: string;
  user_data?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

export function metaCapiServerConfigured(): boolean {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  return Boolean(pixelId && token);
}

/**
 * Envia um lote de eventos para o endpoint do pixel (Graph API).
 * Sem pixel/token ou lista vazia: não faz rede e devolve `ok: false`.
 */
export async function sendMetaCapiEvents(
  events: MetaCapiEventInput[],
): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !token || events.length === 0) {
    return { ok: false, status: 0, body: "missing_env_or_events" };
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`);
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: events }),
  });

  const body = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body };
  return { ok: true };
}
