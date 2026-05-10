import type { ServerFnErrorBody } from "@/lib/server-fn-http";

/** Registo estruturado mínimo (sem PII); usar para medição de duração nas server functions. */
export function timedServerFn<TArgs extends object, R>(
  name: string,
  handler: (args: TArgs) => Promise<R>,
): (args: TArgs) => Promise<R> {
  return async (args: TArgs) => {
    const t0 = Date.now();
    try {
      const result = await handler(args);
      console.info(JSON.stringify({ serverFn: name, ms: Date.now() - t0, ok: true }));
      return result;
    } catch (e) {
      let code: string | undefined;
      if (e instanceof Response) {
        try {
          const j = (await e.clone().json()) as ServerFnErrorBody;
          code = j.code;
        } catch {
          code = undefined;
        }
      }
      console.warn(
        JSON.stringify({
          serverFn: name,
          ms: Date.now() - t0,
          ok: false,
          code: code ?? "THROW",
        }),
      );
      throw e;
    }
  };
}
