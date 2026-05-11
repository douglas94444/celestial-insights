import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchChartsList } from "@/hooks/use-charts-list";
import { fetchProfile } from "@/hooks/use-profile";
import { Plus, Stars, Sparkles, CalendarRange, Heart, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiButton } from "@/components/AiButton";
import { AiTextCard } from "@/components/AiTextCard";
import { TransitScoreBadges } from "@/components/TransitScoreBadges";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import { useDailyMoment } from "@/hooks/use-daily-moment";
import { useAuth } from "@/hooks/use-auth";
import { ENGAGEMENT_ROUTES, ENGAGEMENT_TOPICS } from "@/lib/engagement";
import { usePageEngagement } from "@/hooks/use-page-engagement";
import { buildShareCardDailyExtras, buildTransitLuckFingerprint } from "@/data/share-card-daily";
import { generateAnnualForecastFn } from "@/lib/annual-forecast.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { Progress } from "@/components/ui/progress";
import type { GenerateAnnualForecastFnResult } from "@/lib/types/server-fn-results";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, session } = useAuth();
  const prefetchedRef = useRef(false);

  usePageEngagement(ENGAGEMENT_ROUTES.dashboard, ENGAGEMENT_TOPICS.dashboard_open);

  // Prefetch dados usados pelas rotas seguintes mais prováveis
  useEffect(() => {
    if (!user?.id || prefetchedRef.current) return;
    prefetchedRef.current = true;
    void qc.prefetchQuery({
      queryKey: ["charts", user.id],
      queryFn: fetchChartsList,
      staleTime: 60_000,
    });
    void qc.prefetchQuery({
      queryKey: ["profile", user.id],
      queryFn: () => fetchProfile(user.id),
      staleTime: 10 * 60_000,
    });
  }, [user?.id, qc]);

  const {
    charts,
    primary,
    planets,
    houses,
    wheelData,
    sunSign,
    moonSign,
    ascSign,
    transitToday,
    transitWeek,
    moonSkyLine,
    dashTransitAi,
    dashTransitAiMutation,
    morningDeep,
    natalEssenceQuery,
    horoscopeSolarLine,
    moonNatalExcerpt,
    ascMicroLine,
    formatWeekdayShort,
    todayStr,
  } = useDailyMoment();

  const dashShareExtras = useMemo(() => {
    if (!primary || !sunSign) return null;
    const fp = buildTransitLuckFingerprint(transitToday ?? undefined);
    return buildShareCardDailyExtras(sunSign, todayStr, fp);
  }, [primary, sunSign, todayStr, transitToday]);

  const currentYear = useMemo(() => new Date().getUTCFullYear(), []);
  const currentMonth = useMemo(() => new Date().getUTCMonth() + 1, []);

  const annualForecastQuery = useQuery<GenerateAnnualForecastFnResult>({
    queryKey: ["annual-forecast", primary?.id, currentYear],
    queryFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return generateAnnualForecastFn({
        data: { chartId: primary!.id, year: currentYear },
        ...withSupabaseAuth(session),
      });
    },
    enabled: !!session && !!primary?.id,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const currentMonthForecast = useMemo(() => {
    if (!annualForecastQuery.data?.months) return null;
    return annualForecastQuery.data.months.find((m) => m.month === currentMonth) ?? null;
  }, [annualForecastQuery.data, currentMonth]);

  function handleNewMap() {
    navigate({ to: "/mapas/novo" });
  }

  return (
    <div className="container mx-auto space-y-6 p-4 pb-8 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Card className="overflow-hidden md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stars className="h-5 w-5 text-primary" /> Meu Mapa Principal
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="mx-auto shrink-0 origin-top scale-[0.92] md:mx-0 md:scale-100">
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
                {natalEssenceQuery.data?.essence ? (
                  <p className="font-display text-sm italic text-foreground/75 leading-snug border-l-2 border-primary/30 pl-3">
                    "{natalEssenceQuery.data.essence}"
                  </p>
                ) : null}
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
            <CardTitle>Horóscopo hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <Badge variant="outline" className="mb-2 text-[10px] uppercase">
                Signo solar (geral)
              </Badge>
              <p>{horoscopeSolarLine ?? "Crie seu mapa para ver o horóscopo do dia."}</p>
            </div>

            {primary && moonSign && moonNatalExcerpt ? (
              <div className="rounded-md border border-accent/20 bg-muted/20 p-3">
                <Badge variant="outline" className="mb-2 text-[10px] uppercase">
                  Lua natal (autoconhecimento)
                </Badge>
                <p className="text-foreground/90 leading-snug">{moonNatalExcerpt}</p>
                <Link
                  to="/mapas/$id"
                  params={{ id: primary.id }}
                  className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver mapa
                </Link>
              </div>
            ) : null}

            {primary && ascSign && ascMicroLine ? (
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="w-fit text-[10px] uppercase">
                  Ascendente · {ascSign}
                </Badge>
                <p className="text-xs leading-snug text-foreground/85">{ascMicroLine}</p>
              </div>
            ) : null}

            {dashShareExtras ? (
              <div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-3">
                <Badge variant="outline" className="mb-2 text-[10px] uppercase">
                  Igual ao cartão Momento
                </Badge>
                <p className="text-xs leading-snug text-foreground/90">
                  <span className="font-semibold text-muted-foreground">Sorte:</span>{" "}
                  {dashShareExtras.luckLine}
                </p>
                <p className="mt-1 text-xs leading-snug text-foreground/90">
                  <span className="font-semibold text-muted-foreground">Cor de hoje:</span>{" "}
                  {dashShareExtras.colorLabel}{" "}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ({dashShareExtras.colorHex})
                  </span>
                </p>
                <Link
                  to="/momento"
                  className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Abrir Momento e partilhar
                </Link>
              </div>
            ) : null}

            {transitToday && (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-foreground">
                <Badge variant="secondary" className="mb-2 bg-primary/15 text-primary">
                  Personalizado · trânsitos × seu mapa
                </Badge>
                <p className="mb-2 text-xs text-muted-foreground">
                  Lua em trânsito em {transitToday.transitMoonSign || "—"} · intensidade{" "}
                  {transitToday.intensity}/100
                </p>
                {moonSkyLine ? (
                  <p className="mb-2 text-xs leading-snug text-muted-foreground">{moonSkyLine}</p>
                ) : null}
                <div className="mb-2">
                  <TransitScoreBadges scores={transitToday.scores} />
                </div>
                <ul className="list-disc space-y-1 pl-4 text-sm leading-snug">
                  {transitToday.narrative.slice(0, 4).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                {transitToday.narrative.length > 4 && (
                  <Link
                    to="/transitos"
                    className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ver trânsitos completos →
                  </Link>
                )}
                {transitToday.interpretiveHints.length > 0 ? (
                  <div className="mt-3 border-t border-primary/10 pt-3">
                    <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                      Para reflexão
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs leading-snug text-foreground/90">
                      {transitToday.interpretiveHints.slice(0, 3).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-3 space-y-2 border-t border-primary/10 pt-3">
                  <AiButton
                    isPending={dashTransitAiMutation.isPending}
                    onClick={() => dashTransitAiMutation.mutate()}
                    label="Explicar hoje com IA"
                    aria-label="Gerar explicação do trânsito de hoje com inteligência artificial"
                    className="w-full border-primary/25 text-xs"
                  />
                  {dashTransitAi ? (
                    <AiTextCard
                      text={dashTransitAi}
                      className="rounded-md border border-primary/10 bg-background/40 p-2 text-xs"
                    />
                  ) : null}
                </div>
              </div>
            )}

            {transitWeek.length > 0 ? (
              <div className="border-t border-border/60 pt-3">
                <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
                  Esta semana (7 dias)
                </p>
                <ul className="space-y-2">
                  {transitWeek.map((d) => (
                    <li
                      key={d.date}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground"
                    >
                      <span className="shrink-0 font-medium text-foreground">
                        {formatWeekdayShort(d.date)}
                      </span>
                      <span className="shrink-0">{d.intensity}/100</span>
                      <span className="min-w-0 flex-1 leading-snug">{d.narrative[0] ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border border-accent/20 shadow-soft md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-primary" /> Trânsitos & calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Veja uma janela de datas, marque dias intensos, filtre aspectos e exporte PDF. Envie
              um resumo por email quando o servidor tiver Resend configurado.
            </p>

            {currentMonthForecast ? (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Previsão do mês atual
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    Intensidade média {currentMonthForecast.avgIntensity}/100
                  </Badge>
                </div>
                <Progress value={currentMonthForecast.avgIntensity} className="h-1.5" />
                {currentMonthForecast.peakDays.slice(0, 2).length > 0 && (
                  <p className="text-xs text-foreground/80">
                    <span className="font-medium">Pico: </span>
                    {currentMonthForecast.peakDays.slice(0, 2).map((d) => (
                      <span key={d.date} className="mr-3">
                        {new Date(d.date + "T12:00:00Z").toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        ({d.intensity}/100)
                      </span>
                    ))}
                  </p>
                )}
                {(currentMonthForecast.retrogradePeriods.length > 0 ||
                  currentMonthForecast.ingresses.length > 0) && (
                  <p className="text-xs text-foreground/75">
                    {currentMonthForecast.retrogradePeriods.map((r) => (
                      <span key={`${r.planet}-${r.startDate}`} className="mr-2">
                        ⟲ {r.planet} retrógrado
                      </span>
                    ))}
                    {currentMonthForecast.ingresses.map((i) => (
                      <span key={`${i.planet}-${i.date}`} className="mr-2">
                        ↗ {i.planet} em {i.intoSign}
                      </span>
                    ))}
                  </p>
                )}
                <Link
                  to="/transitos"
                  className="inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver previsão anual completa →
                </Link>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-mystical text-white hover:opacity-90">
                <Link to="/transitos">
                  <Sparkles className="mr-1 h-4 w-4" /> Abrir trânsitos
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/momento">
                  <Sparkles className="mr-1 h-4 w-4" /> Momento com o céu
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {primary && (
        <div>
          <h2 className="mb-3 font-display text-xl font-semibold">Explorar</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link to="/compatibilidade">
              <Card className="h-full transition-all hover:border-primary hover:shadow-soft">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Heart className="h-5 w-5 text-primary" />
                    {charts.length >= 2 ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-400"
                      >
                        Pronto para usar
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        2 mapas
                      </Badge>
                    )}
                  </div>
                  <p className="font-display font-semibold text-sm">Sinastria</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Compare dois mapas e descubra compatibilidade de amor, trabalho e amizade.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/transitos">
              <Card className="h-full transition-all hover:border-primary hover:shadow-soft">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    <Badge variant="secondary" className="text-[10px]">
                      Anual
                    </Badge>
                  </div>
                  <p className="font-display font-semibold text-sm">Previsão do ano</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Veja meses de maior intensidade, retrogradações e ingressos planetários.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {!morningDeep ? (
              <Link to="/momento">
                <Card className="h-full transition-all hover:border-primary hover:shadow-soft">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <Badge variant="secondary" className="text-[10px]">
                        Hoje
                      </Badge>
                    </div>
                    <p className="font-display font-semibold text-sm">Carta do dia profunda</p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Mensagem personalizada com afirmação, tema do dia e dica prática.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Link to="/momento">
                <Card className="h-full transition-all hover:border-primary hover:shadow-soft border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary">
                        Gerada hoje
                      </Badge>
                    </div>
                    <p className="font-display font-semibold text-sm">Carta do dia</p>
                    <p className="text-xs text-muted-foreground leading-snug italic">
                      {morningDeep.main_message?.slice(0, 80)}
                      {(morningDeep.main_message?.length ?? 0) > 80 ? "…" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        </div>
      )}

      {charts.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-semibold">Meus mapas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {charts.map((c) => (
              <Link key={c.id} to="/mapas/$id" params={{ id: c.id }}>
                <Card className="transition-all hover:border-primary hover:shadow-soft">
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
