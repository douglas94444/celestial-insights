import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SynastryBiWheel } from "@/components/SynastryBiWheel";
import { supabase } from "@/integrations/supabase/client";
import type { ChartData } from "@/lib/astrology/calculate";
import type {
  SynastryAnalysis,
  SynastryAreaScores,
  SynastryCrossAspect,
} from "@/lib/astrology/synastry";
import { chartRowToChartData } from "@/lib/chart-from-row";
import { generateSynastryNarrativeFn } from "@/lib/ai-interpretation.functions";
import type {
  AiInterpretationFnResult,
  CalculateAndSaveSynastryFnResult,
} from "@/lib/types/server-fn-results";
import { calculateAndSaveSynastryFn } from "@/lib/synastry.functions";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/compatibilidade")({
  component: CompatibilidadePage,
});

type StoredCompatibilityPayload = {
  chart1Name: string;
  chart2Name: string;
  aspects: SynastryCrossAspect[];
  areas: SynastryAreaScores;
  highlights: string[];
};

function parseStoredPayload(raw: unknown): StoredCompatibilityPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.chart1Name !== "string" ||
    typeof o.chart2Name !== "string" ||
    !Array.isArray(o.aspects) ||
    !o.areas ||
    typeof o.areas !== "object"
  ) {
    return null;
  }
  return {
    chart1Name: o.chart1Name,
    chart2Name: o.chart2Name,
    aspects: o.aspects as SynastryCrossAspect[],
    areas: o.areas as SynastryAreaScores,
    highlights: Array.isArray(o.highlights) ? (o.highlights as string[]) : [],
  };
}

const AREA_META: { key: keyof SynastryAreaScores; title: string; hint: string }[] = [
  { key: "love", title: "Amor & atração", hint: "Sol, Lua, Vênus, Marte entre os mapas" },
  { key: "friendship", title: "Amizade & conversa", hint: "Lua, Mercúrio, Júpiter" },
  { key: "work", title: "Trabalho & objetivos", hint: "Sol, Saturno, Mercúrio, Marte" },
  { key: "convivencia", title: "Convivência diária", hint: "Lua, Vênus, Marte no dia a dia" },
];

