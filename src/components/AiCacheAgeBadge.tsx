import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Resposta típica com cache de interpretação IA (`mutation.data` pode estar indefinido). */
export type AiCachedResultLike =
  | {
      cached?: boolean;
      cached_at?: string | null;
    }
  | null
  | undefined;

/** Badge só quando `cached` e `cached_at` estão presentes (evita condicionais repetidos nas rotas). */
export function AiCacheAgeBadgeFromResult({ result }: { result: AiCachedResultLike }) {
  if (!result?.cached || !result.cached_at) return null;
  return <AiCacheAgeBadge cachedAt={result.cached_at} />;
}

/** Mostra idade relativa do registo em cache (interpretação IA). */
export function AiCacheAgeBadge({ cachedAt }: { cachedAt: string | null | undefined }) {
  if (!cachedAt) return null;
  try {
    const d = parseISO(cachedAt);
    if (Number.isNaN(d.getTime())) return null;
    const label = formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
    return (
      <p className="text-[10px] leading-snug text-muted-foreground tabular-nums">
        Cache · gerado {label}
      </p>
    );
  } catch {
    return null;
  }
}
