import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BirthChartForm } from "@/components/BirthChartForm";
import { UpgradeMapModal } from "@/components/UpgradeMapModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/novo")({
  component: NovoMapa,
});

function NovoMapa() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_tier")
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
      const { data, error } = await supabase.from("charts").select("id").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
