import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { shouldExposePaymentConfigurationGaps } from "@/lib/payment-configuration-diagnostics";
import {
  buildMercadoPagoWebhookUrl,
  getMercadoPagoPublicKey,
  isMercadoPagoServerConfigured,
  isMercadoPagoTransparentConfigured,
  mercadoPagoCheckoutProGaps,
  mercadoPagoCheckoutRedirectUrl,
  mercadoPagoCreatePreference,
  mercadoPagoGetPayment,
  mercadoPagoPostCardPayment,
  mercadoPagoTransparentGaps,
  MercadoPagoApiError,
  MercadoPagoConfigError,
} from "@/lib/mercadopago/client";
import {
  amountForSubscriptionPlan,
  subscriptionPlanTitle,
  type SubscriptionProductId,
} from "@/lib/subscription-pricing";

const planSchema = z.enum(["mensal", "anual", "mapa"]);

const createPreferenceSchema = z.object({
  plan: planSchema,
});

const orderStatusSchema = z.object({
  external_reference: z.string().uuid(),
});

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function userMessageFromMercadoPago(err: unknown): string {
  if (err instanceof MercadoPagoConfigError) return err.message;
  if (err instanceof MercadoPagoApiError) {
    if (err.status === 401) return "Mercado Pago: token de acesso inválido.";
    if (err.status === 400) {
      try {
        const j = JSON.parse(err.body) as {
          message?: string;
          cause?: Array<{ description?: string }>;
        };
        if (j.message) return `Mercado Pago: ${j.message}`;
        const d = j.cause?.[0]?.description;
        if (d) return `Mercado Pago: ${d}`;
      } catch {
        /* ignore */
      }
      return "Mercado Pago: dados do pagamento inválidos.";
    }
    if (err.status === 429) return "Mercado Pago: limite de pedidos. Tente mais tarde.";
    return `Mercado Pago: erro ${err.status}.`;
  }
  return "Erro ao comunicar com o pagamento.";
}

export const getMercadoPagoAvailabilityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    timedServerFn("getMercadoPagoAvailabilityFn", async ({ context }) => {
      const publicKey = getMercadoPagoPublicKey();
      const checkoutPro = isMercadoPagoServerConfigured();
      const transparent = isMercadoPagoTransparentConfigured();
      const base = {
        checkoutPro,
        transparent,
        publicKey: publicKey || undefined,
      } as const;
      const diagnostics = await shouldExposePaymentConfigurationGaps(
        context.supabase,
        context.userId,
      );
      return diagnostics
        ? ({
            ...base,
            configurationGaps: {
              checkoutPro: mercadoPagoCheckoutProGaps(),
              transparent: mercadoPagoTransparentGaps(),
            },
          } as const)
        : base;
    }),
  );

/** Cria preferência Checkout Pro e regista `mercadopago_orders` (id = external_reference). */
export const createMercadoPagoPreferenceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = createPreferenceSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("createMercadoPagoPreferenceFn", async ({ data, context }) => {
      if (!isMercadoPagoServerConfigured()) {
        throw jsonError(
          503,
          "MERCADOPAGO_DISABLED",
          "Pagamento Mercado Pago não está configurado no servidor.",
        );
      }

      const supabase = context.supabase;
      const userId = context.userId;
      const claims = context.claims as Record<string, unknown>;
      const email = typeof claims.email === "string" ? claims.email.trim() : "";
      if (!email) {
        throw jsonError(
          400,
          "EMAIL_MISSING",
          "O seu utilizador não tem email no token. Volte a entrar ou associe um email.",
        );
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const { data: profileAfter } = await supabase
        .from("profiles")
        .select("billing_cpf, billing_phone")
        .eq("id", userId)
        .single();

      const cpf = onlyDigits(profileAfter?.billing_cpf ?? "");
      const phone = onlyDigits(profileAfter?.billing_phone ?? "");
      if (cpf.length !== 11) {
        throw jsonError(
          400,
          "BILLING_CPF",
          "Indique um CPF válido (11 dígitos) em Configurações para pagar com cartão.",
        );
      }
      if (phone.length < 10 || phone.length > 11) {
        throw jsonError(
          400,
          "BILLING_PHONE",
          "Indique um telefone válido (10 ou 11 dígitos) em Configurações.",
        );
      }

      const plan = data.plan as SubscriptionProductId;
      const amount = amountForSubscriptionPlan(plan);
      const title = subscriptionPlanTitle(plan);
      const orderId = crypto.randomUUID();
      const externalReference = orderId;

      try {
        const pref = await mercadoPagoCreatePreference({
          externalReference,
          payerEmail: email,
          title,
          unitPrice: amount,
          plan,
          userId,
        });

        const preferenceId = pref.id?.trim();
        if (!preferenceId) {
          throw jsonError(502, "MERCADOPAGO_RESPONSE", "Resposta sem id da preferência.");
        }

        let insertErr: { message: string } | null = null;
        if (plan === "mapa") {
          const { error } = await supabase.from("mapa_orders").insert({
            id: orderId,
            user_id: userId,
            amount,
            currency: "BRL",
            payment_method: "mercadopago",
            external_ref: externalReference,
            status: "pending",
          });
          insertErr = error ?? null;
        } else {
          const { error } = await supabase.from("mercadopago_orders").insert({
            id: orderId,
            user_id: userId,
            plan,
            amount,
            currency: "BRL",
            external_reference: externalReference,
            preference_id: preferenceId,
            status: "pending",
          });
          insertErr = error ?? null;
        }

        if (insertErr) {
          throw jsonError(500, "ORDER_INSERT", insertErr.message);
        }

        const redirectUrl = mercadoPagoCheckoutRedirectUrl(pref);

        return {
          redirectUrl,
          externalReference,
          preferenceId: preferenceId,
        } as const;
      } catch (err) {
        if (err instanceof Response) throw err;
        throw jsonError(502, "MERCADOPAGO", userMessageFromMercadoPago(err));
      }
    }),
  );

