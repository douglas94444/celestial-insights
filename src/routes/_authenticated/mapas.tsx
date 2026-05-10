import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/mapas")({
  component: MapasList,
});

function MapasList() {
  const { data: charts = [] } = useQuery({
    queryKey: ["charts-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("charts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Meus Mapas</h1>
        <Button asChild className="bg-mystical text-white">
          <Link to="/mapas/novo"><Plus className="mr-1 h-4 w-4" /> Novo</Link>
        </Button>
      </div>
      {charts.length === 0 ? (
        <p className="text-muted-foreground">Nenhum mapa ainda. <Link to="/onboarding" className="text-primary underline">Criar o primeiro</Link>.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {charts.map((c) => (
            <Link key={c.id} to="/mapas/$id" params={{ id: c.id }}>
              <Card className="hover:border-primary transition-colors">
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
      )}
    </div>
  );
}
