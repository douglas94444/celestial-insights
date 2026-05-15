## Diagnóstico

O código do `/assinatura` já implementa os três fluxos (Pix SyncPay, MP Checkout Pro «nova página», MP Transparente «cartão na própria app»). A UI esconde Pix e Cartão Transparente porque, em produção (`astrologiia.app` / Worker da Lovable), `getSyncPayAvailabilityFn` devolve `available: false` e `getMercadoPagoAvailabilityFn` devolve `transparent: false`.

A causa não é lógica de UI — são variáveis de ambiente que não estão a ser lidas pelo runtime do Worker:

1. **MP Transparente:** `mercadoPagoPublicKeyForTransparent()` em `src/lib/mercadopago/client.ts` lê primeiro `import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY` (substituído em build) e depois faz fallback para `process.env.VITE_MERCADOPAGO_PUBLIC_KEY` / `process.env.MERCADOPAGO_PUBLIC_KEY` (runtime). O secret existente chama-se `VITE_MERCADOPAGO_PUBLIC_KEY`, mas chaves com prefixo `VITE_` só são injetadas no bundle do cliente em build — não chegam ao Worker como `process.env`. Resultado: `transparent` fica `false`.
2. **SyncPay Pix:** `isSyncPayServerConfigured()` exige `SYNCPAY_API_BASE_URL`, `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`, `SYNCPAY_WEBHOOK_TOKEN` em `process.env` no Worker. Estão registados nos secrets da Lovable Cloud, mas no Worker da Lovable apenas as keys explicitamente expostas ao runtime ficam disponíveis. Sem isso, `available` fica `false`.

## Mudanças propostas

### 1. Código (src/lib/mercadopago/client.ts)
Tornar a leitura da chave pública mais robusta para não depender do prefixo `VITE_` em runtime:

- Acrescentar suporte a um nome canónico `MERCADOPAGO_PUBLIC_KEY` (server-side, sem `VITE_`).
- Manter `VITE_MERCADOPAGO_PUBLIC_KEY` como build-time / fallback (para o SDK no cliente continuar a funcionar a partir do bundle).
- Atualizar `mercadoPagoTransparentGaps()` para reportar `MERCADOPAGO_PUBLIC_KEY` como o nome recomendado nos diagnósticos do painel admin.

Nenhuma outra mudança de fluxo é necessária — `MercadoPagoTransparentCardBrick` e `createMercadoPagoTransparentPaymentFn` já estão completos.

### 2. Secrets a adicionar / renomear na Lovable Cloud
Para o Worker que serve `astrologiia.app`, garantir que existem como **runtime** env vars (não apenas no bundle Vite):

- `MERCADOPAGO_PUBLIC_KEY` — mesma chave pública do MP que está em `VITE_MERCADOPAGO_PUBLIC_KEY` (copiar valor).
- Confirmar que `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN`, `APP_PUBLIC_URL` já estão como secrets de runtime — aparecem na lista, mas precisamos confirmar que o Worker os vê.
- Confirmar SyncPay: `SYNCPAY_API_BASE_URL`, `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`, `SYNCPAY_WEBHOOK_TOKEN` (todos já listados).

### 3. Verificação
Após o deploy:
- Em `/assinatura?produto=mapa` (logado como admin), o painel de diagnóstico deve mostrar 0 gaps em Checkout Pro **e** Transparente, e «SyncPay disponível».
- A UI deve passar a oferecer 3 botões de pagamento: «Pix», «Cartão (nesta página)», «Mercado Pago (nova página)».

## Pergunta antes de executar

Quer que eu:
- **(A)** Aplique a alteração de código no `mercadopago/client.ts` e abra um pedido para adicionar o secret `MERCADOPAGO_PUBLIC_KEY` (você cola o valor da chave pública MP no formulário seguro)?
- **(B)** Ou prefere também rever / readicionar os secrets SyncPay para garantir que ficam visíveis ao runtime do Worker?

A escolha mais comum é A + verificação de B só se Pix continuar oculto após publish.
