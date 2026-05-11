import type { ChartData } from "@/lib/astrology/calculate";
import type { SynastryAnalysis } from "@/lib/astrology/synastry";
import type { AnnualForecast } from "@/lib/astrology/annual-forecast";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import type { ChartRow } from "@/lib/chart-from-row";
import type { Database } from "@/integrations/supabase/types";
import type { MorningDeepOutput, SynastryDeepOutput } from "@/lib/schemas/personalization-ai";

export type SynastryRow = Database["public"]["Tables"]["synastries"]["Row"];

/** Resposta típica das funções de interpretação IA (cache hit/miss). */
export type AiInterpretationFnResult = {
  cached: boolean;
  content: string;
  /** Preenchido em cache hit (ISO da linha em `interpretation_ai_cache`). */
  cached_at?: string | null;
};

export type MorningDeepMessageFnResult = {
  cached: boolean;
  morning: MorningDeepOutput;
  cached_at?: string | null;
};

export type NatalEssenceFnResult = {
  cached: boolean;
  essence: string;
  cached_at?: string | null;
};

export type SynastryDeepNarrativeFnResult = {
  cached: boolean;
  deep: SynastryDeepOutput;
  cached_at?: string | null;
};

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

export type GenerateAnnualForecastFnResult = {
  chartId: string;
  chartName: string;
  year: number;
  months: AnnualForecast;
};

/** Resultado de `calculateChartFn` (pré-visualização pura). */
export type CalculateChartFnResult = ChartData;

export type SendTransitDigestEmailFnResult = { ok: true; to: string; date: string };

export type DeleteAccountFnResult = { ok: true };

export type MoodHistoryEntryFn = {
  ymd: string;
  mood_score: number;
  emotions: string[];
  note: string | null;
};

export type GetMoodHistoryFnResult = {
  entries: MoodHistoryEntryFn[];
  intensityByYmd: Record<string, number>;
  correlationNote: string | null;
};

export type UpsertMoodFnResult = { ok: true };

export type CalculateCompositeFnResult = {
  chart1Id: string;
  chart2Id: string;
  chart1Name: string;
  chart2Name: string;
  composite: ChartData;
};

/** Agregados globais devolvidos por `adminOverviewFn` / RPC `admin_overview_metrics`. */
export type AdminOverviewFnResult = {
  profiles_count: number;
  charts_count: number;
  synastries_count: number;
  mood_logs_count: number;
  ai_cache_count: number;
  engagement_events_total: number;
  engagement_events_last_7d: number;
};
