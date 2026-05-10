import type { ServerFnErrorBody } from "@/lib/server-fn-http";

const IA_QUOTA_CODES = new Set(["PREMIUM_REQUIRED", "RATE_LIMIT", "MONTHLY_LIMIT"]);

function appendIaQuotaPremiumHint(message: string, code?: string): string {
  if (!code || !IA_QUOTA_CODES.has(code)) return message;
  return `${message} Para planos Premium ou mais uso, vá a /premium.`;
}

/** Mensagem e código JSON quando a falha veio de uma Response de server function. */
export async function getServerFnErrorDetails(
  err: unknown,
): Promise<{ message: string; code?: string }> {
  if (err instanceof Response) {
    try {
      const j = (await err.json()) as Partial<ServerFnErrorBody>;
      return {
        message: j.message ?? `Erro ${err.status}`,
        code: typeof j.code === "string" ? j.code : undefined,
      };
    } catch {
      return { message: err.statusText || "Erro no servidor" };
    }
  }
  if (err instanceof Error) return { message: err.message };
  return { message: String(err) };
}

/** Extrai mensagem de erro de falhas de server function (Response ou Error). */
export async function getServerFnErrorMessage(err: unknown): Promise<string> {
  const d = await getServerFnErrorDetails(err);
  return appendIaQuotaPremiumHint(d.message, d.code);
}
