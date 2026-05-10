import { z } from "zod";

export const profileNameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const profilePreferencesSchema = z.object({
  house_system: z.enum(["placidus", "equal", "whole_sign"]),
  zodiac: z.enum(["tropical", "sidereal"]),
  email_notifications: z.boolean(),
});

export type ProfilePreferencesForm = z.infer<typeof profilePreferencesSchema>;
