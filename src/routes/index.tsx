import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Stars, Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { amountForSubscriptionPlan, formatSubscriptionPriceBrl } from "@/lib/subscription-pricing";

const MAPA_COMPRA_SEARCH = { produto: "mapa" as const };
const AUTH_REDIRECT_MAPA = { redirect: "/assinatura?produto=mapa" as const };

/** Ficheiros em `public/landing/` (servidos em `/landing/…`). */
const LANDING_PUBLIC = "/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "AstroMap — mapa natal interativo, interpretações em português",
      },
      {
        name: "description",
        content:
          "Mapa natal completo com roda interativa e interpretações em português. Pagamento único, acesso permanente. Pix ou cartão.",
      },
    ],
    links: [{ rel: "prefetch", href: "/auth" }],
  }),
  component: Landing,
});

type Testimonial = {
  quote: string;
  name: string;
  sign: string;
};

// TODO: substituir por depoimentos reais antes do lançamento
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Nunca entendi tão bem meu Saturno em Escorpião na Casa 8. O AstroMap conectou tudo de um jeito que nenhum livro fez.",
    name: "Marina S.",
    sign: "Capricórnio",
  },
  {
    quote:
      "Em menos de 2 minutos já estava explorando meu mapa. A interpretação do meu Nodo Norte me fez parar tudo.",
    name: "Rafael T.",
    sign: "Peixes",
  },
  {
    quote: "Finalmente um mapa sério em português. Paguei sem hesitar e vale cada centavo.",
    name: "Juliana C.",
    sign: "Libra",
  },
];

type RoadmapStep = {
  title: string;
  body?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageCaption?: string;
};

const ROADMAP_STEPS: RoadmapStep[] = [
  {
    title: "Crie sua conta em 30 segundos",
    body: "(ou faça login se já tiver)",
    imageSrc: `${LANDING_PUBLIC}/onboarding-welcome.png`,
    imageAlt:
      "Tela de boas-vindas do AstroMap com título Bem-vindo ao AstroMap e botão Começar para iniciar o primeiro mapa",
  },
  {
    title: "Escolha Pix ou cartão na página de pagamento",
    body: "Processado pelo Mercado Pago — Pix com QR Code ou cartão de crédito.",
  },
  {
    title: "Coloque data, hora e local de nascimento",
    imageSrc: `${LANDING_PUBLIC}/birth-form.png`,
    imageAlt:
      "Formulário Seus dados de nascimento com campos de nome, data, hora, local e botão Calcular meu mapa",
  },
  {
    title: "Seu mapa é gerado na hora",
    imageSrc: `${LANDING_PUBLIC}/chart-aspectos.png`,
    imageAlt:
      "Mapa natal na tela: roda com planetas e linhas de aspectos coloridas, com lista de aspectos ao lado",
  },
  {
    title: "Explore cada planeta tocando na roda",
    imageSrc: `${LANDING_PUBLIC}/hero-essencia.png`,
    imageAlt:
      "Roda natal ao lado do painel Essência com cartões de interpretação para Sol, Lua e Ascendente",
  },
  {
    title: "O mapa fica na sua conta para sempre",
    body: "Volte quando quiser — sem mensalidade",
  },
];

function forWhoBullets(mapaPrice: string): string[] {
  return [
    "Quer o SEU mapa desenhado com dados reais de nascimento",
    "Valoriza casas, aspectos e exploração individual de cada planeta",
    `Prefere pagar uma vez (${mapaPrice}) e ter acesso permanente`,
    "Quer leituras em português ancoradas no céu do seu nascimento",
  ];
}

type DetailBlock = {
  title: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
  imageCaption?: string;
};

