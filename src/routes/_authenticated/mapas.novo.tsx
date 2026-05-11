import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BirthChartForm } from "@/components/BirthChartForm";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mapas/novo")({
  component: NovoMapa,
});

function NovoMapa() {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold mb-6">Novo mapa astral</h1>
      <BirthChartForm
        session={session}
        setPrimary={false}
        submitLabel="Criar mapa"
        onSuccess={(chartId) => {
          toast.success("Mapa criado!");
          navigate({ to: "/mapas/$id", params: { id: chartId } });
        }}
      />
    </div>
  );
}
