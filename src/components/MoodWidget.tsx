import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getMoodHistoryFn, upsertMoodFn } from "@/lib/mood.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";

const EMOTIONS = ["calmo", "ansioso", "energizado", "cansado", "focado", "melancólico"] as const;

type MoodWidgetProps = {
  chartId: string;
  /** Dia civil SP «hoje» — ancora da janela de histórico. */
  todayStr: string;
  /** Dia que o utilizador está a ver no Momento (pode ser histórico). */
  viewYmd: string;
};

export function MoodWidget({ chartId, todayStr, viewYmd }: MoodWidgetProps) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [score, setScore] = useState([5]);
  const [chips, setChips] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const range = useMemo(() => {
    const end = todayStr;
    const start = format(subDays(parseISO(`${end}T12:00:00.000Z`), 29), "yyyy-MM-dd");
    return { start, end };
  }, [todayStr]);

  const historyQuery = useQuery({
    queryKey: ["mood-history", chartId, range.start, range.end],
    queryFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return getMoodHistoryFn({
        data: { chartId, startYmd: range.start, endYmd: range.end },
        ...withSupabaseAuth(session),
      });
    },
    enabled: !!session && !!chartId,
    staleTime: 30_000,
  });

  useEffect(() => {
    const row = historyQuery.data?.entries.find((e) => e.ymd === viewYmd);
    if (row) {
      setScore([row.mood_score]);
      setChips([...(row.emotions ?? [])]);
      setNote(row.note ?? "");
    } else {
      setScore([5]);
      setChips([]);
      setNote("");
    }
  }, [historyQuery.data, viewYmd]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão necessária.");
      return upsertMoodFn({
        data: {
          chartId,
          ymd: viewYmd,
          moodScore: score[0] ?? 5,
          emotions: chips,
          note: note.trim() || undefined,
        },
        ...withSupabaseAuth(session),
      });
    },
    onSuccess: async () => {
      toast.success("Humor registado");
      await qc.invalidateQueries({ queryKey: ["mood-history", chartId] });
    },
    onError: (e) => void toastServerFnError(e),
  });

  const chartWindow = useMemo(() => {
    const end = todayStr;
    const start = format(subDays(parseISO(`${end}T12:00:00.000Z`), 13), "yyyy-MM-dd");
    const entries = historyQuery.data?.entries ?? [];
    const n = entries.filter((e) => e.ymd >= start && e.ymd <= end).length;
    const intens = historyQuery.data?.intensityByYmd ?? {};
    const points = Array.from({ length: 14 }, (_, i) => {
      const ymd = format(addDays(parseISO(`${start}T12:00:00.000Z`), i), "yyyy-MM-dd");
      const moodRow = entries.find((e) => e.ymd === ymd);
      const ins = intens[ymd];
      return {
        ymd,
        label: format(parseISO(`${ymd}T12:00:00.000Z`), "dd/MM", { locale: ptBR }),
        humor: moodRow?.mood_score ?? null,
        transitos: ins !== undefined ? Math.min(10, ins / 10) : null,
      };
    });
    return { start, end, moodCount14: n, points };
  }, [historyQuery.data, todayStr]);

  const showChart = chartWindow.moodCount14 >= 7;

  function toggleChip(e: string) {
    setChips((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  const isTodayView = viewYmd === todayStr;

  return (
    <Card className="border-primary/15 bg-gradient-to-b from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg">Diário de humor</CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Um registo por dia civil ({viewYmd}). Escala 1–10 e etiquetas opcionais — correlaciona com
          a intensidade dos trânsitos ao meio-dia UTC.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isTodayView ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
            Está a visualizar {viewYmd}. O registo abaixo grava o humor deste dia (não apenas o dia
            de hoje).
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Nível de humor (1–10)</Label>
            <span className="text-sm tabular-nums font-medium text-primary">{score[0]}</span>
          </div>
          <Slider
            value={score}
            onValueChange={setScore}
            min={1}
            max={10}
            step={1}
            disabled={!session}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Emoções (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map((e) => (
              <Badge
                key={e}
                variant={chips.includes(e) ? "default" : "outline"}
                className="cursor-pointer font-normal capitalize"
                onClick={() => toggleChip(e)}
              >
                {e}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mood-note">Nota curta (opcional)</Label>
          <Textarea
            id="mood-note"
            rows={2}
            maxLength={800}
            placeholder="Uma linha sobre o dia…"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            disabled={!session}
          />
        </div>

        <Button
          type="button"
          className="w-full bg-mystical text-white"
          disabled={!session || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "A guardar…" : "Registar humor"}
        </Button>

        {historyQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">A carregar histórico…</p>
        ) : historyQuery.isError ? (
          <p className="text-xs text-destructive">Não foi possível carregar o histórico.</p>
        ) : showChart ? (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Últimos 14 dias (humor e trânsitos)
            </p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartWindow.points}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[1, 10]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value, name) => [
                      (value as number | undefined) ?? "—",
                      name === "humor" ? "Humor" : "Trânsitos /10",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="humor"
                    name="Humor"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="transitos"
                    name="Intensidade /10"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {historyQuery.data?.correlationNote ? (
              <p className="text-xs leading-relaxed text-muted-foreground border-t border-border/60 pt-3">
                {historyQuery.data.correlationNote}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">
            Após 7 registos nos últimos 14 dias, aparece aqui o mini gráfico de humor e intensidade.
            Já tem {chartWindow.moodCount14} registo
            {chartWindow.moodCount14 === 1 ? "" : "s"} nesta janela.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
