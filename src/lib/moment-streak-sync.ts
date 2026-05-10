import { supabase } from "@/integrations/supabase/client";

export async function persistMomentStreakToProfile(
  userId: string,
  streak: number,
  lastVisitYmd: string,
): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      moment_streak: streak,
      moment_last_visit_ymd: lastVisitYmd,
    })
    .eq("id", userId);
}
