import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Stars, Sparkles, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import { UpgradeMapModal } from "@/components/UpgradeMapModal";
import { useDailyMoment } from "@/hooks/use-daily-moment";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  ENGAGEMENT_ROUTES,
  ENGAGEMENT_TOPICS,
  insertEngagementEventDeduped,
} from "@/lib/engagement";
import { buildShareCardDailyExtras, buildTransitLuckFingerprint } from "@/data/share-card-daily";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    insertEngagementEventDeduped(supabase, user.id, {
      route_key: ENGAGEMENT_ROUTES.dashboard,
      topic_key: ENGAGEMENT_TOPICS.dashboard_open,
    });
  }, [user?.id]);

  const {
    profile,
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

  function handleNewMap() {
    if (profile?.subscription_tier === "FREE" && charts.length >= 1) {
      setUpgradeOpen(true);
      return;
    }
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
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Humor {transitToday.scores.humor}/100
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Relações {transitToday.scores.amor}/100
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Trabalho {transitToday.scores.trabalho}/100
                  </Badge>
                </div>
                <ul className="list-disc space-y-1 pl-4 text-sm leading-snug">
                  {transitToday.narrative.slice(0, 4).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-primary/25 text-xs"
                    disabled={dashTransitAiMutation.isPending}
                    aria-label="Gerar explicação do trânsito de hoje com inteligência artificial"
                    onClick={() => dashTransitAiMutation.mutate()}
                  >
                    {dashTransitAiMutation.isPending ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3 w-3" />
                    )}
                    Explicar hoje com IA
                  </Button>
                  {dashTransitAi ? (
                    <article className="rounded-md border border-primary/10 bg-background/40 p-2 text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {dashTransitAi}
                    </article>
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
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Veja uma janela de datas, marque dias intensos, filtre aspectos e exporte PDF. Envie
              um resumo por email quando o servidor tiver Resend configurado.
            </p>
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