const DETAIL_BLOCKS: DetailBlock[] = [
  {
    title: "Roda natal interativa completa",
    body: "13 planetas posicionados nas 12 casas. Aspectos desenhados (trígonos, quadraturas, oposições…).",
    imageSrc: `${LANDING_PUBLIC}/chart-aspectos.png`,
    imageAlt:
      "Roda natal com linhas de aspectos entre planetas e lista de aspectos com tipos e órbitas",
    imageCaption: "Aspectos listados ao lado da roda, com filtros na app.",
  },
  {
    title: "Interpretações de cada posição",
    body: "Sol, Lua, Ascendente — base da personalidade. Mercúrio, Vênus, Marte — planetas pessoais. Júpiter, Saturno — sociais. Urano, Netuno, Plutão — transformação. Quíron, Nodos — pontos sensíveis.",
    imageSrc: `${LANDING_PUBLIC}/hero-essencia.png`,
    imageAlt:
      "Painel Essência com textos de interpretação para Sol em signo, Lua em signo e Ascendente",
  },
  {
    title: "Padrões especiais (quando existirem)",
    body: "Grand Trine, T-Square, Yod, Stellium.",
    imageSrc: `${LANDING_PUBLIC}/chart-aspectos.png`,
    imageAlt:
      "Roda natal com linhas de aspectos destacadas — padrões geométricos como Grand Trine aparecem visualmente na roda",
    imageCaption:
      "Na app, padrões como Grand Trine ou Yod surgem no separador Essência quando o mapa os tiver.",
  },
  {
    title: "Essência natal personalizada",
    body: "Síntese gerada para o seu mapa especificamente — conecta Sol, Lua, Ascendente e os padrões do seu céu natal em um texto só.",
    imageSrc: `${LANDING_PUBLIC}/hero-essencia.png`,
    imageAlt:
      "Painel Essência com interpretações textuais de Sol, Lua e Ascendente no contexto do mapa natal",
    imageCaption: "Resumo e síntese no fluxo real do detalhe do mapa.",
  },
];

function SectionRule() {
  return <div className="my-16 border-t border-border/60" aria-hidden />;
}

function TrustBadges() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span>Pagamento seguro</span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <span>Acesso imediato após confirmação</span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <span>Mapa permanente na sua conta</span>
    </div>
  );
}

