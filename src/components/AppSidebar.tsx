import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Home,
  Stars,
  Heart,
  CalendarRange,
  Settings,
  Sparkles,
  LogOut,
  Crown,
  Coffee,
  Shield,
} from "lucide-react";
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
import { useUserIsAdmin } from "@/hooks/use-user-is-admin";
import { useProfile } from "@/hooks/use-profile";
import { useSubscriptionRollout } from "@/hooks/use-subscription-rollout";
import type { RolloutGates } from "@/lib/subscription-rollout";
import {
  FREE_ROLLOUT_LOCKED_MESSAGE,
  isMapaTier,
  MAPA_ROLLOUT_LOCKED_MESSAGE,
  rolloutLockedMessage,
} from "@/lib/subscription-rollout";
import { Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Home;
  premium?: boolean;
  rolloutGate?: keyof RolloutGates;
};

const items: NavItem[] = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "Momento", url: "/momento", icon: Coffee, rolloutGate: "transits" },
  { title: "Meus Mapas", url: "/mapas", icon: Stars },
  { title: "Compatibilidade", url: "/compatibilidade", icon: Heart, rolloutGate: "synastry" },
  { title: "Trânsitos", url: "/transitos", icon: CalendarRange, rolloutGate: "transits" },
  { title: "Planos", url: "/planos", icon: Crown },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const adminGate = useUserIsAdmin();
  const showAdmin = adminGate.data === true;
  const { data: profile } = useProfile();
  const rollout = useSubscriptionRollout();
  const streak = profile?.moment_streak ?? 0;

  const navItems = useMemo(() => {
    const adminEntry: NavItem = { title: "Administração", url: "/admin", icon: Shield };
    return [...items.slice(0, 5), ...(showAdmin ? [adminEntry] : []), ...items.slice(5)];
  }, [showAdmin]);

  const isFreeRestricted = rollout?.freeRestricted ?? false;

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
                {navItems.map((item) => {
                  const active =
                    item.url === "/planos"
                      ? path === "/planos"
                      : item.url === "/admin"
                        ? path === "/admin" || path.startsWith("/admin/")
                        : path.startsWith(item.url);
                  const isMomento = item.url === "/momento";
                  const gate = item.rolloutGate;
                  const rolloutBlocked = !!rollout?.active && !!gate && !rollout.gates[gate];
                  const freeBlocked = isFreeRestricted && !!gate;
                  const isBlocked = rolloutBlocked || freeBlocked;
                  const rolloutTooltip = freeBlocked
                    ? FREE_ROLLOUT_LOCKED_MESSAGE
                    : rolloutBlocked &&
                        profile?.subscription_tier &&
                        isMapaTier(profile.subscription_tier)
                      ? MAPA_ROLLOUT_LOCKED_MESSAGE
                      : rolloutBlocked
                        ? rolloutLockedMessage(gate, rollout.dayIndex)
                        : null;
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
                      {isMomento && streak > 0 ? (
                        <Badge className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] px-1.5">
                          {streak}🔥
                        </Badge>
                      ) : null}
                    </Link>
                  );
                  const expandedDisabledFree = (
                    <span className="flex w-full cursor-not-allowed items-center gap-2 opacity-50">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </span>
                  );
                  const collapsedDisabledFree = (
                    <span className="flex items-center gap-2 opacity-50">
                      <item.icon className="h-4 w-4 shrink-0" />
                    </span>
                  );
                  const collapsedLink = (
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                    </Link>
                  );
                  const expandedDisabled = (
                    <span className="flex w-full cursor-not-allowed items-center gap-2 opacity-50">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {isMomento && streak > 0 ? (
                        <Badge className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] px-1.5">
                          {streak}🔥
                        </Badge>
                      ) : null}
                    </span>
                  );
                  const collapsedDisabled = (
                    <span className="flex items-center gap-2 opacity-50">
                      <item.icon className="h-4 w-4 shrink-0" />
                    </span>
                  );
                  return (
                    <SidebarMenuItem key={item.url}>
                      {isBlocked ? (
                        collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton isActive={false} className="pointer-events-none">
                                {freeBlocked ? collapsedDisabledFree : collapsedDisabled}
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              {rolloutTooltip}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton isActive={false} className="pointer-events-none">
                                {freeBlocked ? expandedDisabledFree : expandedDisabled}
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              {rolloutTooltip}
                            </TooltipContent>
                          </Tooltip>
                        )
                      ) : collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild isActive={active}>
                              {collapsedLink}
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {item.title}
                            {isMomento && streak > 0 ? ` · ${streak}🔥` : ""}
                          </TooltipContent>
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
                  <Link
                    to={isFreeRestricted ? "/assinatura" : "/planos"}
                    search={isFreeRestricted ? { produto: "mapa" } : undefined}
                    aria-label={isFreeRestricted ? "Comprar Mapa" : "Planos"}
                  >
                    <Crown className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isFreeRestricted ? "Comprar Mapa — R$ 37" : "Planos"}
              </TooltipContent>
            </Tooltip>
          ) : isFreeRestricted ? (
            <Button asChild variant="default" className="bg-mystical text-white hover:opacity-90">
              <Link to="/assinatura" search={{ produto: "mapa" }}>
                <Crown className="mr-1 h-4 w-4" />
                Comprar Mapa — R$ 37
              </Link>
            </Button>
          ) : (
            <Button asChild variant="default" className="bg-mystical text-white hover:opacity-90">
              <Link to="/planos">
                <Crown className="mr-1 h-4 w-4" />
                Planos
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
