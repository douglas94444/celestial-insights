/** Preços de subscrição AstroMap (SyncPay, Mercado Pago, etc.). */

export type SubscriptionPlanId = "mensal" | "anual";

/** Identificador de qualquer produto vendável (planos recorrentes + mapa avulso). */
export type SubscriptionProductId = SubscriptionPlanId | "mapa";

export const SUBSCRIPTION_PLAN_AMOUNTS: Record<SubscriptionProductId, number> = {
  mapa: 37,
  mensal: 24.9,
  anual: 147,
};

export function amountForSubscriptionPlan(plan: SubscriptionProductId): number {
  return SUBSCRIPTION_PLAN_AMOUNTS[plan];
}

export function subscriptionPlanTitle(plan: SubscriptionProductId): string {
  if (plan === "mapa") return "AstroMap — mapa natal";
  return plan === "mensal" ? "AstroMap — plano mensal" : "AstroMap — plano anual";
}

export function formatSubscriptionPriceBrl(amount: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}
