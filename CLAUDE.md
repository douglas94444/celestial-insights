# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite + TanStack Start SSR)
npm run build        # Production build (Cloudflare Worker output)
npm run lint         # ESLint
npm run test         # Vitest (unit tests, run once)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright end-to-end (requires dev server on :5173)
npm run format       # Prettier write
npm run format:check # Prettier check

# Run a single test file
npx vitest run src/lib/astrology/transits.test.ts

# Supabase (project ref: fxcoxnqqjgvqfukasfjb)
# A equipa Supabase não suporta `npm install -g supabase`; usar sempre `npx supabase` (os scripts npm abaixo já fazem isso).
npm run supabase:link              # Link CLI to remote project
npm run supabase:push              # Push migrations to remote (use -- --include-all if prompted)
npm run supabase:types             # Regenerate src/integrations/supabase/types.ts; then `npm run format` if needed
npm run supabase:functions:deploy # Deploy transit-digest-cron edge function
```

Notas sobre `npm audit`, GHSA em `@tanstack/history` e alinhamento de versões: `docs/npm-security-audit-notes.md`.

## Architecture

### Framework & Runtime

This is a **TanStack Start** (SSR) app deployed to **Cloudflare Workers**. Vite handles the build via `@cloudflare/vite-plugin`. `vite.config.ts` intentionally has almost nothing in it — `@lovable.dev/vite-tanstack-config` provides TanStack Start, React, Tailwind, path aliases, and Cloudflare bundling. Do not add those plugins manually.

The SSR entry point is `src/server.ts`. The client entry is `src/start.ts`.

### Routing

TanStack Router with file-based routes. **`src/routeTree.gen.ts` is auto-generated — never edit it manually.** Routes live in `src/routes/`.

- `__root.tsx` — providers: `QueryClientProvider`, `ThemeProvider`, `AuthProvider`, `Toaster`
- `_authenticated.tsx` — layout guard: checks Supabase session via cookie (SSR) or `getSession()` (client), redirects to `/auth` if missing. Renders `AppSidebar` + `AppAuthenticatedHeader`.
- `_authenticated/*.tsx` — rotas protegidas (ver tabela abaixo).

### Páginas e funcionalidades (mapa do produto)

Rotas em `src/routes/`. Textos de UI em **PT-BR**. Nome comercial na app: **AstroMap**.

| Rota               | Ficheiro                             | O que faz                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                | `index.tsx`                          | Landing: marketing, CTAs para registo, lista de funcionalidades.                                                                                                                                                                                                                                                     |
| `/auth`            | `auth.tsx`                           | Separadores Entrar / Criar conta (email+senha), OAuth Google; redirect após sessão (`emailRedirectTo` pode incluir `/onboarding`).                                                                                                                                                                                   |
| `/reset-password`  | `reset-password.tsx`                 | Fluxo de recuperação de palavra-passe (Supabase).                                                                                                                                                                                                                                                                    |
| `/dashboard`       | `_authenticated/dashboard.tsx`       | Resumo: mapa principal (`NatalChartWheel`), horóscopo do dia, trânsitos vs natal, link para Momento / mapa; cartão com link para `/planos`. Limite FREE para número de mapas + modal upgrade.                                                                                                                        |
| `/onboarding`      | `_authenticated/onboarding.tsx`      | Primeiro mapa via `BirthChartForm`; redirect para detalhe do mapa ou dashboard se já existir mapa.                                                                                                                                                                                                                   |
| `/mapas`           | `_authenticated/mapas.tsx`           | Lista de mapas do utilizador; badge «Primário»; menu tornar primário (update em cascata); links para novo mapa e detalhe.                                                                                                                                                                                            |
| `/mapas/novo`      | `_authenticated/mapas.novo.tsx`      | Criar mapa adicional (mesmo fluxo de formulário + upgrade FREE).                                                                                                                                                                                                                                                     |
| `/mapas/$id`       | `_authenticated/mapas.$id.tsx`       | Detalhe do mapa: roda natal, separadores Essência (Sol/Lua/Asc + **Configurações especiais**: Grand Trine, T-Square, Grand Cross, Yod), Planetas (interpretações + IA por planeta), Casas (planeta-em-casa), Aspectos (filtro + lista virtualizada). Ações: recalcular geometria, excluir mapa; IA resumo executivo. |
| `/transitos`       | `_authenticated/transitos.tsx`       | Separadores **Período** (janela ±30/60/90 dias, calendário, lista do dia, filtros de aspectos, IA do dia, PDF, email digest) e **Ano** (previsão anual: `generateAnnualForecastFn`).                                                                                                                                 |
| `/compatibilidade` | `_authenticated/compatibilidade.tsx` | Dois mapas: sinastria (`calculateAndSaveSynastryFn`), biwheel, scores por área, destaques, lista «Todos os aspectos cruzados» (virtualizada), IA sinastria / sinastria profunda; separador **Mapa composto** (`calculateCompositeFn`, roda composta, IA `composite`). Histórico paginado de sinastrias guardadas.    |
| `/momento`         | `_authenticated/momento.tsx`         | Dia civil (SP): cartão partilhável, streak, histórico local, IA «Momento», export PNG do cartão, **MoodWidget** (humor + gráfico vs intensidade).                                                                                                                                                                    |
| `/configuracoes`   | `_authenticated/configuracoes.tsx`   | Perfil (nome, género, avatar), sistema de casas, preferências; gestão de conta / eliminar conta (server fn).                                                                                                                                                                                                         |
| `/planos`          | `_authenticated/planos.tsx`          | Comparação Grátis vs Premium (copy própria), preços via `subscription-pricing`; CTA para `/assinatura` (checkout).                                                                                                                                                                                                   |
| `/assinatura`      | `_authenticated/assinatura.tsx`      | Checkout: SyncPay (Pix), Mercado Pago; `?mp=` para retorno Checkout Pro.                                                                                                                                                                                                                                             |
| `/premium`         | `_authenticated/premium.tsx`         | Redirect permanente para `/assinatura` (compat.: `?mp=` do Mercado Pago antigo).                                                                                                                                                                                                                                     |
| `/admin`           | `_authenticated/admin.tsx`           | Painel operacional só para utilizadores com papel `admin` em `user_roles`: métricas agregadas (RPC `admin_overview_metrics`), atalhos Supabase/docs; não expõe linhas com dados pessoais.                                                                                                                            |

**Server functions** (`src/lib/*.functions.ts`): `astrology.functions.ts` — `calculateChartFn` (pré-visualização de mapa, rate limit `chart_preview_calc_events`); `charts.functions.ts` — CRUD mapas, recalcular geometria; `transits.functions.ts` — trânsitos por intervalo; `annual-forecast.functions.ts`; `synastry.functions.ts`; `composite.functions.ts`; `ai-interpretation.functions.ts` (IAs em cache); `mood.functions.ts`; `email.functions.ts` (digest trânsitos); `profile.functions.ts`; `admin.functions.ts` — `adminOverviewFn` (métricas globais após `assertAdminUser`). Cliente: `withSupabaseAuth(session)`. Erros: `server-fn-http.ts`; quotas IA: `assertAiGenerationAllowed`.

**Componentes notáveis**: `NatalChartWheel`, `SynastryBiWheel`, `CompositeChartWheel`, `ShareableMomentCard`, `BirthChartForm`, `MoodWidget`, listas virtualizadas (`NatalAspectsVirtualList`, `SynastryAspectsVirtualList`), PDF `TransitReportPdf`.

### Authentication

`src/hooks/use-auth.tsx` exposes `AuthProvider` / `useAuth()` (React context over Supabase `onAuthStateChange`).

For **server functions**, auth is enforced by `requireSupabaseAuth` middleware (`src/integrations/supabase/auth-middleware.ts`). It extracts the Bearer JWT from the `Authorization` header, verifies it with `supabase.auth.getClaims()`, and injects `{ supabase, userId, claims }` into the handler context.

On the client, pass `...withSupabaseAuth(session)` when calling a server function to attach the JWT.

### Server Functions

All server-only logic lives in `src/lib/*.functions.ts` (`createServerFn` from `@tanstack/react-start`). Pattern:

```ts
export const myFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = mySchema.safeParse(input);
    if (!parsed.success) throwValidationResponse(parsed.error);
    return parsed.data;
  })
  .handler(timedServerFn("myFn", async ({ data, context }) => { ... }));
```

- Errors are thrown as `Response` objects via `jsonError(status, code, message)` (`src/lib/server-fn-http.ts`)
- `timedServerFn` wraps handlers with structured JSON logging (duration, ok/error, error code)
- Zod validation failures produce HTTP 400 with code `"VALIDATION"`

### Astrology Engine

Pure-TS calculation in `src/lib/astrology/`. Core files:

- `calculate.ts` — `calculateChart(input)` → `ChartData`; `computePlanetPositionsUtc(date)` for transits without houses; `utcBirthInstant(input)` converts local birth time + timezone offset to UTC
- `zodiac.ts` — `PLANETS` array (13 bodies incl. Chiron, North/South Node), `signFromLongitude`, `formatDegree`
- `houses.ts` — Placidus, Equal, and Whole Sign house systems
- `transits.ts` — `analyzeTransitDay`, `analyzeTransitRange`; filtros auxiliares para UI de trânsitos
- `synastry.ts` — aspectos cruzados e scores por área
- `annual-forecast.ts` — `buildAnnualForecast(year, …)`: intensidade mensal, ingressos planetas lentos, retrógrados Mercúrio/Vênus/Marte
- `composite.ts` — mapa composto por midpoint de longitudes + casas derivadas → `ChartData`
- `chart-patterns.ts` — `deriveChartPatterns`: Stellium, Grand Trine, T-Square, Grand Cross, Yod (quincúncio por longitude local)

`astronomy-engine` provides geocentric ephemeris. Chiron and lunar nodes are computed with manual formulas in `extra-bodies.ts`.

The Supabase edge function (`supabase/functions/transit-digest-cron`) duplicates some of these files in `supabase/functions/_shared/` for Deno compatibility.

### AI Interpretations

`src/lib/ai/llm-provider.ts` provides `completeChat(system, user, opts?)` — uses Anthropic or OpenAI depending on which API key is set. Provider selection: `AI_PROVIDER` env var, or first available key.

All AI server functions (`src/lib/ai-interpretation.functions.ts`) follow the same cache-first pattern:

1. Build a SHA-256 fingerprint from chart data + prompt version
2. Look up `interpretation_ai_cache` table
3. If hit: return cached content
4. Check quota via `assertAiGenerationAllowed` (24h rolling + monthly for FREE tier)
5. Call LLM, insert into cache (handle `23505` duplicate race)

Supported kinds (`interpretation_ai_kind`): `natal_summary`, `natal_planet`, `synastry`, `synastry_deep`, `transit_day`, `morning_deep`, `natal_essence`, `composite`.

### Database (Supabase)

Migrations in `supabase/migrations/`. Key tables:

- `profiles` — extends `auth.users`; holds `subscription_tier` (FREE/PREMIUM), `house_system`, personalization prefs, streak data
- `charts` — natal chart rows; `chart_geometry` JSON column stores `ChartData`; `house_system`, `timezone_offset_minutes`
- `synastries` — sinastrias guardadas; `compatibility_data` JSON
- `mood_logs` — diário de humor (`user_id`, `ymd`, `mood_score`, `emotions`, `note`; índice único por utilizador+dia)
- `interpretation_ai_cache` — cache de IAs por `(user_id, kind, fingerprint)`
- `chart_preview_calc_events` — rate-limiting table for `calculateChartFn`
- `user_engagement_events` — analytics; fire-and-forget via `insertEngagementEventDeduped`
- `user_roles` — `(user_id, role)` com enum `app_role` (`admin` \| `user`); o cliente pode ler as próprias linhas (RLS); função SQL `has_role` existe mas não está exposta ao cliente para chamadas diretas

Types auto-generated at `src/integrations/supabase/types.ts` — run `npm run supabase:types` after schema changes.

### Painel `/admin` (operacional)

- **Quem acede:** apenas utilizadores com uma linha `user_roles` com `role = 'admin'`. A UI verifica na própria tabela (RLS); as server functions usam `assertAdminUser` (`src/integrations/supabase/admin-guard.ts`) e a RPC `admin_overview_metrics()` confere `has_role(auth.uid(), 'admin')`.
- **Primeiro administrador:** não automatizar por produto; promover manualmente no SQL Editor do Supabase, por exemplo:  
  `INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid-do-auth.users>', 'admin');`
- **Limitações do MVP:** contagens globais e links úteis — não é listagem de utilizadores nem edição de dados alheios; alargamentos futuros devem ser uma server function + política/RPC explícita cada um.
- Migração: `supabase/migrations/*_admin_overview_metrics.sql` — após `npm run supabase:push`, alinhar tipos com `npm run supabase:types` se preferir regenerar `types.ts` em vez de editar à mão.

### UI

shadcn/ui components in `src/components/ui/` (Radix UI primitives). TailwindCSS v4. Fonts: Cormorant Garamond (`font-display` class) + Inter (body).

Toast notifications via `sonner`. All user-facing strings are in Portuguese (PT-BR).

**Hooks úteis**: `use-auth.tsx`, `use-charts-list.ts` (lista de mapas React Query), `use-user-is-admin.ts` (papel `admin` para gate da sidebar / `/admin`), `use-daily-moment.ts` (Momento + Dashboard: trânsitos do dia/semana, geometria do mapa primário, `todayStr` America/Sao_Paulo com atualização ao longo do dia).

### Environment Variables

| Variable                                              | Where used                                             |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side (build-time)                               |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`           | Server-side (SSR/Worker)                               |
| `SUPABASE_SERVICE_ROLE_KEY`                           | `deleteAccountFn` only                                 |
| `AI_PROVIDER`                                         | `"anthropic"` or `"openai"` (auto-detect if omitted)   |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`                | LLM calls                                              |
| `AI_ANTHROPIC_MODEL`                                  | Default: `claude-sonnet-4-20250514`                    |
| `AI_OPENAI_MODEL`                                     | Default: `gpt-4o-mini`                                 |
| `AI_INTERPRETATION_REQUIRE_PREMIUM`                   | `"true"` to gate AI behind PREMIUM                     |
| `AI_INTERPRETATION_MAX_PER_24H_PREMIUM` / `_FREE`     | Rolling 24h quotas                                     |
| `AI_INTERPRETATION_FREE_TRIES_PER_MONTH`              | Monthly limit for FREE users                           |
| `CALCULATE_CHART_MAX_PER_USER_PER_HOUR`               | Default: 90                                            |
| `VITE_APP_INSTAGRAM_HANDLE` / `VITE_APP_SHARE_URL`    | Branding (Instagram card)                              |
| `VITE_APP_GITHUB_URL`                                 | Opcional; link «Repositório GitHub» no painel `/admin` |
| `TRANSIT_DIGEST_CRON_SECRET`                          | Edge function auth                                     |
