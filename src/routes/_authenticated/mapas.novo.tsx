import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthChartForm } from "@/components/BirthChartForm";
import { useAuth } from "@/hooks/use-auth";
import { useChartsListQuery } from "@/hooks/use-charts-list";
import { useProfile } from "@/hooks/use-profile";
import { useSubscriptionRollout } from "@/hooks/use-subscription-rollout";
import { RolloutLockedAlert } from "@/components/RolloutLockedAlert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/novo")({
  component: NovoMapa,
});

function NovoMapa() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data: charts = [] } = useChartsListQuery();
  const rollout = useSubscriptionRollout();
  const { data: profile } = useProfile();
  const tier = profile?.subscription_tier ?? "FREE";
  const blockSecond = charts.length >= 1 && rollout?.active && !rollout.gates.extraCharts;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold mb-6">Novo mapa astral</h1>
      {blockSecond && rollout ? (
        <RolloutLockedAlert
          className="mb-6"
          tier={tier}
          feature="extraCharts"
          dayIndex={rollout.dayIndex}
          rampTitle="Mais mapas em breve"
        />
      ) : null}
      <fieldset disabled={!!blockSecond} className="min-w-0 border-0 p-0 m-0 disabled:opacity-60">
        <BirthChartForm
          session={session}
          setPrimary={false}
          submitLabel="Criar mapa"
          onSuccess={(chartId) => {
            toast.success("Mapa criado!");
            navigate({ to: "/mapas/$id", params: { id: chartId } });
          }}
        />
      </fieldset>
    </div>
  );
}
