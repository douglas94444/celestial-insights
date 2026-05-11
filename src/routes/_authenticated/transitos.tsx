import { createFileRoute } from "@tanstack/react-router";
import { BackToDashboardLink } from "@/components/BackToDashboardLink";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Sparkles,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AiCacheAgeBadgeFromResult } from "@/components/AiCacheAgeBadge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useChartsListQuery } from "@/hooks/use-charts-list";
import { generateTransitDayNarrativeFn } from "@/lib/ai-interpretation.functions";
import type {
  AiInterpretationFnResult,
  CalculateTransitsFnResult,
  GenerateAnnualForecastFnResult,
  SendTransitDigestEmailFnResult,
} from "@/lib/types/server-fn-results";
import { generateAnnualForecastFn } from "@/lib/annual-forecast.functions";
import { calculateTransitsFn } from "@/lib/transits.functions";
import { sendTransitDigestEmailFn } from "@/lib/email.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import { ENGAGEMENT_ROUTES, ENGAGEMENT_TOPICS, recordAiEngagement } from "@/lib/engagement";
import { usePageEngagement } from "@/hooks/use-page-engagement";
import { useSubscriptionRollout } from "@/hooks/use-subscription-rollout";
import { rolloutLockedMessage } from "@/lib/subscription-rollout";
import { AiButton } from "@/components/AiButton";
import { AiTextCard } from "@/components/AiTextCard";
import { TransitScoreBadges } from "@/components/TransitScoreBadges";
import { EmptyFeatureState } from "@/components/EmptyFeatureState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import {
  filterAspectsByFastTransit,
  filterAspectsByPersonalNatal,
  formatTransitDayTitle,
} from "@/lib/astrology/transits";
import { ASPECT_LABELS } from "@/data/chart-detail-interpretations";
import { getPlanetName } from "@/lib/astrology/zodiac";
import type { PlanetKey } from "@/lib/astrology/zodiac";

export const Route = createFileRoute("/_authenticated/transitos")({
  component: TransitosPage,
});

const PERSONAL: PlanetKey[] = ["sun", "moon", "mercury", "venus", "mars"];

