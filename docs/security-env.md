# Variáveis de ambiente e segredos

## Cliente (`VITE_*`)

Apenas valores **seguros para expor no bundle** devem usar o prefixo `VITE_`:

- URL pública do projeto Supabase e chave **anon / publishable**
- Opcional: `VITE_APP_INSTAGRAM_HANDLE`, `VITE_APP_SHARE_URL`

## Servidor / Worker

- Chaves **OpenAI**, **Anthropic**, **Resend**, **SUPABASE_SERVICE_ROLE_KEY**, segredos de cron: **sem** prefixo `VITE_`; só disponíveis em server functions / Edge.
- **`APP_PUBLIC_URL`**: URL absoluta do site nos emails de cron (Momento / digest); não usar `VITE_`.

## Storage — avatares (bucket público)

O bucket `avatars` está configurado como **público**: qualquer pessoa com o URL pode ver a imagem (path típico `{userId}/avatar.jpg`). Isto simplifica o `<img>` de perfil mas não é “privado”. Para maior privacidade no futuro: bucket privado + URLs **assinadas** com TTL curto na app.

## Middleware Supabase gerado

[`src/integrations/supabase/auth-middleware.ts`](../src/integrations/supabase/auth-middleware.ts) pode ser marcado como gerado pelo tooling. Em upgrades ou regenerações, **rever o diff**: validação Bearer + `getClaims` não deve ser enfraquecida inadvertidamente.

## Cabeçalhos HTTP

Ver [security-headers.md](security-headers.md) para CSP e headers recomendados no edge.

## Auditoria rápida

- Comparar [`.env.example`](../.env.example) com variáveis lidas em [`src/lib/ai/`](../src/lib/ai/) e server functions: nenhuma chave secreta deve aparecer em `import.meta.env.VITE_*`.
