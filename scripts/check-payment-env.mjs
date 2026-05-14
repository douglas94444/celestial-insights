/**
 * Verifica variáveis de ambiente necessárias a Pix (SyncPay), Mercado Pago Checkout Pro
 * e checkout transparente — alinhado com:
 * - src/lib/syncpay/client.ts (isSyncPayServerConfigured / syncPayConfigurationGaps)
 * - src/lib/mercadopago/client.ts (isMercadoPagoServerConfigured, isMercadoPagoTransparentConfigured, gaps)
 * - src/integrations/supabase/public-config.ts (fallback de SUPABASE_URL no runtime da app)
 *
 * Uso: `npm run check:payment-env` (carrega `.env` e `.env.local` do cwd se existirem).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SUPABASE_URL_FALLBACK = "https://fxcoxnqqjgvqfukasfjb.supabase.co";

function loadEnvFile(rel) {
  const p = join(process.cwd(), rel);
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    const cur = process.env[key];
    if (cur === undefined || cur === "") process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function trim(key) {
  return (process.env[key] ?? "").trim();
}

/** Igual a getSupabaseUrl() na app (fallback público). */
function getSupabaseUrl() {
  const u = trim("SUPABASE_URL");
  return u || SUPABASE_URL_FALLBACK;
}

function mercadoPagoPublicKeyForCheck() {
  const a = trim("VITE_MERCADOPAGO_PUBLIC_KEY");
  if (a) return a;
  return trim("MERCADOPAGO_PUBLIC_KEY");
}

function syncPayGaps() {
  const missing = [];
  if (!trim("SYNCPAY_API_BASE_URL")) missing.push("SYNCPAY_API_BASE_URL");
  if (!trim("SYNCPAY_CLIENT_ID")) missing.push("SYNCPAY_CLIENT_ID");
  if (!trim("SYNCPAY_CLIENT_SECRET")) missing.push("SYNCPAY_CLIENT_SECRET");
  if (!trim("SYNCPAY_WEBHOOK_TOKEN")) missing.push("SYNCPAY_WEBHOOK_TOKEN");
  if (!getSupabaseUrl()) missing.push("SUPABASE_URL");
  return missing;
}

function isSyncPayServerConfigured() {
  return syncPayGaps().length === 0;
}

function mercadoPagoCheckoutProGaps() {
  const missing = [];
  if (!trim("MERCADOPAGO_ACCESS_TOKEN")) missing.push("MERCADOPAGO_ACCESS_TOKEN");
  if (!trim("MERCADOPAGO_WEBHOOK_TOKEN")) missing.push("MERCADOPAGO_WEBHOOK_TOKEN");
  if (!getSupabaseUrl()) missing.push("SUPABASE_URL");
  if (!trim("APP_PUBLIC_URL")) missing.push("APP_PUBLIC_URL");
  return missing;
}

function isMercadoPagoServerConfigured() {
  return mercadoPagoCheckoutProGaps().length === 0;
}

function mercadoPagoTransparentGaps() {
  const missing = [];
  if (!trim("MERCADOPAGO_ACCESS_TOKEN")) missing.push("MERCADOPAGO_ACCESS_TOKEN");
  if (!trim("MERCADOPAGO_WEBHOOK_TOKEN")) missing.push("MERCADOPAGO_WEBHOOK_TOKEN");
  if (!getSupabaseUrl()) missing.push("SUPABASE_URL");
  if (!mercadoPagoPublicKeyForCheck())
    missing.push("VITE_MERCADOPAGO_PUBLIC_KEY ou MERCADOPAGO_PUBLIC_KEY");
  return missing;
}

function isMercadoPagoTransparentConfigured() {
  return mercadoPagoTransparentGaps().length === 0;
}

function line(title, ok, gaps) {
  const status = ok ? "OK" : "incompleto";
  console.log(`\n## ${title}: ${status}`);
  if (!ok && gaps.length) {
    console.log("   Em falta ou vazio:", gaps.join(", "));
  }
}

console.log("Verificação de ambiente — pagamentos (local / CI)");
console.log("Cwd:", process.cwd());
if (!existsSync(join(process.cwd(), ".env")) && !existsSync(join(process.cwd(), ".env.local"))) {
  console.log("\n(dica: crie .env a partir de .env.example para preencher valores locais)");
}

const syncOk = isSyncPayServerConfigured();
const mpProOk = isMercadoPagoServerConfigured();
const mpTrOk = isMercadoPagoTransparentConfigured();

line("Pix (SyncPay) — botão em /assinatura", syncOk, syncPayGaps());
line("Mercado Pago Checkout Pro (nova página)", mpProOk, mercadoPagoCheckoutProGaps());
line(
  "Mercado Pago checkout transparente (cartão nesta página)",
  mpTrOk,
  mercadoPagoTransparentGaps(),
);

console.log(`
Notas:
- No Cloudflare Worker, as mesmas variáveis devem existir como secrets/vars (não só no .env local).
- VITE_MERCADOPAGO_PUBLIC_KEY tem de estar presente no *build* do cliente se for a única fonte da chave pública.
- Pode duplicar a chave pública em MERCADOPAGO_PUBLIC_KEY no Worker se o runtime não expuser VITE_*.
Documentação: docs/operacao-ambiente.md
`);

const url = pathToFileURL(join(process.cwd(), "docs", "operacao-ambiente.md")).href;
console.log(`Abrir: ${url}\n`);

process.exitCode = 0;
