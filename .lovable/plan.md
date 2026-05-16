## Diagnóstico

Na página `/assinatura`, o selector "Pix ou Cartão" só aparece quando há **2 ou mais** métodos disponíveis (lógica em `src/routes/_authenticated/assinatura.tsx`, `premiumPaymentOptionCount` / `mapaPaymentOptionCount`). Quando só um método está activo, o passo de checkout é mostrado directamente — daí estar a aparecer logo o checkout transparente do Mercado Pago.

Estado actual dos secrets do Worker (Lovable Cloud / TanStack Start):

- Mercado Pago transparente: **OK** (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` presentes).
- SyncPay Pix: **incompleto** — faltam variáveis para `isSyncPayServerConfigured()` devolver `true`:
  - `SYNCPAY_CLIENT_ID` ✓
  - `SYNCPAY_CLIENT_SECRET` ✓
  - `SYNCPAY_WEBHOOK_TOKEN` ✓
  - `SYNCPAY_API_BASE_URL` ✗ (em falta)

Sem `SYNCPAY_API_BASE_URL`, `getSyncPayAvailabilityFn` devolve `available: false`, só sobra `mp_transparent`, contagem = 1 e o picker não aparece.

## Passos

1. Adicionar o secret **`SYNCPAY_API_BASE_URL`** ao Worker (Lovable Cloud).
   - Valor padrão da API Partner da SyncPay: `https://api.syncpayments.com.br`
   - O cliente em `src/lib/syncpay/client.ts` normaliza a URL (remove `/api/partner/v1` se for incluído), portanto qualquer das formas funciona.

2. Fazer **Publish → Update** para o Worker passar a ler o novo secret.

3. Validar em `/assinatura`:
   - `getSyncPayAvailabilityFn` → `{ available: true }`
   - `getMercadoPagoAvailabilityFn` → `{ transparent: true, publicKey: "…" }`
   - Aparece o passo "Como quer pagar?" com **Pix (SyncPay)** e **Cartão (Mercado Pago)**.

## Pergunta antes de avançar

Confirma que a URL base da API Partner SyncPay desta conta é `https://api.syncpayments.com.br`? Se for um endpoint diferente (sandbox / domínio próprio), indica-o para eu usar no secret.

## Nota técnica

Não precisa de alterações de código. A lógica do picker (`premiumPaymentOptionCount > 1` / `mapaPaymentOptionCount > 1`) é a desejada — assim que `available` do SyncPay passar a `true`, o passo "escolher método" aparece automaticamente, sem rebuild de frontend (apenas o redeploy do Worker para captar o novo env).
