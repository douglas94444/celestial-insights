import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ExternalLink, Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminOverviewFn } from "@/lib/admin.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";
import { useAuth } from "@/hooks/use-auth";
import { useUserIsAdmin } from "@/hooks/use-user-is-admin";
import { AdminInstagramSignCards } from "@/components/AdminInstagramSignCards";

const SUPABASE_PROJECT_REF =
  import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, "").split(".")[0] ?? "";
const SUPABASE_DASHBOARD_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}`;

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const adminGate = useUserIsAdmin();

  useEffect(() => {
    if (adminGate.isError && adminGate.error) {
      void toastServerFnError(adminGate.error);
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminGate.isError, adminGate.error, navigate]);

  useEffect(() => {
    if (!adminGate.isPending && adminGate.data === false) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [adminGate.isPending, adminGate.data, navigate]);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminOverviewFn({ ...withSupabaseAuth(session) }),
    enabled: !!session && adminGate.data === true,
  });

  useEffect(() => {
    if (overview.isError && overview.error) {
      void toastServerFnError(overview.error);
    }
  }, [overview.isError, overview.error]);

  if (adminGate.isPending || adminGate.isError || adminGate.data !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  const metrics = overview.data;

  return (
    <div className="container mx-auto space-y-8 p-4 pb-12 md:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mystical text-white shadow-mystical">
          <Shield className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Administração</h1>
          <p className="text-muted-foreground">
            Visão operacional agregada — sem dados pessoais identificáveis neste painel.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Recursos do projeto</CardTitle>
          <CardDescription>Atalhos úteis para operação e desenvolvimento.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <a
            href={SUPABASE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
          >
            Dashboard Supabase (projeto {SUPABASE_PROJECT_REF})
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </a>
          <p className="text-muted-foreground">
            Documentação interna no repositório: ficheiro{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">CLAUDE.md</code> na raiz do
            projeto.
          </p>
          {import.meta.env.VITE_APP_GITHUB_URL ? (
            <a
              href={import.meta.env.VITE_APP_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              Repositório GitHub
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            </a>
          ) : null}
          <Link
            to="/dashboard"
            className="inline-flex w-fit items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Voltar ao painel principal
          </Link>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-4 text-xl font-semibold">Métricas globais</h2>
        {overview.isPending ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : metrics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard title="Perfis" value={metrics.profiles_count} subtitle="total acumulado" />
            <MetricCard title="Mapas" value={metrics.charts_count} subtitle="total acumulado" />
            <MetricCard
              title="Sinastrias"
              value={metrics.synastries_count}
              subtitle="total acumulado"
            />
            <MetricCard
              title="Registos de humor"
              value={metrics.mood_logs_count}
              subtitle="total acumulado"
            />
            <MetricCard
              title="Entradas em cache de interpretação"
              value={metrics.ai_cache_count}
              subtitle="total acumulado"
            />
            <MetricCard
              title="Eventos de produto"
              value={metrics.engagement_events_total}
              subtitle="total acumulado"
            />
            <MetricCard
              title="Eventos de produto"
              value={metrics.engagement_events_last_7d}
              subtitle="últimos 7 dias"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Não foi possível carregar as métricas.</p>
        )}
      </div>

      <AdminInstagramSignCards />
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-bold tabular-nums">
          {value.toLocaleString("pt-BR")}
        </p>
        {subtitle && (
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
