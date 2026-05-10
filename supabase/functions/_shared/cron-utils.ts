const SP_TZ = "America/Sao_Paulo";

const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Hora civil e weekday em São Paulo para digest automático. */
export function saoPauloDigestContext(d = new Date()): {
  dateStr: string;
  hour: number;
  weekday: number;
} {
  const dateStr = d.toLocaleDateString("en-CA", { timeZone: SP_TZ });
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SP_TZ,
      hour: "2-digit",
      hour12: false,
    }).format(d),
    10,
  );
  const wdLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: SP_TZ,
    weekday: "short",
  }).format(d);
  const idx = WEEKDAY_SHORT_EN.indexOf(wdLabel as (typeof WEEKDAY_SHORT_EN)[number]);
  return { dateStr, hour: Number.isNaN(hour) ? 12 : hour, weekday: idx === -1 ? 0 : idx };
}

export function secretsMatchConstantTime(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

/** IP do cliente atrás de proxy (preferir `cf-connecting-ip` no Cloudflare). */
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

/** Se `allowedCsv` estiver vazio, permite qualquer IP (só segredo). */
export function cronIpAllowlistAllows(req: Request, allowedCsv: string | undefined): boolean {
  const raw = allowedCsv?.trim();
  if (!raw) return true;
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  const ip = extractCronClientIp(req);
  return !!ip && allowed.includes(ip);
}
