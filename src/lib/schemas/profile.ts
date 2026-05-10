import { z } from "zod";

export const profileNameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const profilePreferencesSchema = z.object({
  house_system: z.enum(["placidus", "equal", "whole_sign"]),
  zodiac: z.enum(["tropical", "sidereal"]),
  email_notifications: z.boolean(),
  moment_daily_email: z.boolean(),
  transit_digest_auto: z.boolean(),
  transit_digest_hour: z.number().int().min(0).max(23),
  transit_digest_weekdays: z.array(z.number().int().min(0).max(6)).min(1),
});

export type ProfilePreferencesForm = z.infer<typeof profilePreferencesSchema>;
