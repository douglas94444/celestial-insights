import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Em desenvolvimento ou para utilizadores com papel `admin`, o servidor pode devolver gaps de env de pagamentos. */
export async function shouldExposePaymentConfigurationGaps(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  if (import.meta.env.DEV) return true;
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}
