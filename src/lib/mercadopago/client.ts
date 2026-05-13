/**
 * Cliente HTTP Mercado Pago (Checkout Pro + Checkout Transparente / API de pagamentos) — só servidor / Worker.
 * @see https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post
 * @see https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
 */

import type { SubscriptionProductId } from "@/lib/subscription-pricing";
import { getSupabaseUrl } from "@/integrations/supabase/public-config";

const MP_API = "https://api.mercadopago.com";

export type MercadoPagoCreatePreferenceInput = {
  externalReference: string;
  payerEmail: string;
  title: string;
  unitPrice: number;
  plan: SubscriptionProductId;
  userId: string;
};

export type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
};

/** Normaliza a resposta JSON da API (snake_case; tolera variações raras de chave). */
export function normalizeMercadoPagoPreferenceResponse(
  raw: unknown,
): MercadoPagoPreferenceResponse {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : undefined);
  return {
    id: str("id"),
    init_point: str("init_point") ?? str("initPoint"),
    sandbox_init_point: str("sandbox_init_point") ?? str("sandboxInitPoint"),
  };
}

export type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string | null;
};

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function getAccessToken(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!t) {
    throw new MercadoPagoConfigError("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }
  return t;
}

export class MercadoPagoConfigError extends Error {
  readonly code = "MERCADOPAGO_CONFIG" as const;
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoConfigError";
  }
}

export class MercadoPagoApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly code = "MERCADOPAGO_HTTP" as const;
  constructor(status: number, body: string) {
    super(`Mercado Pago HTTP ${status}`);
    this.name = "MercadoPagoApiError";
    this.status = status;
    this.body = body;
  }
}

function mercadoPagoPublicKeyForTransparent(): string {
  const viteKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;
  const a = typeof viteKey === "string" ? viteKey.trim() : "";
  if (a) return a;
  const runtimeViteKey = process.env.VITE_MERCADOPAGO_PUBLIC_KEY?.trim();
  if (runtimeViteKey) return runtimeViteKey;
  return process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ?? "";
}

/** Checkout Pro: access token, webhook, Supabase URL e APP_PUBLIC_URL (back_urls). */
export function isMercadoPagoServerConfigured(): boolean {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const hook = process.env.MERCADOPAGO_WEBHOOK_TOKEN?.trim();
  const supabaseUrl = getSupabaseUrl().trim();
  const appUrl = process.env.APP_PUBLIC_URL?.trim();
  return Boolean(token && hook && supabaseUrl && appUrl);
}

/** Checkout Transparente (Card Payment Brick + POST /v1/payments): chave pública + credenciais de API + webhook. */
export function isMercadoPagoTransparentConfigured(): boolean {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const hook = process.env.MERCADOPAGO_WEBHOOK_TOKEN?.trim();
  const supabaseUrl = getSupabaseUrl().trim();
  return Boolean(token && hook && supabaseUrl && mercadoPagoPublicKeyForTransparent());
}

/** Variáveis em falta para o Checkout Pro (inclui APP_PUBLIC_URL para back_urls). */
export function mercadoPagoCheckoutProGaps(): string[] {
  const missing: string[] = [];
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) missing.push("MERCADOPAGO_ACCESS_TOKEN");
  if (!process.env.MERCADOPAGO_WEBHOOK_TOKEN?.trim()) missing.push("MERCADOPAGO_WEBHOOK_TOKEN");
  if (!getSupabaseUrl().trim()) missing.push("SUPABASE_URL");
  if (!process.env.APP_PUBLIC_URL?.trim()) missing.push("APP_PUBLIC_URL");
  return missing;
}

/** Variáveis em falta para cartão nesta página (sem exigir APP_PUBLIC_URL). */
export function mercadoPagoTransparentGaps(): string[] {
  const missing: string[] = [];
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) missing.push("MERCADOPAGO_ACCESS_TOKEN");
  if (!process.env.MERCADOPAGO_WEBHOOK_TOKEN?.trim()) missing.push("MERCADOPAGO_WEBHOOK_TOKEN");
  if (!getSupabaseUrl().trim()) missing.push("SUPABASE_URL");
  if (!mercadoPagoPublicKeyForTransparent())
    missing.push("VITE_MERCADOPAGO_PUBLIC_KEY ou MERCADOPAGO_PUBLIC_KEY");
  return missing;
}

/** Chave pública para o SDK no browser (segura de expor). */
export function getMercadoPagoPublicKey(): string {
  return mercadoPagoPublicKeyForTransparent();
}

