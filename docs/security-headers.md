# Cabeçalhos HTTP de segurança (produção)

O `vite.config.ts` não define CSP nem outros headers: configure-os no **edge** (Cloudflare Workers dashboard, `wrangler.toml` `rules`, ou Transform Rules).

## Objetivos

- **Content-Security-Policy (CSP):** limitar origens de script/style/font/img para reduzir impacto de XSS futuros.
- **`frame-ancestors 'none'`** ou lista fechada: reduzir clickjacking.
- **`Referrer-Policy`:** por exemplo `strict-origin-when-cross-origin`.
- **`Permissions-Policy`:** desactivar APIs não usadas (geolocation, microphone, etc.) se aplicável.

## Exemplo de CSP (ponto de partida — ajustar ao bundle real)

Valide sempre em staging: analytics, fonts Google/Adobe, websockets Supabase Realtime, `blob:` para PDF/export e qualquer `worker-src` necessário ao Cloudflare podem exigir entradas extra.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

## Notas

- CSP restritiva pode **partir** `@react-pdf`, `html-to-image`, ou iframes de terceiros até alargar `connect-src` / `img-src`.
- Duplicar políticas em Cloudflare **e** em meta tags tende a confundir — prefira um único lugar no edge.

Ver também [security-env.md](security-env.md).
