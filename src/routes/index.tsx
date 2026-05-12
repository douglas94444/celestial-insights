import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Stars,
  Heart,
  CalendarRange,
  Coffee,
  TrendingUp,
  Telescope,
  Check,
  ArrowRight,
  Zap,
  Crown,
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
          "Mapa natal, trânsitos personalizados e sinastria com leituras em PT-BR. Planos Mensal e Anual; checkout em preparação.",
      },
    ],
    links: [{ rel: "prefetch", href: "/auth" }],
  }),
  component: Landing,
});

const PAID_PLAN_FEATURES = [
  "Mapas ilimitados (família, amigos, parceiros)",
  "Sinastria e mapa composto",
  "Interpretações com IA ilimitadas",
  "Trânsitos e previsão anual",
  "Exportação PDF e cartão Instagram personalizados",
  "Diário de humor com correlações",
];

const FOR_WHO = [
  "Se horóscopo de revista parece escrito pra milhões de pessoas (porque é)",
  "Se você faz terapia, medita, jornaliza — e quer um espelho simbólico complementar",
  'Se já passou da fase "qual meu signo?" e quer mergulhar em planetas, casas, aspectos',
  'Se quando alguém diz "Mercúrio retrógrado" você pensa "sim, mas em qual casa do MEU mapa?"',
  "Se você quer dados, não posts motivacionais com glitter de estrela",
  "Se autoconhecimento não é hobby. É prática.",
];

const TRANSIT_MOCK = [
  { planet: "Saturno △ Vênus", score: 82, label: "Casa 2 · Estrutura" },
  { planet: "Júpiter ☌ Sol", score: 95, label: "Casa 10 · Propósito" },
  { planet: "Marte □ Lua", score: 41, label: "Casa 4 · Emoções" },
];

