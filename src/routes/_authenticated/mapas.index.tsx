import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, MoreVertical, Pencil, Plus, Star, Stars, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyFeatureState } from "@/components/EmptyFeatureState";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useChartsListQuery } from "@/hooks/use-charts-list";
import { useAuth } from "@/hooks/use-auth";
import { deleteChartFn, makePrimaryChartFn } from "@/lib/charts.functions";
import { withSupabaseAuth } from "@/lib/server-fn-client";
import { toastServerFnError } from "@/lib/toast-server-fn-error";

export const Route = createFileRoute("/_authenticated/mapas/")({
  component: MapasList,
});

function MapasList() {
  const qc = useQueryClient();
  const { session, user } = useAuth();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: charts = [] } = useChartsListQuery();

  const chartsKey = ["charts", user?.id] as const;

  function openRename(c: { id: string; name: string }) {
    setRenameId(c.id);
    setRenameValue(c.name);
    setRenameOpen(true);
  }

  async function saveRename() {
    if (!renameId || !renameValue.trim()) return;
    const newName = renameValue.trim();
    // Optimistic update
    qc.setQueryData(chartsKey, (old: typeof charts | undefined) =>
      old?.map((c) => (c.id === renameId ? { ...c, name: newName } : c)),
    );
    setRenameOpen(false);
    const { error } = await supabase.from("charts").update({ name: newName }).eq("id", renameId);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: chartsKey });
    } else {
      toast.success("Nome atualizado");
    }
  }

  async function makePrimaryChart(chartId: string) {
    // Optimistic update — toggle is_primary flags
    qc.setQueryData(chartsKey, (old: typeof charts | undefined) =>
      old?.map((c) => ({ ...c, is_primary: c.id === chartId })),
    );
    try {
      await makePrimaryChartFn({ data: chartId, ...withSupabaseAuth(session) });
      toast.success("Mapa definido como primário");
    } catch (err) {
      qc.invalidateQueries({ queryKey: chartsKey });
      await toastServerFnError(err);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    // Optimistic update — remove from list immediately
    qc.setQueryData(chartsKey, (old: typeof charts | undefined) =>
      old?.filter((c) => c.id !== deleteId),
    );
    setDeleteId(null);
    try {
      await deleteChartFn({ data: deleteId, ...withSupabaseAuth(session) });
      toast.success("Mapa excluído");
    } catch (err) {
      qc.invalidateQueries({ queryKey: chartsKey });
      await toastServerFnError(err);
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
        <EmptyFeatureState
          icon={Stars}
          title="Nenhum mapa guardado"
          description="Crie o seu primeiro mapa natal — demora menos de um minuto. Use o onboarding guiado ou adicione diretamente."
          primaryCta={{ label: "Começar pelo onboarding", to: "/onboarding" }}
          secondaryCta={{ label: "Novo mapa direto", to: "/mapas/novo", variant: "outline" }}
        />
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
                        onClick={() => setDeleteId(c.id)}
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

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mapa permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O mapa e todas as interpretações em cache serão
              removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
