# Operação por ambiente (staging / produção)

Checklist para colocar o AstroMap funcional fora da máquina local.

## Primeiro deploy Cloudflare (conta própria)

Fluxo para produção **na tua conta Cloudflare** (TanStack Start + Worker). O deploy **não** envia o `.env` nem cria secrets automaticamente: o código e os assets saem do `npm run build`; as secrets definem-se no painel do Worker ou com `npx wrangler secret put <NOME>`.

1. **Autenticação Wrangler** — Na raiz do repo: `npx wrangler login` (browser) **ou** `CLOUDFLARE_API_TOKEN` no ambiente (token com permissão de editar Workers; ver [`.env.example`](../.env.example)).
2. **Variáveis no momento do build** — Antes de `npm run deploy:worker`, definir no terminal (ou no CI) pelo menos `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e, se usar cartão na página, `VITE_MERCADOPAGO_PUBLIC_KEY`. O JavaScript do cliente é gerado aqui; secrets coladas **só** no Worker depois do deploy **não** alteram o bundle antigo.
3. **Deploy** — `npm run deploy:worker` (equivale a `npm run build` + `wrangler deploy --config dist/server/wrangler.json`). No dashboard **Workers & Pages** deve aparecer o Worker (nome predefinido no repo: `tanstack-start-app`). URL inicial típico: `*.workers.dev` até haver domínio custom.
4. **Secrets no Worker** — **Settings → Variables and Secrets** do Worker (tipo **Secret** para tokens). Mínimo comum: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SYNCPAY_API_BASE_URL`, `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`, **`SYNCPAY_WEBHOOK_TOKEN`** (igual à Edge Function `syncpay-webhook` no Supabase), `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN` (igual à Edge Function `mercadopago-webhook`), `APP_PUBLIC_URL`, `SUPABASE_SERVICE_ROLE_KEY` (ex. Checkout transparente). Lista completa: [`.env.example`](../.env.example) e secções abaixo.
5. **Domínio e Supabase Auth** — **Custom Domains** no Worker (ou rotas + DNS na zona Cloudflare). `APP_PUBLIC_URL` deve coincidir com o URL público final (ex. `https://teu-dominio.com`). No Supabase: **Authentication → URL configuration** com redirects para esse origin. Se o domínio antes apontava para outro host (ex. Lovable), ajustar ou remover registos `A`/`CNAME` antigos para evitar dois sites no mesmo hostname.
6. **Verificação** — Abrir `/assinatura`: com pelo menos um meio completo no Worker, aparece **«Dados de cobrança»**. Em desenvolvimento ou como administrador, a página pode mostrar diagnóstico de variáveis em falta. Após mudar secrets, voltar a correr `npm run deploy:worker` se o hosting não aplicar alterações automaticamente.

Referência técnica: [`wrangler.jsonc`](../wrangler.jsonc), script `deploy:worker` em [`package.json`](../package.json).

## Variáveis de ambiente

Ver [`.env.example`](../.env.example). No cliente só podem existir segredos **anon** com prefixo `VITE_`. Chaves `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_*`, `TRANSIT_DIGEST_CRON_SECRET`, **`SYNCPAY_*`** (só servidor) e **`MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_WEBHOOK_TOKEN`** (só servidor) e **todas as variáveis `AI_*` / chaves de LLM** ficam **só no servidor**. A **`VITE_MERCADOPAGO_PUBLIC_KEY`** é pública e entra no **build** do frontend (Vite); opcionalmente **`MERCADOPAGO_PUBLIC_KEY`** no Worker se o runtime não expuser `VITE_*`.

### Pagamentos SyncPay (Pix cash-in)

1. Definir no **Worker / Lovable** (server functions), p.ex. **Cloudflare → Workers → Settings → Variables and Secrets** (tipo **Secret** para credenciais): `SYNCPAY_API_BASE_URL` (URL absoluto só até ao host, **sem** sufixo `/api/partner/v1` e sem `/` final), `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET` e **`SYNCPAY_WEBHOOK_TOKEN`**. O `wrangler deploy` **não** envia estas variáveis: criar no painel ou `npx wrangler secret put SYNCPAY_WEBHOOK_TOKEN`.
2. O **`SYNCPAY_WEBHOOK_TOKEN`** é um segredo **teu** (string longa aleatória): o **mesmo** valor no Worker e na secret **`SYNCPAY_WEBHOOK_TOKEN`** da Edge Function `syncpay-webhook` (Supabase Dashboard → Edge Functions → Secrets). Sem o token no Worker, o cash-in não monta `.../syncpay-webhook?token=...` e o Pix fica desligado em `/assinatura`.
3. Deploy da função: `npx supabase functions deploy syncpay-webhook --no-verify-jwt` (ou script npm equivalente). O URL do webhook passado ao cash-in é `{SUPABASE_URL}/functions/v1/syncpay-webhook?token={SYNCPAY_WEBHOOK_TOKEN}` (o servidor monta-o automaticamente quando `SUPABASE_URL` e `SYNCPAY_WEBHOOK_TOKEN` existem). Use **esta** função (`syncpay-webhook`), não outro nome de endpoint; no painel SyncPay, evento de cash-in / recebimento conforme a doc do parceiro.
4. No painel SyncPay, **autorizar IP** de egress (Worker e/ou Supabase Edge, conforme o que chama a API) e configurar webhooks conforme a documentação do parceiro.
5. Utilizadores precisam de **nome**, **e-mail** (Auth), **CPF e telefone** em `profiles` (`billing_cpf`, `billing_phone`) — preenchidos em Configurações ou no fluxo Premium. O webhook de cash-in (incl. padrão OLD da doc SyncPay) pode trazer `data.id` e `data.idtransaction`; a função `syncpay-webhook` reconcilia o pedido se qualquer um coincidir com o `identifier` guardado em `syncpay_orders`.