/** Estado local do pedido e, se existir payment_id, estado remoto do pagamento. */
export const getMercadoPagoOrderStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = orderStatusSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("getMercadoPagoOrderStatusFn", async ({ data, context }) => {
      if (!isMercadoPagoServerConfigured() && !isMercadoPagoTransparentConfigured()) {
        throw jsonError(503, "MERCADOPAGO_DISABLED", "Mercado Pago não está configurado.");
      }

      const supabase = context.supabase;
      const userId = context.userId;

      const { data: order, error: orderErr } = await supabase
        .from("mercadopago_orders")
        .select("id, plan, status, payment_id, amount, currency")
        .eq("user_id", userId)
        .eq("external_reference", data.external_reference)
        .maybeSingle();

      if (orderErr) throw jsonError(500, "ORDER", orderErr.message);
      if (!order) {
        throw jsonError(404, "NOT_FOUND", "Pedido não encontrado.");
      }

      let remoteStatus: string | null = null;
      const pid = order.payment_id?.trim();
      if (pid) {
        try {
          const pay = await mercadoPagoGetPayment(pid);
          remoteStatus = pay.status ?? null;
        } catch {
          remoteStatus = null;
        }
      }

      return {
        localStatus: order.status,
        remoteStatus,
        paymentId: order.payment_id,
        plan: order.plan,
      } as const;
    }),
  );

const transparentPaymentSchema = z.object({
  plan: planSchema,
  token: z.string().min(10).max(500),
  issuer_id: z.union([z.string(), z.number()]).optional(),
  payment_method_id: z.string().min(2).max(40),
  transaction_amount: z.number(),
  installments: z.number().int().min(1).max(24),
});

function orderStatusFromMpPayment(
  st: string | undefined,
): "pending" | "approved" | "rejected" | "cancelled" | "refunded" {
  const s = (st ?? "").toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded" || s === "charged_back") return "refunded";
  return "pending";
}

function getSupabaseAdminOrThrow() {
  try {
    return supabaseAdmin;
  } catch {
    throw jsonError(
      503,
      "SUPABASE_ADMIN",
      "Configure SUPABASE_SERVICE_ROLE_KEY no servidor para pagamentos com cartão nesta página.",
    );
  }
}

