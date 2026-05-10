import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Stars, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { HOROSCOPE_DAILY } from "@/data/interpretations";
import type { SignName } from "@/lib/astrology/zodiac";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import type { Aspect, ChartData, HousePosition, PlanetPosition } from "@/lib/astrology/calculate";
import { UpgradeMapModal } from "@/components/UpgradeMapModal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: charts = [] } = useQuery({
    queryKey: ["charts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const primary = charts.find((c) => c.is_primary) ?? charts[0];
  const planets = (primary?.planets_data as PlanetPosition[] | null) ?? [];
  const houses = (primary?.houses_data as HousePosition[] | null) ?? [];
  const aspects = (primary?.aspects_data as Aspect[] | null) ?? [];
  const ascendant = houses[0]?.cusp ?? 0;
  const wheelData: ChartData | null = primary
    ? {
        ascendant,
        midheaven: 0,
        planets,
        houses,
        aspects,
      }
    : null;

  const sunSign = planets.find((p) => p.key === "sun")?.sign as SignName | undefined;

  function handleNewMap() {
    if (profile?.subscription_tier === "FREE" && charts.length >= 1) {
      setUpgradeOpen(true);
      return;
    }
    navigate({ to: "/mapas/novo" });
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Olá ✨</h1>
          <p className="text-muted-foreground">Seu universo astrológico</p>
        </div>
        <Button
          type="button"
          onClick={handleNewMap}
          className="bg-mystical text-white hover:opacity-90"
        >
          <Plus className="mr-1 h-4 w-4" /> Novo mapa
        </Button>
      </div>

      <UpgradeMapModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />

      {!primary && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="h-10 w-10 text-primary" />
            <p className="font-medium">Você ainda não criou nenhum mapa.</p>
            <Button asChild className="bg-mystical text-white hover:opacity-90">
              <Link to="/onboarding">Criar meu primeiro mapa</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {primary && wheelData && (
          <Card className="md:col-span-2 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stars className="h-5 w-5 text-primary" /> Meu Mapa Principal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="mx-auto shrink-0 md:mx-0">
                <NatalChartWheel data={wheelData} size={280} />
              </div>
              <div className="flex-1 space-y-3">
                <p className="font-display text-xl font-semibold">{primary.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(primary.birth_date).toLocaleDateString("pt-BR")} · {primary.birth_place}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(["sun", "moon"] as const).map((k) => {
                    const p = planets.find((x) => x.key === k);
                    return (
                      <div
                        key={k}
                        className="rounded-lg bg-muted/50 p-3 text-center ring-1 ring-accent/15 shadow-sm"
                      >
                        <div className="text-xs uppercase text-muted-foreground">
                          {k === "sun" ? "Sol" : "Lua"}
                        </div>
                        <div className="mt-1 font-display font-semibold">{p?.sign ?? "—"}</div>
                      </div>
                    );
                  })}
                  <div className="rounded-lg bg-muted/50 p-3 text-center ring-1 ring-accent/15 shadow-sm">
                    <div className="text-xs uppercase text-muted-foreground">Asc</div>
                    <div className="mt-1 font-display font-semibold">{houses[0]?.sign ?? "—"}</div>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full border-accent/30">
                  <Link to="/mapas/$id" params={{ id: primary.id }}>
                    Ver detalhes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="ring-1 ring-accent/10 shadow-soft">
          <CardHeader>
            <CardTitle>Horóscopo Hoje</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sunSign ? HOROSCOPE_DAILY[sunSign] : "Crie seu mapa para ver o horóscopo do dia."}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-dashed ring-1 ring-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" /> Próximos Trânsitos
              <Badge variant="secondary" className="bg-accent/25 text-accent-foreground">
                PREMIUM
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Em breve: receba análises dos planetas em movimento sobre seu mapa natal.
          </CardContent>
        </Card>
      </div>

      {charts.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-3">Meus mapas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {charts.map((c) => (
              <Link key={c.id} to="/mapas/$id" params={{ id: c.id }}>
                <Card className="hover:border-primary hover:shadow-soft transition-all">
                  <CardContent className="p-4">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.birth_date).toLocaleDateString("pt-BR")} · {c.birth_place}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
