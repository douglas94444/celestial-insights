import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { META_PIXEL_ID_META_NAME } from "@/lib/meta-pixel-html";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __metaPixelId?: string;
  }
}

let fbeventsLoadPromise: Promise<void> | null = null;

function loadFbeventsJs(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.fbq) return Promise.resolve();
  if (fbeventsLoadPromise) return fbeventsLoadPromise;

  fbeventsLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    s.onload = () => resolve();
    s.onerror = () => {
      fbeventsLoadPromise = null;
      reject(new Error("Meta Pixel: falha ao carregar fbevents.js"));
    };
    document.head.appendChild(s);
  });

  return fbeventsLoadPromise;
}

/** Prioridade: `VITE_META_PIXEL_ID` (build) → `<meta name="meta-pixel-id">` (Worker / HTMLRewriter). */
export function readMetaPixelId(): string | undefined {
  const vite = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();
  if (vite) return vite;
  if (typeof document !== "undefined") {
    const fromMeta = document
      .querySelector(`meta[name="${META_PIXEL_ID_META_NAME}"]`)
      ?.getAttribute("content")
      ?.trim();
    if (fromMeta) return fromMeta;
  }
  return undefined;
}

/**
 * Meta Pixel (Facebook).
 * - Com `VITE_META_PIXEL_ID` no build: activo em dev e prod.
 * - Só com `META_PIXEL_ID` no Cloudflare Worker: o `server.ts` injeta meta no HTML; o cliente lê e carrega o script (sem rebuild por VITE).
 * PageView após `fbq('init')`; PageView em navegações SPA (pathname + search).
 */
export function MetaPixel() {
  const pixelIdVite = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const fullPath = `${pathname}${searchStr}`;
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const pixelId = readMetaPixelId();
    if (!pixelId) return;

    let cancelled = false;

    void (async () => {
      try {
        await loadFbeventsJs();
        if (cancelled || !window.fbq) return;

        if (window.__metaPixelId !== pixelId) {
          window.__metaPixelId = pixelId;
          window.fbq("init", pixelId);
          window.fbq("track", "PageView");
          prevPathRef.current = fullPath;
          return;
        }

        if (prevPathRef.current === null) {
          prevPathRef.current = fullPath;
          return;
        }
        if (prevPathRef.current !== fullPath) {
          prevPathRef.current = fullPath;
          window.fbq("track", "PageView");
        }
      } catch {
        /* evita ruído no cliente; falhas de rede / adblock */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fullPath]);

  if (!pixelIdVite) return null;

  const noscriptSrc = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelIdVite)}&ev=PageView&noscript=1`;

  return (
    <noscript>
      <img height="1" width="1" style={{ display: "none" }} src={noscriptSrc} alt="" />
    </noscript>
  );
}
