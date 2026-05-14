import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMercadoPagoWebhookUrl,
  isMercadoPagoServerConfigured,
  isMercadoPagoTransparentConfigured,
  MercadoPagoApiError,
  MercadoPagoConfigError,
  mercadoPagoCheckoutProGaps,
  mercadoPagoCheckoutRedirectUrl,
  mercadoPagoGetPayment,
  mercadoPagoPostCardPayment,
  mercadoPagoTransparentGaps,
  mercadoPagoUsesSandboxToken,
  normalizeMercadoPagoPreferenceResponse,
} from "@/lib/mercadopago/client";

function setTransparentEnv() {
  process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-access-12345";
  process.env.MERCADOPAGO_WEBHOOK_TOKEN = "webhook-secret";
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.MERCADOPAGO_PUBLIC_KEY = "TEST-pub-key";
}

function clearMpEnv() {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_WEBHOOK_TOKEN;
  delete process.env.SUPABASE_URL;
  delete process.env.MERCADOPAGO_PUBLIC_KEY;
  delete process.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  delete process.env.APP_PUBLIC_URL;
}

// ---------------------------------------------------------------------------
// normalizeMercadoPagoPreferenceResponse
// ---------------------------------------------------------------------------
describe("normalizeMercadoPagoPreferenceResponse", () => {
  it("retorna objeto vazio para entradas inválidas", () => {
    expect(normalizeMercadoPagoPreferenceResponse(null)).toEqual({});
    expect(normalizeMercadoPagoPreferenceResponse(undefined)).toEqual({});
    expect(normalizeMercadoPagoPreferenceResponse("string")).toEqual({});
    expect(normalizeMercadoPagoPreferenceResponse(42)).toEqual({});
  });

  it("normaliza campos snake_case da API do MP", () => {
    const raw = {
      id: "pref-123",
      init_point: "https://mp.com/init",
      sandbox_init_point: "https://sandbox.mp.com/init",
    };
    expect(normalizeMercadoPagoPreferenceResponse(raw)).toEqual({
      id: "pref-123",
      init_point: "https://mp.com/init",
      sandbox_init_point: "https://sandbox.mp.com/init",
    });
  });

  it("aceita camelCase como fallback (initPoint / sandboxInitPoint)", () => {
    const raw = {
      id: "pref-456",
      initPoint: "https://mp.com/camel",
      sandboxInitPoint: "https://sandbox.mp.com/camel",
    };
    const result = normalizeMercadoPagoPreferenceResponse(raw);
    expect(result.init_point).toBe("https://mp.com/camel");
    expect(result.sandbox_init_point).toBe("https://sandbox.mp.com/camel");
  });

  it("snake_case tem prioridade sobre camelCase quando ambos presentes", () => {
    const raw = {
      init_point: "https://mp.com/snake",
      initPoint: "https://mp.com/camel",
    };
    expect(normalizeMercadoPagoPreferenceResponse(raw).init_point).toBe("https://mp.com/snake");
  });

  it("aplica trim nos valores de string", () => {
    const raw = { id: "  pref-789  ", init_point: "  https://mp.com/init  " };
    const result = normalizeMercadoPagoPreferenceResponse(raw);
    expect(result.id).toBe("pref-789");
    expect(result.init_point).toBe("https://mp.com/init");
  });

  it("retorna undefined para campos ausentes", () => {
    const result = normalizeMercadoPagoPreferenceResponse({ id: "x" });
    expect(result.init_point).toBeUndefined();
    expect(result.sandbox_init_point).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mercadoPagoUsesSandboxToken
// ---------------------------------------------------------------------------
describe("mercadoPagoUsesSandboxToken", () => {
  afterEach(clearMpEnv);

  it("retorna true quando token começa com TEST-", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-12345-sandbox";
    expect(mercadoPagoUsesSandboxToken()).toBe(true);
  });

  it("retorna false para token de produção (APP-)", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP-12345-production";
    expect(mercadoPagoUsesSandboxToken()).toBe(false);
  });

  it("retorna false quando token ausente", () => {
    expect(mercadoPagoUsesSandboxToken()).toBe(false);
  });

  it("retorna false para token vazio", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "   ";
    expect(mercadoPagoUsesSandboxToken()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isMercadoPagoTransparentConfigured
// ---------------------------------------------------------------------------
describe("isMercadoPagoTransparentConfigured", () => {
  afterEach(clearMpEnv);

  it("retorna true quando todas as vars estão presentes", () => {
    setTransparentEnv();
    expect(isMercadoPagoTransparentConfigured()).toBe(true);
  });

  it("retorna false quando ACCESS_TOKEN ausente", () => {
    setTransparentEnv();
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(isMercadoPagoTransparentConfigured()).toBe(false);
  });

  it("retorna false quando WEBHOOK_TOKEN ausente", () => {
    setTransparentEnv();
    delete process.env.MERCADOPAGO_WEBHOOK_TOKEN;
    expect(isMercadoPagoTransparentConfigured()).toBe(false);
  });

  it("retorna false quando chave pública ausente", () => {
    setTransparentEnv();
    delete process.env.MERCADOPAGO_PUBLIC_KEY;
    // sem nenhuma das três alternativas de chave pública
    expect(isMercadoPagoTransparentConfigured()).toBe(false);
  });

  it("aceita VITE_MERCADOPAGO_PUBLIC_KEY como chave pública alternativa", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-12345";
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "hook";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.VITE_MERCADOPAGO_PUBLIC_KEY = "TEST-vite-pub";
    expect(isMercadoPagoTransparentConfigured()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isMercadoPagoServerConfigured (Checkout Pro)
// ---------------------------------------------------------------------------
describe("isMercadoPagoServerConfigured", () => {
  afterEach(clearMpEnv);

  it("retorna true quando todas as vars do Pro estão presentes", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP-prod-token";
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "webhook-secret";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.APP_PUBLIC_URL = "https://myapp.com";
    expect(isMercadoPagoServerConfigured()).toBe(true);
  });

  it("retorna false sem APP_PUBLIC_URL (diferença do Transparente)", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP-prod-token";
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "webhook-secret";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    expect(isMercadoPagoServerConfigured()).toBe(false);
  });

  it("retorna false sem ACCESS_TOKEN", () => {
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "webhook-secret";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.APP_PUBLIC_URL = "https://myapp.com";
    expect(isMercadoPagoServerConfigured()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mercadoPagoTransparentGaps
// ---------------------------------------------------------------------------
describe("mercadoPagoTransparentGaps", () => {
  afterEach(clearMpEnv);

  it("retorna lista vazia quando completamente configurado", () => {
    setTransparentEnv();
    expect(mercadoPagoTransparentGaps()).toEqual([]);
  });

  it("lista MERCADOPAGO_ACCESS_TOKEN em falta", () => {
    setTransparentEnv();
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(mercadoPagoTransparentGaps()).toContain("MERCADOPAGO_ACCESS_TOKEN");
  });

  it("lista MERCADOPAGO_WEBHOOK_TOKEN em falta", () => {
    setTransparentEnv();
    delete process.env.MERCADOPAGO_WEBHOOK_TOKEN;
    expect(mercadoPagoTransparentGaps()).toContain("MERCADOPAGO_WEBHOOK_TOKEN");
  });

  it("lista chave pública em falta", () => {
    setTransparentEnv();
    delete process.env.MERCADOPAGO_PUBLIC_KEY;
    const gaps = mercadoPagoTransparentGaps();
    expect(gaps.some((g) => g.includes("MERCADOPAGO_PUBLIC_KEY"))).toBe(true);
  });

  it("lista todas as vars quando nada configurado", () => {
    const gaps = mercadoPagoTransparentGaps();
    expect(gaps).toContain("MERCADOPAGO_ACCESS_TOKEN");
    expect(gaps).toContain("MERCADOPAGO_WEBHOOK_TOKEN");
    expect(gaps.some((g) => g.includes("MERCADOPAGO_PUBLIC_KEY"))).toBe(true);
  });

  it("não lista APP_PUBLIC_URL (não é exigida pelo Transparente)", () => {
    expect(mercadoPagoTransparentGaps()).not.toContain("APP_PUBLIC_URL");
  });
});

// ---------------------------------------------------------------------------
// mercadoPagoCheckoutProGaps
// ---------------------------------------------------------------------------
describe("mercadoPagoCheckoutProGaps", () => {
  afterEach(clearMpEnv);

  it("retorna lista vazia quando completamente configurado", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP-token";
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "hook";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.APP_PUBLIC_URL = "https://myapp.com";
    expect(mercadoPagoCheckoutProGaps()).toEqual([]);
  });

  it("inclui APP_PUBLIC_URL na lista de gaps (ausente no Transparente)", () => {
    expect(mercadoPagoCheckoutProGaps()).toContain("APP_PUBLIC_URL");
  });

  it("lista todas as vars em falta quando nada configurado", () => {
    const gaps = mercadoPagoCheckoutProGaps();
    expect(gaps).toContain("MERCADOPAGO_ACCESS_TOKEN");
    expect(gaps).toContain("MERCADOPAGO_WEBHOOK_TOKEN");
    expect(gaps).toContain("APP_PUBLIC_URL");
  });
});

// ---------------------------------------------------------------------------
// buildMercadoPagoWebhookUrl
// ---------------------------------------------------------------------------
describe("buildMercadoPagoWebhookUrl", () => {
  afterEach(clearMpEnv);

  it("constrói URL no formato correto com token codificado", () => {
    process.env.SUPABASE_URL = "https://abc.supabase.co";
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "secret token com espaço";
    const url = buildMercadoPagoWebhookUrl();
    expect(url).toBe(
      "https://abc.supabase.co/functions/v1/mercadopago-webhook?token=secret%20token%20com%20espa%C3%A7o",
    );
  });

  it("remove barra final do SUPABASE_URL", () => {
    process.env.SUPABASE_URL = "https://abc.supabase.co/";
    process.env.MERCADOPAGO_WEBHOOK_TOKEN = "tok";
    const url = buildMercadoPagoWebhookUrl();
    expect(url).not.toContain("//functions");
    expect(url).toContain("/functions/v1/mercadopago-webhook");
  });

  it("lança MercadoPagoConfigError sem WEBHOOK_TOKEN", () => {
    process.env.SUPABASE_URL = "https://abc.supabase.co";
    expect(() => buildMercadoPagoWebhookUrl()).toThrow(MercadoPagoConfigError);
  });
});

// ---------------------------------------------------------------------------
// mercadoPagoCheckoutRedirectUrl
// ---------------------------------------------------------------------------
describe("mercadoPagoCheckoutRedirectUrl", () => {
  afterEach(clearMpEnv);

  it("retorna sandbox_init_point quando token é TEST- (modo sandbox)", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-12345";
    const pref = {
      init_point: "https://prod.mp.com/init",
      sandbox_init_point: "https://sandbox.mp.com/init",
    };
    expect(mercadoPagoCheckoutRedirectUrl(pref)).toBe("https://sandbox.mp.com/init");
  });

  it("retorna init_point quando token é de produção", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP-12345";
    const pref = {
      init_point: "https://prod.mp.com/init",
      sandbox_init_point: "https://sandbox.mp.com/init",
    };
    expect(mercadoPagoCheckoutRedirectUrl(pref)).toBe("https://prod.mp.com/init");
  });

  it("fallback para init_point quando sandbox_init_point ausente em modo sandbox", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-12345";
    expect(mercadoPagoCheckoutRedirectUrl({ init_point: "https://prod.mp.com/init" })).toBe(
      "https://prod.mp.com/init",
    );
  });

  it("lança MercadoPagoConfigError quando nenhuma URL disponível", () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP-12345";
    expect(() => mercadoPagoCheckoutRedirectUrl({})).toThrow(MercadoPagoConfigError);
  });

  it("lança MercadoPagoConfigError quando pref está vazio", () => {
    expect(() => mercadoPagoCheckoutRedirectUrl({})).toThrow(MercadoPagoConfigError);
  });
});

// ---------------------------------------------------------------------------
// mercadoPagoPostCardPayment  (mocked fetch)
// ---------------------------------------------------------------------------
describe("mercadoPagoPostCardPayment", () => {
  afterEach(() => {
    clearMpEnv();
    vi.restoreAllMocks();
  });

  const cardBody = {
    transaction_amount: 37.9,
    token: "card-token-abc",
    description: "Mapa Natal AstroMap",
    installments: 1,
    payment_method_id: "visa",
    issuer_id: 24,
    payer: {
      email: "test@example.com",
      identification: { type: "CPF", number: "12345678901" },
    },
    external_reference: "order-uuid-123",
  };

  it("envia POST para /v1/payments com headers corretos", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-access-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ id: 999, status: "approved", status_detail: "accredited" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await mercadoPagoPostCardPayment(cardBody, "idem-key-1");

    expect(result.status).toBe("approved");
    expect(result.id).toBe(999);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(opts.method).toBe("POST");
    const headers = opts.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBe("idem-key-1");
    expect(headers["Authorization"]).toBe("Bearer TEST-access-token");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("inclui issuer_id numérico no body quando fornecido", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-access-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 1, status: "approved" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await mercadoPagoPostCardPayment(cardBody, "idem-2");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(sent.issuer_id).toBe(24);
  });

  it("omite issuer_id vazio do payload enviado", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-access-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 1, status: "approved" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const bodyWithEmptyIssuer = { ...cardBody, issuer_id: "" as unknown as number };
    await mercadoPagoPostCardPayment(bodyWithEmptyIssuer, "idem-3");

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect("issuer_id" in sent).toBe(false);
  });

  it("retorna status pending (pagamento em análise)", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-access-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({ id: 777, status: "in_process", status_detail: "pending_review" }),
      }),
    );

    const result = await mercadoPagoPostCardPayment(cardBody, "idem-4");
    expect(result.status).toBe("in_process");
  });

  it("lança MercadoPagoApiError para resposta HTTP 422", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-access-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ message: "cc_rejected_bad_filled_card_number" }),
      }),
    );

    const err = await mercadoPagoPostCardPayment(cardBody, "idem-5").catch((e) => e);
    expect(err).toBeInstanceOf(MercadoPagoApiError);
    expect((err as MercadoPagoApiError).status).toBe(422);
  });

  it("lança MercadoPagoApiError para resposta HTTP 401 (token inválido)", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "INVALID-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"message":"Unauthorized"}',
      }),
    );

    await expect(mercadoPagoPostCardPayment(cardBody, "idem-6")).rejects.toThrow(
      MercadoPagoApiError,
    );
  });

  it("lança MercadoPagoConfigError quando ACCESS_TOKEN ausente", async () => {
    await expect(mercadoPagoPostCardPayment(cardBody, "idem-7")).rejects.toThrow(
      MercadoPagoConfigError,
    );
  });

  it("inclui notification_url no body quando fornecida", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 1, status: "approved" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await mercadoPagoPostCardPayment(
      { ...cardBody, notification_url: "https://hook.example.com" },
      "idem-8",
    );

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(sent.notification_url).toBe("https://hook.example.com");
  });
});

