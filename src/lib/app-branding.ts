/** Handle Instagram / marca no rodapé do cartão (sem @ obrigatório no env). */
export function getInstagramBrandHandle(): string {
  const raw = import.meta.env.VITE_APP_INSTAGRAM_HANDLE as string | undefined;
  const trimmed = raw?.trim();
  if (trimmed) return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  return "@astrologiia.app";
}

/** URL pública para CTA no cartão / legenda (fallback: origem actual no cliente). */
export function getSharePublicUrl(): string {
  const raw = (import.meta.env.VITE_APP_SHARE_URL as string | undefined)?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}
