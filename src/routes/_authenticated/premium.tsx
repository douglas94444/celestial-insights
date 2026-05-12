import { createFileRoute, redirect } from "@tanstack/react-router";

/** Retornos antigos do Mercado Pago (`/premium?mp=…`) redirecionam para o checkout actual. */
export const Route = createFileRoute("/_authenticated/premium")({
  validateSearch: (search: Record<string, unknown>): { mp?: "success" | "failure" | "pending" } => {
    const v = search.mp;
    if (v === "success" || v === "failure" || v === "pending") return { mp: v };
    return {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/assinatura",
      search: search as { mp?: "success" | "failure" | "pending" },
    });
  },
});
