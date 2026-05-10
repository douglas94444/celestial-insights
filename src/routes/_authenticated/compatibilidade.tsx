import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/compatibilidade")({
  component: () => (
    <div className="container mx-auto max-w-xl p-6 text-center">
      <Lock className="mx-auto mt-12 h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 font-display text-2xl font-bold">Sinastria — em breve</h1>
      <p className="mt-2 text-muted-foreground">
        Compare dois mapas e descubra a compatibilidade entre vocês.
      </p>
      <Button asChild className="mt-6 bg-mystical text-white"><Link to="/dashboard"><Sparkles className="mr-1 h-4 w-4" /> Voltar</Link></Button>
    </div>
  ),
});
