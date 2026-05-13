/**
 * API mínima do Cloudflare Workers usada em `meta-pixel-html.ts`.
 * @see https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/
 */
declare class HTMLRewriter {
  on(
    selector: string,
    handlers: {
      element(element: { append(content: string, options?: { html?: boolean }): void }): void;
    },
  ): HTMLRewriter;
  transform(response: Response): Response;
}
