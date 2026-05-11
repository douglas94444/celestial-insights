import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BackToDashboardLink } from "@/components/BackToDashboardLink";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AiCacheAgeBadge } from "@/components/AiCacheAgeBadge";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import { NatalAspectsVirtualList } from "@/components/NatalAspectsVirtualList";
import { computeAngles, type HouseSystemId } from "@/lib/astrology/calculate";
import { HOUSE_SYSTEM_LABELS } from "@/lib/astrology/houses";
import type { ChartData, PlanetPosition } from "@/lib/astrology/calculate";
import { signFromLongitude, formatDegree, PLANETS, type PlanetKey } from "@/lib/astrology/zodiac";
import { SUN_IN_SIGN, MOON_IN_SIGN, ASC_IN_SIGN } from "@/data/interpretations";
import {
  aspectMood,
  HOUSE_MEANINGS,
  planetInSignInterpretation,
  planetInHouseInterpretation,
} from "@/data/chart-detail-interpretations";
import {
  deriveChartPatterns,
  planetKeysLabelPt,
  SPECIAL_GEOMETRY_BLURBS,
} from "@/lib/chart-patterns";
import type { SignName } from "@/lib/astrology/zodiac";
import { parseTimezoneLabelToMinutes } from "@/lib/timezone-br";
import {
  generateNatalExecutiveSummaryFn,
  generateNatalPlanetInsightFn,
} from "@/lib/ai-interpretation.functions";
import { recalculateChartFn } from "@/lib/charts.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { useAuth } from "@/hooks/use-auth";
import { tryParseStoredChartGeometry } from "@/lib/schemas/chart-payload";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import {
  ENGAGEMENT_ROUTES,
  ENGAGEMENT_TOPICS,
  insertEngagementEventDeduped,
  recordAiEngagement,
} from "@/lib/engagement";
import type {
  AiInterpretationFnResult,
  RecalculateChartFnResult,
} from "@/lib/types/server-fn-results";

export const Route = createFileRoute("/_authenticated/mapas/$id")({
  component: ChartView,
});

