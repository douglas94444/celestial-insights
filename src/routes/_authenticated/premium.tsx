import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
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
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
      <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
      <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />

      <div className="container mx-auto max-w-4xl space-y-8 p-4 pb-12 sm:p-6 texture-grain relative z-[1]">
        <div className="text-center sm:text-left">
          <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/5">
            Pagamento em preparação
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Planos AstroMap
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Mensal e anual incluem os mesmos recursos quando a rampa de 7 dias termina (desbloqueio
            gradual por dia civil, fuso São Paulo). O checkout (cartão / assinatura) será ativado
            numa próxima versão; até lá não há cobrança.
          </p>
        </div>

        <Alert className="border-primary/25 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>Transparência</AlertTitle>
          <AlertDescription>
            Pode usar a conta desde o primeiro dia; na primeira semana algumas áreas abrem dia a dia
            (trânsitos, sinastria, mapa composto, etc.). Os CTAs da página pública levam à criação
            de conta; aqui vê os preços previstos e o plano associado ao seu perfil.
          </AlertDescription>
        </Alert>

        <p className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
          Preço previsto — será confirmado antes de ativar o checkout. Quando o Mercado Pago estiver
          ligado, os botões serão ativados.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border bg-card shadow-soft">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl">
                Mensal
                {highlightMensal ? (
                  <Badge className="bg-mystical text-white hover:bg-mystical/90">Plano atual</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>Cobrança mês a mês</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col space-y-2 sm:space-y-3">
              <p className="font-display text-2xl sm:text-3xl font-bold">
                R$ 24,90
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                {PLAN_FEATURES.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button disabled className="mt-auto w-full bg-mystical/80 text-white">
                Assinar mensal (em breve)
              </Button>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-primary shadow-mystical">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 font-display text-xl sm:text-2xl">
                Anual
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/15"
                >
                  Melhor custo no ano
                </Badge>
                {highlightAnual ? (
                  <Badge className="bg-mystical text-white hover:bg-mystical/90">Plano atual</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>Melhor custo por mês</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col space-y-2 sm:space-y-3">
              <p className="font-display text-2xl sm:text-3xl font-bold">
                R$ 147
                <span className="text-base font-normal text-muted-foreground">/ano</span>
              </p>
              <p className="text-sm text-muted-foreground">
                R$ 12,25/mês · economia de R$ 151,80 vs mensal
              </p>
              <ul className="flex-1 space-y-2 text-sm text-muted-foreground">
                {PLAN_FEATURES.map((t) => (
                  <li key={`a-${t}`} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button disabled className="mt-auto w-full bg-mystical/80 text-white">
                Assinar anual (em breve)
              </Button>
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
    </div>
  );
}
