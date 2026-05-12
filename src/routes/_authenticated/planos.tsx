import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Crown, Sparkles, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfile } from "@/hooks/use-profile";
import { amountForSubscriptionPlan, formatSubscriptionPriceBrl } from "@/lib/subscription-pricing";

export const Route = createFileRoute("/_authenticated/planos")({
  component: PlanosPage,
});

const FREE_HIGHLIGHTS = ["Criação da conta gratuita", "Página de boas-vindas com visão geral"];

const MAPA_HIGHLIGHTS = [
  "Roda natal interactiva completa",
  "Todos os planetas, casas e aspectos",
  "Interpretações com IA: Sol, Lua, Asc e todos os planetas",
  "Configurações especiais (Grand Trine, T-Square, Yod…)",
  "Essência natal gerada por IA",
  "Acesso permanente — sem mensalidade",
];

const PREMIUM_HIGHLIGHTS = [
  "Tudo do Mapa Natal +",
  "Mapas ilimitados — família, amigos, parceiros",
  "Sinastria e mapa composto",
  "Trânsitos e previsão anual",
  "PDFs e cartões prontos para redes sociais",
  "Diário de humor com leitura ao longo do tempo",
  "IA avançada sem limite diário",
];

function PlanosPage() {
  const { data: profile } = useProfile();
  const tier = profile?.subscription_tier ?? "FREE";
  const isMapaTier = tier === "MAPA";
  const isPaidTier = tier === "PREMIUM" || tier === "MENSAL" || tier === "ANUAL";

  const priceMapaFmt = formatSubscriptionPriceBrl(amountForSubscriptionPlan("mapa"));
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
          Comece pelo mapa natal com uma compra única de {priceMapaFmt}, ou assine o Premium para
          acesso a todas as funcionalidades avançadas.
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
              <Link to="/assinatura">Abrir assinatura</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : isMapaTier ? (
        <Alert className="border-primary/30 bg-primary/5">
          <Map className="h-4 w-4 text-primary" />
          <AlertTitle>O seu mapa natal está activo</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              Quer sinastria, trânsitos e mais? Assine o Premium.
            </span>
            <Button asChild variant="outline" size="sm" className="shrink-0 border-primary/40">
              <Link to="/assinatura">Ver planos Premium</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna 1: Cadastro Grátis */}
        <Card className="border-muted shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl">Cadastro Grátis</CardTitle>
            <CardDescription>Crie a conta e explore a proposta.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col space-y-4">
            <p className="font-display text-3xl font-semibold">R$ 0</p>
            <ul className="flex-1 space-y-3 text-sm text-muted-foreground">
              {FREE_HIGHLIGHTS.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {tier === "FREE" && <p className="text-xs text-muted-foreground italic">Plano atual</p>}
          </CardContent>
        </Card>

        {/* Coluna 2: Mapa Natal */}
        <Card className="relative overflow-hidden border-primary/25 bg-gradient-to-b from-primary/5 to-card shadow-soft ring-1 ring-primary/10">
          <div className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Popular
          </div>
          <CardHeader className="pr-24">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Map className="h-5 w-5 text-primary" aria-hidden />
              Mapa Natal
            </CardTitle>
            <CardDescription>Pagamento único — acesso permanente.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col space-y-4">
            <div>
              <p className="font-display text-3xl font-bold">{priceMapaFmt}</p>
              <p className="text-xs text-muted-foreground">uma vez, sem mensalidade</p>
            </div>
            <ul className="flex-1 space-y-3 text-sm text-muted-foreground">
              {MAPA_HIGHLIGHTS.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {isMapaTier ? (
              <p className="text-xs font-medium text-primary">Plano atual ✓</p>
            ) : (
              <Button asChild size="lg" className="w-full bg-mystical text-white hover:opacity-90">
                <Link to="/assinatura" search={{ produto: "mapa" }}>
                  Comprar mapa — {priceMapaFmt}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Coluna 3: Premium */}
        <Card className="relative overflow-hidden border-amber-500/25 bg-gradient-to-b from-amber-500/5 to-card shadow-soft ring-1 ring-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Crown className="h-5 w-5 text-amber-500" aria-hidden />
              Premium
            </CardTitle>
            <CardDescription>Tudo, sem limites.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col space-y-4">
            <div className="rounded-lg border border-amber-500/15 bg-background/80 p-3">
              <div className="mb-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Mensal</p>
                <p className="font-display text-2xl font-bold">{priceMensal}</p>
                <p className="text-xs text-muted-foreground">por mês</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Anual</p>
                <p className="font-display text-2xl font-bold">{priceAnual}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSubscriptionPriceBrl(amountForSubscriptionPlan("anual") / 12)}/mês ·
                  economia vs mensal
                </p>
              </div>
            </div>
            <ul className="flex-1 space-y-3 text-sm text-muted-foreground">
              {PREMIUM_HIGHLIGHTS.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {isPaidTier ? (
              <p className="text-xs font-medium text-amber-600">Plano atual ✓</p>
            ) : (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-amber-500/40 hover:bg-amber-500/5"
              >
                <Link to="/assinatura">
                  Ver planos Premium
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
