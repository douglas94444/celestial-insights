import { createHash, timingSafeEqual } from "node:crypto";
import type { ZodError } from "zod";

/** Corpo JSON estável para erros devolvidos pelas server functions. */
export type ServerFnErrorBody = { code: string; message: string };

export function jsonError(status: number, code: string, message: string): Response {
  const body: ServerFnErrorBody = { code, message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Compara dois segredos em texto sem vazar diferenças de comprimento via timing (usa SHA-256). */
export function secretsMatchConstantTime(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function zodValidationMessage(err: ZodError): string {
  const flat = err.flatten();
  const form = flat.formErrors.filter(Boolean);
  if (form.length) return form.join("; ");
  const entries = Object.entries(flat.fieldErrors);
  const first = entries[0];
  if (first) {
    const msgs = first[1];
    if (msgs?.length) return `${first[0]}: ${msgs.join(", ")}`;
  }
  return "Dados inválidos";
}

/** Para usar em `inputValidator`: falhas Zod tornam-se Response 400 com código VALIDATION. */
export function throwValidationResponse(zodError: ZodError): never {
  throw jsonError(400, "VALIDATION", zodValidationMessage(zodError));
}
