import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { NatalAspectRow } from "@/components/NatalAspectRow";
import { aspectMood } from "@/data/chart-detail-interpretations";
import type { Aspect } from "@/lib/astrology/calculate";
import type { PlanetPosition } from "@/lib/astrology/calculate";
import type { PlanetKey } from "@/lib/astrology/zodiac";

const ROW_ESTIMATE_PX = 76;

interface Props {
  aspects: Aspect[];
  planetByKey: Map<PlanetKey, PlanetPosition>;
  className?: string;
}

export function NatalAspectsVirtualList({ aspects, planetByKey, className }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: aspects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      className={className ?? "max-h-[60vh] overflow-auto rounded-lg border border-border/80"}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const a = aspects[vi.index];
          const p1 = planetByKey.get(a.planet1);
          const p2 = planetByKey.get(a.planet2);
          if (!p1 || !p2) return null;
          const mood = aspectMood(a.type);
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <NatalAspectRow
                p1Symbol={p1.symbol}
                p1Name={p1.name}
                p2Symbol={p2.symbol}
                p2Name={p2.name}
                aspectType={a.type}
                orb={a.orb}
                exactAngle={a.exactAngle}
                mood={mood}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
