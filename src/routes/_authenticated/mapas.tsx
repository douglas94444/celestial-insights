import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, MoreVertical, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/mapas")({
  component: MapasList,
});

function MapasList() {
  const qc = useQueryClient();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { data: charts = [] } = useQuery({
    queryKey: ["charts-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">Meus Mapas</h1>
        <Button asChild className="bg-mystical text-white">
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
        <p className="text-muted-foreground">
          Nenhum mapa ainda.{" "}
          <Link to="/onboarding" className="text-primary underline">
            Criar o primeiro
          </Link>
          .
        </p>
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
                    <p className="font-medium">{c.name}</p>
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