function Landing() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`min-h-screen scroll-smooth bg-background ${showStickyCta ? "pb-16 md:pb-0" : ""}`}
    >
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
              <Link to="/assinatura">Começar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <h1 className="mt-4 font-display text-5xl font-bold md:text-7xl md:leading-[1.08] text-gradient-mystical">
            O céu sabia antes de você.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Mapa natal, trânsitos ao seu mapa e leituras com IA — em português, sem horóscopo de
            signo solar genérico.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-mystical text-white shadow-mystical hover:opacity-90"
            >
              <Link to="/assinatura">
                Começar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Como funciona ↓</a>
            </Button>
          </div>
          <p className="mx-auto mt-6 text-xs text-muted-foreground">
            Planos Mensal e Anual · checkout em preparação · dados criptografados (HTTPS/TLS)
          </p>

          {/* Mock visual do produto */}
          <div className="mx-auto mt-14 max-w-sm rounded-2xl border bg-card/80 p-5 text-left shadow-mystical backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Trânsitos de hoje
            </p>
            <div className="mt-3 space-y-2">
              {TRANSIT_MOCK.map((t) => (
                <div
                  key={t.planet}
                  className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="w-20 shrink-0">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${t.score}%` }}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{t.planet}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{t.label}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs font-bold text-primary">{t.score}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              ✦ Personalizado ao seu mapa · atualizado agora
            </p>
          </div>
        </div>
      </section>

      {/* Diferenciação */}
      <section id="como-funciona" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Não é horóscopo. É um espelho cósmico atualizado todo dia.
          </h2>
          <div className="mt-8 space-y-6">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Enquanto outros apps te mostram textos genéricos sobre seu signo, o AstroMap conecta{" "}
              <strong className="text-foreground">13 corpos celestes do SEU mapa exato</strong> com{" "}
              <strong className="text-foreground">o céu de hoje, agora, neste momento</strong>.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              É a diferença entre ler sobre &ldquo;pessoas de Áries&rdquo; e entender por que{" "}
              <strong className="text-foreground">VOCÊ, especificamente</strong>, sente o que sente.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-8">
            <Link to="/auth">Ver como funciona no meu mapa →</Link>
          </Button>
        </div>
      </section>

      {/* Para Quem — movido para cá para qualificar cedo */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            Para quem é o AstroMap
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Isso não é pra todo mundo. <span className="text-gradient-mystical">É pra você.</span>
          </h2>
          <ul className="mt-10 space-y-4">
            {FOR_WHO.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 font-display text-lg font-semibold">
            Não é pra quem quer respostas fáceis. É pra quem faz as perguntas difíceis.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura">
              Começar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Mapa Natal */}
      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Stars className="h-3 w-3" />
            Mapa Natal
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            13 corpos celestes. 12 casas. 40+ aspectos. Só seu.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Sol, Lua, planetas, Quíron, Nodo Norte, Nodo Sul — cada um em seu lugar único no momento
            do seu nascimento. Não é um PDF estático. É uma roda interativa onde cada clique revela
            uma camada de você.
          </p>
          <div className="mt-8 rounded-2xl border bg-card p-6">
            <p className="font-semibold">✨ Leituras personalizadas ao seu mapa</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cada planeta em signo e casa gera um texto que parece ter sido escrito por alguém que
              te conhece há anos.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ver meu mapa →</Link>
          </Button>
        </div>
      </section>

      {/* Momento com o Céu */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Coffee className="h-3 w-3" />
            Momento com o Céu
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Todo dia, o universo te envia uma carta.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Às 7h (ou quando você quiser), uma mensagem personalizada com base nos trânsitos de HOJE
            cruzados com SEU mapa. Não é &ldquo;hoje Áries vai ter sorte&rdquo;. É:
          </p>
          <blockquote className="mt-6 rounded-xl border-l-4 border-primary bg-primary/5 px-6 py-4 italic text-muted-foreground">
            &ldquo;Marina, Saturno está fazendo sextil com sua Vênus na Casa 2 — hora de estruturar
            aquele projeto criativo.&rdquo;
          </blockquote>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">☕ Tom &ldquo;Café com as Estrelas&rdquo;</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Acolhedor, sábio, como se o próprio cosmos estivesse te escrevendo.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">🎨 Gera card para Instagram</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Compartilhe sua energia do dia — ou guarde só pra você.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ver exemplo de mensagem →</Link>
          </Button>
        </div>
      </section>

      {/* Trânsitos */}
      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <CalendarRange className="h-3 w-3" />
            Trânsitos Diários
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            O céu se move todo dia. Seu mapa mostra onde ele te toca.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Enquanto outros apps te dizem &ldquo;Mercúrio retrógrado!&rdquo;, você vê:
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Score de intensidade personalizado (0–100)",
              "Quais casas da sua vida estão sendo ativadas",
              "Quando exatamente o aspecto fica perfeito (ex: 14h37)",
              "Histórico de como você se sentiu em trânsitos passados",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 italic text-muted-foreground">
            É a diferença entre saber que chove e ter um radar que mostra se vai cair no seu
            telhado.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ver meus trânsitos agora →</Link>
          </Button>
        </div>
      </section>

      {/* Sinastria */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Heart className="h-3 w-3" />
            Sinastria
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Compatibilidade não é matemática. Mas os aspectos contam uma história.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Sobreponha seu mapa com o de alguém (crush, parceiro, amigo, familiar). Veja:
          </p>
          <ul className="mt-6 space-y-3">
            <li className="rounded-xl border bg-card p-4 text-sm">
              <strong>Scores por área:</strong>{" "}
              <span className="text-muted-foreground">
                Amor (78/100), Comunicação (65/100), Valores (82/100)
              </span>
            </li>
            <li className="rounded-xl border bg-card p-4 text-sm">
              <strong>Aspectos cruzados:</strong>{" "}
              <span className="text-muted-foreground">
                &ldquo;Seu Sol ativa a Casa 7 dele — você é espelho do que ele busca&rdquo;
              </span>
            </li>
            <li className="rounded-xl border bg-card p-4 text-sm">
              <strong>Leitura profunda:</strong>{" "}
              <span className="text-muted-foreground">
                2000+ palavras explicando a dinâmica real entre vocês dois
              </span>
            </li>
          </ul>
          <p className="mt-8 italic text-muted-foreground">
            Não é teste de revista. É terapia de casal em forma de mapa.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Criar sinastria →</Link>
          </Button>
        </div>
      </section>

      {/* Previsão Anual */}
      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Telescope className="h-3 w-3" />
            Previsão Anual
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Veja 2026 antes de ele acontecer.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Um panorama de 12 meses mostrando:
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Ingressos planetários (quando Júpiter muda de signo e mexe com sua Casa X)",
              "Mercúrio, Vênus e Marte retrógrados (períodos exatos)",
              'Picos de intensidade (meses "pesados" vs "leves")',
              "Eclipses e configurações raras",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 italic text-muted-foreground">
            Você não controla o céu. Mas pode se preparar pra dança.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ver meu ano →</Link>
          </Button>
        </div>
      </section>

      {/* Diário de Humor */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <TrendingUp className="h-3 w-3" />
            Diário de Humor
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Registre como você se sente. Descubra se o céu tem algo a ver.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Todo dia: marque humor de 1–10 + tags emocionais (ansioso, criativo, exausto...).
            <br />
            Após 7 dias: veja seu gráfico emocional sobreposto aos trânsitos.
          </p>
          <blockquote className="mt-6 rounded-xl border-l-4 border-primary bg-primary/5 px-6 py-4 italic text-muted-foreground">
            Quando Lua transita sua Casa 8, você não está louco. Está humano.
          </blockquote>
          <p className="mt-6 text-muted-foreground">É autoconhecimento + validação cósmica.</p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Começar diário →</Link>
          </Button>
        </div>
      </section>

      {/* Planos — Mensal + Anual */}
      <section id="planos" className="py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Mesma experiência. Você escolhe o ritmo.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Mensal e anual incluem os mesmos recursos após a primeira semana (desbloqueio gradual
              por dia, fuso São Paulo). O checkout (cartão / assinatura) será ativado numa próxima
              versão; até lá não há cobrança — crie a conta e comece pelo mapa natal.
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
            Preço previsto — será confirmado antes de ativar o checkout.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 shadow-soft">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl font-semibold">Mensal</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Cobrança mês a mês</p>
              <div className="mt-4 flex items-baseline gap-1">
                <p className="font-display text-5xl font-bold">R$&nbsp;24,90</p>
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </div>
              <ul className="mt-6 space-y-2">
                {PAID_PLAN_FEATURES.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
                <Link to="/auth">Criar conta</Link>
              </Button>
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-mystical">
              <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
                <span className="whitespace-nowrap rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Melhor custo no ano
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <h3 className="font-display text-2xl font-semibold">Anual</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Melhor custo por mês</p>
              <div className="mt-4 flex items-baseline gap-1">
                <p className="font-display text-5xl font-bold">R$&nbsp;147</p>
                <span className="text-base font-normal text-muted-foreground">/ano</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                R$&nbsp;12,25/mês · economia de R$&nbsp;151,80 vs mensal (12 × R$&nbsp;24,90)
              </p>
              <ul className="mt-6 space-y-2">
                {PAID_PLAN_FEATURES.map((t) => (
                  <li
                    key={`a-${t}`}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-400/95">
                Checkout em preparação — sem cobrança até ativarmos pagamentos.
              </p>
              <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
                <Link to="/auth">Criar conta</Link>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Depois do login: página «Planos» com estado da assinatura.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Perguntas que todo mundo faz
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="1">
              <AccordionTrigger>O que é um mapa astral, afinal?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  Um retrato do céu no momento exato do seu nascimento. Imagine: 13 corpos celestes,
                  cada um numa posição única, formando ângulos entre si. Esse arranjo é só seu — nem
                  gêmeos têm mapa igual (se nascem com minutos de diferença, o Ascendente já muda).
                </p>
                <p>
                  O mapa não &ldquo;prevê futuro&rdquo;. Ele mapeia arquétipos, potenciais, tensões
                  internas. É psicologia em linguagem cósmica.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Preciso saber minha hora exata de nascimento?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  Idealmente, sim. A hora define seu Ascendente (máscara social, primeira impressão
                  que você dá) e as 12 casas (áreas da vida onde os planetas atuam). Sem a hora,
                  você perde metade da leitura.
                </p>
                <p>
                  <strong>Não sei minha hora?</strong> Peça a certidão de nascimento (tem a hora).
                  Se não achar: use 12h00 — dá um mapa &ldquo;solar&rdquo; sem casas definidas. O
                  app exibe um aviso quando a hora não é precisa.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Meus dados são privados?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  Sim. Seus mapas são privados por padrão — regras de acesso no banco de dados
                  impedem que outros usuários leiam seus dados. Você pode exportar ou deletar tudo a
                  qualquer hora em Configurações.
                </p>
                <p className="font-medium">Não vendemos dados. Nunca, pra ninguém, por nada.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>Mensal e Anual — o que muda?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  <strong>Recursos:</strong> nada após a primeira semana. Os dois planos chegam ao
                  mesmo conjunto (mapas ilimitados, sinastria, IA, trânsitos, previsão anual, PDF,
                  diário de humor); nos primeiros 7 dias civis (São Paulo) a app abre estas áreas
                  aos poucos para você se ambientar.
                </p>
                <p>
                  <strong>Preço:</strong> no mensal você paga R$&nbsp;24,90 por mês. No anual,
                  R$&nbsp;147 por ano (equivale a cerca de R$&nbsp;12,25/mês e economiza vs 12
                  mensalidades).
                </p>
                <p className="italic text-muted-foreground">
                  Escolha o ritmo que combina com você; o céu no app é o mesmo.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="5">
              <AccordionTrigger>As leituras são genéricas?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>Não. E isso é o diferencial.</p>
                <p>
                  Cada leitura é gerada a partir do seu mapa natal completo (13 corpos, 12 casas,
                  40+ aspectos), dos trânsitos de hoje e dos padrões únicos do seu mapa (stelliums,
                  configurações raras).
                </p>
                <p>
                  Não geramos &ldquo;Sol em Áries: você é corajoso&rdquo;.
                  <br />
                  Geramos: &ldquo;Marina, seu Sol em Áries na Casa 10, em trígono com Júpiter na 2,
                  te dá coragem pública — você brilha quando cria valor visível. Hoje, com Saturno
                  fazendo sextil com sua Vênus...&rdquo;
                </p>
                <p>É específico. É seu.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="6">
              <AccordionTrigger>Quando vou poder pagar pelo app?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  Estamos preparando checkout com cartão (assinatura). Enquanto isso, você pode
                  criar conta e usar o fluxo completo sem cobrança.
                </p>
                <p>
                  Os valores divulgados na landing (R$&nbsp;24,90/mês e R$&nbsp;147/ano) são os
                  previstos; confirmaremos antes de ligar o pagamento.
                </p>
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
            Seu mapa está esperando. <span className="text-gradient-mystical">O céu não.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-muted-foreground">
            Todo segundo que passa, os planetas se movem. Trânsitos mudam. O cosmos escreve.
            <br />
            Você pode ignorar. Ou pode ler.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura">
              Começar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-6 space-y-1 text-xs text-muted-foreground">
            <p>Mensal: R$&nbsp;24,90/mês · Anual: R$&nbsp;147/ano (checkout em preparação)</p>
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container mx-auto space-y-2 px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AstroMap · Feito com ☕ e 🌙</p>
          <div className="flex justify-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-primary hover:underline">
              Política de Privacidade
            </Link>
            <Link to="/terms" className="hover:text-primary hover:underline">
              Termos de Uso
            </Link>
          </div>
        </div>
      </footer>

      {/* Sticky CTA — mobile only */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
          <p className="truncate text-xs font-medium">
            Planos Mensal ou Anual · checkout em preparação
          </p>
          <Button asChild size="sm" className="shrink-0 bg-mystical text-white hover:opacity-90">
            <Link to="/assinatura">Começar</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
