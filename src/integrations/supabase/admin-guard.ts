import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { jsonError } from "@/lib/server-fn-http";

/** Garante que o utilizador tem uma linha `user_roles` com `role = admin`. */
export async function assertAdminUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw jsonError(500, "DB", error.message);
  }
  if (!data) {
    throw jsonError(403, "FORBIDDEN", "Acesso reservado a administradores.");
  }
}
