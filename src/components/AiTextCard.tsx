import type { ReactNode } from "react";
import { AiCacheAgeBadge } from "@/components/AiCacheAgeBadge";

interface AiTextCardProps {
  text: string;
  cachedAt?: string | null;
  badge?: ReactNode;
  className?: string;
}

export function AiTextCard({ text, cachedAt, badge, className }: AiTextCardProps) {
  const resolvedBadge =
    badge ?? (cachedAt !== undefined ? <AiCacheAgeBadge cachedAt={cachedAt ?? undefined} /> : null);
  return (
    <article
      className={`space-y-2 whitespace-pre-wrap leading-relaxed text-foreground/90 ${className ?? "rounded-md border border-primary/15 bg-primary/5 p-3 text-sm"}`}
    >
      {resolvedBadge}
      {text}
    </article>
  );
}
