import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ChartRow = Database["public"]["Tables"]["charts"]["Row"];

export const chartsListQueryKey = ["charts-list"] as const;

export async function fetchChartsList(): Promise<ChartRow[]> {
  const { data, error } = await supabase
    .from("charts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Lista global de mapas (mesma key em mapas, compatibilidade, trânsitos). */
export function useChartsListQuery() {
  return useQuery({
    queryKey: chartsListQueryKey,
    queryFn: fetchChartsList,
  });
}
