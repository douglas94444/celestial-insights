# Server functions: auth e posse de dados

Referência rápida para auditorias (middleware JWT vs segredo de serviço vs recurso).

| Função                                   | Auth                        | Verificação de posse / notas                                                      |
| ---------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `createChartFn`                          | `requireSupabaseAuth`       | `user_id` no insert; limite FREE em código                                        |
| `recalculateChartFn`                     | JWT                         | `charts` com `.eq("user_id", userId)`                                             |
| `calculateChartFn`                       | JWT                         | Sem recurso alvo; quota por utilizador/hora via `chart_preview_calc_events` + env |
| `calculateAndSaveSynastryFn`             | JWT                         | Dois mapas `.eq("user_id", userId)`                                               |
| `calculateTransitsFn`                    | JWT                         | Mapa `.eq("user_id", userId)`                                                     |
| `sendTransitDigestEmailFn`               | JWT                         | Mapa + email da conta                                                             |
| `processTransitDigestCronFn`             | `cronSecret` + service role | Sem JWT; só secret + admin client                                                 |
| `generateNatal*` / synastry / transit IA | JWT                         | Mapa/sinastria do utilizador                                                      |
| `deleteAccountFn`                        | JWT                         | `deleteUser(context.userId)` via service role                                     |

Erros JSON estáveis: [`src/lib/server-fn-http.ts`](../src/lib/server-fn-http.ts) (`code`, `message`).

**Espelho Supabase:** o mesmo fluxo do cron está em [`supabase/functions/transit-digest-cron/`](../supabase/functions/transit-digest-cron/index.ts) (HTTP POST com `cronSecret`, sem JWT). Configure apenas **um** agendador (Edge ou Worker) para evitar emails duplicados.
