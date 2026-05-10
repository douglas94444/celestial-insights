import type { ServerFnErrorBody } from "@/lib/server-fn-http";

/** Extrai mensagem de erro de falhas de server function (Response ou Error). */
export async function getServerFnErrorMessage(err: unknown): Promise<string> {
  if (err instanceof Response) {
    try {
      const j = (await err.json()) as Partial<ServerFnErrorBody>;
      return j.message ?? `Erro ${err.status}`;
    } catch {
      return err.statusText || "Erro no servidor";
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
