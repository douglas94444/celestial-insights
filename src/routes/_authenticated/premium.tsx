import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPlansPage,
});

const PLAN_FEATURES = [
  "Mapas ilimitados (família, amigos, parceiros)",
  "Sinastria e mapa composto",
  "Interpretações com IA ilimitadas",
  "Trânsitos e previsão anual",
  "Exportação PDF e cartão Instagram personalizados",
  "Diário de humor com correlações",
];

function PremiumPlansPage() {
  const { data: profile } = useProfile();
  const tier = profile?.subscription_tier ?? "MENSAL";
  const highlightMensal = tier === "MENSAL" || tier === "PREMIUM" || tier === "FREE";
  const highlightAnual = tier === "ANUAL";

  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-4 pb-12 sm:p-6">
      <div className="text-center sm:text-left">
        <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/5">
          Pagamento em preparação
        </Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Planos AstroMap
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mensal e anual incluem os mesmos recursos. O checkout (cartão / assinatura) será ativado
          numa próxima versão; até lá não há cobrança.
        </p>
      </div>

      <Alert className="border-primary/25 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertTitle>Transparência</AlertTitle>
        <AlertDescription>
          Pode usar hoje todo o fluxo com acesso completo. Os CTAs da página pública levam à criação
          de conta; aqui vê os preços previstos e o plano associado ao seu perfil.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border bg-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 font-display text-2xl">
              Mensal
              {highlightMensal ? (
                <Badge className="bg-mystical text-white hover:bg-mystical/90">Plano atual</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>Cobrança mês a mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-display text-3xl font-bold">
              R$ 24,90
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Preço previsto — será confirmado antes de ativar o checkout.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PLAN_FEATURES.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button disabled className="mt-4 w-full bg-mystical/80 text-white">
              Assinar mensal (em breve)
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Quando o Mercado Pago estiver ligado, o botão substitui este estado desativado.
            </p>
          </CardContent>
        </Card>

        <Card className="relative border-2 border-primary shadow-mystical">
          <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-mystical px-3 py-1 text-xs font-semibold text-white">
            <Crown className="h-3 w-3" />
            MAIS POPULAR
          </div>
          <CardHeader className="pt-8">
            <CardTitle className="flex flex-wrap items-center gap-2 font-display text-2xl">
              Anual
              {highlightAnual ? (
                <Badge className="bg-mystical text-white hover:bg-mystical/90">Plano atual</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>Melhor custo por mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-display text-3xl font-bold">
              R$ 147
              <span className="text-base font-normal text-muted-foreground">/ano</span>
            </p>
            <p className="text-sm text-muted-foreground">
              R$ 12,25/mês · economia de R$ 151,80 vs mensal
            </p>
            <p className="text-xs text-muted-foreground">
              Preço previsto — será confirmado antes de ativar o checkout.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {PLAN_FEATURES.map((t) => (
                <li key={`a-${t}`} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button disabled className="mt-4 w-full bg-mystical/80 text-white">
              Assinar anual (em breve)
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Quando o Mercado Pago estiver ligado, o botão substitui este estado desativado.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button asChild variant="outline">
          <Link to="/configuracoes">Preferências e perfil</Link>
        </Button>
        <Button asChild className="bg-mystical text-white hover:opacity-90">
          <Link to="/dashboard">
            <Sparkles className="mr-2 h-4 w-4" />
            Voltar ao painel
          </Link>
        </Button>
      </div>
    </div>
  );
}