function TransitosPage() {
  const { session, user } = useAuth();
  const qc = useQueryClient();

  usePageEngagement(ENGAGEMENT_ROUTES.transitos, ENGAGEMENT_TOPICS.transitos_open);

  const [chartId, setChartId] = useState("");
  const [rangePreset, setRangePreset] = useState<"30" | "60" | "90">("30");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [majorOnly, setMajorOnly] = useState(false);
  const [fastTransitOnly, setFastTransitOnly] = useState(false);
  const [natalPersonalOnly, setNatalPersonalOnly] = useState(false);
  const [transitAiText, setTransitAiText] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"periodo" | "ano">("periodo");
  const [forecastYear, setForecastYear] = useState(() => new Date().getUTCFullYear());

  const [startDate, endDate] = useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = rangePreset === "30" ? 30 : rangePreset === "60" ? 60 : 90;
    start.setUTCDate(start.getUTCDate() - days);
    end.setUTCDate(end.getUTCDate() + days);
    return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")] as const;
  }, [rangePreset]);

  const { data: charts = [] } = useChartsListQuery();
  const rollout = useSubscriptionRollout();

  useEffect(() => {
    if (!chartId && charts.length) {
      const primary = charts.find((c) => c.is_primary) ?? charts[0];
      if (primary) setChartId(primary.id);
    }
  }, [charts, chartId]);

  const transitsQuery = useQuery<CalculateTransitsFnResult>({
    queryKey: ["transits", chartId, startDate, endDate],
    queryFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return calculateTransitsFn({
        data: { chartId, startDate, endDate },
        ...withSupabaseAuth(session),
      });
    },
    enabled:
      !!session && !!chartId && mainTab === "periodo" && rollout !== null && rollout.gates.transits,
    staleTime: 60_000,
  });

  const annualForecastQuery = useQuery<GenerateAnnualForecastFnResult>({
    queryKey: ["annual-forecast", chartId, forecastYear],
    queryFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return generateAnnualForecastFn({
        data: { chartId, year: forecastYear },
        ...withSupabaseAuth(session),
      });
    },
    enabled:
      !!session &&
      !!chartId &&
      mainTab === "ano" &&
      rollout !== null &&
      rollout.gates.annualForecast,
    staleTime: 120_000,
  });

  const days = useMemo(() => transitsQuery.data?.days ?? [], [transitsQuery.data]);
  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedPayload: TransitDayPayload | undefined = days.find((d) => d.date === selectedKey);

  const intenseDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) {
      if (d.intensity >= 45) set.add(d.date);
    }
    return set;
  }, [days]);

  useEffect(() => {
    setTransitAiText(null);
  }, [selectedKey, chartId]);

  const transitAiMutation = useMutation<AiInterpretationFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      if (!chartId || !selectedKey)
        throw new Error("Escolha um mapa e um dia dentro do intervalo.");
      return generateTransitDayNarrativeFn({
        data: { chartId, date: selectedKey },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setTransitAiText(r.content);
      recordAiEngagement(supabase, user?.id, {
        route_key: ENGAGEMENT_ROUTES.transitos,
        topic_key: ENGAGEMENT_TOPICS.ai_transit_transitos,
        cached: r.cached,
        meta: { chart_id: chartId, date: selectedKey },
      });
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: (e) => void toastServerFnError(e),
  });

  const filteredAspects = useMemo(() => {
    if (!selectedPayload) return [];
    let list = selectedPayload.aspects;
    if (majorOnly) {
      list = list.filter((a) => PERSONAL.includes(a.planet1) || PERSONAL.includes(a.planet2));
    }
    if (fastTransitOnly) list = filterAspectsByFastTransit(list);
    if (natalPersonalOnly) list = filterAspectsByPersonalNatal(list);
    return list;
  }, [selectedPayload, majorOnly, fastTransitOnly, natalPersonalOnly]);

  const handleRefreshTransits = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["transits", chartId, startDate, endDate] });
  }, [qc, chartId, startDate, endDate]);

  async function exportPdf() {
    if (rollout?.active && !rollout.gates.pdfExport) {
      toast.error(rolloutLockedMessage("pdfExport", rollout.dayIndex));
      return;
    }
    if (!transitsQuery.data || days.length === 0) {
      toast.error("Calcule o período primeiro.");
      return;
    }
    try {
      const [{ pdf }, { TransitReportPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/TransitReportPdf"),
      ]);
      const blob = await pdf(
        <TransitReportPdf
          chartName={transitsQuery.data.chartName}
          startDate={transitsQuery.data.startDate}
          endDate={transitsQuery.data.endDate}
          days={days}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transitos-${transitsQuery.data.chartName.slice(0, 24)}-${startDate}_${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o PDF neste ambiente.");
    }
  }

  const emailMutation = useMutation<SendTransitDigestEmailFnResult, Error, void>({
    mutationFn: async () => {
      if (!session || !chartId) throw new Error("Sessão ou mapa necessário.");
      const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      return sendTransitDigestEmailFn({
        data: { chartId, date: todayLocal },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      toast.success(`Resumo enviado para ${r.to}`);
    },
    onError: (e) => void toastServerFnError(e),
  });

  useEffect(() => {
    if (rollout?.active && !rollout.gates.annualForecast && mainTab === "ano") {
      setMainTab("periodo");
    }
  }, [rollout, mainTab]);

  return (
    <div className="container mx-auto max-w-6xl p-4 pb-10 sm:p-6">
      <BackToDashboardLink buttonClassName="mb-4" />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Trânsitos
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
            Planetas em movimento sobre o seu mapa natal (aspectos trânsito × natal ao meio-dia UTC
            de cada dia). Use o calendário para focar um dia e exporte PDF ou receba um resumo por
            email.
          </p>
        </div>
      </div>

      {!user ? null : charts.length === 0 ? (
        <div className="mb-6">
          <EmptyFeatureState
            icon={CalendarRange}
            title="Nenhum mapa encontrado"
            description="Crie o seu mapa natal para ver trânsitos personalizados, calendário de intensidade e previsão anual."
            primaryCta={{ label: "Criar meu mapa", to: "/onboarding" }}
          />
        </div>
      ) : (
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as "periodo" | "ano")}
          className="w-full"
        >
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="periodo">Período</TabsTrigger>
            <TabsTrigger
              value="ano"
              disabled={!!(rollout?.active && !rollout.gates.annualForecast)}
            >
              Ano
            </TabsTrigger>
          </TabsList>

          <TabsContent value="periodo" className="mt-0">
            {rollout?.active && !rollout.gates.transits ? (
              <Alert className="border-primary/25 bg-primary/5">
                <AlertTitle>Trânsitos em breve</AlertTitle>
                <AlertDescription>
                  {rolloutLockedMessage("transits", rollout.dayIndex)}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base">Mapa & período</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Mapa natal</Label>
                        <Select value={chartId} onValueChange={setChartId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha o mapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {charts.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Janela em torno de hoje</Label>
                        <ToggleGroup
                          type="single"
                          value={rangePreset}
                          onValueChange={(v) => v && setRangePreset(v as "30" | "60" | "90")}
                          className="flex flex-wrap justify-start"
                        >
                          <ToggleGroupItem value="30" aria-label="±30 dias">
                            ±30 d
                          </ToggleGroupItem>
                          <ToggleGroupItem value="60" aria-label="±60 dias">
                            ±60 d
                          </ToggleGroupItem>
                          <ToggleGroupItem value="90" aria-label="±90 dias">
                            ±90 d
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-[11px] text-muted-foreground">
                          {startDate} → {endDate} (até 186 dias por pedido)
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 [&_button]:min-h-10 sm:[&_button]:min-h-9">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={
                            !chartId ||
                            transitsQuery.isFetching ||
                            !!(rollout?.active && !rollout.gates.transits)
                          }
                          onClick={handleRefreshTransits}
                        >
                          <RefreshCw
                            className={`mr-1 h-4 w-4 ${transitsQuery.isFetching ? "animate-spin" : ""}`}
                          />
                          Atualizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            days.length === 0 || !!(rollout?.active && !rollout.gates.pdfExport)
                          }
                          onClick={exportPdf}
                        >
                          <Download className="mr-1 h-4 w-4" /> PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !chartId ||
                            emailMutation.isPending ||
                            !!(rollout?.active && !rollout.gates.digestEmail)
                          }
                          onClick={() => emailMutation.mutate()}
                        >
                          {emailMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="mr-1 h-4 w-4" />
                          )}
                          Email hoje
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base">Calendário</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => setSelectedDate(d)}
                        modifiers={{
                          intense: (date) => intenseDates.has(format(date, "yyyy-MM-dd")),
                        }}
                        modifiersClassNames={{
                          intense:
                            "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                        }}
                        className="rounded-md border"
                      />
                      <p className="mt-2 text-center text-[11px] text-muted-foreground">
                        Marcador: dias com intensidade ≥ 45 (mais aspectos / mais «peso»).
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="min-h-[420px]">
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-display text-lg">
                      {selectedPayload
                        ? formatTransitDayTitle(selectedPayload.date)
                        : "Escolha um dia"}
                    </CardTitle>
                    {selectedPayload ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          Lua trânsito: {selectedPayload.transitMoonSign || "—"}
                        </Badge>
                        <Badge variant="outline">Intensidade {selectedPayload.intensity}/100</Badge>
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {transitsQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> Carregando trânsitos…
                      </div>
                    ) : transitsQuery.isError ? (
                      <p className="text-sm text-destructive">
                        {(transitsQuery.error as Error)?.message ?? "Erro ao calcular."}
                      </p>
                    ) : !selectedPayload ? (
                      <p className="text-sm text-muted-foreground">
                        Este dia está fora do intervalo calculado. Ajuste o dia no calendário ou
                        alargue a janela.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground" />
                          <Button
                            variant={majorOnly ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8"
                            onClick={() => setMajorOnly(!majorOnly)}
                          >
                            Só aspectos com planetas pessoais
                          </Button>
                          <Button
                            variant={fastTransitOnly ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8"
                            onClick={() => setFastTransitOnly(!fastTransitOnly)}
                          >
                            Só trânsitos rápidos (Sol–Marte)
                          </Button>
                          <Button
                            variant={natalPersonalOnly ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8"
                            onClick={() => setNatalPersonalOnly(!natalPersonalOnly)}
                          >
                            Só pontos natais pessoais
                          </Button>
                        </div>

                        <TransitScoreBadges scores={selectedPayload.scores} />

                        <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Leitura rápida
                          </p>
                          <ul className="list-disc pl-4 text-sm space-y-1 text-foreground/90">
                            {selectedPayload.narrative.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        </div>

                        {selectedPayload.interpretiveHints.length > 0 ? (
                          <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 space-y-2">
                            <p className="text-xs font-medium uppercase text-muted-foreground">
                              Sugestões para reflexão
                            </p>
                            <ul className="list-disc pl-4 text-sm space-y-1 text-foreground/90">
                              {selectedPayload.interpretiveHints.slice(0, 4).map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="rounded-lg border border-muted bg-muted/20 p-4 space-y-3">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Linguagem simples (IA)
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Complementa a leitura rápida acima; em caso de erro, continue a usar as
                            listas estáticas.
                          </p>
                          <AiButton
                            isPending={transitAiMutation.isPending}
                            onClick={() => transitAiMutation.mutate()}
                            label="Explicar este dia em linguagem simples"
                            aria-label="Pedir explicação em linguagem simples para o dia seleccionado"
                            variant="secondary"
                          />
                          {transitAiText ? (
                            <AiTextCard
                              text={transitAiText}
                              badge={<AiCacheAgeBadgeFromResult result={transitAiMutation.data} />}
                              className="space-y-2 border-t border-border/60 pt-3 text-sm"
                            />
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                            Aspectos ({filteredAspects.length})
                          </p>
                          <ul className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 text-sm">
                            {filteredAspects.map((a, idx) => (
                              <li
                                key={`${a.planet1}-${a.planet2}-${a.type}-${idx}`}
                                className="rounded-md border border-border/60 bg-card/50 px-3 py-2"
                              >
                                <span className="font-medium">{getPlanetName(a.planet1)}</span> em
                                trânsito{" "}
                                <span className="text-primary">{ASPECT_LABELS[a.type]}</span>{" "}
                                <span className="font-medium">{getPlanetName(a.planet2)}</span>{" "}
                                natal
                                <span className="text-muted-foreground"> · orbe {a.orb}°</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ano" className="mt-0 space-y-6">
            {rollout?.active && !rollout.gates.annualForecast ? (
              <Alert className="border-primary/25 bg-primary/5">
                <AlertTitle>Previsão anual em breve</AlertTitle>
                <AlertDescription>
                  {rolloutLockedMessage("annualForecast", rollout.dayIndex)}
                </AlertDescription>
              </Alert>
            ) : null}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">
                  Previsão anual (visão do mapa)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="space-y-2 min-w-[200px]">
                  <Label>Mapa natal</Label>
                  <Select value={chartId} onValueChange={setChartId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o mapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {charts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano civil (UTC)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Ano anterior"
                      onClick={() => setForecastYear((y) => y - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-display min-w-[5rem] text-center text-xl tabular-nums">
                      {forecastYear}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Ano seguinte"
                      onClick={() => setForecastYear((y) => y + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug max-w-xl">
                  Intensidade = média diária dos aspectos trânsito×natal ao meio-dia UTC. Ingressos:
                  Júpiter a Plutão. Retrógrados: Mercúrio, Vênus e Marte (trechos observados dentro
                  de cada mês).
                </p>
              </CardContent>
            </Card>

            {!chartId ? (
              <p className="text-sm text-muted-foreground">Escolha um mapa para ver o ano.</p>
            ) : annualForecastQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" /> A calcular os 12 meses…
              </div>
            ) : annualForecastQuery.isError ? (
              <p className="text-sm text-destructive">
                {(annualForecastQuery.error as Error)?.message ?? "Erro ao calcular a vista anual."}
              </p>
            ) : !annualForecastQuery.data?.months?.length ? (
              <p className="text-sm text-muted-foreground">
                Não foi possível gerar a previsão anual para este mapa e ano. Verifique se o mapa
                tem data de nascimento completa e tente recalcular.
              </p>
            ) : (
              <Accordion type="multiple" className="w-full border rounded-lg px-2">
                {annualForecastQuery.data.months.map((m) => (
                  <AccordionItem key={m.month} value={`m-${m.month}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="flex flex-1 flex-wrap items-center gap-3">
                        <span className="font-display font-semibold capitalize">
                          {format(new Date(Date.UTC(m.year, m.month - 1, 1)), "MMMM yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">
                          intensidade média {m.avgIntensity}/100
                        </span>
                        <Progress
                          value={m.avgIntensity}
                          className="hidden h-2 max-w-[140px] sm:inline-flex"
                        />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <Progress value={m.avgIntensity} className="h-2 max-w-xs sm:hidden" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Dias de pico (top 3)
                        </p>
                        <ul className="text-sm space-y-1">
                          {m.peakDays.map((p) => (
                            <li key={p.date}>
                              {format(new Date(`${p.date}T12:00:00.000Z`), "d MMM", {
                                locale: ptBR,
                              })}
                              : intensidade {p.intensity}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {m.ingresses.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Ingressos em signo
                          </p>
                          <ul className="text-sm space-y-1">
                            {m.ingresses.map((ing) => (
                              <li key={`${ing.planet}-${ing.date}`}>
                                <span className="font-medium">{getPlanetName(ing.planet)}</span>{" "}
                                entra em {ing.intoSign}{" "}
                                <span className="text-muted-foreground">
                                  (
                                  {format(new Date(`${ing.date}T12:00:00.000Z`), "d MMM", {
                                    locale: ptBR,
                                  })}
                                  )
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {m.retrogradePeriods.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Retrógrados (Mercúrio · Vênus · Marte)
                          </p>
                          <ul className="text-sm space-y-1">
                            {m.retrogradePeriods.map((r, idx) => (
                              <li key={`${r.planet}-${r.startDate}-${idx}`}>
                                <span className="font-medium">{getPlanetName(r.planet)}</span>:{" "}
                                {r.startDate === r.endDate ? (
                                  r.startDate
                                ) : (
                                  <>
                                    {r.startDate} → {r.endDate}
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
