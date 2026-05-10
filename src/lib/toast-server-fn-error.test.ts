import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("toastServerFnError", () => {
  it("mostra toast com mensagem resolvida", async () => {
    const { toast } = await import("sonner");
    const { toastServerFnError } = await import("@/lib/toast-server-fn-error");
    await toastServerFnError(new Error("falha rede"));
    expect(toast.error).toHaveBeenCalledWith("falha rede");
  });
});
