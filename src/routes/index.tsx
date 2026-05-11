import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Stars,
  Heart,
  CalendarRange,
  Coffee,
  TrendingUp,
  Telescope,
  Layers,
  Check,
  ArrowRight,
  Moon,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AstroMap — O céu sabia antes de você" },
      {
        name: "description",
        content:
          "Mapa natal completo com 13 corpos celestes, interpretações com IA, sinastria, trânsitos diários e rituais personalizados. Astrologia psicológica séria, em português.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Stars,
    title: "Mapa Natal Completo",
    desc: "13 corpos celestes (incluindo Quíron, Nodo Norte/Sul), 4 sistemas de casas, aspectos com orbes ajustáveis e flag ℞ de retrógrados. Cada planeta em seu signo e casa com interpretação textual individual.",
  },
  {
    icon: CalendarRange,
    title: "Trânsitos Diários",
    desc: "Intensidade personalizada ao seu mapa: score por planeta, destaques do dia e histórico de ativação. Você vê quando Saturno está quadrando seu Sol — não um horóscopo genérico.",
  },
  {
    icon: Coffee,
    title: "Momento com o Céu",
    desc: "Ritual diário com leitura simbólica do céu de hoje em relação ao seu mapa. Gera cartão para Instagram com a energia do dia — para compartilhar ou guardar.",
  },
  {
    icon: Heart,
    title: "Sinastria Profunda",
    desc: "Sobreposição de dois mapas com scores de harmonia, tensão e magnetismo. Aspectos cruzados com orbes. Narrativa gerada por IA sobre a dinâmica do par.",
  },
  {
    icon: Telescope,
    title: "Previsão Anual de Trânsitos",
    desc: "12 meses num único panorama: ingressos planetários, períodos retrógrados de Mercúrio, Vênus e Marte, picos de intensidade e alertas de configurações raras.",
  },
  {
    icon: Layers,
    title: "Padrões Especiais do Mapa",
    desc: "Detecção automática de Grand Trine, T-Square, Grand Cross e Yod. Se o seu mapa tem uma configuração rara, você saberá — com interpretação específica do padrão.",
  },
  {
    icon: TrendingUp,
    title: "Diário de Humor + Correlações",
    desc: "Registre seu humor diário (1–10 + tags emocionais). Após 7 dias, veja o gráfico do seu estado interno sobreposto à intensidade dos trânsitos. O universo reflete o que você sente.",
  },
];

const FOR_WHO = [
  "Quem sente que o horóscopo semanal não chega nem perto do que acontece de verdade",
  "Quem medita, jornaliza, faz terapia — e quer um espelho arquetípico complementar",
  "Quem já leu o ascendente e quer ir fundo nos planetas em casas, nos aspectos, nos nodos",
  "Quem acompanha o céu e quer dados sérios em vez de posts motivacionais com estrelas",
];

const FREE_FEATURES = [
  "1 mapa natal salvo na conta",
  "Todos os planetas, casas e aspectos com roda interativa",
  "3 interpretações com IA por mês",
  "Painel com destaques diários",
  "Momento com o Céu (ritual do dia)",
];

