import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppAuthenticatedHeader } from "@/components/AppAuthenticatedHeader";
import { AuthenticatedSessionSkeleton } from "@/components/AuthenticatedSessionSkeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseSessionCookie } from "@/lib/supabase-auth-server";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/auth" });
      return;
    }
    const ok = await hasSupabaseSessionCookie();
    if (!ok) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [user, loading, navigate]);

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
