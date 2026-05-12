/** Preços de subscrição AstroMap (SyncPay, Mercado Pago, etc.). */

export type SubscriptionPlanId = "mensal" | "anual";

export const SUBSCRIPTION_PLAN_AMOUNTS: Record<SubscriptionPlanId, number> = {
  mensal: 24.9,
  anual: 147,
};

export function amountForSubscriptionPlan(plan: SubscriptionPlanId): number {
  return SUBSCRIPTION_PLAN_AMOUNTS[plan];
}

export function subscriptionPlanTitle(plan: SubscriptionPlanId): string {
  return plan === "mensal" ? "AstroMap — plano mensal" : "AstroMap — plano anual";
}

export function formatSubscriptionPriceBrl(amount: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}
