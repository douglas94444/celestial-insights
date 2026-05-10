import { createFileRoute, Navigate } from "@tanstack/react-router";

// /mapas/novo é um alias para o onboarding (formulário idêntico).
export const Route = createFileRoute("/_authenticated/mapas/novo")({
  component: () => <Navigate to="/onboarding" />,
});
