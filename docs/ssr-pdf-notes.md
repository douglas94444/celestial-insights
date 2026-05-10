# SSR e PDF de trânsitos (`@react-pdf`)

## Comportamento actual

- O PDF é gerado **apenas no cliente**: em [`transitos.tsx`](../src/routes/_authenticated/transitos.tsx) usamos `import()` dinâmico de `@react-pdf/renderer` e do componente [`TransitReportPdf.tsx`](../src/components/TransitReportPdf.tsx) dentro do handler de exportação.
- Mesmo assim, o bundler SSR pode **seguir dependências** de `@react-pdf` / `fontkit` ao construir o grafo, o que gera avisos do tipo `openSync is not exported by fontkit/dist/browser-module.mjs` durante `vite build`. O build **completa** com sucesso no estado actual.

## Porque não forçámos `ssr.external` agora

O alvo de deploy (Worker Cloudflare) não tem `require` de Node para pacotes externos como no servidor Node clássico; externalizar `@react-pdf` poderia quebrar resolução em tempo de execução sem um alias/teste extensivo no preset [@lovable.dev/vite-tanstack-config](../vite.config.ts).

## Se os avisos passarem a erros no futuro

1. Confirmar que não há `import` estático de `@react-pdf/renderer` fora de código só cliente.
2. Avaliar `vite.resolve.alias` específico para `fontkit` **após** validação com `npm run build` em ambiente idêntico ao CI.
3. Como último recurso, mover o wizard de PDF para um boundary estritamente client-only (por exemplo rota ou lazy island isolada).
