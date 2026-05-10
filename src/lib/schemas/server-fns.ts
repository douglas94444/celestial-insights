import { z } from "zod";
import { PLANETS, type PlanetKey } from "@/lib/astrology/zodiac";

/** UUID de recurso `charts.id`. */
export const chartIdSchema = z.string().uuid();

export const planetKeySchema = z.enum(PLANETS.map((p) => p.key) as [PlanetKey, ...PlanetKey[]]);

/** Data civil YYYY-MM-DD (uso em trânsitos / digest). */
export const dateYmdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser YYYY-MM-DD");

export const calculateTransitsInputSchema = z.object({
  chartId: chartIdSchema,
  startDate: dateYmdSchema,
  endDate: dateYmdSchema,
});

export type CalculateTransitsInput = z.infer<typeof calculateTransitsInputSchema>;

export const annualForecastInputSchema = z.object({
  chartId: chartIdSchema,
  year: z.number().int().min(1900).max(2100),
});

export type AnnualForecastInput = z.infer<typeof annualForecastInputSchema>;

export const upsertMoodInputSchema = z.object({
  chartId: chartIdSchema.nullish(),
  ymd: dateYmdSchema,
  moodScore: z.number().int().min(1).max(10),
  emotions: z.array(z.string().max(40)).max(12),
  note: z.string().max(2000).optional(),
});

export type UpsertMoodInput = z.infer<typeof upsertMoodInputSchema>;

export const getMoodHistoryInputSchema = z.object({
  chartId: chartIdSchema,
  startYmd: dateYmdSchema,
  endYmd: dateYmdSchema,
});

export type GetMoodHistoryInput = z.infer<typeof getMoodHistoryInputSchema>;

export const recalculateChartInputSchema = z.object({
  chartId: chartIdSchema,
});

export type RecalculateChartInput = z.infer<typeof recalculateChartInputSchema>;

export const sendTransitDigestInputSchema = z.object({
  chartId: chartIdSchema,
  date: dateYmdSchema.optional(),
});

export type SendTransitDigestInput = z.infer<typeof sendTransitDigestInputSchema>;

export const cronTransitDigestSchema = z.object({
  cronSecret: z.string().min(16),
});

export type CronTransitDigestInput = z.infer<typeof cronTransitDigestSchema>;

export const saveSynastryInputSchema = z.object({
  chart1Id: chartIdSchema,
  chart2Id: chartIdSchema,
});

export type SaveSynastryInput = z.infer<typeof saveSynastryInputSchema>;

export const natalExecutiveSummaryInputSchema = z.object({
  chartId: chartIdSchema,
});

export const natalPlanetInsightInputSchema = z.object({
  chartId: chartIdSchema,
  planetKey: planetKeySchema,
});

export const synastryNarrativeInputSchema = z
  .object({
    synastryId: z.string().uuid().optional(),
    chart1Id: chartIdSchema.optional(),
    chart2Id: chartIdSchema.optional(),
  })
  .refine((d) => Boolean(d.synastryId) || (Boolean(d.chart1Id) && Boolean(d.chart2Id)), {
    message: "Indica synastryId ou chart1Id e chart2Id.",
  });

export const transitDayNarrativeInputSchema = z.object({
  chartId: chartIdSchema,
  date: dateYmdSchema,
});

export type TransitDayNarrativeInput = z.infer<typeof transitDayNarrativeInputSchema>;

export const morningDeepMessageInputSchema = z.object({
  chartId: chartIdSchema,
  date: dateYmdSchema,
});

export type MorningDeepMessageInput = z.infer<typeof morningDeepMessageInputSchema>;

export const natalEssenceInputSchema = z.object({
  chartId: chartIdSchema,
});

export type NatalEssenceInput = z.infer<typeof natalEssenceInputSchema>;

export const synastryDeepNarrativeInputSchema = synastryNarrativeInputSchema;

export type SynastryDeepNarrativeInput = z.infer<typeof synastryDeepNarrativeInputSchema>;
