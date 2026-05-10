import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Download, Loader2, Mail, RefreshCw, Sparkles, Filter } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { generateTransitDayNarrativeFn } from "@/lib/ai-interpretation.functions";
import type {
  AiInterpretationFnResult,
  CalculateTransitsFnResult,
  SendTransitDigestEmailFnResult,
} from "@/lib/types/server-fn-results";
import { calculateTransitsFn } from "@/lib/transits.functions";
import { sendTransitDigestEmailFn } from "@/lib/email.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";
import type { TransitDayPayload } from "@/lib/astrology/transits";
import {
  filterAspectsByFastTransit,
  filterAspectsByPersonalNatal,
  formatTransitDayTitle,
} from "@/lib/astrology/transits";
import { ASPECT_LABELS } from "@/data/chart-detail-interpretations";
import { PLANETS } from "@/lib/astrology/zodiac";
import type { PlanetKey } from "@/lib/astrology/zodiac";

export const Route = createFileRoute("/_authenticated/transitos")({
  component: TransitosPage,
});

const PERSONAL: PlanetKey[] = ["sun", "moon", "mercury", "venus", "mars"];

function planetLabel(key: PlanetKey) {
  return PLANETS.find((p) => p.key === key)?.name ?? key;
}

function TransitosPage() {
  const { session, user } = useAuth();
  const qc = useQueryClient();

  const [chartId, setChartId] = useState("");
  const [rangePreset, setRangePreset] = useState<"30" | "60" | "90">("30");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [majorOnly, setMajorOnly] = useState(false);
  const [fastTransitOnly, setFastTransitOnly] = useState(false);
  const [natalPersonalOnly, setNatalPersonalOnly] = useState(false);
  const [transitAiText, setTransitAiText] = useState<string | null>(null);

  const [startDate, endDate] = useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = rangePreset === "30" ? 30 : rangePreset === "60" ? 60 : 90;
    start.setUTCDate(start.getUTCDate() - days);
    end.setUTCDate(end.getUTCDate() + days);
    return [format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")] as const;
  }, [rangePreset]);

  const { data: charts = [] } = useQuery({
    queryKey: ["charts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
    enabled: !!session && !!chartId,
    staleTime: 60_000,
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
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
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

  async function exportPdf() {
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
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
  });

  return (
    <div className="container mx-auto max-w-6xl p-4 pb-10 sm:p-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
      </Button>

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
        <Card className="border-dashed mb-6">
          <CardContent className="py-8 text-center text-muted-foreground">
            Crie um mapa para ver trânsitos.{" "}
            <Link to="/onboarding" className="text-primary underline">
              Ir ao onboarding
            </Link>
          </CardContent>
        </Card>
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
                    disabled={!chartId || transitsQuery.isFetching}
                    onClick={() =>
                      qc.invalidateQueries({ queryKey: ["transits", chartId, startDate, endDate] })
                    }
                  >
                    <RefreshCw
                      className={`mr-1 h-4 w-4 ${transitsQuery.isFetching ? "animate-spin" : ""}`}
                    />
                    Atualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={days.length === 0}
                    onClick={exportPdf}
                  >
                    <Download className="mr-1 h-4 w-4" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!chartId || emailMutation.isPending}
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
                {selectedPayload ? formatTransitDayTitle(selectedPayload.date) : "Escolha um dia"}
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
                  Este dia está fora do intervalo calculado. Ajuste o dia no calendário ou alargue a
                  janela.
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

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Humor {selectedPayload.scores.humor}/100
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Relações {selectedPayload.scores.amor}/100
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Trabalho {selectedPayload.scores.trabalho}/100
                    </Badge>
                  </div>

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
                      Complementa a leitura rápida acima; em caso de erro, continue a usar as listas
                      estáticas.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={transitAiMutation.isPending}
                      onClick={() => transitAiMutation.mutate()}
                    >
                      {transitAiMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Explicar este dia em linguagem simples
                    </Button>
                    {transitAiText ? (
                      <article className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 border-t border-border/60 pt-3">
                        {transitAiText}
                      </article>
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
                          <span className="font-medium">{planetLabel(a.planet1)}</span> em trânsito{" "}
                          <span className="text-primary">{ASPECT_LABELS[a.type]}</span>{" "}
                          <span className="font-medium">{planetLabel(a.planet2)}</span> natal
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
    </div>
  );
}
