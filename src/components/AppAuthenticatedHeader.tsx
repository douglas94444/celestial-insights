import { Link, useRouterState } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUserIsAdmin } from "@/hooks/use-user-is-admin";
import { titleForAuthenticatedPath } from "@/lib/authenticated-route-titles";

export function AppAuthenticatedHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleForAuthenticatedPath(pathname);
  const adminGate = useUserIsAdmin();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:gap-3 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
      </div>
      {adminGate.data === true ? (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 px-2 text-muted-foreground"
          asChild
        >
          <Link to="/admin">
            <Shield className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </Button>
      ) : null}
      <ThemeToggle />
    </header>
  );
}
