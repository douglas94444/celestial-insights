import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthenticatedSessionSkeleton } from "@/components/AuthenticatedSessionSkeleton";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/dashboard",
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const { next } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      void navigate({ to: user ? next : "/auth", replace: true });
    }
  }, [loading, user, next, navigate]);

  return <AuthenticatedSessionSkeleton />;
}
