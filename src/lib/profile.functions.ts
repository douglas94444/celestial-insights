import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Remove o usuário do Auth (cascata em profiles/charts). Requer SUPABASE_SERVICE_ROLE_KEY no servidor. */
export const deleteAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Response(
        JSON.stringify({
          code: "MISSING_SERVICE_ROLE",
          message:
            "Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor (Cloudflare/Lovable) para permitir exclusão de conta.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin.auth.admin.deleteUser(context.userId);
    if (error) {
      throw new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return { ok: true as const };
  });
