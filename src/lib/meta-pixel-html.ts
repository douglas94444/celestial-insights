/** Meta tag usada pelo cliente para ler o ID do Pixel quando só existe no Worker (`META_PIXEL_ID`). */
export const META_PIXEL_ID_META_NAME = "meta-pixel-id";

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function readMetaPixelIdFromWorkerEnv(env: unknown): string | undefined {
  if (!env || typeof env !== "object") return undefined;
  const e = env as Record<string, unknown>;
  const meta = typeof e.META_PIXEL_ID === "string" ? e.META_PIXEL_ID.trim() : "";
  const vite = typeof e.VITE_META_PIXEL_ID === "string" ? e.VITE_META_PIXEL_ID.trim() : "";
  const out = meta || vite;
  return out.length > 0 ? out : undefined;
}

/**
 * Injeta o snippet padrão do Meta Pixel + `<meta name="meta-pixel-id">` no `<head>`.
 * O snippet inline permite que o Pixel Helper detete o pixel antes da hydration React.
 * A `<meta>` mantém-se para o `MetaPixel.tsx` ler o ID em dev (sem HTMLRewriter).
 */
export function injectMetaPixelIdMeta(response: Response, env: unknown): Response {
  const pixelId = readMetaPixelIdFromWorkerEnv(env);
  if (!pixelId) return response;
  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return response;
  if (typeof HTMLRewriter === "undefined") return response;

  const id = escapeHtmlAttr(pixelId);
  // window.__metaPixelId sinaliza ao MetaPixel.tsx que já foi inicializado — evita PageView duplo.
  const snippet =
    `<script>` +
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
    `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
    `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
    `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
    `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
    `fbq('init','${id}');fbq('track','PageView');window.__metaPixelId='${id}';` +
    `</script>` +
    `<noscript><img height="1" width="1" style="display:none"` +
    ` src="https://www.facebook.com/tr?id=${id}&amp;ev=PageView&amp;noscript=1"/></noscript>` +
    `<meta name="${META_PIXEL_ID_META_NAME}" content="${id}">`;

  const rewriter = new HTMLRewriter().on("head", {
    element(el) {
      el.append(snippet, { html: true });
    },
  });
  return rewriter.transform(response);
}
