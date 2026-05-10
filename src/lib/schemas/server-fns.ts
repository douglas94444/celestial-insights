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
