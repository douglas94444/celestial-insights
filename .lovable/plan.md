## Diagnóstico

A página `/premium` mostra o aviso quando **ambos** os gates falham no servidor:

- **SyncPay** (`isSyncPayServerConfigured`) exige: `SYNCPAY_API_BASE_URL`, `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET`, **`SYNCPAY_WEBHOOK_TOKEN`**, `SUPABASE_URL`.
- **Mercado Pago Checkout Pro** (`isMercadoPagoServerConfigured`) exige: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN`, `SUPABASE_URL`, **`APP_PUBLIC_URL`**.
- **Mercado Pago Transparente / cartão** (`isMercadoPagoTransparentConfigured`) exige: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN`, `SUPABASE_URL`, `VITE_MERCADOPAGO_PUBLIC_KEY` (ou `MERCADOPAGO_PUBLIC_KEY`).

Comparando com os secrets já configurados no projeto:

| Secret | Estado |
|---|---|
| `SYNCPAY_API_BASE_URL`, `SYNCPAY_CLIENT_ID`, `SYNCPAY_CLIENT_SECRET` | ✅ presentes |
| `SYNCPAY_WEBHOOK_TOKEN` | ❌ **em falta** |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN`, `VITE_MERCADOPAGO_PUBLIC_KEY` | ✅ presentes |
| `APP_PUBLIC_URL` | ❌ **em falta** |
| `SUPABASE_URL` | ✅ presente |

Em teoria o gate **MP transparente** já deveria estar verde (todos os quatro presentes). Como o aviso ainda aparece, o Worker publicado provavelmente foi gerado **antes** dos secrets actuais terem sido adicionados — os secrets só ficam disponíveis para o Worker após **novo deploy / Publish → Update**.

## Plano

1. **Adicionar os dois secrets em falta** (via tool de secrets, formulário seguro):
   - `SYNCPAY_WEBHOOK_TOKEN` — string aleatória forte que vais também colar no painel SyncPay como token do webhook (`/functions/v1/syncpay-webhook?token=…`).
   - `APP_PUBLIC_URL` — URL pública absoluta da app, ex.: `https://astrologiia.app` (sem `/` final). Usado nas `back_urls` do Checkout Pro do Mercado Pago.

2. **Republicar o Worker** (Publish → Update no editor) para que os secrets fiquem disponíveis em `process.env` no SSR/Worker. Sem este passo, mesmo os secrets já existentes podem não estar a ser lidos pelo build em produção.

3. **Verificar no `/premium`**:
   - O alerta "Pagamentos em configuração" deve desaparecer.
   - Botão Pix (SyncPay) activo se `SYNCPAY_*` completos.
   - Botão Mercado Pago Checkout Pro activo (precisa `APP_PUBLIC_URL`).
   - Brick de cartão (transparente) activo (precisa `VITE_MERCADOPAGO_PUBLIC_KEY` no build do cliente — se não aparecer, é preciso garantir que esse `VITE_*` foi injectado no build e republicar).

4. **Configurar webhooks nos providers** (passo operacional, fora do código):
   - **SyncPay** → URL: `https://fxcoxnqqjgvqfukasfjb.supabase.co/functions/v1/syncpay-webhook?token=<SYNCPAY_WEBHOOK_TOKEN>`
   - **Mercado Pago** → URL: `https://fxcoxnqqjgvqfukasfjb.supabase.co/functions/v1/mercadopago-webhook?token=<MERCADOPAGO_WEBHOOK_TOKEN>`

## Notas técnicas

- Nenhuma alteração de código é necessária — só configuração de ambiente + redeploy.
- Se quiseres só uma das passarelas (ex.: só Pix SyncPay), basta completar esse conjunto e o gate respectivo abre; a outra continua oculta sem partir nada.
- Para `APP_PUBLIC_URL` em ambiente preview vs produção: usa o domínio final (`https://astrologiia.app`) — afecta apenas os `back_urls` do Checkout Pro (sucesso/falha/pendente).
