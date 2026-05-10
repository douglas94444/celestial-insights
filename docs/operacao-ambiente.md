# Operação por ambiente (staging / produção)

Checklist para colocar o AstroMap funcional fora da máquina local.

## Variáveis de ambiente

Ver [`.env.example`](../.env.example). No cliente só podem existir segredos **anon** com prefixo `VITE_`. Chaves `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_*`, `TRANSIT_DIGEST_CRON_SECRET` e **todas as variáveis `AI_*` / chaves de LLM** ficam **só no servidor**.

### Interpretações com IA (`interpretation_ai_cache`)

1. Aplicar a migração que cria `interpretation_ai_cache` e o enum `interpretation_ai_kind` (`npm run supabase:push`).
2. Configurar pelo menos uma chave: `ANTHROPIC_API_KEY` **ou** `OPENAI_API_KEY`. Opcional: `AI_PROVIDER=anthropic|openai` quando ambas existem.
3. Modelos opcionais: `AI_ANTHROPIC_MODEL` (ex.: `claude-sonnet-4-20250514`), `AI_OPENAI_MODEL` (ex.: `gpt-4o-mini`). Timeouts/tamanho: `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_RESPONSE_CHARS`.
4. **Premium / quotas**: `AI_INTERPRETATION_REQUIRE_PREMIUM=true` restringe novas gerações (miss de cache) a `profiles.subscription_tier === PREMIUM`. Com `false`, utilizadores FREE têm `AI_INTERPRETATION_FREE_TRIES_PER_MONTH` (predefinição 3) contagens de linhas **novas** na cache no mês civil UTC, mais limite `AI_INTERPRETATION_MAX_PER_24H_FREE` (predefinição 8). PREMIUM usa sobretudo `AI_INTERPRETATION_MAX_PER_24H_PREMIUM` (predefinição 40). Cache hits não consomem quota de LLM.

### Pré-visualização astrológica (`calculateChartFn` / `chart_preview_calc_events`)

1. Aplicar migração que cria `chart_preview_calc_events` (`npm run supabase:push`).
2. Opcional: `CALCULATE_CHART_MAX_PER_USER_PER_HOUR` (inteiro positivo; predefinição **90** contagens por utilizador por hora deslizante). Cada chamada bem-sucedida regista uma linha para auditoria de quota.

### Erros nas server functions

Respostas JSON com `{ "code", "message" }`; falhas de validação Zod nas edges usam HTTP **400** e `code: "VALIDATION"`. O digest cron valida `cronSecret` com comparação em tempo constante.

**Segredo do cron:** use valor aleatório longo (≥32 bytes em base64/hex), guarde só em secrets do Worker ou Supabase; **rote** se suspeitar de vazamento. Opcional: **`TRANSIT_DIGEST_CRON_ALLOWED_IPS`** — lista CSV de IPs (ex.: egress fixo do seu scheduler). No Cloudflare confie em **`CF-Connecting-IP`**; atrás de outros proxies configure headers com cuidado (`X-Forwarded-For` pode ser forjado sem rede de confiança).

**Rate limiting:** recomenda-se regra WAF / Rate Limiting por caminho no cron para reduzir brute-force contra o segredo (em complemento à comparação em tempo constante).

Matriz auth por função: [docs/server-fn-auth-matrix.md](server-fn-auth-matrix.md).

## Supabase

1. Aplicar migrações: `npm run supabase:push` (ou pipeline CI equivalente) no projeto ligado.
2. **RLS**: políticas em `profiles`, `charts`, etc. devem permitir `SELECT`/`UPDATE` próprios e bloquear cruzamento entre utilizadores.
3. **Storage**: bucket `avatars` (público ou com política de leitura conforme o desenho atual).
4. **Auth → URL configuration**: redirect URLs para o domínio real (`https://.../dashboard`, `http://localhost:5173/...` em dev).
5. **Google OAuth**: provider ativo e mesmo redirect permitido no Google Cloud Console.

## CI local

- `npm run lint` — ESLint + Prettier via plugin.
- `npx tsc --noEmit`
- `npm run test` — Vitest (funções puras).
- `npm run build`
- `npx playwright test` — smoke público (sobe `npm run dev:e2e` na porta **5173**); com `SKIP_AUTH_E2E=1` no GitHub Actions os testes opcionais logados são ignorados.

