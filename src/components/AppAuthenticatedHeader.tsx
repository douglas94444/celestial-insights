import { useRouterState } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { titleForAuthenticatedPath } from "@/lib/authenticated-route-titles";

export function AppAuthenticatedHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleForAuthenticatedPath(pathname);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:gap-3 md:px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
      </div>
      <ThemeToggle />
    </header>
  );
}
