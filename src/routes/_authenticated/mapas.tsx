import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, MoreVertical, Pencil, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useChartsListQuery } from "@/hooks/use-charts-list";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/mapas")({
  component: MapasList,
});

function MapasList() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: charts = [] } = useChartsListQuery();

  function openRename(c: { id: string; name: string }) {
    setRenameId(c.id);
    setRenameValue(c.name);
    setRenameOpen(true);
  }

  async function saveRename() {
    if (!renameId || !renameValue.trim()) return;
    const { error } = await supabase
      .from("charts")
      .update({ name: renameValue.trim() })
      .eq("id", renameId);
    if (error) toast.error(error.message);
    else {
      toast.success("Nome atualizado");
      qc.invalidateQueries({ queryKey: ["charts-list"] });
      qc.invalidateQueries({ queryKey: ["charts"] });
      setRenameOpen(false);
    }
  }

  async function makePrimaryChart(chartId: string) {
    if (!user?.id) return;
    const { error: e1 } = await supabase
      .from("charts")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    if (e1) {
      toast.error(e1.message);
      return;
    }
    const { error: e2 } = await supabase
      .from("charts")
      .update({ is_primary: true })
      .eq("id", chartId);
    if (e2) toast.error(e2.message);
    else {
      toast.success("Mapa definido como primário");
      qc.invalidateQueries({ queryKey: ["charts-list"] });
      qc.invalidateQueries({ queryKey: ["charts"] });
    }
  }

  async function deleteChart(id: string) {
    if (!confirm("Excluir este mapa permanentemente?")) return;
    const { error } = await supabase.from("charts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Mapa excluído");
      qc.invalidateQueries({ queryKey: ["charts-list"] });
      qc.invalidateQueries({ queryKey: ["charts"] });
    }
  }

  return (
    <div className="container mx-auto p-4 pb-10 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Meus Mapas</h1>
        <Button asChild className="min-h-10 bg-mystical text-white">
          <Link to="/mapas/novo">
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Link>
        </Button>
      </div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear mapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename">Nome</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-mystical text-white" onClick={saveRename}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {charts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Sparkles className="h-12 w-12 text-primary" />
            <div className="space-y-1">
              <p className="font-display text-lg font-semibold">Nenhum mapa guardado</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Crie o seu primeiro mapa natal — demora menos de um minuto — ou volte ao onboarding
                se preferir o passo a passo inicial.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="bg-mystical text-white">
                <Link to="/onboarding">Começar pelo onboarding</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/mapas/novo">Novo mapa direto</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {charts.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <Link
                    to="/mapas/$id"
                    params={{ id: c.id }}
                    className="flex-1 p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      {c.is_primary ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Primário
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.birth_date).toLocaleDateString("pt-BR")} · {c.birth_place}
                    </p>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 rounded-none border-l"
                        aria-label="Ações"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/mapas/$id"
                          params={{ id: c.id }}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Eye className="h-4 w-4" /> Ver
                        </Link>
                      </DropdownMenuItem>
                      {!c.is_primary ? (
                        <DropdownMenuItem
                          className="flex cursor-pointer items-center gap-2"
                          onClick={() => void makePrimaryChart(c.id)}
                        >
                          <Star className="h-4 w-4" /> Tornar primário
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        className="flex cursor-pointer items-center gap-2"
                        onClick={() => openRename(c)}
                      >
                        <Pencil className="h-4 w-4" /> Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive flex cursor-pointer items-center gap-2 focus:text-destructive"
                        onClick={() => deleteChart(c.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
