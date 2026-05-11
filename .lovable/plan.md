## Objetivo

Tornar `completeChat` resiliente: se o provedor primário falhar (erro de rede, 4xx/5xx, quota, timeout), tenta automaticamente o outro provedor antes de propagar o erro.

## Alterações

**Ficheiro único:** `src/lib/ai/llm-provider.ts`

1. Refatorar `completeChat` para:
   - Determinar provedor primário via `resolveAiProvider()` (mantém comportamento atual: respeita `AI_PROVIDER` ou primeira chave disponível).
   - Determinar provedor de fallback: o "outro" provedor, **apenas se a respectiva API key estiver definida**.
   - Tentar primário; em caso de erro lançado por `completeAnthropic`/`completeOpenAI`, registar `console.warn` estruturado (`{ aiFallback: true, from, to, reason }`) e tentar fallback.
   - Se fallback também falhar (ou não existir), lançar erro combinado mencionando ambos provedores.

2. Não alterar:
   - Assinaturas públicas (`completeChat`, `resolveAiProvider`, tipos).
   - Lógica interna de `completeAnthropic` / `completeOpenAI` (timeout, sanitização, parsing).
   - Comportamento quando só existe uma chave configurada (sem fallback possível → erro direto, como hoje).

3. Sem alterações em:
   - Server functions que consomem `completeChat` (continuam a apanhar `Error` no `try/catch` existente em `ai-interpretation.functions.ts`).
   - Schema de cache, quotas ou UI.

## Detalhes técnicos

```ts
export async function completeChat(system, user, opts?) {
  const primary = resolveAiProvider();
  if (!primary) throw new Error("LLM não configurado: defina ANTHROPIC_API_KEY ou OPENAI_API_KEY.");

  const fallback: AiProviderId | null =
    primary === "anthropic" && process.env.OPENAI_API_KEY ? "openai"
    : primary === "openai" && process.env.ANTHROPIC_API_KEY ? "anthropic"
    : null;

  const run = (p: AiProviderId) =>
    p === "anthropic" ? completeAnthropic(system, user, opts) : completeOpenAI(system, user, opts);

  try {
    return await run(primary);
  } catch (primaryErr) {
    if (!fallback) throw primaryErr;
    console.warn(JSON.stringify({
      aiFallback: true, from: primary, to: fallback,
      reason: (primaryErr as Error)?.message?.slice(0, 200),
    }));
    try {
      return await run(fallback);
    } catch (fallbackErr) {
      throw new Error(
        `Ambos provedores falharam — ${primary}: ${(primaryErr as Error).message} | ${fallback}: ${(fallbackErr as Error).message}`,
      );
    }
  }
}
```

## Notas

- O fallback aplica-se a **qualquer** falha do primário (incluindo o "credit balance too low" da Anthropic que motivou o pedido).
- `AI_PROVIDER` continua a determinar a preferência inicial; o fallback nunca é usado se só houver uma chave.
- Logging via `console.warn` estruturado mantém o padrão de `timedServerFn` (sem PII).