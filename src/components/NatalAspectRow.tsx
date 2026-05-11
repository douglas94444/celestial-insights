import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { ASPECT_LABELS, type AspectMood } from "@/data/chart-detail-interpretations";
import { AspectMoodBadge } from "@/components/AspectMoodBadge";
import type { AspectType } from "@/lib/astrology/calculate";

export type NatalAspectRowProps = {
  p1Symbol: string;
  p1Name: string;
  p2Symbol: string;
  p2Name: string;
  aspectType: AspectType;
  orb: number;
  exactAngle: number;
  mood: AspectMood;
};

function NatalAspectRowInner({
  p1Symbol,
  p1Name,
  p2Symbol,
  p2Name,
  aspectType,
  orb,
  exactAngle,
  mood,
}: NatalAspectRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-3 text-sm last:border-b-0">
      <span>
        <span className="font-medium">
          {p1Symbol} {p1Name}
        </span>{" "}
        —{" "}
        <span className="font-medium">
          {p2Symbol} {p2Name}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{ASPECT_LABELS[aspectType]}</Badge>
        <span className="text-muted-foreground">
          órbe {orb}° · ângulo {exactAngle}°
        </span>
        <AspectMoodBadge mood={mood} />
      </span>
    </div>
  );
}

export const NatalAspectRow = memo(NatalAspectRowInner);