export function buildMercadoPagoWebhookUrl(): string {
  const supabaseUrl = normalizeBaseUrl(getSupabaseUrl().trim());
  const hookToken = process.env.MERCADOPAGO_WEBHOOK_TOKEN?.trim();
  if (!supabaseUrl || !hookToken) {
    throw new MercadoPagoConfigError(
      "SUPABASE_URL ou MERCADOPAGO_WEBHOOK_TOKEN em falta para montar notification_url.",
    );
  }
  const token = encodeURIComponent(hookToken);
  return `${supabaseUrl}/functions/v1/mercadopago-webhook?token=${token}`;
}

function publicAppBaseUrl(): string {
  const raw = process.env.APP_PUBLIC_URL?.trim();
  if (!raw) {
    throw new MercadoPagoConfigError("APP_PUBLIC_URL em falta para back_urls do checkout.");
  }
  return normalizeBaseUrl(raw);
}

/** Preferência sandbox vs produção conforme prefixo do token (documentação MP). */
export function mercadoPagoUsesSandboxToken(): boolean {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? "";
  return t.startsWith("TEST-");
}

export async function mercadoPagoCreatePreference(
  input: MercadoPagoCreatePreferenceInput,
): Promise<MercadoPagoPreferenceResponse> {
  const token = getAccessToken();
  const base = publicAppBaseUrl();
  const notificationUrl = buildMercadoPagoWebhookUrl();

  const body = {
    items: [
      {
        title: input.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: input.unitPrice,
      },
    ],
    payer: { email: input.payerEmail },
    external_reference: input.externalReference,
    metadata: { user_id: input.userId, plan: input.plan },
    back_urls: {
      success: `${base}/assinatura?mp=success`,
      failure: `${base}/assinatura?mp=failure`,
      pending: `${base}/assinatura?mp=pending`,
    },
    auto_return: "approved",
    notification_url: notificationUrl,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError(res.status, text);
  }
  return normalizeMercadoPagoPreferenceResponse(JSON.parse(text) as unknown);
}

export async function mercadoPagoGetPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const token = getAccessToken();
  const id = encodeURIComponent(paymentId);
  const res = await fetch(`${MP_API}/v1/payments/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError(res.status, text);
  }
  return JSON.parse(text) as MercadoPagoPayment;
}

export function mercadoPagoCheckoutRedirectUrl(pref: MercadoPagoPreferenceResponse): string {
  const sandbox = mercadoPagoUsesSandboxToken();
  const url = sandbox
    ? (pref.sandbox_init_point ?? pref.init_point)
    : (pref.init_point ?? pref.sandbox_init_point);
  if (!url || typeof url !== "string") {
    const keys = pref && typeof pref === "object" ? Object.keys(pref as object).join(", ") : "";
    throw new MercadoPagoConfigError(
      keys
        ? `Resposta Mercado Pago sem URL de checkout (init_point). Chaves: ${keys}.`
        : "Resposta Mercado Pago sem URL de checkout (init_point).",
    );
  }
  return url;
}

export type MercadoPagoCreateCardPaymentBody = {
  transaction_amount: number;
  token: string;
  description: string;
  installments: number;
  payment_method_id: string;
  issuer_id?: string | number;
  payer: {
    email: string;
    identification: { type: string; number: string };
  };
  external_reference: string;
  notification_url?: string;
};

export type MercadoPagoCreateCardPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
};

export async function mercadoPagoPostCardPayment(
  body: MercadoPagoCreateCardPaymentBody,
  idempotencyKey: string,
): Promise<MercadoPagoCreateCardPaymentResponse> {
  const token = getAccessToken();
  const payload: Record<string, unknown> = {
    transaction_amount: body.transaction_amount,
    token: body.token,
    description: body.description,
    installments: body.installments,
    payment_method_id: body.payment_method_id,
    payer: body.payer,
    external_reference: body.external_reference,
  };
  if (body.issuer_id !== undefined && body.issuer_id !== "" && body.issuer_id !== null) {
    payload.issuer_id =
      typeof body.issuer_id === "string" && body.issuer_id.trim() !== ""
        ? Number(body.issuer_id) || body.issuer_id
        : body.issuer_id;
  }
  if (body.notification_url) {
    payload.notification_url = body.notification_url;
  }

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MercadoPagoApiError(res.status, text);
  }
  return JSON.parse(text) as MercadoPagoCreateCardPaymentResponse;
}