function ChartView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    insertEngagementEventDeduped(supabase, user.id, {
      route_key: ENGAGEMENT_ROUTES.mapas_detail,
      topic_key: ENGAGEMENT_TOPICS.chart_detail_open,
      meta: { chart_id: id },
    });
  }, [user?.id, id]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("house_system, subscription_tier")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [aspectFilter, setAspectFilter] = useState<"todos" | "harmonicos" | "desafiadores">(
    "todos",
  );
  const [aiExecOpen, setAiExecOpen] = useState(false);
  const [aiExecutiveText, setAiExecutiveText] = useState<string | null>(null);
  const [aiExecutiveCachedAt, setAiExecutiveCachedAt] = useState<string | null>(null);
  const [aiPlanetTexts, setAiPlanetTexts] = useState<Partial<Record<PlanetKey, string>>>({});
  const [aiPlanetCachedAt, setAiPlanetCachedAt] = useState<Partial<Record<PlanetKey, string>>>({});
  const [aiPlanetLoading, setAiPlanetLoading] = useState<PlanetKey | null>(null);

  useEffect(() => {
    setAiExecutiveText(null);
    setAiExecutiveCachedAt(null);
    setAiPlanetTexts({});
    setAiPlanetCachedAt({});
  }, [id]);

  const { data: chart, isLoading } = useQuery({
    queryKey: ["chart", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("charts").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const timezoneOffset =
    chart?.timezone_offset_minutes ?? parseTimezoneLabelToMinutes(chart?.timezone ?? "") ?? -180;

  const storedHouseSystem = (chart?.house_system as HouseSystemId | undefined) ?? "placidus";
  const profileHouseSystem = (profile?.house_system as HouseSystemId | undefined) ?? "placidus";

  const angles = useMemo(() => {
    if (!chart) return { ascendant: 0, midheaven: 0 };
    return computeAngles({
      birthDate: chart.birth_date,
      birthTime: chart.birth_time,
      latitude: chart.latitude,
      longitude: chart.longitude,
      timezoneOffset,
      houseSystem: storedHouseSystem,
    });
  }, [chart, timezoneOffset, storedHouseSystem]);

  const parsedChart = useMemo(() => {
    if (!chart) return null;
    return tryParseStoredChartGeometry(chart);
  }, [chart]);

  const planetsByHouse = useMemo(() => {
    if (!parsedChart) return new Map<number, PlanetPosition[]>();
    const map = new Map<number, PlanetPosition[]>();
    for (const p of parsedChart.planets) {
      const bucket = map.get(p.house) ?? [];
      bucket.push(p);
      map.set(p.house, bucket);
    }
    return map;
  }, [parsedChart]);

  const needsRecalcPlanets = !!parsedChart && parsedChart.planets.length < PLANETS.length;

  const needsRecalcHouseMismatch = !!chart && !!profile && storedHouseSystem !== profileHouseSystem;

  const needsRecalc = needsRecalcPlanets || needsRecalcHouseMismatch;

  const chartPatterns = useMemo(() => {
    if (!parsedChart) return null;
    const asc = parsedChart.houses[0]?.cusp ?? angles.ascendant;
    const cd: ChartData = {
      ascendant: asc,
      midheaven: angles.midheaven,
      planets: parsedChart.planets,
      houses: parsedChart.houses,
      aspects: parsedChart.aspects,
    };
    return deriveChartPatterns(cd);
  }, [parsedChart, angles.ascendant, angles.midheaven]);

  const chartWheelData = useMemo((): ChartData | null => {
    if (!parsedChart) return null;
    const asc = parsedChart.houses[0]?.cusp ?? angles.ascendant;
    return {
      ascendant: asc,
      midheaven: angles.midheaven,
      planets: parsedChart.planets,
      houses: parsedChart.houses,
      aspects: parsedChart.aspects,
    };
  }, [parsedChart, angles.ascendant, angles.midheaven]);

  const planetByKey = useMemo(() => {
    if (!parsedChart) return new Map<PlanetKey, PlanetPosition>();
    return new Map(parsedChart.planets.map((p) => [p.key, p]));
  }, [parsedChart]);

  const filteredAspects = useMemo(() => {
    if (!parsedChart) return [];
    return parsedChart.aspects.filter((a) => {
      if (aspectFilter === "todos") return true;
      const m = aspectMood(a.type);
      if (aspectFilter === "harmonicos") return m === "harmonic";
      return m === "desafiador";
    });
  }, [parsedChart, aspectFilter]);

  const chartEssence = useMemo(() => {
    if (!parsedChart) return null;
    const ascendant = parsedChart.houses[0]?.cusp ?? angles.ascendant;
    const planets = parsedChart.planets;
    return {
      sun: planets.find((p) => p.key === "sun"),
      moon: planets.find((p) => p.key === "moon"),
      ascendant,
      ascSign: signFromLongitude(ascendant) as SignName,
      planets,
      houses: parsedChart.houses,
      aspects: parsedChart.aspects,
    };
  }, [parsedChart, angles.ascendant]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Excluir este mapa?")) return;
    const { error } = await supabase.from("charts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Mapa excluído");
      navigate({ to: "/dashboard" });
    }
  }, [id, navigate]);

  const aiExecutiveMutation = useMutation<AiInterpretationFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return generateNatalExecutiveSummaryFn({
        data: { chartId: id },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setAiExecutiveText(r.content);
      setAiExecutiveCachedAt(r.cached ? (r.cached_at ?? null) : null);
      recordAiEngagement(supabase, user?.id, {
        route_key: ENGAGEMENT_ROUTES.mapas_detail,
        topic_key: ENGAGEMENT_TOPICS.ai_natal_executive,
        cached: r.cached,
        meta: { chart_id: id },
      });
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: (e) => void toastServerFnError(e),
  });

  const aiPlanetMutation = useMutation<AiInterpretationFnResult, Error, PlanetKey>({
    mutationFn: async (planetKey: PlanetKey) => {
      if (!session) throw new Error("Sessão necessária.");
      return generateNatalPlanetInsightFn({
        data: { chartId: id, planetKey },
        ...withSupabaseAuth(session),
      });
    },
    onMutate: (planetKey) => setAiPlanetLoading(planetKey),
    onSettled: () => setAiPlanetLoading(null),
    onSuccess: (r, planetKey) => {
      setAiPlanetTexts((prev) => ({ ...prev, [planetKey]: r.content }));
      setAiPlanetCachedAt((prev) => ({
        ...prev,
        [planetKey]: r.cached ? (r.cached_at ?? undefined) : undefined,
      }));
      recordAiEngagement(supabase, user?.id, {
        route_key: ENGAGEMENT_ROUTES.mapas_detail,
        topic_key: ENGAGEMENT_TOPICS.ai_natal_planet,
        cached: r.cached,
        meta: { chart_id: id, planet_key: planetKey },
      });
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: (e) => void toastServerFnError(e),
  });

  const recalcMutation = useMutation<RecalculateChartFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return recalculateChartFn({
        data: { chartId: id },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chart", id] });
      await queryClient.invalidateQueries({ queryKey: ["charts"] });
      toast.success("Mapa recalculado com os dados atualizados.");
    },
    onError: (e) => void toastServerFnError(e),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-9 w-44 rounded-md" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <Skeleton className="mx-auto h-[280px] w-[280px] shrink-0 rounded-full lg:mx-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  if (!chart) return <div className="p-6">Mapa não encontrado.</div>;

  if (!parsedChart) {
    return (
      <div className="container mx-auto max-w-5xl p-6">
        <p className="text-destructive">
          Os dados guardados deste mapa não são válidos. Experimente «Recalcular mapa» ou crie um
          mapa novo.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => recalcMutation.mutate()}>
          Recalcular mapa
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <BackToDashboardLink buttonClassName="mb-4" />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">{chart.name}</h1>
          <p className="text-muted-foreground">
            {new Date(chart.birth_date).toLocaleDateString("pt-BR")} às {chart.birth_time} ·{" "}
            {chart.birth_place}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {needsRecalc && (
            <Button
              variant="secondary"
              size="sm"
              disabled={recalcMutation.isPending}
              onClick={() => recalcMutation.mutate()}
            >
              <RefreshCw
                className={`mr-1 h-4 w-4 ${recalcMutation.isPending ? "animate-spin" : ""}`}
              />
              Recalcular mapa
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" /> Excluir
          </Button>
        </div>
      </div>

      {needsRecalc && (
        <div className="text-sm text-muted-foreground mb-4 space-y-2">
          {needsRecalcPlanets && (
            <p>
              Este mapa foi salvo com uma versão anterior do cálculo. Use &quot;Recalcular
              mapa&quot; para incluir Quiron, Nodos e aspectos atualizados.
            </p>
          )}
          {needsRecalcHouseMismatch && (
            <p>
              O seu sistema de casas nas{" "}
              <Link to="/configuracoes" className="text-primary underline underline-offset-2">
                Configurações
              </Link>{" "}
              ({HOUSE_SYSTEM_LABELS[profileHouseSystem]}) não coincide com o deste mapa (
              {HOUSE_SYSTEM_LABELS[storedHouseSystem]}). Recalcule para alinhar casas e planetas ao
              perfil atual.
            </p>
          )}
        </div>
      )}

      <Collapsible open={aiExecOpen} onOpenChange={setAiExecOpen} className="mb-6">
        <Card className="border-primary/20 bg-muted/15">
          <CardContent className="p-4">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left font-display text-lg font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Interpretação integrada (IA)
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform ${aiExecOpen ? "rotate-180" : ""}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Camada opcional que complementa os textos fixos desta página. Se o serviço de IA
                falhar, continue a usar as interpretações estáticas.{" "}
                {profile?.subscription_tier === "FREE" ? (
                  <span>
                    No plano gratuito aplicam-se limites mensais de gerações novas (consulte a
                    documentação do ambiente).
                  </span>
                ) : null}
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={aiExecutiveMutation.isPending}
                onClick={() => aiExecutiveMutation.mutate()}
              >
                {aiExecutiveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Gerar resumo executivo
              </Button>
              {aiExecutiveText ? (
                <article className="space-y-2 rounded-lg border bg-card p-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  <AiCacheAgeBadge cachedAt={aiExecutiveCachedAt} />
                  {aiExecutiveText}
                </article>
              ) : null}
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <NatalChartWheel data={chartWheelData!} />
            <p className="text-center text-xs text-muted-foreground mt-2">
              {HOUSE_SYSTEM_LABELS[storedHouseSystem]} · Meio do Céu (MC){" "}
              {formatDegree(angles.midheaven)} — {signFromLongitude(angles.midheaven)}
            </p>
          </CardContent>
        </Card>

        <div>
          <Tabs defaultValue="essencia">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="essencia">Essência</TabsTrigger>
              <TabsTrigger value="planetas">Planetas</TabsTrigger>
              <TabsTrigger value="casas">Casas</TabsTrigger>
              <TabsTrigger value="aspectos">Aspectos</TabsTrigger>
            </TabsList>

            <TabsContent value="essencia" className="space-y-5 mt-4">
              {chartEssence?.sun && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-display text-lg font-semibold">
                      ☉ Sol em {chartEssence.sun.sign}{" "}
                      <span className="text-muted-foreground text-sm">
                        · {formatDegree(chartEssence.sun.longitude)}
                      </span>
                    </h3>
                    <p className="mt-2 text-sm text-foreground/80">
                      {SUN_IN_SIGN[chartEssence.sun.sign as SignName]}
                    </p>
                  </CardContent>
                </Card>
              )}
              {chartEssence?.moon && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-display text-lg font-semibold">
                      ☽ Lua em {chartEssence.moon.sign}{" "}
                      <span className="text-muted-foreground text-sm">
                        · {formatDegree(chartEssence.moon.longitude)}
                      </span>
                    </h3>
                    <p className="mt-2 text-sm text-foreground/80">
                      {MOON_IN_SIGN[chartEssence.moon.sign as SignName]}
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-display text-lg font-semibold">
                    ↗ Ascendente em {chartEssence!.ascSign}{" "}
                    <span className="text-muted-foreground text-sm">
                      · {formatDegree(chartEssence!.ascendant)}
                    </span>
                  </h3>
                  <p className="mt-2 text-sm text-foreground/80">
                    {ASC_IN_SIGN[chartEssence!.ascSign]}
                  </p>
                </CardContent>
              </Card>

              {chartPatterns &&
                (chartPatterns.grand_trines.length > 0 ||
                  chartPatterns.t_squares.length > 0 ||
                  chartPatterns.grand_crosses.length > 0 ||
                  chartPatterns.yods.length > 0) && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-5 space-y-4">
                      <h3 className="font-display text-lg font-semibold">
                        Configurações especiais
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Padrões geométricos entre planetas (orbes do cálculo natal). Leitura
                        simbólica, não determinística.
                      </p>
                      <ul className="space-y-4 text-sm">
                        {chartPatterns.grand_trines.map((g, idx) => (
                          <li key={`gt-${idx}-${g.planets.join("-")}`}>
                            <p className="font-medium">Grande trígono ({g.element})</p>
                            <p className="text-muted-foreground">{planetKeysLabelPt(g.planets)}</p>
                            <p className="mt-1 text-foreground/85">
                              {SPECIAL_GEOMETRY_BLURBS.grand_trine}
                            </p>
                          </li>
                        ))}
                        {chartPatterns.t_squares.map((t, idx) => (
                          <li key={`ts-${idx}-${t.apex}-${t.opposition.join("-")}`}>
                            <p className="font-medium">T-quadrado</p>
                            <p className="text-muted-foreground">
                              Vértice {planetKeysLabelPt([t.apex])} · oposição{" "}
                              {planetKeysLabelPt([t.opposition[0], t.opposition[1]])}
                            </p>
                            <p className="mt-1 text-foreground/85">
                              {SPECIAL_GEOMETRY_BLURBS.t_square}
                            </p>
                          </li>
                        ))}
                        {chartPatterns.grand_crosses.map((gc, idx) => (
                          <li key={`gc-${idx}-${gc.planets.join("-")}`}>
                            <p className="font-medium">Grande cruz</p>
                            <p className="text-muted-foreground">{planetKeysLabelPt(gc.planets)}</p>
                            <p className="mt-1 text-foreground/85">
                              {SPECIAL_GEOMETRY_BLURBS.grand_cross}
                            </p>
                          </li>
                        ))}
                        {chartPatterns.yods.map((y, idx) => (
                          <li key={`yod-${idx}-${y.apex}-${y.sextile.join("-")}`}>
                            <p className="font-medium">Yod (Dedo de Deus)</p>
                            <p className="text-muted-foreground">
                              Vértice {planetKeysLabelPt([y.apex])} · base em sextil{" "}
                              {planetKeysLabelPt([y.sextile[0], y.sextile[1]])}
                            </p>
                            <p className="mt-1 text-foreground/85">{SPECIAL_GEOMETRY_BLURBS.yod}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
            </TabsContent>

            <TabsContent
              value="planetas"
              className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-1"
            >
              {PLANETS.map((meta) => {
                const p = planetByKey.get(meta.key);
                if (!p) return null;
                return (
                  <Card key={p.key}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-display text-base font-semibold">
                          <span className="mr-1.5">{p.symbol}</span>
                          {p.name} em {p.sign}{" "}
                          <span className="text-muted-foreground text-sm font-normal inline-flex flex-wrap items-center gap-1">
                            · {formatDegree(p.longitude)} · Casa {p.house}
                            {p.retrograde ? (
                              <Badge
                                variant="outline"
                                className="text-amber-600 border-amber-400 text-[10px] px-1 py-0 font-normal"
                              >
                                ℞
                              </Badge>
                            ) : null}
                          </span>
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-xs h-8"
                          disabled={aiPlanetLoading === p.key}
                          onClick={() => aiPlanetMutation.mutate(p.key)}
                        >
                          {aiPlanetLoading === p.key ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1 h-3 w-3" />
                          )}
                          Aprofundar com IA
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-foreground/85 leading-relaxed">
                        {planetInSignInterpretation(p.key, p.sign as SignName)}
                      </p>
                      {aiPlanetTexts[p.key] ? (
                        <article className="mt-3 space-y-2 rounded-md border border-primary/15 bg-primary/5 p-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          <AiCacheAgeBadge cachedAt={aiPlanetCachedAt[p.key]} />
                          {aiPlanetTexts[p.key]}
                        </article>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="casas" className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground">
                Sistema usado neste mapa: <strong>{HOUSE_SYSTEM_LABELS[storedHouseSystem]}</strong>.
                Altere o padrão em{" "}
                <Link to="/configuracoes" className="text-primary underline underline-offset-2">
                  Configurações
                </Link>{" "}
                e use &quot;Recalcular mapa&quot; para aplicar outro sistema sem criar um mapa novo.
              </p>
              {chartEssence!.houses.map((house) => {
                const inHouse = planetsByHouse.get(house.number) ?? [];
                return (
                  <Card key={house.number}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-base font-semibold">
                            Casa {house.number}{" "}
                            <span className="text-muted-foreground font-normal text-sm">
                              · cúspide em {house.sign} ({formatDegree(house.cusp)})
                            </span>
                          </h3>
                          <p className="mt-2 text-sm text-foreground/85 leading-relaxed">
                            {HOUSE_MEANINGS[house.number]}
                          </p>
                        </div>
                      </div>
                      {inHouse.length > 0 ? (
                        <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
                          {inHouse.map((p) => (
                            <li key={p.key} className="text-sm">
                              <span className="font-medium">
                                {p.symbol} {p.name}
                              </span>{" "}
                              em {p.sign} ({formatDegree(p.longitude)}){" "}
                              {p.retrograde ? (
                                <Badge
                                  variant="outline"
                                  className="align-middle text-amber-600 border-amber-400 text-[10px] px-1 py-0 font-normal"
                                >
                                  ℞
                                </Badge>
                              ) : null}{" "}
                              —{" "}
                              <span className="text-muted-foreground">
                                {planetInHouseInterpretation(p.key, house.number) ||
                                  `${p.name} em ${p.sign} colore esta área com sua energia arquetípica.`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground italic">
                          Nenhum planeta listado neste segmento (útil para áreas mais livres de
                          ênfase planetária direta).
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="aspectos" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Filtrar:</span>
                <Select
                  value={aspectFilter}
                  onValueChange={(v) =>
                    setAspectFilter(v as "todos" | "harmonicos" | "desafiadores")
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os aspectos</SelectItem>
                    <SelectItem value="harmonicos">Harmônicos (trígono, sextil)</SelectItem>
                    <SelectItem value="desafiadores">
                      Desafiadores (quadratura, oposição)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="font-normal">
                  {filteredAspects.length} de {chartEssence!.aspects.length}
                </Badge>
              </div>

              {filteredAspects.length === 0 ? (
                <div className="rounded-lg border border-border/80 p-4 text-sm text-muted-foreground">
                  Nenhum aspecto neste filtro (ou lista vazia).
                </div>
              ) : (
                <NatalAspectsVirtualList aspects={filteredAspects} planetByKey={planetByKey} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
