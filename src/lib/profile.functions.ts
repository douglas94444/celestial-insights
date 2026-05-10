import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { jsonError } from "@/lib/server-fn-http";
import { timedServerFn } from "@/lib/server-fn-observe";

/** Remove o usuário do Auth (cascata em profiles/charts). Requer SUPABASE_SERVICE_ROLE_KEY no servidor. */
export const deleteAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    timedServerFn("deleteAccountFn", async ({ context }) => {
      const url = process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceKey) {
        throw jsonError(
          503,
          "MISSING_SERVICE_ROLE",
          "Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor (Cloudflare/Lovable) para permitir exclusão de conta.",
        );
      }

      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await admin.auth.admin.deleteUser(context.userId);
      if (error) {
        throw jsonError(500, "DELETE_USER", error.message);
      }

      return { ok: true as const };
    }),
  );
