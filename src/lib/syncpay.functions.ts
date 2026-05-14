import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jsonError, throwValidationResponse } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { shouldExposePaymentConfigurationGaps } from "@/lib/payment-configuration-diagnostics";
import {
  buildSyncPayWebhookUrl,
  isSyncPayServerConfigured,
  syncPayConfigurationGaps,
  syncPayCreateCashIn,
  syncPayGetTransaction,
  SyncPayApiError,
  SyncPayConfigError,
} from "@/lib/syncpay/client";
import {
  amountForSubscriptionPlan,
  subscriptionPlanTitle,
  type SubscriptionProductId,
} from "@/lib/subscription-pricing";

const planSchema = z.enum(["mensal", "anual", "mapa"]);

const createPixOrderSchema = z.object({
  plan: planSchema,
  /** Opcional: se enviado, actualiza `profiles` antes do cash-in (apenas dígitos). */
  billing_cpf: z.string().min(11).max(18).optional(),
  billing_phone: z.string().min(10).max(20).optional(),
});

const transactionQuerySchema = z.object({
  identifier: z.string().min(1).max(200),
});

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function userMessageFromSyncPay(err: unknown): string {
  if (err instanceof SyncPayConfigError) return err.message;
  if (err instanceof SyncPayApiError) {
    if (err.status === 401) return "SyncPay: credenciais ou token inválidos.";
    if (err.status === 422) return "SyncPay: dados rejeitados. Verifique CPF e telefone.";
    if (err.status === 429) return "SyncPay: limite de pedidos. Tente mais tarde.";
    return `SyncPay: erro ${err.status}.`;
  }
  return "Erro ao comunicar com o pagamento.";
}

/** Indica se o servidor tem env SyncPay completo (UI pode mostrar checkout). */
export const getSyncPayAvailabilityFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    timedServerFn("getSyncPayAvailabilityFn", async ({ context }) => {
      const available = isSyncPayServerConfigured();
      const diagnostics = await shouldExposePaymentConfigurationGaps(
        context.supabase,
        context.userId,
      );
      return diagnostics
        ? ({ available, configurationGaps: syncPayConfigurationGaps() } as const)
        : ({ available } as const);
    }),
  );

/** Cria pedido Pix (cash-in) e regista linha em `syncpay_orders`. */
export const createSyncPayPixOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = createPixOrderSchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("createSyncPayPixOrderFn", async ({ data, context }) => {
      if (!isSyncPayServerConfigured()) {
        throw jsonError(
          503,
          "SYNCPAY_DISABLED",
          "Pagamento SyncPay não está configurado no servidor.",
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

      const patch: { billing_cpf?: string; billing_phone?: string } = {};
      if (data.billing_cpf !== undefined) {
        const d = onlyDigits(data.billing_cpf);
        if (d.length === 11) patch.billing_cpf = d;
      }
      if (data.billing_phone !== undefined) {
        const p = onlyDigits(data.billing_phone);
        if (p.length >= 10 && p.length <= 11) patch.billing_phone = p;
      }
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", userId);
        if (upErr) throw jsonError(500, "PROFILE_UPDATE", upErr.message);
      }

      const { data: profileAfter } = await supabase
        .from("profiles")
        .select("name, billing_cpf, billing_phone")
        .eq("id", userId)
        .single();

      const cpf = onlyDigits(profileAfter?.billing_cpf ?? "");
      const phone = onlyDigits(profileAfter?.billing_phone ?? "");
      if (cpf.length !== 11) {
        throw jsonError(
          400,
          "BILLING_CPF",
          "Indique um CPF válido (11 dígitos) em Configurações ou no formulário abaixo quando disponível.",
        );
      }
      if (phone.length < 10 || phone.length > 11) {
        throw jsonError(
          400,
          "BILLING_PHONE",
          "Indique um telefone válido (10 ou 11 dígitos) em Configurações.",
        );
      }

      const name = (profileAfter?.name ?? "").trim() || "Cliente";
      const plan = data.plan as SubscriptionProductId;
      const amount = amountForSubscriptionPlan(plan);
      const description = subscriptionPlanTitle(plan);

      let webhookUrl: string;
      try {
        webhookUrl = buildSyncPayWebhookUrl();
      } catch (e) {
        throw jsonError(503, "WEBHOOK_URL", e instanceof Error ? e.message : "Webhook inválido.");
      }

      try {
        const cashIn = await syncPayCreateCashIn({
          amount,
          description,
          webhook_url: webhookUrl,
          client: {
            name,
            cpf,
            email,
            phone,
          },
        });

        const identifier = cashIn.identifier?.trim();
        if (!identifier) {
          throw jsonError(502, "SYNCPAY_RESPONSE", "Resposta SyncPay sem identificador.");
        }

        let insertErr: { message: string } | null = null;
        if (data.plan === "mapa") {
          const { error } = await supabase.from("mapa_orders").insert({
            user_id: userId,
            amount,
            currency: "BRL",
            payment_method: "syncpay",
            external_ref: identifier,
            status: "pending",
          });
          insertErr = error ?? null;
        } else {
          const { error } = await supabase.from("syncpay_orders").insert({
            user_id: userId,
            plan: data.plan,
            amount,
            currency: "BRL",
            syncpay_identifier: identifier,
            status: "pending",
          });
          insertErr = error ?? null;
        }

        if (insertErr) {
          throw jsonError(500, "ORDER_INSERT", insertErr.message);
        }

        return {
          pix_code: cashIn.pix_code,
          identifier,
          amount,
          plan: data.plan,
        } as const;
      } catch (err) {
        if (err instanceof Response) throw err;
        throw jsonError(502, "SYNCPAY", userMessageFromSyncPay(err));
      }
    }),
  );

/** Consulta estado da transação na SyncPay (polling na UI). */
export const getSyncPayTransactionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = transactionQuerySchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(
    timedServerFn("getSyncPayTransactionFn", async ({ data, context }) => {
      if (!isSyncPayServerConfigured()) {
        throw jsonError(503, "SYNCPAY_DISABLED", "Pagamento SyncPay não está configurado.");
      }

      const supabase = context.supabase;
      const userId = context.userId;

      const { data: order, error: orderErr } = await supabase
        .from("syncpay_orders")
        .select("id, plan, status, syncpay_identifier")
        .eq("user_id", userId)
        .eq("syncpay_identifier", data.identifier)
        .maybeSingle();

      if (orderErr) throw jsonError(500, "ORDER", orderErr.message);

      let localStatus: string;

      if (order) {
        localStatus = order.status;
      } else {
        const { data: mapaOrder, error: mapaErr } = await supabase
          .from("mapa_orders")
          .select("id, status")
          .eq("user_id", userId)
          .eq("external_ref", data.identifier)
          .maybeSingle();

        if (mapaErr) throw jsonError(500, "ORDER", mapaErr.message);
        if (!mapaOrder) throw jsonError(404, "NOT_FOUND", "Pedido não encontrado.");

        localStatus = mapaOrder.status;
      }

      try {
        const tx = await syncPayGetTransaction(data.identifier);
        const st = tx.data?.status;
        return {
          localStatus,
          remoteStatus: st,
          amount: tx.data?.amount,
          currency: tx.data?.currency,
        } as const;
      } catch (err) {
        if (err instanceof Response) throw err;
        throw jsonError(502, "SYNCPAY", userMessageFromSyncPay(err));
      }
    }),
  );
