import { createServerFn } from "@tanstack/react-start";
import { assertAdminUser } from "@/integrations/supabase/admin-guard";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jsonError } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";
import { z } from "zod";

const adminOverviewMetricsSchema = z.object({
  profiles_count: z.number(),
  charts_count: z.number(),
  synastries_count: z.number(),
  mood_logs_count: z.number(),
  ai_cache_count: z.number(),
  engagement_events_total: z.number(),
  engagement_events_last_7d: z.number(),
});

export const adminOverviewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    timedServerFn("adminOverviewFn", async ({ context }) => {
      const supabase = context.supabase;
      await assertAdminUser(supabase, context.userId);

      const { data, error } = await supabase.rpc("admin_overview_metrics");

      if (error) {
        const msg = error.message ?? "";
        if (/administradores|42501|privilege/i.test(msg)) {
          throw jsonError(403, "FORBIDDEN", "Acesso reservado a administradores.");
        }
        throw jsonError(500, "RPC", msg || "Falha ao obter métricas.");
      }

      const parsed = adminOverviewMetricsSchema.safeParse(data);
      if (!parsed.success) {
        throw jsonError(500, "INVALID_METRICS", "Resposta de métricas inválida.");
      }

      return parsed.data;
    }),
  );
