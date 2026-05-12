import { createClient } from "jsr:@supabase/supabase-js@2";

type ParsedTx = { candidateIds: string[]; status: string };

function extractTxFromPayload(body: unknown): ParsedTx | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const data = b.data;
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.status !== "string") return null;
  const status = String(d.status).toLowerCase();
  const ids: string[] = [];
  for (const key of ["id", "idtransaction", "idTransaction"] as const) {
    const v = d[key];
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t && !ids.includes(t)) ids.push(t);
  }
  if (ids.length === 0) return null;
  return { candidateIds: ids, status };
}

const allowedOrderStatuses = new Set(["pending", "completed", "failed", "refunded", "med"]);

function normalizeOrderStatus(raw: string): string {
  const s = raw.toLowerCase();
  return allowedOrderStatuses.has(s) ? s : "pending";
}

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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ code: "METHOD", message: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const got = url.searchParams.get("token") ?? "";
  const expected = Deno.env.get("SYNCPAY_WEBHOOK_TOKEN") ?? "";
  if (!expected || !(await timingSafeStringEq(got, expected))) {
    return new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Token inválido." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = extractTxFromPayload(body);
  if (!parsed) {
    console.warn("[syncpay-webhook] Payload sem transação reconhecida");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.error("[syncpay-webhook] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em falta");
    return new Response(JSON.stringify({ code: "CONFIG", message: "Servidor mal configurado." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Procurar primeiro em syncpay_orders; se não encontrar, tentar mapa_orders
  let orderId: string | null = null;
  let orderUserId: string | null = null;
  let orderPlan: string | null = null;
  let isMapa = false;

  const { data: spOrders, error: findErr } = await admin
    .from("syncpay_orders")
    .select("id, user_id, plan, status")
    .in("syncpay_identifier", parsed.candidateIds)
    .limit(1);

  if (findErr) {
    console.error("[syncpay-webhook] select syncpay_order", findErr.message);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (spOrders && spOrders.length > 0) {
    orderId = spOrders[0].id;
    orderUserId = spOrders[0].user_id;
    orderPlan = spOrders[0].plan;
    isMapa = false;
  } else {
    // Tentar mapa_orders (external_ref é o syncpay_identifier)
    const { data: mapaOrders, error: mapaErr } = await admin
      .from("mapa_orders")
      .select("id, user_id, status")
      .in("external_ref", parsed.candidateIds)
      .limit(1);

    if (mapaErr) {
      console.error("[syncpay-webhook] select mapa_order", mapaErr.message);
    }

    if (mapaOrders && mapaOrders.length > 0) {
      orderId = mapaOrders[0].id;
      orderUserId = mapaOrders[0].user_id;
      orderPlan = "mapa";
      isMapa = true;
    }
  }

  if (!orderId || !orderUserId) {
    console.warn("[syncpay-webhook] Pedido desconhecido:", parsed.candidateIds.join(", "));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const newStatus = normalizeOrderStatus(parsed.status);
  let payloadJson: Record<string, unknown>;
  try {
    payloadJson = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  } catch {
    payloadJson = { _note: "unserializable_body" };
  }

  if (isMapa) {
    const { error: upOrderErr } = await admin
      .from("mapa_orders")
      .update({
        status:
          newStatus === "completed" ? "completed" : newStatus === "failed" ? "failed" : "pending",
        raw_last_payload: payloadJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (upOrderErr) {
      console.error("[syncpay-webhook] update mapa_order", upOrderErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    const { error: upOrderErr } = await admin
      .from("syncpay_orders")
      .update({
        status: newStatus,
        raw_last_payload: payloadJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (upOrderErr) {
      console.error("[syncpay-webhook] update syncpay_order", upOrderErr.message);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (newStatus === "completed") {
    const tier = isMapa ? "MAPA" : orderPlan === "anual" ? "ANUAL" : "MENSAL";
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderUserId);

    if (profErr) {
      console.error("[syncpay-webhook] update profile", profErr.message);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
