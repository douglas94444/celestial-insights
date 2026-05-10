import { createServerOnlyFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";

/**
 * Lê a sessão Supabase a partir dos cookies no pedido SSR (TanStack Start / h3).
 * Só pode ser invocado no servidor — em cliente, `createServerOnlyFn` falha antes do corpo.
 */
export const hasSupabaseSessionCookie = createServerOnlyFn(async (): Promise<boolean> => {
  const [{ createServerClient }, { getCookies, setCookie, setResponseHeader }] = await Promise.all([
    import("@supabase/ssr"),
    import("@tanstack/react-start/server"),
  ]);

  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!url || !key) return false;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        const jar = getCookies();
        return Object.entries(jar).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options);
        }
        for (const [hname, hval] of Object.entries(headers)) {
          setResponseHeader(hname as never, hval);
        }
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
});
