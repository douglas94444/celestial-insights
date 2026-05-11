import { memo } from "react";
import type { AspectMood } from "@/data/chart-detail-interpretations";
import { AspectMoodBadge } from "@/components/AspectMoodBadge";

export type SynastryAspectRowProps = {
  planet1Label: string;
  planet2Label: string;
  typeLabel: string;
  orb: number;
  mood: AspectMood;
};

function SynastryAspectRowInner({
  planet1Label,
  planet2Label,
  typeLabel,
  orb,
  mood,
}: SynastryAspectRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 text-sm last:border-b-0">
      <span>
        <span className="font-medium">{planet1Label}</span>
        {" — "}
        <span className="font-medium">{planet2Label}</span>
        {" · "}
        <span className="text-muted-foreground">{typeLabel}</span>
        {" · órbe "}
        <span className="tabular-nums">{orb}°</span>
      </span>
      <AspectMoodBadge mood={mood} />
    </div>
  );
}

export const SynastryAspectRow = memo(SynastryAspectRowInner);