No GitHub Actions, configure secrets opcionais `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` se não quiser usar os placeholders do `playwright.config.ts`.

## Digest automático de trânsitos (`processTransitDigestCronFn`)

Os utilizadores ativam preferências em Configurações (`transit_digest_*`) com migração aplicada em `profiles`.

- **Lembrete Momento (`moment_daily_email`)**: segundo envio opcional no **mesmo** horário e dias (`transit_digest_hour`, `transit_digest_weekdays`), apenas para quem tem também «Notificações por email». Defina **`APP_PUBLIC_URL`** no servidor (URL absoluta do site) para o link «Abrir o seu Momento» funcionar nos emails.

**Escolha um único destino de cron** para não enviar o mesmo digest duas vezes (Edge Function **ou** Worker/Lovable — não ambos com o mesmo segredo/horário). O mesmo cron pode enviar digest **e** lembrete Momento quando configurados (dois emails distintos se ambos activos).

### Opção A — Supabase Edge Function (recomendado no projeto ligado)

Foi adicionada a função **`transit-digest-cron`** (`supabase/functions/transit-digest-cron/`). Deploy:

```bash
npx supabase functions deploy transit-digest-cron --no-verify-jwt
```

**Secrets obrigatórios da função** (Dashboard → Edge Functions → Secrets, ou CLI):

```bash
npx supabase secrets set TRANSIT_DIGEST_CRON_SECRET="..." RESEND_API_KEY="..."
```

Opcional: `TRANSIT_DIGEST_CRON_ALLOWED_IPS` (CSV, mesma semântica que no Worker). Opcional: `RESEND_FROM_EMAIL` (predefinição no código: `AstroMap <onboarding@resend.dev>`). `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são injectados pelo Supabase no runtime das Edge Functions.

**URL do cron:**

`https://<project-ref>.supabase.co/functions/v1/transit-digest-cron`

(Substitua `<project-ref>` pelo ID do projeto — o mesmo do URL em `SUPABASE_URL`.)

**Corpo JSON:**

```json
{ "cronSecret": "<valor de TRANSIT_DIGEST_CRON_SECRET>" }
```

Agende um **HTTP POST** horário (GitHub Actions, cron.cloud, `pg_cron` + `pg_net`, etc.) para esta URL.

### Opção B — TanStack Start / Worker / Lovable (`processTransitDigestCronFn`)

1. Definir no servidor: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TRANSIT_DIGEST_CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
2. Agendar **HTTP POST** para o endpoint da server function que expõe `processTransitDigestCronFn`.

**URL:** depende do deploy TanStack Start / Cloudflare / Lovable. Obtenha-a inspecionando as chamadas de rede no browser a partir de uma server function conhecida (mesmo padrão de caminho) ou pela documentação do hosting no build `dist/server`.

3. **Opcional (Cloudflare):** se o POST do cron ficar exposto na Internet pública, considere uma regra WAF ou Rate Limiting por caminho/IP para reduzir tentativas de brute-force do segredo (o servidor já usa comparação em tempo constante).

## PDF de trânsitos

A exportação usa `@react-pdf/renderer` **apenas no browser** (import dinâmico na página Trânsitos). O servidor **não** deve gerar PDF no Worker. O plugin Cloudflare Vite **proíbe** `resolve.external` no ambiente SSR, pelo que não se configuram externos `@react-pdf/*`; durante `vite build` podem aparecer avisos `fontkit` — são esperados e não impedem o PDF no cliente.

## Auth SSR e cookies

O cliente browser usa `createBrowserClient` (`@supabase/ssr`) para persistir sessão em **cookies** compatíveis com SSR. O layout `_authenticated` valida no servidor via [`hasSupabaseSessionCookie`](../src/lib/supabase-auth-server.ts), que usa **`getUser()`** (validação alinhada à recomendação Supabase para SSR). Utilizadores que ainda tinham só sessão antiga em `localStorage` podem precisar de **voltar a iniciar sessão** uma vez.
