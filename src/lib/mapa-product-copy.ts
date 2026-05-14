/**
 * Copy canónica do produto Mapa Natal (landing + checkout).
 * Manter alinhado com o que o servidor entrega (tier MAPA).
 */
export const MAPA_INCLUDED_ITEMS = [
  {
    title: "Roda natal interativa completa",
    body: "13 pontos, 12 casas, aspectos na roda.",
  },
  {
    title: "Interpretações detalhadas por posição",
    body: "Sol, Lua, Ascendente, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão, Quíron e Nodos — quando aplicável ao seu mapa.",
  },
  {
    title: "Padrões especiais",
    body: "Grand Trine, T-Square, Yod, Stellium… só quando existirem no seu desenho.",
  },
  {
    title: "Essência natal",
    body: "Síntese do fio condutor do mapa.",
  },
  {
    title: "Acesso permanente",
    body: "Paga uma vez, consulta quando quiser; sem mensalidade neste produto.",
  },
] as const;

export type MapaIncludedItem = (typeof MAPA_INCLUDED_ITEMS)[number];

/** Linhas curtas para o card de resumo no checkout (mesma ordem que a landing). */
export const MAPA_CHECKOUT_CARD_LINES: readonly string[] = MAPA_INCLUDED_ITEMS.map((i) => i.title);

/**
 * `sessionStorage` com valor `"1"` quando o utilizador está no fluxo só do mapa
 * (inclui retorno do Mercado Pago sem `?produto=mapa` na URL).
 */
export const SESSION_CHECKOUT_MAPA_INTENT = "astromap_checkout_mapa_intent";

export function markCheckoutMapaIntent(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_CHECKOUT_MAPA_INTENT, "1");
}

export function clearCheckoutMapaIntent(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SESSION_CHECKOUT_MAPA_INTENT);
}

export function hasCheckoutMapaIntent(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(SESSION_CHECKOUT_MAPA_INTENT) === "1";
}

/** Uma vez por sessão de browser: diálogo de upsell Premium para tier MAPA. Limpar no logout. */
export const SESSION_MAPA_PREMIUM_PROMPT_SHOWN = "astromap_mapa_premium_prompt_shown";

export function clearMapaPremiumPromptShown(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SESSION_MAPA_PREMIUM_PROMPT_SHOWN);
}

export const MAPA_PREMIUM_BANNER_TEXT =
  "O plano Mapa Natal inclui só o mapa de nascimento. Desbloqueie sinastria, trânsitos, PDF e interpretações ilimitadas com o Premium.";

export const MAPA_PREMIUM_DIALOG_TITLE = "Quer ir mais longe?";

export const MAPA_PREMIUM_DIALOG_BODY =
  "O Premium desbloqueia mapas ilimitados, compatibilidade, trânsitos, previsão anual, exportações e muito mais.";
