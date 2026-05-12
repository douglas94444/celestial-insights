import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Sparkles, Share2, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AiCacheAgeBadge, AiCacheAgeBadgeFromResult } from "@/components/AiCacheAgeBadge";
import { BackToDashboardLink } from "@/components/BackToDashboardLink";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ShareableMomentCard, CARD_THEMES, type CardTheme } from "@/components/ShareableMomentCard";
const MoodWidget = lazy(() =>
  import("@/components/MoodWidget").then((m) => ({ default: m.MoodWidget })),
);
import { useDailyMoment } from "@/hooks/use-daily-moment";
import {
  touchMomentStreak,
  readMomentStreak,
  seedLocalMomentStreakFromProfileIfAhead,
} from "@/lib/moment-streak";
import { persistMomentStreakToProfile } from "@/lib/moment-streak-sync";
import { getInstagramBrandHandle, getSharePublicUrl } from "@/lib/app-branding";
import {
  buildMomentShareCaption,
  INSTAGRAM_CAPTION_SOFT_CAP,
  suggestedMomentHashtags,
  type MomentCaptionPreset,
} from "@/lib/moment-share-caption";

const CAPTION_PRESETS: MomentCaptionPreset[] = ["short", "medium", "full", "essence"];
import {
  loadMomentHistory,
  upsertMomentHistory,
  type MomentHistorySnapshot,
} from "@/lib/moment-history-local";
import { primarySunMoonAsc } from "@/lib/personalized-moment";
import { pickMomentFallbackQuote, signLabelPt } from "@/data/daily-moment-fallback";
import { buildMomentQuoteLines } from "@/lib/moment-quote";
import { ENGAGEMENT_ROUTES, ENGAGEMENT_TOPICS } from "@/lib/engagement";
import { usePageEngagement } from "@/hooks/use-page-engagement";
import { AiButton } from "@/components/AiButton";
import { AiTextCard } from "@/components/AiTextCard";
import { buildShareCardDailyExtras, buildTransitLuckFingerprint } from "@/data/share-card-daily";
import { useAiQuota } from "@/hooks/use-ai-quota";
import { useSubscriptionRollout } from "@/hooks/use-subscription-rollout";
import { rolloutLockedMessage } from "@/lib/subscription-rollout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/momento")({
  component: MomentoPage,
});

