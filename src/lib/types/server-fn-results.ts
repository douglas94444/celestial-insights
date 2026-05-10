import type { ChartData } from "@/lib/astrology/calculate";
import type { SynastryAnalysis } from "@/lib/astrology/synastry";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import type { ChartRow } from "@/lib/chart-from-row";
import type { Database } from "@/integrations/supabase/types";

export type SynastryRow = Database["public"]["Tables"]["synastries"]["Row"];

/** Resposta típica das funções de interpretação IA (cache hit/miss). */
export type AiInterpretationFnResult = { cached: boolean; content: string };

export type CreateChartFnResult = { chart: ChartRow; computed: ChartData };

export type RecalculateChartFnResult = { chart: ChartRow; computed: ChartData };

export type CalculateAndSaveSynastryFnResult = {
  synastry: SynastryRow;
  analysis: SynastryAnalysis;
  baseChart: ChartData;
  overlayChart: ChartData;
};

export type CalculateTransitsFnResult = {
  chartId: string;
  chartName: string;
  startDate: string;
  endDate: string;
  days: TransitDayPayload[];
};

/** Resultado de `calculateChartFn` (pré-visualização pura). */
export type CalculateChartFnResult = ChartData;

export type SendTransitDigestEmailFnResult = { ok: true; to: string; date: string };

export type DeleteAccountFnResult = { ok: true };
