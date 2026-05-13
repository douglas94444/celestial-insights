import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Resposta JSON de erro (sem importar server-fn-http — evita `node:crypto` no bundle cliente). */
function rolloutJsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const SAO_PAULO_TZ = "America/Sao_Paulo";

/** YYYY-MM-DD no calendário civil de São Paulo para um instante ISO UTC. */
export function ymdSaoPaulo(isoUtc: string, ref = new Date(isoUtc)): string {
  return ref.toLocaleDateString("en-CA", { timeZone: SAO_PAULO_TZ });
}

/** Diferença em dias civis (UTC date parts) entre dois YYYY-MM-DD. */
export function calendarDaysBetweenYmd(anchorYmd: string, todayYmd: string): number {
  const [y1, m1, d1] = anchorYmd.split("-").map(Number);
  const [y2, m2, d2] = todayYmd.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

/**
 * Dias completos desde a data de criação do perfil (SP) até hoje (SP).
 * 0 = primeiro dia; ≥7 = rampa concluída.
 */
export function getRolloutDayIndexSp(profileCreatedAtIso: string, now: Date = new Date()): number {
  const anchorYmd = ymdSaoPaulo(profileCreatedAtIso, new Date(profileCreatedAtIso));
  const todayYmd = now.toLocaleDateString("en-CA", { timeZone: SAO_PAULO_TZ });
  return calendarDaysBetweenYmd(anchorYmd, todayYmd);
}

export type PaidRolloutTier = "MENSAL" | "ANUAL" | "PREMIUM";

export function isPaidRolloutTier(tier: string): tier is PaidRolloutTier {
  return tier === "MENSAL" || tier === "ANUAL" || tier === "PREMIUM";
}

/** Tier de compra avulsa do mapa natal (permanente, R$37). */
export function isMapaTier(tier: string): boolean {
  return tier === "MAPA";
}

/** Tier gratuito (sem compra): acesso ao mapa natal mas features avançadas bloqueadas. */
export function isFreeTier(tier: string): boolean {
  return tier === "FREE";
}

/** Tiers com acesso completo (sinastria, trânsitos, PDF, etc.). */
export function isFullPremiumTier(tier: string): boolean {
  return isPaidRolloutTier(tier);
}

/** Dias 0–6: desbloqueio progressivo; a partir do dia 7 (índice ≥7) tudo liberado para pagos. */
export const ROLLOUT_WINDOW_DAYS = 7;

export type RolloutGates = {
  transits: boolean;
  extraCharts: boolean;
  synastry: boolean;
  composite: boolean;
  annualForecast: boolean;
  pdfExport: boolean;
  moodAdvanced: boolean;
  digestEmail: boolean;
  aiFullKinds: boolean;
};

/** Gates do tier FREE: o mapa natal é acessível (criação + visualização), o resto bloqueado. */
export const FREE_TIER_GATES: RolloutGates = {
  transits: false,
  extraCharts: false,
  synastry: false,
  composite: false,
  annualForecast: false,
  pdfExport: false,
  moodAdvanced: false,
  digestEmail: false,
  aiFullKinds: false,
};

/** Gates do tier MAPA: só mapa natal + IA natal; sem trânsitos, sinastria, mapas extra, etc. */
export const MAPA_TIER_GATES: RolloutGates = {
  transits: false,
  extraCharts: false,
  synastry: false,
  composite: false,
  annualForecast: false,
  pdfExport: false,
  moodAdvanced: false,
  digestEmail: false,
  aiFullKinds: false,
};

export const FULL_ROLLOUT_GATES: RolloutGates = {
  transits: true,
  extraCharts: true,
  synastry: true,
  composite: true,
  annualForecast: true,
  pdfExport: true,
  moodAdvanced: true,
  digestEmail: true,
  aiFullKinds: true,
};

/** Primeiro `dayIndex` em que a gate fica true (tabela do plano). */
export const ROLLOUT_FIRST_DAY_INDEX: Record<keyof RolloutGates, number> = {
  transits: 1,
  extraCharts: 2,
  synastry: 3,
  composite: 4,
  annualForecast: 5,
  pdfExport: 5,
  moodAdvanced: 6,
  digestEmail: 6,
  aiFullKinds: 6,
};

export function buildRolloutGatesForDay(dayIndex: number): RolloutGates {
  if (dayIndex >= ROLLOUT_WINDOW_DAYS) return FULL_ROLLOUT_GATES;
  return {
    transits: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.transits,
    extraCharts: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.extraCharts,
    synastry: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.synastry,
    composite: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.composite,
    annualForecast: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.annualForecast,
    pdfExport: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.pdfExport,
    moodAdvanced: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.moodAdvanced,
    digestEmail: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.digestEmail,
    aiFullKinds: dayIndex >= ROLLOUT_FIRST_DAY_INDEX.aiFullKinds,
  };
}

/** Gates efectivos por tier: FREE/MAPA fixos; planos pagos seguem a rampa de 7 dias. */
export function rolloutGatesForTier(tier: string, dayIndex: number): RolloutGates {
  if (isFreeTier(tier)) return FREE_TIER_GATES;
  if (isMapaTier(tier)) return MAPA_TIER_GATES;
  return buildRolloutGatesForDay(dayIndex);
}

/**
 * Quando as gates devem ser aplicadas com erro 403 (MAPA sempre; pagos só na rampa;
 * FREE nunca — UI e outras regras tratam o tier gratuito).
 */
export function rolloutGateEnforcementActive(tier: string, dayIndex: number): boolean {
  if (isMapaTier(tier)) return true;
  return paidRolloutApplies(tier, dayIndex);
}

export function paidRolloutApplies(tier: string, dayIndex: number): boolean {
  return isPaidRolloutTier(tier) && dayIndex < ROLLOUT_WINDOW_DAYS;
}

export function rolloutLockedMessage(feature: keyof RolloutGates, dayIndex: number): string {
  const need = ROLLOUT_FIRST_DAY_INDEX[feature];
  const opensOnDay = need + 1;
  const youAreOn = dayIndex + 1;
  return `Esta função abre no ${opensOnDay}.º dia após criar a conta (horário de São Paulo). Agora está no ${youAreOn}.º dia.`;
}

/** Mensagem quando o utilizador tem tier MAPA e pede uma feature Premium. */
export const MAPA_ROLLOUT_LOCKED_MESSAGE =
  "Esta função faz parte do plano Premium. O plano Mapa Natal inclui o mapa de nascimento e as interpretações associadas.";

export type AssertRolloutGateOptions = {
  tier?: string;
};

export function assertRolloutGate(
  applies: boolean,
  gate: boolean,
  feature: keyof RolloutGates,
  dayIndex: number,
  options?: AssertRolloutGateOptions,
): void {
  if (!applies || gate) return;
  const msg =
    options?.tier && isMapaTier(options.tier)
      ? MAPA_ROLLOUT_LOCKED_MESSAGE
      : rolloutLockedMessage(feature, dayIndex);
  throw rolloutJsonError(403, "ROLLOUT_LOCKED", msg);
}

export type InterpretationAiKind = Database["public"]["Enums"]["interpretation_ai_kind"];

export const ROLLOUT_EARLY_NATAL_AI_KINDS: readonly InterpretationAiKind[] = [
  "natal_summary",
  "natal_planet",
  "natal_essence",
] as const;

export async function countInterpretationsUtcMonth(
  supabase: SupabaseClient<Database>,
  userId: string,
  at: Date = new Date(),
): Promise<number> {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1, 0, 0, 0, 0));
  const { count, error } = await supabase
    .from("interpretation_ai_cache")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  if (error) throw rolloutJsonError(500, "COUNT", error.message);
  return count ?? 0;
}

