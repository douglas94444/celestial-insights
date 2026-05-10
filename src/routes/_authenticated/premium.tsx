import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPlaceholder,
});

function PremiumPlaceholder() {
  return (
    <div className="container mx-auto max-w-lg p-6">
      <Card>
        <CardHeader className="text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle className="font-display text-2xl">AstroMap Premium</CardTitle>
          <Badge variant="secondary" className="mx-auto w-fit bg-accent/30">
            Em breve
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-muted-foreground">
          <p>
            Você terá mapas ilimitados, sinastria completa, trânsitos diários e PDF — por uma
            assinatura mensal justa.
          </p>
          <Button asChild className="bg-mystical text-white">
            <Link to="/dashboard">
              <Sparkles className="mr-2 h-4 w-4" /> Voltar ao início
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
