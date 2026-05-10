import { extractFirstJsonObject } from "@/lib/ai/json-response";
import {
  synastryDeepOutputSchema,
  type SynastryDeepOutput,
} from "@/lib/schemas/personalization-ai";

/** Mesmo texto injectado no prompt e no fallback quando o JSON falha. */
export const SYNASTRY_COMPOSITE_MVP_PT =
  "Esta versão do AstroMap não calcula mapa composto (pontos médios entre cartas). Não inventes nem interpretes mapa composto até existir cálculo no produto.";

export function parseSynastryDeepCached(content: string): SynastryDeepOutput | null {
  try {
    const o = JSON.parse(content) as unknown;
    const p = synastryDeepOutputSchema.safeParse(o);
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

export function synastryDeepFromLlm(text: string, legalDisclaimer: string): SynastryDeepOutput {
  try {
    const raw = extractFirstJsonObject(text);
    const p = synastryDeepOutputSchema.safeParse(raw);
    if (p.success) return p.data;
  } catch {
    /* ignore */
  }
  const chunk = text.trim().slice(0, 4000);
  const filler =
    "Integra tensões e recursos já descritos nos dados; linguagem acessível; evita julgar a relação.";
  return {
    composite_disclaimer: SYNASTRY_COMPOSITE_MVP_PT,
    overview: chunk || filler,
    emotional_dynamics: filler,
    communication_styles: filler,
    intimacy_attraction: filler,
    conflict_repair: filler,
    daily_rhythm: filler,
    long_term_growth: filler,
    integration_summary: legalDisclaimer,
  };
}
