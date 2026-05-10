# Operações Supabase

## Migrações

1. Desenvolver SQL em `supabase/migrations/` com timestamp e nome descritivo.
2. Testar localmente: `supabase db reset` ou `supabase migration up` conforme o vosso fluxo.
3. Aplicar ao projeto ligado: `npm run supabase:push` (ou `supabase db push`).

## Tipos TypeScript

Depois de aplicar migrações que alterem o schema público:

```bash
npm run supabase:types
```

Revisar o diff em [`src/integrations/supabase/types.ts`](../src/integrations/supabase/types.ts) e commitar.

## RLS — `profiles`

Na migração inicial, `profiles` tem:

- `SELECT`, `UPDATE`, `INSERT` com `auth.uid() = id`.

Colunas novas (ex.: `moment_streak`, `moment_last_visit_ymd`, `moment_daily_email`) **não exigem políticas novas**: ficam cobertas pelo mesmo `UPDATE`/`SELECT` por linha do utilizador. Evitar `SELECT *` exposto em APIs públicas fora do cliente autenticado.
