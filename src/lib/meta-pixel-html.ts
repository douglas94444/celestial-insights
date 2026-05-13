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
 * Injeta `<meta name="meta-pixel-id" content="...">` no `<head>` para o bundle do cliente
 * poder carregar o Pixel sem `VITE_*` na build (basta `META_PIXEL_ID` / `VITE_META_PIXEL_ID` no Worker).
 */
export function injectMetaPixelIdMeta(response: Response, env: unknown): Response {
  const pixelId = readMetaPixelIdFromWorkerEnv(env);
  if (!pixelId) return response;
  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) return response;
  if (typeof HTMLRewriter === "undefined") return response;

  const rewriter = new HTMLRewriter().on("head", {
    element(el) {
      el.append(`<meta name="${META_PIXEL_ID_META_NAME}" content="${escapeHtmlAttr(pixelId)}">`, {
        html: true,
      });
    },
  });
  return rewriter.transform(response);
}
