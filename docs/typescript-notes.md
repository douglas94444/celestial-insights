# Notas TypeScript

## `src/routeTree.gen.ts` (TanStack Router)

Este ficheiro é **gerado automaticamente** e inclui `// @ts-nocheck` e `as any` nos updates de rotas. **Não editar manualmente** — alterações serão sobrescritas no próximo `routeTree` gerado.

Para tipagem mais estrita no tempo de compilação da árvore de rotas, o caminho correcto é **seguir releases / issues do TanStack Router** (upstream), não desligar o `nocheck` localmente de forma persistente.

Ver também o diagnóstico em `.cursor/plans` ou histórico de PR sobre «Diagnóstico TypeScript».

## Validação em runtime

Onde há dados externos (Supabase `Json`, LLM, `localStorage`), preferir **`unknown` + Zod** em vez de `as unknown as T`. Ver [`src/lib/schemas/chart-payload.ts`](../src/lib/schemas/chart-payload.ts) e comentários em [`src/lib/ai/json-response.ts`](../src/lib/ai/json-response.ts).
