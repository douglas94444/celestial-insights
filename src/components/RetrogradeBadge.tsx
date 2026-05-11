import { Badge } from "@/components/ui/badge";

interface RetrogradeBadgeProps {
  inline?: boolean;
}

export function RetrogradeBadge({ inline }: RetrogradeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-amber-600 border-amber-400 text-[10px] px-1 py-0 font-normal${inline ? " align-middle" : ""}`}
    >
      ℞
    </Badge>
  );
}
