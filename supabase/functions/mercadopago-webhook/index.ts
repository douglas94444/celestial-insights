import { createClient } from "jsr:@supabase/supabase-js@2";

type MercadoPagoPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string | null;
};

async function sha256hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function timingSafeStringEq(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256hex(a), sha256hex(b)]);
  if (ha.length !== hb.length) return false;
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

function extractPaymentId(method: string, url: URL, body: unknown): string | null {
  if (method === "GET") {
    const topic = url.searchParams.get("topic") ?? "";
    const id = url.searchParams.get("id");
    if (topic.toLowerCase() === "payment" && id) return id.trim();
    return null;
  }
  if (method !== "POST" || !body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const data = b.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (d.id !== undefined && d.id !== null) return String(d.id).trim();
  }
  const resource = b.resource;
  if (typeof resource === "string" && resource.includes("/payments/")) {
    const m = resource.match(/payments\/(\d+)/);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

const allowedOrderStatuses = new Set(["pending", "approved", "rejected", "cancelled", "refunded"]);

function mapPaymentToOrderStatus(paymentStatus: string): string {
  const s = paymentStatus.toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded" || s === "charged_back") return "refunded";
  if (s === "pending" || s === "in_process" || s === "in_mediation" || s === "authorized")
    return "pending";
  return "pending";
}

async function fetchPayment(accessToken: string, paymentId: string): Promise<MercadoPagoPayment> {
  const id = encodeURIComponent(paymentId);
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[mercadopago-webhook] GET payment", res.status, text.slice(0, 500));
    throw new Error(`MP_PAYMENT_${res.status}`);
  }
  return JSON.parse(text) as MercadoPagoPayment;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const got = url.searchParams.get("token") ?? "";
  const expected = Deno.env.get("MERCADOPAGO_WEBHOOK_TOKEN") ?? "";
  if (!expected || !(await timingSafeStringEq(got, expected))) {
    return new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Token inválido." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ code: "METHOD", message: "Use GET ou POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown = null;
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    }
  }

  const paymentId = extractPaymentId(req.method, url, body);
  if (!paymentId) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")?.trim() ?? "";
  if (!accessToken) {
    console.error("[mercadopago-webhook] MERCADOPAGO_ACCESS_TOKEN em falta");
    return new Response(JSON.stringify({ code: "CONFIG", message: "Token MP em falta." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payment: MercadoPagoPayment;
  try {
    payment = await fetchPayment(accessToken, paymentId);
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const extRef = payment.external_reference?.trim();
  if (!extRef) {
    console.warn("[mercadopago-webhook] Pagamento sem external_reference:", paymentId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.error("[mercadopago-webhook] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta");
    return new Response(JSON.stringify({ code: "CONFIG", message: "Supabase em falta." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Procurar em mercadopago_orders; se não encontrar, tentar mapa_orders
  let orderId: string | null = null;
  let orderUserId: string | null = null;
  let orderPlan: string | null = null;
  let orderStatus: string | null = null;
  let orderAmount: number | null = null;
  let isMapa = false;

  const { data: mpOrder, error: findErr } = await admin
    .from("mercadopago_orders")
    .select("id, user_id, plan, status, amount")
    .eq("external_reference", extRef)
    .maybeSingle();

  if (findErr) {
    console.error("[mercadopago-webhook] select mp_order", findErr.message);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (mpOrder) {
    orderId = mpOrder.id;
    orderUserId = mpOrder.user_id;
    orderPlan = mpOrder.plan;
    orderStatus = mpOrder.status;
    orderAmount = Number(mpOrder.amount);
    isMapa = false;
  } else {
    const { data: mapaOrder, error: mapaErr } = await admin
      .from("mapa_orders")
      .select("id, user_id, status, amount")
      .eq("external_ref", extRef)
      .maybeSingle();

    if (mapaErr) {
      console.error("[mercadopago-webhook] select mapa_order", mapaErr.message);
    }

    if (mapaOrder) {
      orderId = mapaOrder.id;
      orderUserId = mapaOrder.user_id;
      orderPlan = "mapa";
      orderStatus = mapaOrder.status;
      orderAmount = Number(mapaOrder.amount);
      isMapa = true;
    }
  }

  if (!orderId || !orderUserId) {
    console.warn("[mercadopago-webhook] Pedido desconhecido:", extRef);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (orderStatus === "approved" || orderStatus === "completed") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payStatus = (payment.status ?? "").toLowerCase();
  let newOrderStatus = mapPaymentToOrderStatus(payStatus);
  if (!allowedOrderStatuses.has(newOrderStatus)) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currency = (payment.currency_id ?? "").toUpperCase();
  if (currency && currency !== "BRL") {
    console.warn("[mercadopago-webhook] Moeda inesperada:", currency, paymentId);
  }

  const txAmt = Number(payment.transaction_amount);
  const orderAmt = orderAmount ?? 0;
  const amountOk =
    Number.isFinite(txAmt) && Number.isFinite(orderAmt) && Math.abs(txAmt - orderAmt) <= 0.02;
  const currencyOk = !currency || currency === "BRL";

  if (newOrderStatus === "approved" && (!amountOk || !currencyOk)) {
    console.warn("[mercadopago-webhook] Aprovação ignorada (valor ou moeda).", {
      paymentId,
      txAmt,
      orderAmt,
      currency,
    });
    newOrderStatus = "pending";
  }

  const paymentIdStr = String(payment.id ?? paymentId);
  let payloadJson: Record<string, unknown>;
  try {
    payloadJson = { payment, notify_body: body } as Record<string, unknown>;
  } catch {
    payloadJson = { _note: "payload_error" };
  }

  if (isMapa) {
    const mapaStatus =
      newOrderStatus === "approved"
        ? "completed"
        : newOrderStatus === "rejected"
          ? "failed"
          : "pending";
    const { error: upOrderErr } = await admin
      .from("mapa_orders")
      .update({
        status: mapaStatus,
        raw_last_payload: payloadJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (upOrderErr) {
      console.error("[mercadopago-webhook] update mapa_order", upOrderErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    const { error: upOrderErr } = await admin
      .from("mercadopago_orders")
      .update({
        status: newOrderStatus,
        payment_id: paymentIdStr,
        raw_last_payload: payloadJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (upOrderErr) {
      console.error("[mercadopago-webhook] update mp_order", upOrderErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (newOrderStatus === "approved" && orderStatus !== "approved" && amountOk && currencyOk) {
    const tier = isMapa ? "MAPA" : orderPlan === "anual" ? "ANUAL" : "MENSAL";
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderUserId);

    if (profErr) {
      console.error("[mercadopago-webhook] update profile", profErr.message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
