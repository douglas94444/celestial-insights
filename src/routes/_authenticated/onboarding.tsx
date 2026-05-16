import { useState } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirthChartForm } from "@/components/BirthChartForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { trackMetaEvent } from "@/lib/meta-pixel";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user, session } = useAuth();

  const {
    data: charts = [],
    isFetched,
    isError: chartsError,
    refetch: refetchCharts,
  } = useQuery({
    queryKey: ["charts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charts")
        .select("id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (chartsError) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-muted-foreground">
          Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void refetchCharts()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (user && isFetched && charts.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSuccess(chartId: string, displayName: string) {
    if (user) {
      await supabase.from("profiles").update({ name: displayName }).eq("id", user.id);
    }
    toast.success("Seu mapa está pronto!");
    navigate({ to: "/mapas/$id", params: { id: chartId }, search: { new: true } });
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <Sparkles className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 font-display text-3xl font-bold">Bem-vindo ao AstroMap ✨</h1>
            <p className="mt-3 text-muted-foreground">
              Vamos criar seu primeiro mapa natal. Leva menos de um minuto.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A seguir você informa data, hora e local de nascimento — e a roda natal é gerada na
              hora.
            </p>
            <Button onClick={() => setStep(1)} className="mt-8 bg-mystical text-white" size="lg">
              Começar
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Passo 2 de 2
            </p>
            <h1 className="font-display text-2xl font-bold">Seus dados de nascimento</h1>
            <BirthChartForm
              session={session}
              setPrimary
              submitLabel="Calcular meu mapa"
              onSuccess={handleSuccess}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
