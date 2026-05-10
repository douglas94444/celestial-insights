import { getRequest } from "@tanstack/react-start/server";
import { jsonError } from "@/lib/server-fn-http";

export function extractCronClientIp(req: Request): string | null {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const tc = req.headers.get("true-client-ip")?.trim();
  if (tc) return tc;
  return null;
}

/**
 * Opcional: `TRANSIT_DIGEST_CRON_ALLOWED_IPS` — lista CSV de IPs que podem chamar o cron.
 * Útil atrás do Cloudflare (`CF-Connecting-IP`). Sem variável, não há restrição de IP.
 */
export function assertCronCallerIpAllowed(): void {
  const raw = process.env.TRANSIT_DIGEST_CRON_ALLOWED_IPS?.trim();
  if (!raw) return;
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return;

  const request = getRequest();
  if (!request?.headers) {
    throw jsonError(403, "FORBIDDEN", "IP do cron não validado (pedido sem headers).");
  }

  const ip = extractCronClientIp(request);
  if (!ip || !allowed.includes(ip)) {
    throw jsonError(403, "FORBIDDEN", "IP não autorizado para cron.");
  }
}
