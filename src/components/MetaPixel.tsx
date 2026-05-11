import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

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

/**
 * Meta Pixel (Facebook) — só activo quando `VITE_META_PIXEL_ID` está definido.
 * PageView após `fbq('init')`; PageView em navegações SPA (pathname + search).
 */
export function MetaPixel() {
  const pixelId = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const fullPath = `${pathname}${searchStr}`;
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
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
  }, [pixelId, fullPath]);

  if (!pixelId) return null;

  const noscriptSrc = `https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`;

  return (
    <noscript>
      <img height="1" width="1" style={{ display: "none" }} src={noscriptSrc} alt="" />
    </noscript>
  );
}
