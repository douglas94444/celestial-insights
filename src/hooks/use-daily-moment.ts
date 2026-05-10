import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  HOROSCOPE_MOON_SKY,
  MOON_IN_SIGN,
  HOROSCOPE_ASC_MICRO,
  HOROSCOPE_DAILY,
  excerptInterpretation,
} from "@/data/interpretations";
import type { SignName } from "@/lib/astrology/zodiac";
import type {
  Aspect,
  ChartData,
  HousePosition,
  HouseSystemId,
  PlanetPosition,
} from "@/lib/astrology/calculate";
import { computeAngles } from "@/lib/astrology/calculate";
import { parseTimezoneLabelToMinutes } from "@/lib/timezone-br";
import { analyzeTransitDay, analyzeTransitRange } from "@/lib/astrology/transits";
import {
  generateMorningDeepMessageFn,
  generateNatalEssenceFn,
  generateTransitDayNarrativeFn,
} from "@/lib/ai-interpretation.functions";
import type {
  AiInterpretationFnResult,
  MorningDeepMessageFnResult,
  NatalEssenceFnResult,
} from "@/lib/types/server-fn-results";
import type { MorningDeepOutput } from "@/lib/schemas/personalization-ai";
import { getServerFnErrorMessage } from "@/lib/server-fn-errors";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toast } from "sonner";
import { ENGAGEMENT_ROUTES, ENGAGEMENT_TOPICS, insertEngagementEvent } from "@/lib/engagement";
import {
  buildPersonalizedMomentInsights,
  resolveMomentDisplayName,
} from "@/lib/personalized-moment";

export function useDailyMoment() {
  const { user, session } = useAuth();
  const [dashTransitAi, setDashTransitAi] = useState<string | null>(null);
  const [morningDeep, setMorningDeep] = useState<MorningDeepOutput | null>(null);

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

  const { data: charts = [], isLoading: chartsLoading } = useQuery({
    queryKey: ["charts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("charts").select("*").order("created_at", {
        ascending: false,
      });
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

  const transitWeek = useMemo(() => {
    if (!primary || planets.length === 0 || houses.length === 0) return [];
    return analyzeTransitRange(todayStr, weekEndStr, planets, houses, ascendant, chartHouseSys);
  }, [primary, planets, houses, ascendant, chartHouseSys, todayStr, weekEndStr]);

  const moonSkyLine = useMemo(() => {
    const s = transitToday?.transitMoonSign;
    if (!s || !(s in HOROSCOPE_MOON_SKY)) return null;
    return HOROSCOPE_MOON_SKY[s as SignName];
  }, [transitToday?.transitMoonSign]);

  const personalizedInsights = useMemo(() => {
    if (!primary || planets.length === 0) return null;
    return buildPersonalizedMomentInsights(planets, houses, transitToday);
  }, [primary, planets, houses, transitToday]);

  const displayName = useMemo(
    () => resolveMomentDisplayName(profile, primary, user?.email),
    [profile, primary, user?.email],
  );

  useEffect(() => {
    setDashTransitAi(null);
  }, [primary?.id, todayStr]);

  useEffect(() => {
    setMorningDeep(null);
  }, [primary?.id, todayStr]);

  const dashTransitAiMutation = useMutation<AiInterpretationFnResult, Error, void>({
    mutationFn: async () => {
      if (!session || !primary) throw new Error("Sessão ou mapa necessário.");
      return generateTransitDayNarrativeFn({
        data: { chartId: primary.id, date: todayStr },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setDashTransitAi(r.content);
      if (user?.id)
        insertEngagementEvent(supabase, user.id, {
          route_key: ENGAGEMENT_ROUTES.momento,
          topic_key: ENGAGEMENT_TOPICS.ai_transit_momento,
          meta: { cached: r.cached },
        });
      if (r.cached) toast.message("Texto recuperado do cache.");
    },
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
  });

  const morningDeepMutation = useMutation<MorningDeepMessageFnResult, Error, void>({
    mutationFn: async () => {
      if (!session || !primary) throw new Error("Sessão ou mapa necessário.");
      return generateMorningDeepMessageFn({
        data: { chartId: primary.id, date: todayStr },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: (r) => {
      setMorningDeep(r.morning);
      if (user?.id)
        insertEngagementEvent(supabase, user.id, {
          route_key: ENGAGEMENT_ROUTES.momento,
          topic_key: ENGAGEMENT_TOPICS.ai_morning_deep,
          meta: { cached: r.cached },
        });
      if (r.cached) toast.message("Carta profunda recuperada do cache.");
    },
    onError: async (e) => {
      toast.error(await getServerFnErrorMessage(e));
    },
  });

  const natalEssenceQuery = useQuery<NatalEssenceFnResult>({
    queryKey: ["natal-essence", primary?.id],
    queryFn: async () =>
      generateNatalEssenceFn({
        data: { chartId: primary!.id },
        ...withSupabaseAuth(session!),
      }),
    enabled: !!session && !!primary?.id,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  return {
    user,
    session,
    profile,
    charts,
    chartsLoading,
    primary,
    planets,
    houses,
    aspects,
    tzOff,
    chartHouseSys,
    angles,
    ascendant,
    wheelData,
    sunSign,
    moonSign,
    ascSign,
    todayStr,
    weekEndStr,
    transitToday,
    transitWeek,
    moonSkyLine,
    dashTransitAi,
    setDashTransitAi,
    dashTransitAiMutation,
    morningDeep,
    setMorningDeep,
    morningDeepMutation,
    natalEssenceQuery,
    personalizedInsights,
    displayName,

    horoscopeSolarLine: sunSign ? HOROSCOPE_DAILY[sunSign] : null,
    moonNatalExcerpt:
      moonSign && moonSign in MOON_IN_SIGN ? excerptInterpretation(MOON_IN_SIGN[moonSign]) : null,
    ascMicroLine: ascSign && ascSign in HOROSCOPE_ASC_MICRO ? HOROSCOPE_ASC_MICRO[ascSign] : null,

    formatWeekdayShort: (dateStr: string) =>
      format(parseISO(`${dateStr}T12:00:00.000Z`), "EEE dd/MM", { locale: ptBR }),
  };
}