// ---------------------------------------------------------------------------
// mercadoPagoGetPayment  (mocked fetch)
// ---------------------------------------------------------------------------
describe("mercadoPagoGetPayment", () => {
  afterEach(() => {
    clearMpEnv();
    vi.restoreAllMocks();
  });

  it("busca GET /v1/payments/{id} e retorna dados do pagamento", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    const mockPayment = {
      id: 42,
      status: "approved",
      external_reference: "ref-uuid",
      transaction_amount: 37.9,
      currency_id: "BRL",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(mockPayment) }),
    );

    const result = await mercadoPagoGetPayment("42");
    expect(result.id).toBe(42);
    expect(result.status).toBe("approved");
    expect(result.currency_id).toBe("BRL");
  });

  it("envia Authorization header correto", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-my-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 1 }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await mercadoPagoGetPayment("1");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer TEST-my-token");
  });

  it("lança MercadoPagoApiError para resposta 404", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => '{"message":"Not found"}',
      }),
    );

    const err = await mercadoPagoGetPayment("999").catch((e) => e);
    expect(err).toBeInstanceOf(MercadoPagoApiError);
    expect((err as MercadoPagoApiError).status).toBe(404);
  });

  it("encoda o ID para prevenir injeção de path", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "{}",
    });
    vi.stubGlobal("fetch", mockFetch);

    await mercadoPagoGetPayment("123/evil-path");
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("123%2Fevil-path");
    expect(url).not.toContain("123/evil-path");
  });

  it("lança MercadoPagoConfigError quando ACCESS_TOKEN ausente", async () => {
    await expect(mercadoPagoGetPayment("1")).rejects.toThrow(MercadoPagoConfigError);
  });
});

// ---------------------------------------------------------------------------
// Classes de erro
// ---------------------------------------------------------------------------
describe("MercadoPagoConfigError", () => {
  it("tem code MERCADOPAGO_CONFIG e é instância de Error", () => {
    const err = new MercadoPagoConfigError("variável ausente");
    expect(err.code).toBe("MERCADOPAGO_CONFIG");
    expect(err.name).toBe("MercadoPagoConfigError");
    expect(err.message).toBe("variável ausente");
    expect(err instanceof Error).toBe(true);
  });
});

describe("MercadoPagoApiError", () => {
  it("tem code MERCADOPAGO_HTTP e preserva status e body", () => {
    const body = '{"error":"cc_rejected_bad_filled_card_number"}';
    const err = new MercadoPagoApiError(422, body);
    expect(err.code).toBe("MERCADOPAGO_HTTP");
    expect(err.status).toBe(422);
    expect(err.body).toBe(body);
    expect(err.message).toBe("Mercado Pago HTTP 422");
    expect(err instanceof Error).toBe(true);
  });
});
