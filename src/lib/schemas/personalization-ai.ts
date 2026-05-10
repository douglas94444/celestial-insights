import { z } from "zod";

/** Saída estruturada — mensagem matinal profunda (cache JSON). */
export const morningDeepOutputSchema = z.object({
  greeting: z.string().max(900),
  main_message: z.string().max(4500),
  secondary_theme: z.string().max(2200).optional(),
  practical_tip: z.string().max(1400),
  affirmation: z.string().max(600),
  closing_note: z.string().max(1600).optional(),
});

export type MorningDeepOutput = z.infer<typeof morningDeepOutputSchema>;

export const natalEssenceOutputSchema = z.object({
  essence: z.string().min(6).max(220),
});

export type NatalEssenceOutput = z.infer<typeof natalEssenceOutputSchema>;

/** Sinastria profunda — sem mapa composto (MVP explícito no campo composite_disclaimer). */
export const synastryDeepOutputSchema = z.object({
  composite_disclaimer: z.string().max(1800),
  overview: z.string().max(4500),
  emotional_dynamics: z.string().max(3500),
  communication_styles: z.string().max(3500),
  intimacy_attraction: z.string().max(3500),
  conflict_repair: z.string().max(3500),
  daily_rhythm: z.string().max(3500),
  long_term_growth: z.string().max(3500),
  integration_summary: z.string().max(3500),
});

export type SynastryDeepOutput = z.infer<typeof synastryDeepOutputSchema>;