const PREMIUM_FEATURES = [
  "Mapas ilimitados para você e quem quiser",
  "Interpretações com IA ilimitadas",
  "Sinastria completa com narrativa IA",
  "Trânsitos personalizados com histórico",
  "Previsão anual de trânsitos",
  "Padrões avançados (Grand Trine, Yod…)",
  "Diário de humor com correlações",
  "Carta composta de relacionamentos",
  "Export PDF e cartão Instagram",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-background/70 border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-mystical text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold">AstroMap</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-mystical text-white hover:opacity-90">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-28 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Moon className="h-3 w-3" />
            Astrologia psicológica séria — em português
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold md:text-7xl md:leading-[1.08]">
            O céu sabia <span className="text-gradient-mystical">antes de você.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Mapa natal completo com 13 corpos celestes, interpretações com IA, sinastria, trânsitos
            diários e rituais personalizados. Gratuito para começar — sem horóscopo genérico.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-mystical text-white shadow-mystical hover:opacity-90"
            >
              <Link to="/auth">
                Ver meu mapa agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Sem cartão de crédito · Cadastro em 30 segundos · Dados protegidos
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="como-funciona" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Tudo que está escrito no seu céu
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Não é um gerador de PDF de signos. É uma plataforma de autoconhecimento astrológico —
              atualizada com o céu de hoje, personalizada ao seu mapa exato.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For who */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Zap className="h-3 w-3" />
              Para quem é o AstroMap
            </div>
            <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
              Não é para todo mundo.
              <br />
              <span className="text-gradient-mystical">É para você.</span>
            </h2>
          </div>
          <ul className="mt-10 space-y-4">
            {FOR_WHO.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Planos</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              O universo cobrou R$&nbsp;10.000.000,00 para escrever o seu mapa astral.
              <br />
              Mas a gente não é o universo. Comece de graça.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border bg-card p-8">
              <h3 className="font-display text-2xl font-semibold">Free</h3>
              <p className="mt-1 text-sm text-muted-foreground">Para sentir o céu do seu mapa</p>
              <p className="mt-6 font-display text-4xl font-bold">R$ 0</p>
              <p className="mt-1 text-xs text-muted-foreground">Para sempre, sem truques</p>
              <ul className="mt-6 space-y-3 text-sm">
                {FREE_FEATURES.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full" variant="outline">
                <Link to="/auth">Começar grátis</Link>
              </Button>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-mystical">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mystical px-3 py-1 text-xs font-semibold text-white">
                TUDO O QUE O CÉU PODE DAR
              </div>
              <h3 className="font-display text-2xl font-semibold">Premium</h3>
              <p className="mt-1 text-sm text-muted-foreground">Toda a profundidade do céu</p>
              <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-500/90">
                Checkout em preparação — sem cobrança até ativarmos pagamentos.
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <p className="font-display text-4xl font-bold">R$&nbsp;24,90</p>
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-through opacity-50">
                R$ 10.000.000,00 (preço do universo)
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {PREMIUM_FEATURES.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
                <Link to="/auth">Entrar para ver planos na conta</Link>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Após o login: menu «Planos Premium» com estado da assinatura.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Dúvidas frequentes
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="1">
              <AccordionTrigger>O que é um mapa astral, afinal?</AccordionTrigger>
              <AccordionContent>
                É uma fotografia precisa do céu no instante em que você nasceu: a posição de 13
                corpos celestes (Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno,
                Plutão, Quíron, Nodo Norte e Nodo Sul) em relação aos 12 signos e 12 casas
                astrológicas. Cada combinação planeta-signo-casa revela padrões psicológicos,
                talentos e desafios — não como destino fixo, mas como mapa de tendências.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Preciso saber minha hora exata de nascimento?</AccordionTrigger>
              <AccordionContent>
                Para o Ascendente e as casas, sim — ±4 minutos equivalem a cerca de 1° no
                Ascendente. Se não souber a hora, use 12:00: os planetas estarão corretos, mas o
                Ascendente e as cúspides de casas serão aproximados. O app exibe um tooltip de aviso
                na página do mapa quando a hora não é precisa.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Meus dados são privados?</AccordionTrigger>
              <AccordionContent>
                Sim. Seus mapas ficam visíveis apenas para você, protegidos por RLS (Row Level
                Security) no banco de dados — nem nós conseguimos acessar seus dados sem sua
                permissão. Nenhum dado de nascimento é compartilhado com terceiros.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>O que muda no plano Premium na prática?</AccordionTrigger>
              <AccordionContent>
                No Free você tem 1 mapa e 3 interpretações com IA por mês — suficiente para explorar
                o seu próprio mapa com profundidade. No Premium você desbloqueie mapas ilimitados
                (para família, amigos, parceiros), sinastria completa com narrativa IA, trânsitos
                personalizados, previsão anual, padrões avançados de aspectos, diário de humor com
                correlações e a carta composta de relacionamentos. É para quem quer o céu como
                ferramenta de autoconhecimento contínua, não pontual.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.6]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.18]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Comece agora.
            <br />
            <span className="text-gradient-mystical">O universo não pode mais esperar.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-muted-foreground">
            Seu mapa natal gerado em segundos. Interpretações que fazem sentido. Ritual diário que
            conecta o céu à sua vida real.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/auth">
              Ver meu mapa agora — é grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Para o universo: R$&nbsp;10.000.000,00. Para você: R$&nbsp;24,90/mês.
          </p>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AstroMap · Feito com as estrelas
        </div>
      </footer>
    </div>
  );
}