/** Limite de novas interpretações IA/mês na rampa (dias 0–5), só tipos natais permitidos. */
export const ROLLOUT_EARLY_AI_MONTHLY_CAP = 3;

export type ProfileRolloutState = {
  tier: Database["public"]["Enums"]["subscription_tier"];
  createdAt: string;
  dayIndex: number;
  gates: RolloutGates;
  applies: boolean;
};

export async function fetchProfileRolloutState(
  supabase: SupabaseClient<Database>,
  userId: string,
  now?: Date,
): Promise<ProfileRolloutState> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier, created_at")
    .eq("id", userId)
    .single();
  if (error || !profile)
    throw rolloutJsonError(500, "PROFILE", error?.message ?? "Perfil não encontrado.");
  const tier = profile.subscription_tier;
  const dayIndex = getRolloutDayIndexSp(profile.created_at, now);
  const gates = rolloutGatesForTier(tier, dayIndex);
  const applies = rolloutGateEnforcementActive(tier, dayIndex);
  return {
    tier,
    createdAt: profile.created_at,
    dayIndex,
    gates,
    applies,
  };
}

export async function assertPaidRolloutAiAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: Database["public"]["Enums"]["subscription_tier"],
  createdAtIso: string,
  kind: InterpretationAiKind,
  now?: Date,
): Promise<void> {
  const dayIndex = getRolloutDayIndexSp(createdAtIso, now);

  if (isMapaTier(tier)) {
    const natalOk = (ROLLOUT_EARLY_NATAL_AI_KINDS as readonly string[]).includes(kind);
    if (!natalOk) {
      throw rolloutJsonError(403, "ROLLOUT_LOCKED", MAPA_ROLLOUT_LOCKED_MESSAGE);
    }
    return;
  }

  const applies = paidRolloutApplies(tier, dayIndex);
  if (!applies) return;
  const gates = buildRolloutGatesForDay(dayIndex);
  if (gates.aiFullKinds) return;
  const natalOk = (ROLLOUT_EARLY_NATAL_AI_KINDS as readonly string[]).includes(kind);
  if (!natalOk) {
    throw rolloutJsonError(403, "ROLLOUT_LOCKED", rolloutLockedMessage("aiFullKinds", dayIndex));
  }
  const used = await countInterpretationsUtcMonth(supabase, userId, now);
  if (used >= ROLLOUT_EARLY_AI_MONTHLY_CAP) {
    throw rolloutJsonError(
      403,
      "ROLLOUT_AI_MONTHLY",
      `Na primeira semana são até ${ROLLOUT_EARLY_AI_MONTHLY_CAP} interpretações novas por IA por mês (tipos do mapa natal). Dia 7 libera todos os tipos.`,
    );
  }
}
