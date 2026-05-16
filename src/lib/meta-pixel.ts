/**
 * Disparos de eventos para o Meta Pixel (browser).
 *
 * O snippet do Pixel é injectado em `src/lib/meta-pixel-html.ts` (Worker)
 * e `src/components/MetaPixel.tsx` (cliente). Aqui só envolvemos `fbq` com
 * segurança (silencia se Pixel não estiver configurado ou se um adblock
 * impedir o carregamento de `fbevents.js`).
 *
 * Cada chamada gera um `event_id` (UUID v4) que pode ser reutilizado pelo
 * Conversions API server-side para deduplicar (ver `src/lib/meta-capi.ts`).
 */

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
  }
}

/** Eventos standard do Meta usados no produto. */
export type MetaStandardEvent =
  | "Lead"
  | "CompleteRegistration"
  | "SubmitApplication"
  | "ViewContent"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

export interface MetaTrackOptions {
  /** Reutilizado pelo CAPI para deduplicação. Gerado se omitido. */
  eventID?: string;
}

function newEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fallback abaixo */
  }
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function fbqSafe(): FbqFn | null {
  if (typeof window === "undefined") return null;
  const fn = window.fbq;
  return typeof fn === "function" ? fn : null;
}

/** Dispara evento standard do Pixel. Devolve o `event_id` para correlação. */
export function trackMetaEvent(
  name: MetaStandardEvent,
  params?: Record<string, unknown>,
  options?: MetaTrackOptions,
): string {
  const eventID = options?.eventID ?? newEventId();
  const fbq = fbqSafe();
  if (!fbq) return eventID;
  try {
    if (params && Object.keys(params).length > 0) {
      fbq("track", name, params, { eventID });
    } else {
      fbq("track", name, {}, { eventID });
    }
  } catch {
    /* nunca rebenta o fluxo da app */
  }
  return eventID;
}

/** Dispara evento custom (`fbq('trackCustom', ...)`). */
export function trackMetaCustomEvent(
  name: string,
  params?: Record<string, unknown>,
  options?: MetaTrackOptions,
): string {
  const eventID = options?.eventID ?? newEventId();
  const fbq = fbqSafe();
  if (!fbq) return eventID;
  try {
    fbq("trackCustom", name, params ?? {}, { eventID });
  } catch {
    /* idem */
  }
  return eventID;
}
