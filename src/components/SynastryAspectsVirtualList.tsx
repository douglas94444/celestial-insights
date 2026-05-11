import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SynastryAspectRow } from "@/components/SynastryAspectRow";
import { ASPECT_LABELS, aspectMood } from "@/data/chart-detail-interpretations";
import type { SynastryCrossAspect } from "@/lib/astrology/synastry";
import { getPlanetName } from "@/lib/astrology/zodiac";

const ROW_ESTIMATE_PX = 72;

interface Props {
  aspects: SynastryCrossAspect[];
  className?: string;
}

export function SynastryAspectsVirtualList({ aspects, className }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => [...aspects].sort((a, b) => a.orb - b.orb), [aspects]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className={className ?? "max-h-[min(60vh,480px)] overflow-auto px-0 pb-3"}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const a = sorted[vi.index];
          const mood = aspectMood(a.type);
          const label = ASPECT_LABELS[a.type] ?? String(a.type).replace(/_/g, " ");
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <SynastryAspectRow
                planet1Label={getPlanetName(a.planet1)}
                planet2Label={getPlanetName(a.planet2)}
                typeLabel={label}
                orb={a.orb}
                mood={mood}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
