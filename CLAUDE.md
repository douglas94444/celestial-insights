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

## Architecture

### Framework & Runtime

This is a **TanStack Start** (SSR) app deployed to **Cloudflare Workers**. Vite handles the build via `@cloudflare/vite-plugin`. `vite.config.ts` intentionally has almost nothing in it — `@lovable.dev/vite-tanstack-config` provides TanStack Start, React, Tailwind, path aliases, and Cloudflare bundling. Do not add those plugins manually.

The SSR entry point is `src/server.ts`. The client entry is `src/start.ts`.

### Routing

TanStack Router with file-based routes. **`src/routeTree.gen.ts` is auto-generated — never edit it manually.** Routes live in `src/routes/`.

- `__root.tsx` — providers: `QueryClientProvider`, `ThemeProvider`, `AuthProvider`, `Toaster`
- `_authenticated.tsx` — layout guard: checks Supabase session via cookie (SSR) or `getSession()` (client), redirects to `/auth` if missing. Renders `AppSidebar` + `AppAuthenticatedHeader`.
- `_authenticated/*.tsx` — protected pages (dashboard, mapas, transitos, compatibilidade, momento, configuracoes, premium, onboarding)

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
- `transits.ts` — `analyzeTransitDay(date, natalPlanets, natalHouses, ascendant, houseSystem)`
- `synastry.ts` — cross-aspect analysis and area scores

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

Supported kinds: `natal_summary`, `natal_planet`, `synastry`, `synastry_deep`, `transit_day`, `morning_deep`, `natal_essence`.

### Database (Supabase)

Migrations in `supabase/migrations/`. Key tables:

- `profiles` — extends `auth.users`; holds `subscription_tier` (FREE/PREMIUM), `house_system`, personalization prefs, streak data
- `charts` — natal chart rows; `chart_geometry` JSON column stores `ChartData`; `house_system`, `timezone_offset_minutes`
- `synastries` — synastry pairs; `compatibility_data` JSON
- `interpretation_ai_cache` — cached AI outputs keyed by `(user_id, kind, fingerprint)`
- `chart_preview_calc_events` — rate-limiting table for `calculateChartFn`
- `user_engagement_events` — analytics; fire-and-forget via `insertEngagementEventDeduped`

Types auto-generated at `src/integrations/supabase/types.ts` — run `npm run supabase:types` after schema changes.

### UI

shadcn/ui components in `src/components/ui/` (Radix UI primitives). TailwindCSS v4. Fonts: Cormorant Garamond (`font-display` class) + Inter (body).

Toast notifications via `sonner`. All user-facing strings are in Portuguese (PT-BR).

### Environment Variables

| Variable                                              | Where used                                           |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side (build-time)                             |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`           | Server-side (SSR/Worker)                             |
| `SUPABASE_SERVICE_ROLE_KEY`                           | `deleteAccountFn` only                               |
| `AI_PROVIDER`                                         | `"anthropic"` or `"openai"` (auto-detect if omitted) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`                | LLM calls                                            |
| `AI_ANTHROPIC_MODEL`                                  | Default: `claude-sonnet-4-20250514`                  |
| `AI_OPENAI_MODEL`                                     | Default: `gpt-4o-mini`                               |
| `AI_INTERPRETATION_REQUIRE_PREMIUM`                   | `"true"` to gate AI behind PREMIUM                   |
| `AI_INTERPRETATION_MAX_PER_24H_PREMIUM` / `_FREE`     | Rolling 24h quotas                                   |
| `AI_INTERPRETATION_FREE_TRIES_PER_MONTH`              | Monthly limit for FREE users                         |
| `CALCULATE_CHART_MAX_PER_USER_PER_HOUR`               | Default: 90                                          |
| `VITE_APP_INSTAGRAM_HANDLE` / `VITE_APP_SHARE_URL`    | Branding (Instagram card)                            |
| `TRANSIT_DIGEST_CRON_SECRET`                          | Edge function auth                                   |
