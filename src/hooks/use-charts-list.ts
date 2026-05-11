import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type ChartRow = Database["public"]["Tables"]["charts"]["Row"];

export const chartsQueryKeyBase = ["charts"] as const;

export async function fetchChartsList(): Promise<ChartRow[]> {
  const { data, error } = await supabase
    .from("charts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

/** Lista global de mapas — chave inclui userId para isolar cache entre sessões. */
export function useChartsListQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...chartsQueryKeyBase, user?.id] as const,
    queryFn: fetchChartsList,
    enabled: !!user,
    staleTime: 60_000,
  });
}
