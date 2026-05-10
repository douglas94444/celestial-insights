import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateChart } from "@/lib/astrology/calculate";
import { calculateChartPayloadSchema } from "@/lib/schemas/birth-chart";

/** Calcula posições planetárias, casas e aspectos (servidor, JWT obrigatório). */
export const calculateChartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = calculateChartPayloadSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.flatten().formErrors.join(", ") || "Payload inválido");
    }
    return parsed.data;
  })
  .handler(async ({ data }) => {
    return calculateChart({
      birthDate: data.birthDate,
      birthTime: data.birthTime,
      latitude: data.latitude,
      longitude: data.longitude,
      timezoneOffset: data.timezoneOffsetMinutes,
      houseSystem: data.houseSystem,
    });
  });
