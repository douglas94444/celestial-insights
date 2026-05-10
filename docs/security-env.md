# Variáveis de ambiente e segredos

## Cliente (`VITE_*`)

Apenas valores **seguros para expor no bundle** devem usar o prefixo `VITE_`:

- URL pública do projeto Supabase e chave **anon / publishable**
- Opcional: `VITE_APP_INSTAGRAM_HANDLE`, `VITE_APP_SHARE_URL`

## Servidor / Worker

- Chaves **OpenAI**, **Anthropic**, **Resend**, **SUPABASE_SERVICE_ROLE_KEY**, segredos de cron: **sem** prefixo `VITE_`; só disponíveis em server functions / Edge.
- **`APP_PUBLIC_URL`**: URL absoluta do site nos emails de cron (Momento / digest); não usar `VITE_`.

## Auditoria rápida

- Comparar [`.env.example`](../.env.example) com variáveis lidas em [`src/lib/ai/`](../src/lib/ai/) e server functions: nenhuma chave secreta deve aparecer em `import.meta.env.VITE_*`.
