import { Badge } from "@/components/ui/badge";
import type { AspectMood } from "@/data/chart-detail-interpretations";

export function AspectMoodBadge({ mood }: { mood: AspectMood }) {
  return (
    <Badge
      variant="secondary"
      className={
        mood === "harmonic"
          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
          : mood === "desafiador"
            ? "bg-amber-500/15 text-amber-900 dark:text-amber-100"
            : ""
      }
    >
      {mood === "harmonic" ? "harmônico" : mood === "desafiador" ? "desafiador" : "neutro"}
    </Badge>
  );
}