### Pagamentos Mercado Pago (Checkout Pro — cartão e outros meios no site do MP)

1. No painel Mercado Pago, criar uma aplicação e obter o **Access Token** (produção ou teste). Definir no Worker: `MERCADOPAGO_ACCESS_TOKEN`. Nunca usar prefixo `VITE_`.
2. Gerar um segredo longo para `MERCADOPAGO_WEBHOOK_TOKEN`; o **mesmo** valor na secret **`MERCADOPAGO_WEBHOOK_TOKEN`** da Edge Function `mercadopago-webhook` (Supabase → Edge Functions → Secrets).
3. `SUPABASE_URL` no Worker permite montar `notification_url` apontando para `{SUPABASE_URL}/functions/v1/mercadopago-webhook?token=...`.
4. Deploy: `npm run supabase:functions:deploy:mercadopago-webhook` (ou `npx supabase functions deploy mercadopago-webhook --no-verify-jwt`).
5. No painel MP (Webhooks / notificações URL), configurar a mesma URL pública da Edge Function (produção). Consulte a documentação oficial sobre formato **GET** (IPN) e **POST** (webhooks) e allowlist de IPs se aplicável.
6. `APP_PUBLIC_URL` deve ser a URL pública do site para `back_urls` do checkout (`/assinatura?mp=success|failure|pending`). URLs antigas com `/premium?mp=…` redirecionam para `/assinatura`. Em local, use um túnel (ngrok, etc.) se precisar de voltar do checkout de teste.
7. O checkout no domínio do Mercado Pago pode mostrar **Pix, cartão e outros** meios conforme a conta e a preferência; não é garantido «só cartão».

### Checkout Transparente (cartão nesta página — Card Payment Brick)

1. Requer os mesmos `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN` e `SUPABASE_URL` que o webhook.
2. Definir **`VITE_MERCADOPAGO_PUBLIC_KEY`** (chave pública de produção ou teste, ex. `TEST-...`) no build do cliente/Worker. Opcionalmente duplicar como **`MERCADOPAGO_PUBLIC_KEY`** no servidor se o runtime não expuser `VITE_*`.
3. **`SUPABASE_SERVICE_ROLE_KEY`** no Worker: a server function `createMercadoPagoTransparentPaymentFn` grava `mercadopago_orders` e actualiza `subscription_tier` com o cliente admin (o utilizador não tem permissão de `UPDATE` em `subscription_tier`).
4. O formulário de cartão é renderizado pelo SDK do Mercado Pago; o token segue para `POST /v1/payments` no servidor.

### Página `/assinatura` sem pagamentos (botões Pix desactivados)

Isto é **esperado** quando, no **mesmo runtime das server functions** (Worker / ambiente de deploy), **nenhum** meio está completo:

- **Pix (SyncPay):** faltam `SYNCPAY_API_BASE_URL`, `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`, `SYNCPAY_WEBHOOK_TOKEN` e `SUPABASE_URL` (ver secção SyncPay acima).
- **Mercado Pago:** faltam token de acesso, webhook, `APP_PUBLIC_URL` (Checkout Pro) e/ou chave pública para cartão na página (ver secções MP acima).

Depois de definir ou corrigir variáveis no painel do Worker, **volte a fazer deploy** (`npm run deploy:worker` ou o fluxo do seu hosting). Em desenvolvimento local, use um `.env` na raiz e reinicie `npm run dev`.

Quando pelo menos um canal estiver activo, a página mostra o bloco **«Dados de cobrança»**; para Pix é ainda necessário **CPF (11 dígitos) e telefone (10–11)** para os botões deixarem de estar desactivados.

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

No GitHub Actions, o job de CI define `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no workflow (projecto `fxcoxnqqjgvqfukasfjb`). Em local, o `playwright.config.ts` repete os mesmos fallbacks de `src/integrations/supabase/public-config.ts` quando essas variáveis não estão definidas; podes sobrescrevê-las no ambiente se precisares de outro projecto.

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
