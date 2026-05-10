import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPlansPage,
});

function PremiumPlansPage() {
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
          Compare o que já está disponível no plano gratuito com o que virá no Premium. O checkout
          (cartão / assinatura) será ativado numa próxima versão; até lá não há cobrança.
        </p>
      </div>

      <Alert className="border-primary/25 bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertTitle>Transparência</AlertTitle>
        <AlertDescription>
          Pode usar hoje todo o fluxo gratuito sem cartão. Os CTAs «Premium» na página pública levam
          à criação de conta para explorar o app; esta página resume os benefícios futuros e o
          estado atual do produto.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border bg-card shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Free</CardTitle>
            <CardDescription>O que já usa ao criar conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-display text-3xl font-bold">R$ 0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "1 mapa natal guardado na conta",
                "Cálculo completo: planetas, casas, aspectos e roda interativa",
                "Painel com horóscopo e destaques do seu mapa principal",
                "Interpretações detalhadas na página do mapa",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/dashboard">Ir para o painel</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="relative border-2 border-primary shadow-mystical">
          <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-mystical px-3 py-1 text-xs font-semibold text-white">
            <Crown className="h-3 w-3" />
            Premium
          </div>
          <CardHeader className="pt-8">
            <CardTitle className="font-display text-2xl">Premium</CardTitle>
            <CardDescription>Lançamento da cobrança em breve</CardDescription>
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
              {[
                "Mapas ilimitados (vários perfis na mesma conta)",
                "Sinastria completa entre mapas seus",
                "Trânsitos e relatórios personalizados à medida que evoluirmos o produto",
                "Exportação PDF onde já existir na app",
                "Prioridade para novos recursos de interpretação e IA",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button disabled className="mt-4 w-full bg-mystical/80 text-white">
              Ativar assinatura (em breve)
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Quando o Stripe estiver ligado, o botão substitui este estado desativado.
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
