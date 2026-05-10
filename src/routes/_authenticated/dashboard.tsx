import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Stars, Sparkles, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  excerptInterpretation,
  HOROSCOPE_ASC_MICRO,
  HOROSCOPE_DAILY,
  HOROSCOPE_MOON_SKY,
  MOON_IN_SIGN,
} from "@/data/interpretations";
import type { SignName } from "@/lib/astrology/zodiac";
import { NatalChartWheel } from "@/components/NatalChartWheel";
import {
  computeAngles,
  type Aspect,
  type ChartData,
  type HousePosition,
  type HouseSystemId,
  type PlanetPosition,
} from "@/lib/astrology/calculate";
import { parseTimezoneLabelToMinutes } from "@/lib/timezone-br";
import { UpgradeMapModal } from "@/components/UpgradeMapModal";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { analyzeTransitDay, analyzeTransitRange } from "@/lib/astrology/transits";
import { generateTransitDayNarrativeFn } from "@/lib/ai-interpretation.functions";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";
import { withSupabaseAuth } from "@/lib/server-fn-client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [dashTransitAi, setDashTransitAi] = useState<string | null>(null);

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
  const planets = useMemo(
    () => (primary?.planets_data as PlanetPosition[] | null) ?? [],
    [primary?.planets_data],
  );
  const houses = useMemo(
    () => (primary?.houses_data as HousePosition[] | null) ?? [],
    [primary?.houses_data],
  );
  const aspects = (primary?.aspects_data as Aspect[] | null) ?? [];
  const tzOff =
    primary?.timezone_offset_minutes ??
    parseTimezoneLabelToMinutes(primary?.timezone ?? "") ??
    -180;
  const chartHouseSys = (primary?.house_system as HouseSystemId | undefined) ?? "placidus";
  const angles = primary
    ? computeAngles({
        birthDate: primary.birth_date,
        birthTime: primary.birth_time,
        latitude: primary.latitude,
        longitude: primary.longitude,
        timezoneOffset: tzOff,
        houseSystem: chartHouseSys,
      })
    : null;
  const ascendant = houses[0]?.cusp ?? angles?.ascendant ?? 0;
  const wheelData: ChartData | null =
    primary && angles
      ? {
          ascendant,
          midheaven: angles.midheaven,
          planets,
          houses,
          aspects,
        }
      : null;

  const sunSign = planets.find((p) => p.key === "sun")?.sign as SignName | undefined;
  const moonSign = planets.find((p) => p.key === "moon")?.sign as SignName | undefined;
  const ascSign = houses[0]?.sign as SignName | undefined;

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
    [],
  );

  const weekEndStr = useMemo(() => {
    const [y, m, d] = todayStr.split("-").map(Number);
    const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return format(addDays(base, 6), "yyyy-MM-dd");
  }, [todayStr]);

  const transitToday = useMemo(() => {
    if (!primary || planets.length === 0 || houses.length === 0) return null;
    return analyzeTransitDay(todayStr, planets, houses, ascendant, chartHouseSys);
  }, [primary, planets, houses, ascendant, chartHouseSys, todayStr]);

  useEffect(() => {
    setDashTransitAi(null);
  }, [primary?.id, todayStr]);

  const dashTransitAiMutation = useMutation({
    mutationFn: async () => {
      if (!session || !primary) throw new Error("Sessão ou mapa necessário.");
      return generateTransitDayNarrativeFn({
        data: { chartId: primary.id, date: todayStr },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setDashTransitAi(r.content);
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
  });

  const transitWeek = useMemo(() => {
    if (!primary || planets.length === 0 || houses.length === 0) return [];
    return analyzeTransitRange(todayStr, weekEndStr, planets, houses, ascendant, chartHouseSys);
  }, [primary, planets, houses, ascendant, chartHouseSys, todayStr, weekEndStr]);

  const moonSkyLine = useMemo(() => {
    const s = transitToday?.transitMoonSign;
    if (!s || !(s in HOROSCOPE_MOON_SKY)) return null;
    return HOROSCOPE_MOON_SKY[s as SignName];
  }, [transitToday?.transitMoonSign]);

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
            <CardTitle>Horóscopo hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <Badge variant="outline" className="mb-2 text-[10px] uppercase">
                Signo solar (geral)
              </Badge>
              <p>
                {sunSign ? HOROSCOPE_DAILY[sunSign] : "Crie seu mapa para ver o horóscopo do dia."}
              </p>
            </div>

            {primary && moonSign && MOON_IN_SIGN[moonSign] ? (
              <div className="rounded-md border border-accent/20 bg-muted/20 p-3">
                <Badge variant="outline" className="mb-2 text-[10px] uppercase">
                  Lua natal (autoconhecimento)
                </Badge>
                <p className="text-foreground/90 leading-snug">
                  {excerptInterpretation(MOON_IN_SIGN[moonSign])}
                </p>
                <Link
                  to="/mapas/$id"
                  params={{ id: primary.id }}
                  className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver mapa
                </Link>
              </div>
            ) : null}

            {primary && ascSign && HOROSCOPE_ASC_MICRO[ascSign] ? (
              <div className="flex flex-col gap-2">
                <Badge variant="outline" className="w-fit text-[10px] uppercase">
                  Ascendente · {ascSign}
                </Badge>
                <p className="text-xs leading-snug text-foreground/85">
                  {HOROSCOPE_ASC_MICRO[ascSign]}
                </p>
              </div>
            ) : null}

            {transitToday && (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-foreground">
                <Badge variant="secondary" className="mb-2 bg-primary/15 text-primary">
                  Personalizado · trânsitos × seu mapa
                </Badge>
                <p className="text-xs text-muted-foreground mb-2">
                  Lua em trânsito em {transitToday.transitMoonSign || "—"} · intensidade{" "}
                  {transitToday.intensity}/100
                </p>
                {moonSkyLine ? (
                  <p className="text-xs text-muted-foreground mb-2 leading-snug">{moonSkyLine}</p>
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

                <div className="mt-3 border-t border-primary/10 pt-3 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-primary/25"
                    disabled={dashTransitAiMutation.isPending}
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
                    <article className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90 rounded-md bg-background/40 p-2 border border-primary/10">
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
                        {format(parseISO(`${d.date}T12:00:00.000Z`), "EEE dd/MM", { locale: ptBR })}
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

        <Card className="md:col-span-3 border border-accent/20 shadow-soft">
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
            <Button asChild className="bg-mystical text-white hover:opacity-90">
              <Link to="/transitos">
                <Sparkles className="mr-1 h-4 w-4" /> Abrir trânsitos
              </Link>
            </Button>
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
