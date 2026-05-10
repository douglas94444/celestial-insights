import type { Session } from "@supabase/supabase-js";

type HeadersInitRecord =
  NonNullable<Parameters<typeof fetch>[1]> extends { headers?: infer H } ? H : HeadersInit;

/** Chama uma server function TanStack Start com Bearer JWT do Supabase. */
export function withSupabaseAuth<S>(session: Session | null): { headers: HeadersInitRecord } {
  const token = session?.access_token;
  if (!token) {
    throw new Error("Sessão necessária para esta operação.");
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}
