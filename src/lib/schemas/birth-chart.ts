import { z } from "zod";

/** Offset em minutos a leste de UTC (ex.: -180 = UTC−3). */
export const timezoneOffsetMinutesSchema = z.number().int().min(-660).max(840);

export const birthChartInputSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(120),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  birthTimeKnown: z.boolean(),
  birthPlace: z.string().trim().min(1).max(200),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  /** Rótulo armazenado no banco (ex.: UTC−3 ou America/Sao_Paulo). */
  timezone: z.string().min(1).max(64),
  /** Usado em calculateChart — minutos a leste de UTC. */
  timezoneOffsetMinutes: timezoneOffsetMinutesSchema,
  /** Se true, este mapa passa a ser o único primário. */
  setPrimary: z.boolean().optional(),
});

export type BirthChartInput = z.infer<typeof birthChartInputSchema>;

export const calculateChartPayloadSchema = z.object({
  birthDate: birthChartInputSchema.shape.birthDate,
  birthTime: birthChartInputSchema.shape.birthTime,
  latitude: birthChartInputSchema.shape.latitude,
  longitude: birthChartInputSchema.shape.longitude,
  timezoneOffsetMinutes: timezoneOffsetMinutesSchema,
});

export type CalculateChartPayload = z.infer<typeof calculateChartPayloadSchema>;