function CompatibilidadePage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [chart1Id, setChart1Id] = useState<string>("");
  const [chart2Id, setChart2Id] = useState<string>("");
  const [activeView, setActiveView] = useState<{
    analysis: SynastryAnalysis;
    baseChart: ChartData;
    overlayChart: ChartData;
    score: number;
    savedAt?: string;
    synastryId?: string;
  } | null>(null);
  const [synastryAiText, setSynastryAiText] = useState<string | null>(null);

  const { data: charts = [], isLoading: chartsLoading } = useQuery({
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

  const { data: history = [] } = useQuery({
    queryKey: ["synastries-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synastries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const seededDefaults = useRef(false);
  useEffect(() => {
    if (seededDefaults.current || charts.length < 2) return;
    seededDefaults.current = true;
    setChart1Id(charts[0]!.id);
    setChart2Id(charts[1]!.id);
  }, [charts]);

  useEffect(() => {
    setSynastryAiText(null);
  }, [activeView?.synastryId]);

  const synastryAiMutation = useMutation<AiInterpretationFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      const sid = activeView?.synastryId;
      if (!sid) throw new Error("Sinastria não identificada.");
      return generateSynastryNarrativeFn({
        data: { synastryId: sid },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setSynastryAiText(r.content);
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
  });

  const calcMutation = useMutation<CalculateAndSaveSynastryFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return calculateAndSaveSynastryFn({
        data: { chart1Id, chart2Id },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["synastries-list"] });
      setActiveView({
        analysis: res.analysis,
        baseChart: res.baseChart,
        overlayChart: res.overlayChart,
        score: res.synastry.compatibility_score,
        savedAt: res.synastry.created_at,
        synastryId: res.synastry.id,
      });
      toast.success("Sinastria calculada e guardada.");
    },
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
  });

  function loadFromHistory(row: (typeof history)[0]) {
    const payload = parseStoredPayload(row.compatibility_data);
    const c1 = charts.find((c) => c.id === row.chart1_id);
    const c2 = charts.find((c) => c.id === row.chart2_id);
    if (!payload || !c1 || !c2) {
      toast.error("Não foi possível carregar esta sinastria.");
      return;
    }
    try {
      const baseChart = chartRowToChartData(c1);
      const overlayChart = chartRowToChartData(c2);
      setActiveView({
        analysis: {
          aspects: payload.aspects,
          overallScore: row.compatibility_score,
          areas: payload.areas,
          highlights: payload.highlights,
        },
        baseChart,
        overlayChart,
        score: row.compatibility_score,
        savedAt: row.created_at,
        synastryId: row.id,
      });
    } catch {
      toast.error("Dados de mapa incompletos.");
    }
  }

  const canSynastry = charts.length >= 2;

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard">
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div className="mb-8 flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            Sinastria
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Compare dois dos seus mapas: aspectos entre planetas, pontuação por área da relação e
            roda dupla concêntrica. Os valores são indicadores para reflexão, não um parecer
            profissional.
          </p>
        </div>
      </div>

      {!chartsLoading && !canSynastry && (
        <Alert className="mb-6">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>São necessários pelo menos dois mapas</AlertTitle>
          <AlertDescription className="flex flex-wrap gap-3 items-center mt-2">
            <span>
              No plano gratuito só pode existir um mapa por conta — ou convida outra conta de teste,
              ou cria mais mapas quando o Premium estiver disponível.
            </span>
            <Button asChild size="sm" variant="secondary">
              <Link to="/mapas/novo">Novo mapa</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-display text-lg">Nova comparação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium">Primeiro mapa (roda exterior)</label>
            <Select
              value={chart1Id}
              onValueChange={setChart1Id}
              disabled={chartsLoading || charts.length < 2}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha um mapa" />
              </SelectTrigger>
              <SelectContent>
                {charts.map((c) => (
                  <SelectItem key={c.id} value={c.id} disabled={c.id === chart2Id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium">Segundo mapa (roda interior)</label>
            <Select
              value={chart2Id}
              onValueChange={setChart2Id}
              disabled={chartsLoading || charts.length < 2}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha outro mapa" />
              </SelectTrigger>
              <SelectContent>
                {charts.map((c) => (
                  <SelectItem key={c.id} value={c.id} disabled={c.id === chart1Id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-mystical text-white shrink-0"
            disabled={
              !canSynastry ||
              !chart1Id ||
              !chart2Id ||
              chart1Id === chart2Id ||
              calcMutation.isPending
            }
            onClick={() => calcMutation.mutate()}
          >
            {calcMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A calcular…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Calcular e guardar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {activeView && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <SynastryBiWheel
              baseChart={activeView.baseChart}
              overlayChart={activeView.overlayChart}
              synastryAspects={activeView.analysis.aspects}
            />
            <p className="text-center text-xs text-muted-foreground">
              Círculos claros com contorno lilás: primeiro mapa · Círculos esverdeados: segundo mapa
              · Linhas: aspectos entre os dois.
            </p>
          </div>

          <div className="space-y-4">
            <Card className="border-primary/25 bg-primary/5">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Compatibilidade geral (heurística)</p>
                <p className="font-display text-5xl font-bold text-primary mt-1">
                  {activeView.score}
                </p>
                <p className="text-xs text-muted-foreground mt-1">de 100</p>
                {activeView.savedAt && (
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Registo: {new Date(activeView.savedAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>

            {activeView.synastryId ? (
              <Card className="border-primary/15">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Análise narrativa (IA)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Opcional — não substitui os destaques numéricos nem uma leitura humana.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={synastryAiMutation.isPending}
                    onClick={() => synastryAiMutation.mutate()}
                  >
                    {synastryAiMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Gerar análise narrativa
                  </Button>
                  {synastryAiText ? (
                    <article className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {synastryAiText}
                    </article>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {AREA_META.map(({ key, title, hint }) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-display text-3xl font-bold">
                      {activeView.analysis.areas[key]}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Destaques (orbe mais fechado primeiro)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-foreground/85 list-disc pl-4">
                  {activeView.analysis.highlights.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="font-display text-lg">Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((row) => {
              const p = parseStoredPayload(row.compatibility_data);
              return (
                <button
                  key={row.id}
                  type="button"
                  className="w-full text-left rounded-lg border px-4 py-3 text-sm hover:bg-muted/60 transition-colors"
                  onClick={() => loadFromHistory(row)}
                >
                  <span className="font-medium">
                    {p?.chart1Name ?? "Mapa"} × {p?.chart2Name ?? "Mapa"}
                  </span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-primary font-semibold">{row.compatibility_score}/100</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
