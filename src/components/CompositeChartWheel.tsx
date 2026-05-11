import { memo } from "react";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import type { ChartData } from "@/lib/astrology/calculate";

interface Props {
  data: ChartData;
  size?: number;
  reduceMotion?: boolean;
}

/** Roda natal para dados já calculados do mapa composto (reutiliza `NatalChartWheel`). */
export const CompositeChartWheel = memo(function CompositeChartWheel({
  data,
  size,
  reduceMotion,
}: Props) {
  return (
    <NatalChartWheel
      data={data}
      size={size}
      reduceMotion={reduceMotion}
      ariaLabel="Mapa composto — roda de midpoints entre dois mapas natais"
    />
  );
});