function LandingScreenshot({
  src,
  alt,
  caption,
  priority,
}: {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}) {
  return (
    <figure className="mt-3">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-mystical md:rounded-2xl">
        <img
          src={src}
          alt={alt}
          className="max-h-[420px] w-full object-cover object-top md:max-h-[520px]"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? ({ fetchPriority: "high" } as const) : {})}
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Landing() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const mapaPriceFormatted = formatSubscriptionPriceBrl(amountForSubscriptionPlan("mapa"));
  const forWho = forWhoBullets(mapaPriceFormatted);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`min-h-screen scroll-smooth bg-background ${showStickyCta ? "pb-16 md:pb-0" : ""}`}
    >
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
              <Link to="/auth" search={AUTH_REDIRECT_MAPA}>
                Já tenho conta
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-mystical text-white hover:opacity-90">
              <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
                Comprar mapa
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Dobra 1 — Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mapa natal</p>
          <h1 className="mt-4 font-display text-4xl font-bold md:text-5xl md:leading-[1.15] text-gradient-mystical">
            Descubra o que o céu diz sobre você
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Roda natal interativa com interpretações de cada planeta em signo e casa — por{" "}
            <strong className="text-foreground">{mapaPriceFormatted}</strong>, pagamento único.
          </p>

          <div className="mx-auto mt-12 max-w-4xl">
            <LandingScreenshot
              src={`${LANDING_PUBLIC}/hero-essencia.png`}
              alt="Interface do AstroMap: roda natal e painel Essência com interpretações de Sol, Lua e Ascendente"
              priority
              caption="Interface real do produto — o seu mapa reflete só os seus dados de nascimento."
            />
          </div>

          <Button
            asChild
            size="lg"
            className="mt-10 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Ver meu mapa por {mapaPriceFormatted}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="mx-auto mt-3 text-sm text-muted-foreground">
            Já tenho conta —{" "}
            <Link
              to="/auth"
              search={AUTH_REDIRECT_MAPA}
              className="text-primary underline underline-offset-2"
            >
              entrar
            </Link>
          </p>
          <TrustBadges />
        </div>
      </section>

      <SectionRule />

      {/* Depoimentos */}
      <section className="py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="rounded-xl border bg-card p-5 text-left">
                <p className="text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.sign}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <SectionRule />

      {/* Dobra 2 — Roadmap (primeiro botão principal) */}
      <section id="roadmap" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Depois da compra
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            O que acontece depois da compra
          </h2>
          <ol className="mt-10 space-y-8">
            {ROADMAP_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border bg-card p-5 text-left">
                <p className="font-display text-lg font-semibold text-foreground">
                  <span className="mr-2 tabular-nums text-primary">{i + 1}.</span>
                  {step.title}
                </p>
                {step.body ? (
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                ) : null}
                {step.imageSrc && step.imageAlt ? (
                  <LandingScreenshot
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    caption={step.imageCaption}
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-10 text-center text-sm font-medium text-primary">
            Processo leva menos de 2 minutos do pagamento até ver seu mapa
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 w-full bg-mystical text-white shadow-mystical hover:opacity-90 sm:w-auto"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Ver meu mapa · {mapaPriceFormatted}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <TrustBadges />
        </div>
      </section>

      <SectionRule />

      {/* Dobra 3 — Diferenciação */}
      <section id="diferenca" className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Não é horóscopo de revista. É o mapa da sua vida.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Horóscopo de revista
              </p>
              <p className="mt-3 text-sm italic text-muted-foreground">
                &quot;Leão: semana de sorte no amor&quot;
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Genérico para uma fatia da população — não o seu céu de nascimento.
              </p>
            </div>
            <div className="rounded-xl border-2 border-primary/30 bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                AstroMap mapa natal ({mapaPriceFormatted})
              </p>
              <p className="mt-3 text-sm text-foreground">
                &quot;Seu Sol em Leão na Casa 5 forma trígono com Júpiter — criatividade expansiva
                aplicada a romance e auto-expressão&quot;
              </p>
              <p className="mt-3 text-sm font-medium text-primary">Específico para você</p>
            </div>
          </div>
          <p className="mt-8 text-lg text-muted-foreground">
            Você paga <strong className="text-foreground">uma vez</strong>, o mapa fica para sempre.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Descobrir meu mapa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <TrustBadges />
        </div>
      </section>

      <SectionRule />

      {/* Dobra 4 — Para quem é */}
      <section id="para-quem" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" aria-hidden />
            Para quem é
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">É para você se:</h2>
          <ul className="mt-10 space-y-4">
            {forWho.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Esta compra é só o seu mapa natal.</strong>{" "}
              Trânsitos diários, sinastria e mapas de outras pessoas fazem parte dos planos Premium
              (mensais ou anuais) — opcionais e à parte.
            </p>
          </div>
        </div>
      </section>

      <SectionRule />

      {/* Dobra 5 — Detalhamento */}
      <section id="detalhe" className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Stars className="h-3 w-3" aria-hidden />
            Detalhamento
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">Mapa natal completo</h2>
          <p className="mt-2 text-lg text-muted-foreground">Uma compra. Acesso permanente.</p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-foreground">
            O que você recebe:
          </p>
          <ol className="mt-6 space-y-6">
            {DETAIL_BLOCKS.map((block, i) => (
              <li key={block.title} className="rounded-xl border bg-card p-5">
                <p className="font-display text-lg font-bold text-primary tabular-nums">
                  [{i + 1}]
                </p>
                <p className="mt-2 font-medium text-foreground">{block.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{block.body}</p>
                {block.imageSrc && block.imageAlt ? (
                  <LandingScreenshot
                    src={block.imageSrc}
                    alt={block.imageAlt}
                    caption={block.imageCaption}
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <Button
            asChild
            size="lg"
            className="mt-10 w-full bg-mystical text-white shadow-mystical hover:opacity-90 sm:w-auto"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Ver meu mapa agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <TrustBadges />
        </div>
      </section>

      <SectionRule />

      {/* Dobra 6 — Preço */}
      <section id="comprar-mapa" className="py-20">
        <div className="container mx-auto max-w-lg px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Mapa Natal — {mapaPriceFormatted}
          </h2>
          <div className="mt-10 rounded-2xl border-2 border-primary bg-card p-8 text-center shadow-mystical">
            <p className="font-display text-5xl font-bold text-primary">{mapaPriceFormatted}</p>
            <p className="mt-1 text-sm text-muted-foreground">pagamento único</p>
            <p className="mt-4 text-sm text-muted-foreground">Acesso permanente ao seu mapa</p>
            <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
              <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
                Ver meu mapa agora
              </Link>
            </Button>
          </div>
          <ul className="mx-auto mt-8 max-w-md space-y-2 text-center text-sm text-muted-foreground">
            <li>Pix ou cartão (Mercado Pago)</li>
            <li>Cobrança só após confirmar no checkout</li>
            <li>Mapa disponível imediatamente após pagamento</li>
          </ul>
        </div>
      </section>

      <SectionRule />

      {/* Dobra 7 — FAQ */}
      <section id="faq" className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="1">
              <AccordionTrigger>Preciso da hora exata de nascimento?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Sim, para casas e Ascendente fiáveis.</strong>{" "}
                  Sem hora exata, as casas perdem precisão. Pode usar certidão com horário ou uma
                  hora aproximada (com limitações).
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Como pago?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Crie a conta ou faça login, vá ao checkout do mapa natal ({mapaPriceFormatted},
                  pagamento único). Pix ou cartão conforme o que aparecer na página de pagamento.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Os meus dados são privados?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Sim. Dados de nascimento ficam na sua conta. Pode gerir em Configurações. Não
                  vendemos os seus dados para marketing.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>Posso pedir reembolso?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  É compra avulsa: o mapa permanece na conta após pagamento. Problemas técnicos —
                  contacte suporte. Reembolsos conforme{" "}
                  <Link to="/terms" className="text-primary underline underline-offset-2">
                    Termos de Uso
                  </Link>{" "}
                  e checkout.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="5">
              <AccordionTrigger>Quanto tempo leva para ver meu mapa?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Menos de 2 minutos do pagamento à primeira visualização. O mapa é calculado e
                  exibido imediatamente após a confirmação do pagamento.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="6">
              <AccordionTrigger>O mapa muda ao longo do tempo?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Não — o mapa natal é fixo no momento do seu nascimento e não muda. O que muda é o
                  céu atual em relação ao seu mapa (trânsitos). Essa comparação faz parte dos planos
                  Premium, opcionais e separados.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="7">
              <AccordionTrigger>Funciona no celular?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Sim. O AstroMap funciona em qualquer navegador moderno — celular, tablet ou
                  computador. Não é necessário instalar nenhum aplicativo.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <SectionRule />

      {/* Dobra 8 — CTA final */}
      <section className="relative overflow-hidden py-28 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.6]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.18]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            O seu céu de nascimento, explicado.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
            {mapaPriceFormatted} pagamento único. Acesso permanente, sem mensalidade.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Começar agora · {mapaPriceFormatted}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <TrustBadges />
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container mx-auto space-y-2 px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AstroMap · Mapa sério, linguagem humana</p>
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

      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
          <p className="truncate text-xs font-medium">
            Mapa natal · {mapaPriceFormatted} · pagamento único
          </p>
          <Button asChild size="sm" className="shrink-0 bg-mystical text-white hover:opacity-90">
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Comprar
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
