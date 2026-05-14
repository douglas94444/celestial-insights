import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Globe2, Sparkles, Star, Sun, Moon, Compass, Brain, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { formatSubscriptionPriceBrl, amountForSubscriptionPlan } from "@/lib/subscription-pricing";

export const Route = createFileRoute("/_authenticated/bem-vindo")({
  component: BemVindoPage,
});

const MAPA_FEATURES = [
  {
    icon: Sun,
    title: "Sol, Lua e Ascendente",
    description: "Os três pilares da sua personalidade astrológica interpretados com profundidade.",
  },
  {
    icon: Globe2,
    title: "Roda natal interactiva",
    description: "Visualize planetas, casas e aspectos no seu mapa completo.",
  },
  {
    icon: Star,
    title: "Todos os planetas e casas",
    description: "Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão e mais.",
  },
  {
    icon: Compass,
    title: "Aspectos e configurações especiais",
    description: "Grand Trine, T-Square, Yod — padrões que moldam quem você é.",
  },
  {
    icon: Brain,
    title: "Interpretações personalizadas",
    description: "Análises personalizadas para cada planeta e posição do seu mapa.",
  },
  {
    icon: Moon,
    title: "Essência natal",
    description: "Resumo executivo que integra automaticamente todas as energias do mapa.",
  },
];

function BemVindoPage() {
  const { data: profile } = useProfile();
  const priceFormatted = formatSubscriptionPriceBrl(amountForSubscriptionPlan("mapa"));

  if (profile && profile.subscription_tier !== "FREE") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-shell-glow texture-grain">
      <div className="container mx-auto max-w-4xl space-y-16 px-4 py-12 md:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 text-center"
        >
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            Bem-vindo ao AstroMap
          </Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            O seu céu natal, <span className="text-primary">interpretado com profundidade</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground text-pretty">
            Com o mapa natal completo você descobre o que os astros dizem sobre a sua personalidade,
            talentos e desafios — uma vez só, para sempre.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-mystical px-8 text-white hover:opacity-90">
              <Link to="/assinatura" search={{ produto: "mapa" }}>
                <Sparkles className="mr-2 h-5 w-5" />
                Obter meu mapa — {priceFormatted}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-muted-foreground">
              <Link to="/planos">Ver todos os planos</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Pagamento único · acesso permanente · sem mensalidade
          </p>
        </motion.div>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="space-y-6"
        >
          <h2 className="text-center font-display text-2xl font-semibold">
            O que você recebe no mapa natal
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {MAPA_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-xl border bg-card/60 p-5 shadow-sm backdrop-blur-sm"
              >
                <feat.icon className="mb-3 h-6 w-6 text-primary" aria-hidden />
                <h3 className="mb-1 font-medium">{feat.title}</h3>
                <p className="text-sm text-muted-foreground">{feat.description}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA final */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center shadow-soft"
        >
          <Lock className="mx-auto mb-4 h-8 w-8 text-primary/60" aria-hidden />
          <h2 className="font-display text-2xl font-bold">Pronto para descobrir o seu mapa?</h2>
          <p className="mt-2 text-muted-foreground">
            Pagamento único de {priceFormatted} — sem cobranças futuras.
          </p>
          <Button asChild size="lg" className="mt-6 bg-mystical px-10 text-white hover:opacity-90">
            <Link to="/assinatura" search={{ produto: "mapa" }}>
              Comprar meu mapa natal
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Já tem Premium?{" "}
            <Link to="/assinatura" className="underline underline-offset-2">
              Assine por {formatSubscriptionPriceBrl(amountForSubscriptionPlan("mensal"))}/mês
            </Link>{" "}
            e aceda a sinastria, trânsitos, PDF e muito mais.
          </p>
        </motion.section>
      </div>
    </div>
  );
}
