import { createFileRoute, Link } from "@tanstack/react-router";
import { BackToDashboardLink } from "@/components/BackToDashboardLink";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  Heart,
  Home,
  Loader2,
  MessageCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
const CompositeChartWheel = lazy(() =>
  import("@/components/CompositeChartWheel").then((m) => ({ default: m.CompositeChartWheel })),
);
import { SynastryAspectsVirtualList } from "@/components/SynastryAspectsVirtualList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AiCacheAgeBadgeFromResult } from "@/components/AiCacheAgeBadge";
import { Skeleton } from "@/components/ui/skeleton";
const SynastryBiWheel = lazy(() =>
  import("@/components/SynastryBiWheel").then((m) => ({ default: m.SynastryBiWheel })),
);
import { supabase } from "@/integrations/supabase/client";
import type { ChartData } from "@/lib/astrology/calculate";
import type {
  SynastryAnalysis,
  SynastryAreaScores,
  SynastryCrossAspect,
} from "@/lib/astrology/synastry";
import { chartRowToChartData } from "@/lib/chart-from-row";
import {
  generateCompositeNarrativeFn,
  generateSynastryDeepNarrativeFn,
  generateSynastryNarrativeFn,
} from "@/lib/ai-interpretation.functions";
import type {
  AiInterpretationFnResult,
  CalculateAndSaveSynastryFnResult,
  CalculateCompositeFnResult,
  SynastryDeepNarrativeFnResult,
} from "@/lib/types/server-fn-results";
import type { SynastryDeepOutput } from "@/lib/schemas/personalization-ai";
import { ENGAGEMENT_ROUTES, ENGAGEMENT_TOPICS, recordAiEngagement } from "@/lib/engagement";
import { usePageEngagement } from "@/hooks/use-page-engagement";
import { AiButton } from "@/components/AiButton";
import { AiTextCard } from "@/components/AiTextCard";
import { calculateCompositeFn } from "@/lib/composite.functions";
import { calculateAndSaveSynastryFn, deleteSynastryFn } from "@/lib/synastry.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { useAuth } from "@/hooks/use-auth";
import { useChartsListQuery } from "@/hooks/use-charts-list";
import { useSubscriptionRollout } from "@/hooks/use-subscription-rollout";
import { rolloutLockedMessage } from "@/lib/subscription-rollout";

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

const COMPAT_HISTORY_PAGE_SIZE = 50;

function synastryScorePresentation(score: number) {
  const v = Math.min(100, Math.max(0, score));
  if (v < 40)
    return { label: "Baixa" as const, labelClass: "text-red-600 dark:text-red-400", value: v };
  if (v < 70)
    return {
      label: "Moderada" as const,
      labelClass: "text-amber-600 dark:text-amber-400",
      value: v,
    };
  return { label: "Alta" as const, labelClass: "text-green-600 dark:text-green-400", value: v };
}

const AREA_META: { key: keyof SynastryAreaScores; title: string; hint: string }[] = [
  { key: "love", title: "Amor & atração", hint: "Sol, Lua, Vênus, Marte entre os mapas" },
  { key: "friendship", title: "Amizade & conversa", hint: "Lua, Mercúrio, Júpiter" },
  { key: "work", title: "Trabalho & objetivos", hint: "Sol, Saturno, Mercúrio, Marte" },
  { key: "convivencia", title: "Convivência diária", hint: "Lua, Vênus, Marte no dia a dia" },
];

