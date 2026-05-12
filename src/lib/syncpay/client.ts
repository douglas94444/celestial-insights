import { getSupabaseUrl } from "@/integrations/supabase/public-config";

/**
 * Cliente HTTP da API Partner SyncPay (só servidor — usar a partir de server functions).
 * Token: POST /api/partner/v1/auth-token; renovar só quando expirar (margem de segurança).
 */

export type SyncPayAuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
};

export type SyncPayCashInClient = {
  name: string;
  cpf: string;
  email: string;
  phone: string;
};

export type SyncPayCreateCashInBody = {
  amount: number;
  description?: string | null;
  webhook_url?: string;
  client?: SyncPayCashInClient;
  split?: Array<{ percentage: number; user_id: string }>;
};

export type SyncPayCashInResponse = {
  message: string;
  pix_code: string;
  identifier: string;
};

export type SyncPayTransactionData = {
  reference_id: string;
  currency: string;
  amount: number;
  transaction_date: string;
  status: "pending" | "completed" | "failed" | "refunded" | "med";
  description?: string | null;
  pix_code?: string | null;
};

export type SyncPayTransactionResponse = {
  data: SyncPayTransactionData;
};

type CachedToken = {
  accessToken: string;
  /** epoch ms quando o token deixa de ser aceite (margem 60s antes do expires_at da API) */
  expiresAtMs: number;
};

let tokenCache: CachedToken | null = null;

function normalizeBaseUrl(raw: string): string {
  let s = raw.replace(/\/+$/, "");
  // Evita URL duplicada se o env incluir o path completo da API Partner.
  s = s.replace(/\/api\/partner\/v1\/?$/i, "");
  return s.replace(/\/+$/, "");
}

function getBaseUrl(): string {
  const raw = process.env.SYNCPAY_API_BASE_URL?.trim();
  if (!raw) {
    throw new SyncPayConfigError("SYNCPAY_API_BASE_URL não configurado.");
  }
  return normalizeBaseUrl(raw);
}

export class SyncPayConfigError extends Error {
  readonly code = "SYNCPAY_CONFIG" as const;
  constructor(message: string) {
    super(message);
    this.name = "SyncPayConfigError";
  }
}

export class SyncPayApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly code: "SYNCPAY_HTTP";
  constructor(status: number, body: string) {
    super(`SyncPay HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "SyncPayApiError";
    this.status = status;
    this.body = body;
    this.code = "SYNCPAY_HTTP";
  }
}

async function fetchPartnerAccessToken(): Promise<string> {
  const clientId = process.env.SYNCPAY_CLIENT_ID?.trim();
  const clientSecret = process.env.SYNCPAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new SyncPayConfigError("SYNCPAY_CLIENT_ID ou SYNCPAY_CLIENT_SECRET em falta.");
  }

  const base = getBaseUrl();
  const res = await fetch(`${base}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SyncPayApiError(res.status, text);
  }
  let parsed: SyncPayAuthResponse;
  try {
    parsed = JSON.parse(text) as SyncPayAuthResponse;
  } catch {
    throw new SyncPayApiError(res.status, "Resposta auth-token inválida (JSON).");
  }
  if (!parsed.access_token || !parsed.expires_at) {
    throw new SyncPayApiError(res.status, "Resposta auth-token incompleta.");
  }
  const expiresAt = Date.parse(parsed.expires_at);
  const expiresAtMs = Number.isFinite(expiresAt)
    ? expiresAt - 60_000
    : Date.now() + (parsed.expires_in ?? 3600) * 1000 - 60_000;
  tokenCache = { accessToken: parsed.access_token, expiresAtMs };
  return parsed.access_token;
}

/** Bearer para chamadas Partner; reutiliza cache até ~1h (com margem). */
export async function getSyncPayAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAtMs) {
    return tokenCache.accessToken;
  }
  return fetchPartnerAccessToken();
}

export async function syncPayGetTransaction(
  identifier: string,
): Promise<SyncPayTransactionResponse> {
  const token = await getSyncPayAccessToken();
  const base = getBaseUrl();
  const id = encodeURIComponent(identifier);
  const res = await fetch(`${base}/api/partner/v1/transaction/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SyncPayApiError(res.status, text);
  }
  return JSON.parse(text) as SyncPayTransactionResponse;
}

export async function syncPayCreateCashIn(
  body: SyncPayCreateCashInBody,
): Promise<SyncPayCashInResponse> {
  const token = await getSyncPayAccessToken();
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/partner/v1/cash-in`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SyncPayApiError(res.status, text);
  }
  return JSON.parse(text) as SyncPayCashInResponse;
}

/** Indica se cash-in pode ser criado (env mínimo + URL do webhook). */
export function isSyncPayServerConfigured(): boolean {
  const base = process.env.SYNCPAY_API_BASE_URL?.trim();
  const id = process.env.SYNCPAY_CLIENT_ID?.trim();
  const secret = process.env.SYNCPAY_CLIENT_SECRET?.trim();
  const hook = process.env.SYNCPAY_WEBHOOK_TOKEN?.trim();
  const supabaseUrl = getSupabaseUrl().trim();
  return Boolean(base && id && secret && hook && supabaseUrl);
}

/** Nomes de variáveis em falta para o Pix SyncPay (diagnóstico; usar só em dev / admin). */
export function syncPayConfigurationGaps(): string[] {
  const missing: string[] = [];
  if (!process.env.SYNCPAY_API_BASE_URL?.trim()) missing.push("SYNCPAY_API_BASE_URL");
  if (!process.env.SYNCPAY_CLIENT_ID?.trim()) missing.push("SYNCPAY_CLIENT_ID");
  if (!process.env.SYNCPAY_CLIENT_SECRET?.trim()) missing.push("SYNCPAY_CLIENT_SECRET");
  if (!process.env.SYNCPAY_WEBHOOK_TOKEN?.trim()) missing.push("SYNCPAY_WEBHOOK_TOKEN");
  if (!getSupabaseUrl().trim()) missing.push("SUPABASE_URL");
  return missing;
}

export function buildSyncPayWebhookUrl(): string {
  const supabaseUrl = normalizeBaseUrl(getSupabaseUrl().trim());
  const hookToken = process.env.SYNCPAY_WEBHOOK_TOKEN?.trim();
  if (!supabaseUrl || !hookToken) {
    throw new SyncPayConfigError(
      "SUPABASE_URL ou SYNCPAY_WEBHOOK_TOKEN em falta para montar webhook_url.",
    );
  }
  const token = encodeURIComponent(hookToken);
  return `${supabaseUrl}/functions/v1/syncpay-webhook?token=${token}`;
}
