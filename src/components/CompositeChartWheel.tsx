import { NatalChartWheel } from "@/components/NatalChartWheel";
import type { ChartData } from "@/lib/astrology/calculate";

type Props = {
  data: ChartData;
  size?: number;
  reduceMotion?: boolean;
};

/** Roda natal para dados já calculados do mapa composto (reutiliza `NatalChartWheel`). */
export function CompositeChartWheel({ data, size, reduceMotion }: Props) {
  return <NatalChartWheel data={data} size={size} reduceMotion={reduceMotion} />;
}
