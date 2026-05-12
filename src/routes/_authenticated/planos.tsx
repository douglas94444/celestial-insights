import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfile } from "@/hooks/use-profile";
import {
  amountForSubscriptionPlan,
  formatSubscriptionPriceBrl,
  subscriptionPlanTitle,
} from "@/lib/subscription-pricing";

export const Route = createFileRoute("/_authenticated/planos")({
  component: PlanosPage,
});

/** Copy específica desta página (não reutiliza bullets nem layout de checkout). */
const FREE_HIGHLIGHTS = [
  "Um mapa natal completo para começar",
  "Painel inicial com horóscopo do dia e visão do mapa principal",
  "Acesso ao Momento e às áreas básicas da app",
];

const PREMIUM_HIGHLIGHTS = [
  "Quantos mapas precisar — família, amigos, viagens",
  "Compatibilidade com duas cartas e mapa composto",
  "IA dedicada a interpretações profundas, sem contagem no dia a dia",
  "Trânsitos em janelas longas e visão macro do ano",
  "PDFs e cartões prontos para redes sociais",
  "Diário de humor com leitura ao longo do tempo",
];

function PlanosPage() {
  const { data: profile } = useProfile();
  const tier = profile?.subscription_tier ?? "FREE";
  const isPaidTier = tier === "PREMIUM" || tier === "MENSAL" || tier === "ANUAL";

  const priceMensal = formatSubscriptionPriceBrl(amountForSubscriptionPlan("mensal"));
  const priceAnual = formatSubscriptionPriceBrl(amountForSubscriptionPlan("anual"));

  return (
    <div className="container mx-auto max-w-5xl space-y-8 p-4 pb-12 md:p-6">
      <div className="space-y-2 text-center md:text-left">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
          AstroMap
        </Badge>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Escolha como quer explorar o seu céu
        </h1>
        <p className="text-muted-foreground text-pretty md:max-w-2xl">
          Compare o acesso gratuito com o Premium. Os valores abaixo são os mesmos do checkout; para
          pagar com cartão ou Pix, use a página de assinatura.
        </p>
      </div>

      {isPaidTier ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Você já tem benefícios Premium ativos</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              Renovação, histórico de pagamento e dados de faturação ficam na área de assinatura.
            </span>
            <Button asChild variant="outline" size="sm" className="shrink-0 border-emerald-600/40">
              <Link to="/assinatura">Abrir checkout e assinatura</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-muted shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Grátis</CardTitle>
            <CardDescription>Ideal para experimentar o mapa e o ritmo diário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-display text-3xl font-semibold">R$ 0</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {FREE_HIGHLIGHTS.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-b from-primary/5 to-card shadow-soft ring-1 ring-primary/10">
          <div className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Recomendado
          </div>
          <CardHeader className="pr-24">
            <CardTitle className="flex items-center gap-2 font-display text-2xl">
              <Crown className="h-6 w-6 text-amber-500" aria-hidden />
              Premium
            </CardTitle>
            <CardDescription>
              Para quem quer estudo contínuo, relações e relatórios profissionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 rounded-lg border border-primary/15 bg-background/80 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {subscriptionPlanTitle("mensal").replace("AstroMap — ", "")}
                </p>
                <p className="font-display text-2xl font-bold">{priceMensal}</p>
                <p className="text-xs text-muted-foreground">cobrança mensal</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {subscriptionPlanTitle("anual").replace("AstroMap — ", "")}
                </p>
                <p className="font-display text-2xl font-bold">{priceAnual}</p>
                <p className="text-xs text-muted-foreground">pagamento anual (economia)</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm">
              {PREMIUM_HIGHLIGHTS.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="w-full bg-mystical text-white hover:opacity-90 sm:w-auto"
            >
              <Link to="/assinatura">
                Ir para pagamento
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Na página seguinte você escolhe Pix (SyncPay) ou cartão (Mercado Pago), conforme
              disponibilidade.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
