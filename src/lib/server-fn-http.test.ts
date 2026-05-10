import { describe, expect, it } from "vitest";
import { jsonError, secretsMatchConstantTime } from "@/lib/server-fn-http";

describe("secretsMatchConstantTime", () => {
  it("accepts equal secrets", () => {
    expect(secretsMatchConstantTime("super-secret-cron-value", "super-secret-cron-value")).toBe(
      true,
    );
  });

  it("rejects different secrets", () => {
    expect(secretsMatchConstantTime("a", "b")).toBe(false);
    expect(secretsMatchConstantTime("same-prefix-x", "same-prefix-y")).toBe(false);
  });
});

describe("jsonError", () => {
  it("serializa code e message", async () => {
    const res = jsonError(400, "VALIDATION", "campo inválido");
    expect(res.status).toBe(400);
    const j = (await res.json()) as { code: string; message: string };
    expect(j.code).toBe("VALIDATION");
    expect(j.message).toBe("campo inválido");
  });
});
