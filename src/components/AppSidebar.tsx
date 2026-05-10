import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Stars, Heart, CalendarRange, Settings, Sparkles, LogOut, Crown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Home;
  premium?: boolean;
};

const items: NavItem[] = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "Meus Mapas", url: "/mapas", icon: Stars },
  { title: "Compatibilidade", url: "/compatibilidade", icon: Heart },
  { title: "Trânsitos", url: "/transitos", icon: CalendarRange },
  { title: "Planos Premium", url: "/premium", icon: Crown },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();

  return (
    <TooltipProvider delayDuration={300}>
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-mystical text-white shadow-mystical">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-semibold tracking-tight">AstroMap</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.url === "/premium"
                    ? path === "/premium"
                    : path.startsWith(item.url);
                const expandedLink = (
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.premium ? (
                      <Badge
                        variant="secondary"
                        className="bg-accent/20 text-accent-foreground text-[10px]"
                      >
                        PRO
                      </Badge>
                    ) : null}
                  </Link>
                );
                const collapsedLink = (
                  <Link to={item.url} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                  </Link>
                );
                return (
                  <SidebarMenuItem key={item.url}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={active}>
                            {collapsedLink}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild isActive={active}>
                        {expandedLink}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t space-y-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="default"
                size="icon"
                className="w-full bg-mystical text-white hover:opacity-90"
              >
                <Link to="/premium" aria-label="Planos Premium">
                  <Crown className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Planos Premium</TooltipContent>
          </Tooltip>
        ) : (
          <Button asChild variant="default" className="bg-mystical text-white hover:opacity-90">
            <Link to="/premium">
              <Crown className="mr-1 h-4 w-4" />
              Planos Premium
            </Link>
          </Button>
        )}
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 truncate text-xs text-muted-foreground">{user?.email}</div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => signOut()}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}
