import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import type { ChartData, PlanetPosition, HousePosition, Aspect } from "@/lib/astrology/calculate";
import { signFromLongitude, formatDegree } from "@/lib/astrology/zodiac";
import { SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN } from "@/data/interpretations";
import type { SignName } from "@/lib/astrology/zodiac";

export const Route = createFileRoute("/_authenticated/mapas/$id")({
  component: ChartView,
});

function ChartView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: chart, isLoading } = useQuery({
    queryKey: ["chart", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("charts").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando mapa...</div>;
  if (!chart) return <div className="p-6">Mapa não encontrado.</div>;

  const planets = chart.planets_data as unknown as PlanetPosition[];
  const houses = chart.houses_data as unknown as HousePosition[];
  const aspects = chart.aspects_data as unknown as Aspect[];
  const ascendant = houses[0]?.cusp ?? 0;
  const data: ChartData = { ascendant, midheaven: 0, planets, houses, aspects };

  const sun = planets.find((p) => p.key === "sun");
  const moon = planets.find((p) => p.key === "moon");
  const ascSign = signFromLongitude(ascendant) as SignName;

  async function handleDelete() {
    if (!confirm("Excluir este mapa?")) return;
    const { error } = await supabase.from("charts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Mapa excluído");
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{chart.name}</h1>
          <p className="text-muted-foreground">
            {new Date(chart.birth_date).toLocaleDateString("pt-BR")} às {chart.birth_time} · {chart.birth_place}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" /> Excluir
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <NatalChartWheel data={data} />
          </CardContent>
        </Card>

        <div>
          <Tabs defaultValue="essencia">
            <TabsList>
              <TabsTrigger value="essencia">Essência</TabsTrigger>
              <TabsTrigger value="planetas">
                Planetas <Badge variant="secondary" className="ml-1 bg-accent/20 text-[10px]">PRO</Badge>
              </TabsTrigger>
              <TabsTrigger value="casas">
                Casas <Badge variant="secondary" className="ml-1 bg-accent/20 text-[10px]">PRO</Badge>
              </TabsTrigger>
              <TabsTrigger value="aspectos">
                Aspectos <Badge variant="secondary" className="ml-1 bg-accent/20 text-[10px]">PRO</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="essencia" className="space-y-5 mt-4">
              {sun && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-display text-lg font-semibold">
                      ☉ Sol em {sun.sign} <span className="text-muted-foreground text-sm">· {formatDegree(sun.longitude)}</span>
                    </h3>
                    <p className="mt-2 text-sm text-foreground/80">{SUN_IN_SIGN[sun.sign as SignName]}</p>
                  </CardContent>
                </Card>
              )}
              {moon && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-display text-lg font-semibold">
                      ☽ Lua em {moon.sign} <span className="text-muted-foreground text-sm">· {formatDegree(moon.longitude)}</span>
                    </h3>
                    <p className="mt-2 text-sm text-foreground/80">{MOON_IN_SIGN[moon.sign as SignName]}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-display text-lg font-semibold">
                    ↗ Ascendente em {ascSign} <span className="text-muted-foreground text-sm">· {formatDegree(ascendant)}</span>
                  </h3>
                  <p className="mt-2 text-sm text-foreground/80">{ASC_IN_SIGN[ascSign]}</p>
                </CardContent>
              </Card>
            </TabsContent>

            {(["planetas", "casas", "aspectos"] as const).map((t) => (
              <TabsContent key={t} value={t} className="mt-4">
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">Conteúdo Premium</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Desbloqueie interpretações completas dos 10 planetas, 12 casas e todos os aspectos do seu mapa.
                    </p>
                    <Button asChild className="bg-mystical text-white"><Link to="/configuracoes">Ver planos</Link></Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
