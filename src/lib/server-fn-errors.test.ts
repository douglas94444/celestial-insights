import { describe, expect, it } from "vitest";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";

describe("getServerFnErrorMessage", () => {
  it("acrescenta referência a Premium para falhas de quota IA", async () => {
    const msg = await getServerFnErrorMessage(
      new Response(JSON.stringify({ code: "RATE_LIMIT", message: "Muito pedidos." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(msg).toContain("Muito pedidos.");
    expect(msg).toContain("/assinatura");
  });

  it("não altera mensagens sem código de quota IA", async () => {
    const msg = await getServerFnErrorMessage(
      new Response(JSON.stringify({ code: "VALIDATION", message: "Campo X." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(msg).toBe("Campo X.");
  });
});
