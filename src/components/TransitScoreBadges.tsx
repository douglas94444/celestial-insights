import { Badge } from "@/components/ui/badge";

interface TransitScoreBadgesProps {
  scores: { humor: number; amor: number; trabalho: number };
}

export function TransitScoreBadges({ scores }: TransitScoreBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="text-[10px]">
        Humor {scores.humor}/100
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        Relações {scores.amor}/100
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        Trabalho {scores.trabalho}/100
      </Badge>
    </div>
  );
}
