import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { userHasAdminRole } from "@/integrations/supabase/user-has-admin-role";
import { jsonError } from "@/lib/server-fn-http";

export { userHasAdminRole } from "@/integrations/supabase/user-has-admin-role";

/** Garante que o utilizador tem uma linha `user_roles` com `role = admin`. */
export async function assertAdminUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  let ok: boolean;
  try {
    ok = await userHasAdminRole(supabase, userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao verificar permissões.";
    throw jsonError(500, "DB", msg);
  }
  if (!ok) {
    throw jsonError(403, "FORBIDDEN", "Acesso reservado a administradores.");
  }
}
