import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppAuthenticatedHeader } from "@/components/AppAuthenticatedHeader";
import { AuthenticatedSessionSkeleton } from "@/components/AuthenticatedSessionSkeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePostAuthRedirectPath } from "@/lib/auth-redirect";
import { hasSupabaseSessionCookie } from "@/lib/supabase-auth-server";

function AuthenticatedErrorFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground">Não foi possível carregar a sessão.</p>
      <a href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Voltar ao início
      </a>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  errorComponent: AuthenticatedErrorFallback,
  beforeLoad: async ({ location }) => {
    const safeRedirect = sanitizePostAuthRedirectPath(location.pathname);
    const authSearch = safeRedirect ? { redirect: safeRedirect } : {};
    try {
      if (typeof window !== "undefined") {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw redirect({ to: "/auth", search: authSearch });
        return;
      }
      const ok = await hasSupabaseSessionCookie();
      if (!ok) throw redirect({ to: "/auth", search: authSearch });
    } catch (e) {
      // Re-throw TanStack Router redirect objects
      if (e != null && typeof e === "object" && ("href" in e || "statusCode" in e)) throw e;
      // Network or unexpected error → redirect to auth
      throw redirect({ to: "/auth", search: authSearch });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const red = sanitizePostAuthRedirectPath(location.pathname);
      void navigate({
        to: "/auth",
        search: red ? { redirect: red } : {},
        replace: true,
      });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading || !user) {
    return <AuthenticatedSessionSkeleton />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppAuthenticatedHeader />
          <main className="relative flex-1 overflow-auto bg-shell-glow texture-grain">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