function CompatibilidadePage() {
  const { session, user } = useAuth();
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
  const [synastryDeep, setSynastryDeep] = useState<SynastryDeepOutput | null>(null);
  const [compositeAiText, setCompositeAiText] = useState<string | null>(null);
  const [compatSubview, setCompatSubview] = useState<"sinastria" | "composto">("sinastria");
  const [historyVisibleCount, setHistoryVisibleCount] = useState(COMPAT_HISTORY_PAGE_SIZE);
  const [deleteSynastryId, setDeleteSynastryId] = useState<string | null>(null);

  const {
    data: charts = [],
    isLoading: chartsLoading,
    isError: chartsError,
    refetch: refetchCharts,
  } = useChartsListQuery();
  const rollout = useSubscriptionRollout();

  const {
    data: history = [],
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["synastries-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synastries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setHistoryVisibleCount(COMPAT_HISTORY_PAGE_SIZE);
  }, [history]);

  const visibleHistory = useMemo(
    () => history.slice(0, historyVisibleCount),
    [history, historyVisibleCount],
  );

  const seededDefaults = useRef(false);
  useEffect(() => {
    if (seededDefaults.current || charts.length < 2) return;
    seededDefaults.current = true;
    setChart1Id(charts[0]!.id);
    setChart2Id(charts[1]!.id);
  }, [charts]);

  useEffect(() => {
    setSynastryAiText(null);
    setSynastryDeep(null);
  }, [activeView?.synastryId]);

  useEffect(() => {
    setCompositeAiText(null);
  }, [chart1Id, chart2Id]);

  useEffect(() => {
    if (!chart1Id || !chart2Id || chart1Id === chart2Id) setCompatSubview("sinastria");
  }, [chart1Id, chart2Id]);

  useEffect(() => {
    if (rollout?.active && !rollout.gates.composite && compatSubview === "composto") {
      setCompatSubview("sinastria");
    }
  }, [rollout, compatSubview]);

  usePageEngagement(
    ENGAGEMENT_ROUTES.compatibilidade,
    ENGAGEMENT_TOPICS.synastry_view,
    {
      enabled: !!activeView?.synastryId,
      meta: { synastry_id: activeView?.synastryId },
    },
    [activeView?.synastryId],
  );

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
      recordAiEngagement(supabase, user?.id, {
        route_key: ENGAGEMENT_ROUTES.compatibilidade,
        topic_key: ENGAGEMENT_TOPICS.ai_synastry_narrative,
        cached: r.cached,
      });
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: (e) => void toastServerFnError(e),
  });

  const compositeQuery = useQuery<CalculateCompositeFnResult>({
    queryKey: ["composite-chart", chart1Id, chart2Id],
    queryFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return calculateCompositeFn({
        data: { chart1Id, chart2Id },
        ...withSupabaseAuth(session),
      });
    },
    enabled:
      !!session &&
      !!chart1Id &&
      !!chart2Id &&
      chart1Id !== chart2Id &&
      compatSubview === "composto" &&
      rollout !== null &&
      rollout.gates.composite,
    staleTime: 120_000,
  });

  const compositeAiMutation = useMutation<AiInterpretationFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return generateCompositeNarrativeFn({
        data: { chart1Id, chart2Id },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setCompositeAiText(r.content);
      recordAiEngagement(supabase, user?.id, {
        route_key: ENGAGEMENT_ROUTES.compatibilidade,
        topic_key: ENGAGEMENT_TOPICS.ai_synastry_narrative,
        cached: r.cached,
      });
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: (e) => void toastServerFnError(e),
  });

  const synastryDeepMutation = useMutation<SynastryDeepNarrativeFnResult, Error, void>({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      const sid = activeView?.synastryId;
      if (!sid) throw new Error("Sinastria não identificada.");
      return generateSynastryDeepNarrativeFn({
        data: { synastryId: sid },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setSynastryDeep(r.deep);
      recordAiEngagement(supabase, user?.id, {
        route_key: ENGAGEMENT_ROUTES.compatibilidade,
        topic_key: ENGAGEMENT_TOPICS.ai_synastry_deep,
        cached: r.cached,
      });
      if (r.cached) toast.message("Análise profunda recuperada do cache.");
    },
    onError: (e) => void toastServerFnError(e),
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
    onError: (e) => void toastServerFnError(e),
  });

  async function confirmDeleteSynastry() {
    if (!deleteSynastryId) return;
    try {
      await deleteSynastryFn({ data: deleteSynastryId, ...withSupabaseAuth(session) });
      qc.invalidateQueries({ queryKey: ["synastries-list"] });
      if (activeView?.synastryId === deleteSynastryId) setActiveView(null);
      toast.success("Sinastria removida do histórico.");
    } catch (e) {
      await toastServerFnError(e);
    } finally {
      setDeleteSynastryId(null);
    }
  }

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteSynastryId(null);
  }, []);

  const loadFromHistory = useCallback(
    (row: (typeof history)[number]) => {
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
    },
    [charts],
  );

  const handleHistoryRowActivate = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rowId = e.currentTarget.dataset.rowId;
      if (!rowId) return;
      const row = history.find((r) => String(r.id) === rowId);
      if (!row) return;
      loadFromHistory(row);
    },
    [history, loadFromHistory],
  );

  const canSynastry = charts.length >= 2;
  const synastryRolloutOk = !rollout?.active || rollout.gates.synastry;

  return (
    <div className="container mx-auto max-w-6xl p-4 pb-10 sm:p-6">
      <BackToDashboardLink buttonClassName="mb-4" />

      {rollout?.active && !rollout.gates.synastry ? (
        <Alert className="mb-6 border-primary/25 bg-primary/5">
          <AlertTitle>Sinastria em breve</AlertTitle>
          <AlertDescription>{rolloutLockedMessage("synastry", rollout.dayIndex)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-8 flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
            <Heart className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" />
            Sinastria
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Compare dois dos seus mapas: aspectos entre planetas, pontuação por área da relação e
            roda dupla concêntrica. Os valores são indicadores para reflexão, não um parecer
            profissional.
          </p>
        </div>
      </div>

      {chartsError ? (
        <Alert variant="destructive" className="mb-6">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar os mapas</AlertTitle>
          <AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
            <span>Verifique a ligação e tente novamente.</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void refetchCharts()}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {historyError ? (
        <Alert variant="destructive" className="mb-6">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o histórico</AlertTitle>
          <AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
            <span>Os mapas podem estar disponíveis mesmo assim.</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void refetchHistory()}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!chartsLoading && !canSynastry && (
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/30 border-2 border-background flex items-center justify-center">
                  <span className="text-lg">🔵</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-violet-400/30 border-2 border-background flex items-center justify-center">
                  <span className="text-lg">🟣</span>
                </div>
              </div>
              <div>
                <h3 className="font-display font-semibold">Descubra a dinâmica entre dois mapas</h3>
                <p className="text-xs text-muted-foreground">Sinastria e mapa composto</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              A sinastria mostra como dois mapas natais interagem — onde há harmonia, onde há tensão
              criativa e como duas pessoas se complementam em diferentes áreas da vida.
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: Heart, label: "Amor & atração" },
                { icon: MessageCircle, label: "Amizade & diálogo" },
                { icon: Briefcase, label: "Trabalho & metas" },
                { icon: Home, label: "Convivência diária" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-primary/15 bg-background/60 p-3 text-center"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" className="bg-mystical text-white hover:opacity-90">
                <Link to="/assinatura">Ver planos</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/mapas/novo">Criar segundo mapa</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              A sinastria compara dois mapas guardados na sua conta. Crie outro mapa em «Mapas →
              Novo» e volte aqui para escolher os dois perfis.
            </p>
          </CardContent>
        </Card>
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
            className="min-h-11 w-full shrink-0 bg-mystical text-white sm:min-h-10 md:w-auto"
            disabled={
              !canSynastry ||
              !synastryRolloutOk ||
              !chart1Id ||
              !chart2Id ||
              chart1Id === chart2Id ||
              calcMutation.isPending
            }
            onClick={() => calcMutation.mutate()}
          >
            {calcMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Calcular e guardar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {!chartsLoading && canSynastry && chart1Id === chart2Id && chart1Id ? (
        <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
          <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <AlertTitle>Escolha dois mapas diferentes</AlertTitle>
          <AlertDescription className="mt-1">
            Para comparar sinastria são necessários dois mapas distintos na conta.
          </AlertDescription>
        </Alert>
      ) : null}

      {chart1Id && chart2Id && chart1Id !== chart2Id ? (
        <Tabs
          value={compatSubview}
          onValueChange={(v) => setCompatSubview(v as "sinastria" | "composto")}
          className="w-full"
        >
          <TabsList className="mb-4 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sinastria">Sinastria</TabsTrigger>
            <TabsTrigger
              value="composto"
              disabled={!!(rollout?.active && !rollout.gates.composite)}
            >
              Mapa composto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sinastria" className="mt-0 space-y-4">
            {activeView ? (
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-4">
                  <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible">
                    <Suspense
                      fallback={
                        <Skeleton className="aspect-square w-full max-w-[380px] rounded-full" />
                      }
                    >
                      <SynastryBiWheel
                        baseChart={activeView.baseChart}
                        overlayChart={activeView.overlayChart}
                        synastryAspects={activeView.analysis.aspects}
                      />
                    </Suspense>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Círculos claros com contorno lilás: primeiro mapa · Círculos esverdeados:
                    segundo mapa · Linhas: aspectos entre os dois.
                  </p>
                </div>

                <div className="space-y-4">
                  <Card className="border-primary/25 bg-primary/5">
                    <CardContent className="pt-6 text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Compatibilidade geral (heurística)
                      </p>
                      <p className="font-display text-5xl font-bold text-primary mt-1">
                        {activeView.score}
                      </p>
                      {(() => {
                        const band = synastryScorePresentation(activeView.score);
                        return (
                          <>
                            <Progress value={band.value} className="h-2 mx-auto max-w-[200px]" />
                            <p className={`text-xs font-medium ${band.labelClass}`}>{band.label}</p>
                          </>
                        );
                      })()}
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
                        <CardTitle className="text-sm font-semibold">
                          Análise narrativa (IA)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Opcional — não substitui os destaques numéricos nem uma leitura humana.
                        </p>
                        <AiButton
                          isPending={synastryAiMutation.isPending}
                          onClick={() => synastryAiMutation.mutate()}
                          label="Gerar análise narrativa"
                          variant="secondary"
                          className="w-full"
                        />
                        {synastryAiText ? (
                          <AiTextCard
                            text={synastryAiText}
                            badge={<AiCacheAgeBadgeFromResult result={synastryAiMutation.data} />}
                            className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm"
                          />
                        ) : null}
                        <AiButton
                          isPending={synastryDeepMutation.isPending}
                          onClick={() => synastryDeepMutation.mutate()}
                          label="Análise profunda (JSON)"
                          className="w-full"
                        />
                        {synastryDeep ? (
                          <article className="max-h-[520px] overflow-y-auto rounded-lg border border-primary/15 bg-background/40 p-3 text-xs leading-relaxed space-y-3">
                            <AiCacheAgeBadgeFromResult result={synastryDeepMutation.data} />
                            <p className="text-[11px] font-medium uppercase text-muted-foreground">
                              Sinastria profunda
                            </p>
                            <p className="text-muted-foreground">
                              {synastryDeep.composite_disclaimer}
                            </p>
                            <section>
                              <h4 className="font-semibold text-sm">Visão geral</h4>
                              <p>{synastryDeep.overview}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Dinâmica emocional</h4>
                              <p>{synastryDeep.emotional_dynamics}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Comunicação</h4>
                              <p>{synastryDeep.communication_styles}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Intimidade & atração</h4>
                              <p>{synastryDeep.intimacy_attraction}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Conflito & reparação</h4>
                              <p>{synastryDeep.conflict_repair}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Ritmo quotidiano</h4>
                              <p>{synastryDeep.daily_rhythm}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Crescimento a longo prazo</h4>
                              <p>{synastryDeep.long_term_growth}</p>
                            </section>
                            <section>
                              <h4 className="font-semibold text-sm">Síntese</h4>
                              <p>{synastryDeep.integration_summary}</p>
                            </section>
                          </article>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {AREA_META.map(({ key, title, hint }) => {
                      const areaScore = activeView.analysis.areas[key];
                      const band = synastryScorePresentation(areaScore);
                      return (
                        <Card key={key}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="font-display text-3xl font-bold">{areaScore}</p>
                            <Progress value={band.value} className="h-2" />
                            <p className={`text-xs font-medium ${band.labelClass}`}>{band.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                              {hint}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Destaques (orbe mais fechado primeiro)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-2 text-foreground/85 list-disc pl-4">
                        {activeView.analysis.highlights.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Collapsible className="rounded-lg border bg-card">
                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-4 text-left font-semibold text-sm hover:bg-muted/40 transition-colors [&[data-state=open]>svg]:rotate-180">
                      Todos os aspectos cruzados
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t">
                      {activeView.analysis.aspects.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">
                          Nenhum aspecto na lista.
                        </p>
                      ) : (
                        <SynastryAspectsVirtualList aspects={activeView.analysis.aspects} />
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            ) : calcMutation.isPending ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm">A calcular sinastria…</p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground leading-relaxed">
                Use «Calcular e guardar» acima para gerar a sinastria e ver o biwheel, pontuações e
                listas de aspectos cruzados.
              </p>
            )}
          </TabsContent>

          <TabsContent value="composto" className="mt-0 space-y-6">
            {rollout?.active && !rollout.gates.composite ? (
              <Alert className="border-primary/25 bg-primary/5">
                <AlertTitle>Mapa composto em breve</AlertTitle>
                <AlertDescription>
                  {rolloutLockedMessage("composite", rollout.dayIndex)}
                </AlertDescription>
              </Alert>
            ) : null}
            {compositeQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin shrink-0" /> A calcular mapa composto…
              </div>
            ) : compositeQuery.isError ? (
              <p className="text-sm text-destructive">
                {(compositeQuery.error as Error)?.message ?? "Erro ao calcular o composto."}
              </p>
            ) : compositeQuery.data ? (
              <div className="space-y-6">
                <div className="-mx-1 flex justify-center overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible">
                  <ErrorBoundary
                    fallback={
                      <p className="text-center text-xs text-muted-foreground py-4">
                        Roda composta indisponível.
                      </p>
                    }
                  >
                    <Suspense fallback={null}>
                      <CompositeChartWheel data={compositeQuery.data.composite} size={520} />
                    </Suspense>
                  </ErrorBoundary>
                </div>
                <p className="mx-auto max-w-xl text-center text-xs text-muted-foreground">
                  Mapa composto por midpoint entre «{compositeQuery.data.chart1Name}» e «
                  {compositeQuery.data.chart2Name}» (RAMC médio para casas — leitura simbólica).
                </p>
                <Card className="border-primary/15">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Interpretação do composto (IA)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <AiButton
                      isPending={compositeAiMutation.isPending}
                      onClick={() => compositeAiMutation.mutate()}
                      label="Gerar texto do mapa composto"
                      variant="secondary"
                    />
                    {compositeAiText ? (
                      <AiTextCard
                        text={compositeAiText}
                        badge={<AiCacheAgeBadgeFromResult result={compositeAiMutation.data} />}
                        className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm"
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      ) : null}

      {!historyError && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="font-display text-lg">Histórico recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" /> A carregar…
              </p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ainda não há comparações guardadas. Use «Calcular e guardar» acima para criar a
                primeira entrada no histórico.
              </p>
            ) : (
              <>
                {visibleHistory.map((row) => {
                  const p = parseStoredPayload(row.compatibility_data);
                  return (
                    <div key={row.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        data-row-id={String(row.id)}
                        className="flex-1 text-left rounded-lg border px-4 py-3 text-sm hover:bg-muted/60 transition-colors"
                        onClick={handleHistoryRowActivate}
                      >
                        <span className="font-medium">
                          {p?.chart1Name ?? "Mapa"} × {p?.chart2Name ?? "Mapa"}
                        </span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-primary font-semibold">
                          {row.compatibility_score}/100
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {new Date(row.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remover do histórico"
                        onClick={() => setDeleteSynastryId(String(row.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {history.length > historyVisibleCount ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 w-full"
                    onClick={() =>
                      setHistoryVisibleCount((n) =>
                        Math.min(n + COMPAT_HISTORY_PAGE_SIZE, history.length),
                      )
                    }
                  >
                    Carregar mais ({history.length - historyVisibleCount} restantes)
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteSynastryId} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sinastria do histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta entrada será removida permanentemente. A sinastria pode ser recalculada a
              qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteSynastry()}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