function MomentoPage() {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [cardTheme, setCardTheme] = useState<CardTheme>("noturno");
  const [showWheel, setShowWheel] = useState(true);
  const [highQuality, setHighQuality] = useState(false);
  const aiQuota = useAiQuota();
  const rollout = useSubscriptionRollout();
  const [streak, setStreak] = useState(() => readMomentStreak().streak);
  const [historyList, setHistoryList] = useState<MomentHistorySnapshot[]>(() =>
    typeof window !== "undefined" ? loadMomentHistory() : [],
  );
  /** null = hoje civil (`todayStr`) */
  const [pickedYmd, setPickedYmd] = useState<string | null>(null);
  const [captionPreset, setCaptionPreset] = useState<MomentCaptionPreset>("medium");
  const [captionWithHashtags, setCaptionWithHashtags] = useState(true);

  const {
    chartsLoading,
    primary,
    wheelData,
    planets,
    houses,
    transitToday,
    dashTransitAi,
    dashTransitAiCachedAt,
    dashTransitAiMutation,
    morningDeep,
    morningDeepCachedAt,
    morningDeepMutation,
    natalEssenceQuery,
    personalizedInsights,
    displayName,
    sunSign,
    moonSign,
    ascSign,
    todayStr,
    profile,
    user,
  } = useDailyMoment();

  usePageEngagement(
    ENGAGEMENT_ROUTES.momento,
    ENGAGEMENT_TOPICS.moment_open,
    {
      enabled: !!primary?.id,
    },
    [primary?.id],
  );

  const viewYmd = pickedYmd ?? todayStr;
  const isTodayView = viewYmd === todayStr;

  useEffect(() => {
    if (!chartsLoading && !primary) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [chartsLoading, primary, navigate]);

  useEffect(() => {
    if (!primary || chartsLoading || !user?.id) return;
    seedLocalMomentStreakFromProfileIfAhead(profile);
    const out = touchMomentStreak();
    setStreak(out.streak);
    void persistMomentStreakToProfile(user.id, out.streak, out.lastVisitYmd);
  }, [chartsLoading, primary, profile, user?.id]);

  useEffect(() => {
    if (streak <= 0) return;
    const MILESTONES = [7, 14, 30, 60, 100];
    if (!MILESTONES.includes(streak)) return;
    const key = `astromap_streak_milestone_${streak}`;
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      toast.success(`${streak} dias de conexão com o céu! Continue assim. 🌙`);
    }
  }, [streak]);

  const sma = useMemo(() => primarySunMoonAsc(planets, houses), [planets, houses]);

  const identityLine = useMemo(() => {
    const fmt = (sign: string | undefined, sym: string) => {
      const name = sign ?? "—";
      return `${sym} ${name}`;
    };
    return [
      fmt(sunSign, sma.sunGlyph),
      fmt(moonSign, sma.moonGlyph),
      fmt(ascSign, sma.ascGlyph),
    ].join(" · ");
  }, [sunSign, moonSign, ascSign, sma.sunGlyph, sma.moonGlyph, sma.ascGlyph]);

  const daySeed = useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    return y * 400 + m * 40 + d;
  }, [todayStr]);

  const fallbackParagraph = useMemo(() => {
    const nome = displayName.split(/\s+/)[0] ?? displayName;
    return pickMomentFallbackQuote(
      {
        nome,
        sol: signLabelPt(sunSign),
        lua: signLabelPt(moonSign),
        ascendente: signLabelPt(ascSign),
        luaCasa: sma.moonHouse,
        elemento: personalizedInsights?.dominantElement ?? "Ar",
      },
      daySeed,
    );
  }, [
    displayName,
    sunSign,
    moonSign,
    ascSign,
    sma.moonHouse,
    personalizedInsights?.dominantElement,
    daySeed,
  ]);

  const quoteLinesToday = useMemo(
    () =>
      buildMomentQuoteLines({
        aiText: dashTransitAi,
        transitNarrative: transitToday?.narrative ?? [],
        fallbackParagraph,
      }),
    [dashTransitAi, transitToday?.narrative, fallbackParagraph],
  );

  const transitLuckFingerprint = useMemo(
    () => buildTransitLuckFingerprint(transitToday ?? undefined),
    [transitToday],
  );

  const shareCardDailyToday = useMemo(
    () => buildShareCardDailyExtras(sunSign, todayStr, transitLuckFingerprint),
    [sunSign, todayStr, transitLuckFingerprint],
  );

  const histEntry = useMemo(() => {
    if (isTodayView) return undefined;
    return historyList.find((h) => h.visitYmd === viewYmd);
  }, [historyList, isTodayView, viewYmd]);

  const shareCardDailyResolved = useMemo(() => {
    if (isTodayView) return shareCardDailyToday;
    if (histEntry?.luckLine && histEntry.colorLabel && histEntry.colorHex) {
      return {
        luckLine: histEntry.luckLine,
        colorLabel: histEntry.colorLabel,
        colorHex: histEntry.colorHex,
      };
    }
    return shareCardDailyToday;
  }, [isTodayView, shareCardDailyToday, histEntry]);

  const quoteLinesForCard = useMemo(() => {
    if (isTodayView) return quoteLinesToday;
    if (histEntry?.quoteLines?.length) return histEntry.quoteLines;
    return ["Sem texto guardado para este dia neste aparelho."];
  }, [isTodayView, quoteLinesToday, histEntry]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHistoryList(loadMomentHistory());
  }, [todayStr]);

  useEffect(() => {
    if (!isTodayView || !primary || chartsLoading || quoteLinesToday.length === 0) return;
    upsertMomentHistory({
      visitYmd: todayStr,
      savedAt: new Date().toISOString(),
      quoteLines: quoteLinesToday,
      luckLine: shareCardDailyToday?.luckLine,
      colorLabel: shareCardDailyToday?.colorLabel,
      colorHex: shareCardDailyToday?.colorHex,
      transitFingerprint: transitLuckFingerprint,
      intensityBucket:
        transitToday !== undefined && transitToday !== null
          ? Math.floor(Math.min(100, Math.max(0, transitToday.intensity)) / 25)
          : undefined,
      transitSnippet: transitToday?.narrative[0]?.replace(/^✦\s*/, ""),
      aiText: dashTransitAi ?? null,
    });
    setHistoryList(loadMomentHistory());
  }, [
    isTodayView,
    primary,
    chartsLoading,
    todayStr,
    quoteLinesToday,
    shareCardDailyToday,
    transitLuckFingerprint,
    transitToday,
    dashTransitAi,
  ]);

  const cardTitle = useMemo(
    () => (displayName.split(/\s+/)[0] ?? displayName).toUpperCase(),
    [displayName],
  );

  const brandHandle = getInstagramBrandHandle();

  const sharePublicUrl = useMemo(() => getSharePublicUrl(), []);

  const hashtagSeed = useMemo(() => {
    const dateStr = viewYmd;
    const fp = isTodayView ? transitLuckFingerprint : histEntry?.transitFingerprint;
    const bucket = isTodayView
      ? transitToday !== undefined && transitToday !== null
        ? Math.floor(Math.min(100, Math.max(0, transitToday.intensity)) / 25)
        : undefined
      : histEntry?.intensityBucket;
    return {
      sunSignLabel: signLabelPt(sunSign) || "Sol",
      dateStr,
      transitFingerprint: fp,
      dominantElement: personalizedInsights?.dominantElement,
      intensityBucket: bucket,
    };
  }, [
    viewYmd,
    isTodayView,
    transitLuckFingerprint,
    histEntry?.transitFingerprint,
    histEntry?.intensityBucket,
    transitToday,
    sunSign,
    personalizedInsights?.dominantElement,
  ]);

  const captionTransitHookLine = useMemo(() => {
    if (isTodayView && transitToday?.narrative?.length) {
      const line = transitToday.narrative[0]!.replace(/^✦\s*/, "").trim();
      return line || undefined;
    }
    if (!isTodayView && histEntry?.transitSnippet) {
      const line = histEntry.transitSnippet.replace(/^✦\s*/, "").trim();
      return line || undefined;
    }
    return undefined;
  }, [isTodayView, transitToday, histEntry]);

  const captionEssenceLine = useMemo(() => {
    if (natalEssenceQuery.data?.essence && !natalEssenceQuery.isError) {
      const t = natalEssenceQuery.data.essence.trim();
      return t || undefined;
    }
    return undefined;
  }, [natalEssenceQuery.data?.essence, natalEssenceQuery.isError]);

  const captionText = useMemo(
    () =>
      buildMomentShareCaption({
        titleFirstName: cardTitle,
        luckLine: shareCardDailyResolved?.luckLine,
        colorLabel: shareCardDailyResolved?.colorLabel,
        colorHex: shareCardDailyResolved?.colorHex,
        essenceLine: captionEssenceLine,
        transitHookLine: captionTransitHookLine,
        brandHandle,
        shareUrl: sharePublicUrl || undefined,
        preset: captionPreset,
        hashtags: captionWithHashtags ? suggestedMomentHashtags(hashtagSeed) : undefined,
      }),
    [
      cardTitle,
      shareCardDailyResolved,
      captionEssenceLine,
      captionTransitHookLine,
      brandHandle,
      sharePublicUrl,
      captionPreset,
      captionWithHashtags,
      hashtagSeed,
    ],
  );

  const titledDate = useMemo(() => {
    const d = parseISO(`${viewYmd}T12:00:00.000Z`);
    return format(d, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }, [viewYmd]);

  async function handleShare() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { captureMomentShareCardPng, sharePngIfPossible, downloadBlob } =
        await import("@/lib/share-card-export");
      const blob = await captureMomentShareCardPng(cardRef.current, {
        pixelRatio: highQuality ? 2 : 1,
        backgroundColor: CARD_THEMES[cardTheme].bg,
      });
      const filename = `astro-moment-${viewYmd}.png`;
      const shared = await sharePngIfPossible(blob, filename, "Meu momento com o céu — AstroMap");
      if (!shared) await downloadBlob(blob, filename);
      toast.success(shared ? "Partilhado" : "Imagem guardada");
    } catch {
      toast.error("Não foi possível gerar a imagem. Tente noutro navegador.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const { captureMomentShareCardPng, downloadBlob } = await import("@/lib/share-card-export");
      const blob = await captureMomentShareCardPng(cardRef.current, {
        pixelRatio: highQuality ? 2 : 1,
        backgroundColor: CARD_THEMES[cardTheme].bg,
      });
      await downloadBlob(blob, `astro-moment-${viewYmd}.png`);
      toast.success("Imagem guardada");
    } catch {
      toast.error("Falha ao guardar a imagem.");
    } finally {
      setExporting(false);
    }
  }

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(captionText);
      toast.success("Legenda copiada — cole no Instagram");
    } catch {
      toast.error("Não foi possível copiar. Verifique permissões do navegador.");
    }
  }

  if (chartsLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Carregando seu momento...</p>
      </div>
    );
  }

  if (!primary) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm">Sem mapa principal — a redirecionar para criar o seu mapa.</p>
      </div>
    );
  }

  if (rollout?.active && !rollout.gates.transits) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 md:max-w-xl">
        <BackToDashboardLink buttonClassName="mb-4" />
        <Alert className="border-primary/25 bg-primary/5">
          <AlertTitle>Momento disponível em breve</AlertTitle>
          <AlertDescription>{rolloutLockedMessage("transits", rollout.dayIndex)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!wheelData || !personalizedInsights) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">
        <p className="mb-4 text-sm">
          Os dados do mapa não estão completos. Volte ao painel ou atualize o mapa.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Ir ao painel</Link>
        </Button>
      </div>
    );
  }

  const previewScale = "min(1, calc((100vw - 32px) / 1080))";
  const dashAiShown = isTodayView ? dashTransitAi : histEntry?.aiText;
  const narrativeShown = isTodayView
    ? (transitToday?.narrative.slice(0, 4) ?? [])
    : histEntry?.transitSnippet
      ? [histEntry.transitSnippet]
      : [];

  return (
    <div className="mx-auto max-w-lg px-3 pb-16 pt-4 md:max-w-3xl md:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <BackToDashboardLink buttonClassName="-ml-2 gap-1 text-muted-foreground" />
        <Badge variant="secondary" className="bg-primary/15 font-display text-primary">
          {streak > 0 ? `${streak} dia${streak === 1 ? "" : "s"} seguidos` : "Comece sua sequência"}
        </Badge>
      </div>

      <header className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/80">
          Ritual diário
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">Momento com o céu</h1>
        <p className="mt-2 text-sm capitalize text-muted-foreground/90">{titledDate}</p>
      </header>

      {primary?.id ? (
        <div className="mb-8">
          <ErrorBoundary
            fallback={
              <p className="text-center text-xs text-muted-foreground py-4">
                Widget de humor indisponível.
              </p>
            }
          >
            <Suspense fallback={null}>
              <MoodWidget chartId={primary.id} todayStr={todayStr} viewYmd={viewYmd} />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={isTodayView ? "secondary" : "outline"}
          onClick={() => setPickedYmd(null)}
          className="text-xs h-8"
        >
          Hoje
        </Button>
        {Array.from({ length: 14 }, (_, i) => {
          const d = subDays(parseISO(`${todayStr}T12:00:00.000Z`), i + 1);
          const ymd = format(d, "yyyy-MM-dd");
          const hasData = historyList.some((h) => h.visitYmd === ymd);
          return (
            <Button
              key={ymd}
              type="button"
              size="sm"
              variant={viewYmd === ymd ? "secondary" : hasData ? "outline" : "ghost"}
              onClick={() => setPickedYmd(ymd)}
              className={`text-xs h-8 ${!hasData ? "opacity-40" : ""}`}
              title={hasData ? "Dados guardados" : "Sem dados para este dia"}
            >
              {format(d, "d MMM", { locale: ptBR })}
            </Button>
          );
        })}
      </div>

      {!isTodayView && !histEntry ? (
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Sem dados guardados para este dia.{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => setPickedYmd(null)}
          >
            Voltar a hoje
          </button>
        </p>
      ) : null}

      <Card className="mb-8 border-primary/15 bg-card/80 shadow-soft backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Seu dia no mapa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isTodayView && transitToday ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Lua em trânsito · {transitToday.transitMoonSign || "—"}
                </Badge>
                <Badge variant="outline">Intensidade {transitToday.intensity}/100</Badge>
              </div>
              <ul className="list-disc space-y-1 pl-4 leading-relaxed text-muted-foreground/90">
                {transitToday.narrative.slice(0, 4).map((line, i) => (
                  <li key={i} className="text-foreground/90">
                    {line}
                  </li>
                ))}
              </ul>
              {transitToday.interpretiveHints.length > 0 ? (
                <div className="rounded-lg border border-accent/20 bg-muted/20 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Para reflexão
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs leading-snug">
                    {transitToday.interpretiveHints.slice(0, 4).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          {!isTodayView && histEntry ? (
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3 text-xs leading-relaxed text-foreground/90">
              <p className="mb-2 font-medium text-muted-foreground">
                Leitura guardada neste aparelho
              </p>
              {narrativeShown.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4">
                  {narrativeShown.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Sem narrativa guardada para este dia.</p>
              )}
            </div>
          ) : null}

          {isTodayView ? (
            <div className="flex flex-col gap-2">
              {aiQuota && !aiQuota.isPremium ? (
                <p
                  className={`text-xs ${aiQuota.nearLimit ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}
                >
                  {aiQuota.remaining === 0 ? (
                    <>
                      Limite mensal atingido ·{" "}
                      <Link to="/assinatura" className="text-primary underline underline-offset-2">
                        Upgrade para ilimitado
                      </Link>
                    </>
                  ) : (
                    `${aiQuota.used}/${aiQuota.limit} interpretações mensais usadas`
                  )}
                </p>
              ) : null}
              <AiButton
                isPending={dashTransitAiMutation.isPending}
                onClick={() => dashTransitAiMutation.mutate()}
                label="Iluminar com IA"
                aria-label="Gerar texto do dia com inteligência artificial"
                className="w-full border-primary/25"
              />
              <AiButton
                isPending={morningDeepMutation.isPending}
                onClick={() => morningDeepMutation.mutate()}
                label="Carta do dia (profunda)"
                aria-label="Gerar carta do dia profunda com estrutura JSON"
                variant="secondary"
                className="w-full border border-primary/10"
              />
            </div>
          ) : null}
          {dashAiShown ? (
            <AiTextCard
              text={dashAiShown}
              badge={
                isTodayView && dashTransitAiCachedAt ? (
                  <AiCacheAgeBadge cachedAt={dashTransitAiCachedAt} />
                ) : null
              }
              className="rounded-md border border-primary/10 bg-background/40 p-3 text-xs"
            />
          ) : null}
          {isTodayView && morningDeep ? (
            <article className="space-y-3 rounded-md border border-accent/20 bg-muted/25 p-3 text-xs leading-relaxed text-foreground/90">
              {morningDeepCachedAt ? <AiCacheAgeBadge cachedAt={morningDeepCachedAt} /> : null}
              <p className="font-semibold text-primary">{morningDeep.greeting}</p>
              <p className="whitespace-pre-wrap">{morningDeep.main_message}</p>
              {morningDeep.secondary_theme ? (
                <p className="text-muted-foreground">{morningDeep.secondary_theme}</p>
              ) : null}
              <p>
                <span className="font-medium text-foreground">Dica prática:</span>{" "}
                {morningDeep.practical_tip}
              </p>
              <p className="italic text-primary/90">«{morningDeep.affirmation}»</p>
              {morningDeep.closing_note ? (
                <p className="text-[11px] text-muted-foreground">{morningDeep.closing_note}</p>
              ) : null}
            </article>
          ) : isTodayView && morningDeepMutation.isError ? (
            <p className="text-center text-xs text-muted-foreground">
              Não foi possível carregar a carta profunda do dia. Tente novamente.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-center font-display text-xl font-semibold">Cartão para o Instagram</h2>
        {natalEssenceQuery.data?.cached ? (
          <div className="flex justify-center">
            <AiCacheAgeBadgeFromResult result={natalEssenceQuery.data} />
          </div>
        ) : null}
        {natalEssenceQuery.isError && isTodayView ? (
          <p className="text-center text-xs text-muted-foreground">
            Essência natal indisponível no momento.{" "}
            <button
              className="underline underline-offset-2"
              onClick={() => void natalEssenceQuery.refetch()}
            >
              Tentar novamente
            </button>
          </p>
        ) : null}
        <p className="text-center text-xs text-muted-foreground/90">
          Pré-visualização do dia selecionado — exportação em alta resolução (1080×1350). Legenda e
          trânsitos em tempo real seguem apenas o dia de hoje.
        </p>

        <div className="mx-auto max-w-md rounded-lg border border-border/40 bg-muted/10 p-4 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Personalizar cartão
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">Tema</Label>
            <div className="flex gap-4">
              {(Object.keys(CARD_THEMES) as CardTheme[]).map((key) => {
                const t = CARD_THEMES[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={t.label}
                    title={t.label}
                    onClick={() => setCardTheme(key)}
                    className={`flex flex-col items-center gap-1 transition-opacity ${cardTheme === key ? "opacity-100" : "opacity-55 hover:opacity-80"}`}
                  >
                    <span
                      className={`block h-9 w-9 rounded-full border-2 transition-colors ${cardTheme === key ? "border-primary" : "border-transparent ring-1 ring-border"}`}
                      style={{ backgroundColor: t.bg }}
                    />
                    <span className="text-[10px] text-muted-foreground">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="show-wheel" className="text-sm">
              Mostrar roda natal
            </Label>
            <Switch id="show-wheel" checked={showWheel} onCheckedChange={setShowWheel} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="high-quality" className="text-sm">
              Qualidade alta (2×)
            </Label>
            <Switch id="high-quality" checked={highQuality} onCheckedChange={setHighQuality} />
          </div>
        </div>

        <div className="flex justify-center overflow-x-auto pb-8 pt-2">
          <div
            className="relative"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            <ShareableMomentCard
              ref={cardRef}
              displayName={cardTitle}
              identityLine={identityLine}
              essenceLine={
                natalEssenceQuery.data?.essence && !natalEssenceQuery.isError
                  ? natalEssenceQuery.data.essence
                  : undefined
              }
              quoteLines={quoteLinesForCard}
              dominantElement={personalizedInsights.dominantElement}
              purposeLine={personalizedInsights.purposeLine}
              luckToday={shareCardDailyResolved?.luckLine}
              todayColor={
                shareCardDailyResolved
                  ? {
                      label: shareCardDailyResolved.colorLabel,
                      hex: shareCardDailyResolved.colorHex,
                    }
                  : undefined
              }
              astroBullets={personalizedInsights.astroBullets}
              brandHandle={brandHandle}
              shareCtaUrl={sharePublicUrl || undefined}
              wheelData={wheelData}
              wheelSize={400}
              theme={CARD_THEMES[cardTheme]}
              showWheel={showWheel}
            />
            {exporting ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-black/60">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="text-xs text-white">Gerando imagem...</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-auto flex max-w-md flex-col gap-3 rounded-lg border border-border/40 bg-muted/10 p-4">
          {!isTodayView && !captionTransitHookLine ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Neste dia o gancho simbólico do trânsito não está disponível na vista histórica — a
              legenda pode usar sorte, cor do dia e essência do mapa quando existirem.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Tamanho da legenda
            </Label>
            <ToggleGroup
              type="single"
              value={captionPreset}
              onValueChange={(v) => {
                if (CAPTION_PRESETS.includes(v as MomentCaptionPreset)) {
                  setCaptionPreset(v as MomentCaptionPreset);
                }
              }}
              variant="outline"
              size="sm"
              className="flex flex-wrap justify-center gap-1"
            >
              <ToggleGroupItem value="short" aria-label="Legenda curta">
                Curta
              </ToggleGroupItem>
              <ToggleGroupItem value="medium" aria-label="Legenda média">
                Média
              </ToggleGroupItem>
              <ToggleGroupItem value="full" aria-label="Legenda completa">
                Completa
              </ToggleGroupItem>
              <ToggleGroupItem value="essence" aria-label="Legenda só essência">
                Só essência
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Quebras de linha são mantidas ao colar; algumas apps podem mostrar espaços de forma
            diferente. Limite macio ~{INSTAGRAM_CAPTION_SOFT_CAP} caracteres (Instagram).
          </p>
          <p className="text-center text-xs tabular-nums text-muted-foreground">
            {captionText.length} caracteres
          </p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="caption-hashtags" className="text-sm">
              Incluir hashtags sugeridas
            </Label>
            <Switch
              id="caption-hashtags"
              checked={captionWithHashtags}
              onCheckedChange={setCaptionWithHashtags}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button
            type="button"
            className="bg-mystical text-white hover:opacity-90"
            disabled={exporting}
            aria-label="Guardar imagem do cartão Momento no dispositivo"
            onClick={handleDownload}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Guardar imagem
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            aria-label="Partilhar ou guardar o cartão Momento como imagem"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Partilhar
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label="Copiar legenda do Instagram para a área de transferência"
            onClick={() => void handleCopyCaption()}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar legenda
          </Button>
        </div>

        {shareCardDailyResolved ? (
          <p className="text-center text-[11px] text-muted-foreground/90">
            Sorte do dia usa o seu Sol ({sunSign ?? "—"}), a data civil (SP) e o contexto da Lua em
            trânsito quando disponível — resultado estável até virar o dia.
          </p>
        ) : null}
        <p className="text-center text-[11px] text-muted-foreground/90">
          Sol · Lua · Asc vêm do seu mapa. Dominância elemental: contagem entre Sol e Saturno
          (heurística).
        </p>
      </section>
    </div>
  );
}
