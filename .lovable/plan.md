## Objetivo

Hoje o Pixel só dispara `PageView` automático. Vou ligar **eventos standard do Meta** nos pontos do funil que já temos instrumentados internamente (engagement), espelhando-os para o Pixel (browser) e, quando há valor monetário, também para a **Conversions API** (servidor, com `event_id` para deduplicar).

## Mapa de eventos por página / botão

| Página / Ação | Trigger | Evento Meta | Parâmetros |
|---|---|---|---|
| Todas as rotas | navegação SPA | `PageView` | — (já existe) |
| `/` landing — CTA «Começar / Criar conta» | clique em cada CTA do hero/sections | `Lead` (custom `LandingCTA`) | `{ zone }` |
| `/auth` — registo concluído | sessão nova criada (signup) | `CompleteRegistration` | `{ method: 'email' \| 'google' }` |
| `/onboarding` — primeiro mapa criado | sucesso do `BirthChartForm` | `SubmitApplication` | `{ content_name: 'natal_chart' }` |
| `/planos` | montagem | `ViewContent` | `{ content_type: 'product', content_ids: ['premium'] }` |
| `/assinatura` | `checkout_view` (dedupe ~90s) | `ViewContent` | `{ content_ids: [produto], value, currency: 'BRL' }` |
| `/assinatura` — botão **Pix** | `checkout_initiate_pix` | `InitiateCheckout` | `{ value, currency: 'BRL', content_ids: [plan], payment_method: 'pix' }` |
| `/assinatura` — botão **Cartão (MP Pro)** | `checkout_initiate_mp_checkout_pro` | `InitiateCheckout` | `{ value, currency: 'BRL', payment_method: 'card_mp_pro' }` |
| `/assinatura` — Brick cartão submetido | `checkout_payment_confirmed_mp_transparent` | `AddPaymentInfo` + `Purchase` | `{ value, currency, content_ids }` |
| `/assinatura` — pagamento confirmado (Pix/MP Pro via polling/return) | `checkout_payment_confirmed` | `Purchase` | `{ value, currency: 'BRL', content_ids: [produto], channel }` |

Em todos os disparos passo um `event_id` (uuid v4) e, quando o utilizador está autenticado, `external_id` (hash SHA-256 do `user.id`) para melhorar match quality.

## Conversions API (servidor)

Para os eventos com valor — `Purchase` e `InitiateCheckout` — também envio via CAPI (`src/lib/meta-capi.ts` já existe) com o mesmo `event_id`, para deduplicação com o Pixel. Faço-o:

- **Purchase**: a partir dos webhooks que já confirmam pagamento — `supabase/functions/mercadopago-webhook` e `supabase/functions/syncpay-webhook`. Aproveito que já recebem o `user_id`/metadata; envio `event_name: "Purchase"`, `action_source: "website"`, `event_source_url` do checkout, `user_data.external_id` (hash do user_id), `custom_data.value/currency/content_ids`.
- **InitiateCheckout (Pix)**: dentro da server function que cria a cobrança Pix (SyncPay) — antes/depois do `createPix`.

Para `Lead`, `CompleteRegistration`, `SubmitApplication`, `ViewContent`, `AddPaymentInfo` fica só Pixel browser (sem valor monetário crítico).

## Implementação

1. **`src/lib/meta-pixel.ts`** (novo): helper cliente `trackMetaEvent(name, params?, options?)` que:
   - faz `window.fbq('track', name, params, { eventID })` se `fbq` estiver carregado;
   - retorna o `event_id` para o caller poder espelhar via CAPI;
   - silencia se Pixel não configurado.
   - Inclui `trackMetaCustomEvent` para eventos custom (ex.: `LandingCTA`).
   - Hash `external_id` SHA-256 (Web Crypto) quando há `user.id`.

2. **`src/lib/meta-capi.ts`** — adicionar utilitário `buildUserData({ userId, request })` com `external_id` (hash) e `client_ip_address`/`client_user_agent` quando disponíveis.

3. **`/` landing (`src/routes/index.tsx`)** — junto ao `recordLandingEngagement(landing_cta_click)` chamo `trackMetaEvent('Lead', { content_name: zone })`.

4. **`/auth` (`src/routes/auth.tsx`)** — em `onAuthStateChange` (ou no handler de signup), quando o evento for `SIGNED_IN` e o utilizador for novo, chamo `CompleteRegistration` com `method`. Para Google OAuth, detecto via `app_metadata.provider`.

5. **`/onboarding`** — após criação bem-sucedida do primeiro mapa, `SubmitApplication`.

6. **`/planos`** — `useEffect` único de `ViewContent`.

7. **`/assinatura`** — em cada chamada existente a `recordCheckoutEngagement` dos eventos da tabela, disparo o evento Meta equivalente com o mesmo `event_id` que envio também (no caso de Purchase) ao webhook handler via metadata (`external_reference` já existe). Para `InitiateCheckout (Pix)`, o `event_id` é gerado no cliente e passado na server function `createSyncPayPixFn` no campo metadata; a server function reenvia ao CAPI.

8. **Webhooks** (`supabase/functions/{mercadopago,syncpay}-webhook`) — após confirmar pagamento, ler `metadata.meta_event_id` (ou gerar) e chamar `sendMetaCapiEvents([{ event_name: 'Purchase', ... }])`. Já temos `META_PIXEL_ID` e `META_CAPI_ACCESS_TOKEN` em secrets — passar via env das Edge Functions.

## Notas técnicas

- Deduplicação: Meta usa `(event_name, event_id)` — basta usar o mesmo uuid em browser + servidor.
- `value`: derivado de `subscription-pricing.ts` (mensal/anual/mapa). Currency sempre `"BRL"`.
- `content_ids`: `["premium_monthly"]`, `["premium_annual"]`, `["mapa"]`.
- Sem PII em claro no `user_data` (apenas hash do user_id como `external_id`).
- Tudo fire-and-forget, com try/catch — nunca quebra o fluxo de pagamento se o Meta falhar.

## Fora de scope

- Pixel Helper / debug UI.
- Eventos IA, sinastria, etc. (não são de conversão; ficam só no engagement interno).
- Server-side de eventos sem valor (Lead/ViewContent) — Pixel browser chega.