/** Checkout Transparente: recebe token do Card Payment Brick e cria `POST /v1/payments`. */
export const createMercadoPagoTransparentPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = transparentPaymentSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("createMercadoPagoTransparentPaymentFn", async ({ data, context }) => {
      if (!isMercadoPagoTransparentConfigured()) {
        throw jsonError(
          503,
          "MERCADOPAGO_TRANSPARENT_DISABLED",
          "Checkout Transparente Mercado Pago não está configurado (chave pública + credenciais).",
        );
      }

      const admin = getSupabaseAdminOrThrow();
      const supabase = context.supabase;
      const userId = context.userId;
      const claims = context.claims as Record<string, unknown>;
      const email = typeof claims.email === "string" ? claims.email.trim() : "";
      if (!email) {
        throw jsonError(
          400,
          "EMAIL_MISSING",
          "O seu utilizador não tem email no token. Volte a entrar ou associe um email.",
        );
      }

      const { data: profileAfter, error: profileErr } = await supabase
        .from("profiles")
        .select("billing_cpf, billing_phone")
        .eq("id", userId)
        .single();

      if (profileErr) throw jsonError(500, "PROFILE", profileErr.message);

      const cpf = onlyDigits(profileAfter?.billing_cpf ?? "");
      const phone = onlyDigits(profileAfter?.billing_phone ?? "");
      if (cpf.length !== 11) {
        throw jsonError(
          400,
          "BILLING_CPF",
          "Indique um CPF válido (11 dígitos) em Configurações antes de pagar com cartão.",
        );
      }
      if (phone.length < 10 || phone.length > 11) {
        throw jsonError(
          400,
          "BILLING_PHONE",
          "Indique um telefone válido (10 ou 11 dígitos) em Configurações.",
        );
      }

      const plan = data.plan as SubscriptionProductId;
      const expectedAmount = amountForSubscriptionPlan(plan);
      if (Math.abs(data.transaction_amount - expectedAmount) > 0.02) {
        throw jsonError(400, "AMOUNT_MISMATCH", "Valor do pagamento não corresponde ao plano.");
      }

      const orderId = crypto.randomUUID();
      const externalReference = orderId;
      let notificationUrl: string;
      try {
        notificationUrl = buildMercadoPagoWebhookUrl();
      } catch (e) {
        throw jsonError(503, "WEBHOOK_URL", e instanceof Error ? e.message : "Webhook inválido.");
      }

      let insertErr: { message: string } | null = null;
      if (plan === "mapa") {
        const { error } = await admin.from("mapa_orders").insert({
          id: orderId,
          user_id: userId,
          amount: expectedAmount,
          currency: "BRL",
          payment_method: "mercadopago",
          external_ref: externalReference,
          status: "pending",
        });
        insertErr = error ?? null;
      } else {
        const { error } = await admin.from("mercadopago_orders").insert({
          id: orderId,
          user_id: userId,
          plan,
          amount: expectedAmount,
          currency: "BRL",
          external_reference: externalReference,
          preference_id: null,
          status: "pending",
        });
        insertErr = error ?? null;
      }

      if (insertErr) {
        throw jsonError(500, "ORDER_INSERT", insertErr.message);
      }

      const payer = {
        email,
        identification: { type: "CPF" as const, number: cpf },
      };

      try {
        const pay = await mercadoPagoPostCardPayment(
          {
            transaction_amount: expectedAmount,
            token: data.token,
            description: subscriptionPlanTitle(plan),
            installments: data.installments,
            payment_method_id: data.payment_method_id,
            issuer_id: data.issuer_id,
            payer,
            external_reference: externalReference,
            notification_url: notificationUrl,
          },
          orderId,
        );

        const paymentIdStr = pay.id !== undefined && pay.id !== null ? String(pay.id) : "";
        const mpStatus = orderStatusFromMpPayment(pay.status);
        const rawPayload = { payment: pay, flow: "transparent" } as unknown as Json;

        const { error: upErr } = await admin
          .from("mercadopago_orders")
          .update({
            status: mpStatus,
            payment_id: paymentIdStr || null,
            raw_last_payload: rawPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("user_id", userId);

        if (upErr) {
          throw jsonError(500, "ORDER_UPDATE", upErr.message);
        }

        if (mpStatus === "approved") {
          const tier = plan === "anual" ? "ANUAL" : plan === "mapa" ? "MAPA" : "MENSAL";
          const { error: profErr } = await admin
            .from("profiles")
            .update({
              subscription_tier: tier,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (profErr) {
            throw jsonError(500, "PROFILE_UPDATE", profErr.message);
          }

          if (plan === "mapa") {
            await admin
              .from("mapa_orders")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", orderId)
              .eq("user_id", userId);
          }
        }

        return {
          status: mpStatus,
          paymentId: paymentIdStr,
          externalReference,
          statusDetail: pay.status_detail ?? null,
        } as const;
      } catch (err) {
        if (err instanceof Response) throw err;
        const msg = userMessageFromMercadoPago(err);
        const errPayload = {
          error: err instanceof MercadoPagoApiError ? err.body : String(err),
        } as unknown as Json;
        if (plan === "mapa") {
          await admin
            .from("mapa_orders")
            .update({
              status: "failed",
              raw_last_payload: errPayload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .eq("user_id", userId);
        } else {
          await admin
            .from("mercadopago_orders")
            .update({
              status: "rejected",
              raw_last_payload: errPayload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .eq("user_id", userId);
        }
        throw jsonError(502, "MERCADOPAGO", msg);
      }
    }),
  );
