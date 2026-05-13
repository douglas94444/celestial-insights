import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Indica se o utilizador tem `role = admin` em `user_roles`.
 * Não importa `server-fn-http` — seguro para módulos partilhados com o cliente.
 * Em erro de base de dados lança `Error` (os handlers servidor devem mapear para 500).
 */
export async function userHasAdminRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return !!data;
}
