import { createServerOnlyFn } from "@tanstack/react-start";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/integrations/supabase/public-config";
import type { Database } from "@/integrations/supabase/types";

/**
 * Confirma utilizador autenticado no SSR via cookies (`getUser()` valida com o Auth).
 * Só pode ser invocado no servidor — em cliente, `createServerOnlyFn` falha antes do corpo.
 */
export const hasSupabaseSessionCookie = createServerOnlyFn(async (): Promise<boolean> => {
  const [{ createServerClient }, { getCookies, setCookie, setResponseHeader }] = await Promise.all([
    import("@supabase/ssr"),
    import("@tanstack/react-start/server"),
  ]);

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
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
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return !!user && !error;
});
