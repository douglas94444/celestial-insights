import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BirthChartForm } from "@/components/BirthChartForm";
import { UpgradeMapModal } from "@/components/UpgradeMapModal";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useChartsListQuery } from "@/hooks/use-charts-list";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/novo")({
  component: NovoMapa,
});

function NovoMapa() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: profile } = useProfile();
  const { data: charts = [] } = useChartsListQuery();

  const freeBlocked = profile?.subscription_tier === "FREE" && charts.length >= 1;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold mb-6">Novo mapa astral</h1>
      {freeBlocked ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">
            No plano gratuito você pode ter um mapa. Para criar outro perfil, faça upgrade quando o
            Premium estiver disponível.
          </p>
          <button
            type="button"
            className="mt-4 text-primary underline font-medium"
            onClick={() => setUpgradeOpen(true)}
          >
            Ver AstroMap Premium
          </button>
        </div>
      ) : (
        <BirthChartForm
          session={session}
          setPrimary={false}
          submitLabel="Criar mapa"
          onBusinessError={(code) => {
            if (code === "FREE_LIMIT") setUpgradeOpen(true);
          }}
          onSuccess={(chartId) => {
            toast.success("Mapa criado!");
            navigate({ to: "/mapas/$id", params: { id: chartId } });
          }}
        />
      )}
      <UpgradeMapModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
