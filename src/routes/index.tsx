import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Stars,
  Check,
  ArrowRight,
  Zap,
  QrCode,
  CreditCard,
  Lock,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { amountForSubscriptionPlan, formatSubscriptionPriceBrl } from "@/lib/subscription-pricing";
import { supabase } from "@/integrations/supabase/client";
import { ENGAGEMENT_ROUTES, ENGAGEMENT_TOPICS, recordLandingEngagement } from "@/lib/engagement";
import { useAuth } from "@/hooks/use-auth";
import { usePageEngagement } from "@/hooks/use-page-engagement";
import { trackMetaEvent } from "@/lib/meta-pixel";

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
    links: [
      { rel: "prefetch", href: "/auth" },
      { rel: "prefetch", href: "/assinatura?produto=mapa" },
    ],
  }),
  component: Landing,
});

type RoadmapStep = {
  title: string;
  body?: string;
  imageSrc?: string;
  imageAlt?: string;
  imageCaption?: string;
  /** Ilustração leve quando não há screenshot (ex.: passo de pagamento). */
  illustration?: "payment";
};

const ROADMAP_STEPS: RoadmapStep[] = [
  {
    title: "Crie sua conta em 30 segundos",
    body: "(ou faça login se já tiver)",
  },
  {
    title: "Escolha Pix ou cartão na página de pagamento",
    body: "Processado pelo Mercado Pago — Pix com QR Code ou cartão de crédito.",
    illustration: "payment",
  },
  {
    title: "Coloque data, hora e local de nascimento",
  },
  {
    title: "Seu mapa é gerado na hora",
  },
  {
    title: "Explore cada planeta tocando na roda",
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
    title: "Casas e planetas em domicílio",
    body: "Cúspide de cada casa, significado do setor da vida e planetas que ocupam o segmento — leitura por domicílio.",
    imageSrc: `${LANDING_PUBLIC}/casas-tab.png`,
    imageAlt:
      "AstroMap: roda natal à esquerda e separador Casas à direita, com cartões Casa 1, Casa 2 e interpretações",
    imageCaption: "Separador Casas no detalhe do mapa.",
  },
  {
    title: "Interpretações de cada posição",
    body: "Sol, Lua, Ascendente — base da personalidade. Mercúrio, Vênus, Marte — planetas pessoais. Júpiter, Saturno — sociais. Urano, Netuno, Plutão — transformação. Quíron, Nodos — pontos sensíveis.",
    imageSrc: `${LANDING_PUBLIC}/planetas-tab.png`,
    imageAlt:
      "AstroMap: roda natal e separador Planetas com cartões Sol, Lua e Mercúrio e botão Aprofundar",
    imageCaption: "Cada planeta com texto base e IA opcional.",
  },
  {
    title: "Padrões especiais (quando existirem)",
    body: "Grand Trine, T-Square, Yod, Stellium.",
    imageSrc: `${LANDING_PUBLIC}/padroes-essencia.png`,
    imageAlt:
      "Cartão Configurações especiais no separador Essência, com T-quadrado e texto interpretativo",
    imageCaption:
      "No Essência, cada padrão mostra os planetas envolvidos com glifos (a geometria continua visível na roda).",
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
      <span aria-hidden className="text-border">
        ·
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-green-500" aria-hidden />
        Garantia de 7 dias
      </span>
    </div>
  );
}

/** Ilustração genérica do passo «pagamento» (sem captura de ecrã com dados). */
function RoadmapPaymentIllustration() {
  return (
    <figure className="mt-3">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-mystical md:rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 sm:flex-row sm:gap-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <QrCode className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-xs font-medium text-foreground">Pix</p>
            <p className="max-w-[10rem] text-[11px] text-muted-foreground">QR Code no checkout</p>
          </div>
          <div className="hidden h-12 w-px bg-border sm:block" aria-hidden />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <CreditCard className="h-7 w-7" aria-hidden />
            </div>
            <p className="text-xs font-medium text-foreground">Cartão</p>
            <p className="max-w-[10rem] text-[11px] text-muted-foreground">
              Crédito no Mercado Pago
            </p>
          </div>
          <div className="hidden h-12 w-px bg-border sm:block" aria-hidden />
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              Pagamento seguro
            </div>
            <p className="max-w-[14rem] text-[11px] leading-relaxed text-muted-foreground">
              O valor do mapa é confirmado antes de pagar. Cobrança só após concluir no checkout.
            </p>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        Ilustração do fluxo — a página real mostra o Mercado Pago com o valor do mapa.
      </figcaption>
    </figure>
  );
}

function LandingScreenshot({
  src,
  alt,
  caption,
  priority,
  variant = "default",
}: {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  /** Hero: roda quadrada/circular sem cortar bordas; fundo alinhado ao tema escuro do gráfico. */
  /** heroDashboard: captura ampla do painel (mapa + horóscopo), moldura premium e maior escala. */
  /** containTop: capturas de UI inteiras sem cortar laterais (object-contain + topo). */
  variant?: "default" | "heroChart" | "heroDashboard" | "containTop";
}) {
  const frame =
    variant === "heroChart"
      ? "overflow-hidden rounded-xl border border-border/80 bg-[radial-gradient(ellipse_at_50%_45%,rgba(180,120,55,0.14)_0%,rgba(12,10,14,0.95)_52%,#070608_100%)] shadow-mystical md:rounded-2xl"
      : variant === "heroDashboard"
        ? "group relative overflow-hidden rounded-2xl border border-primary/35 bg-[radial-gradient(ellipse_90%_70%_at_50%_20%,rgba(200,155,75,0.18)_0%,rgba(14,10,12,0.97)_48%,#080506_100%)] shadow-[0_28px_80px_-24px_rgba(0,0,0,0.75),0_0_0_1px_rgba(200,165,95,0.12),0_0_48px_-12px_rgba(180,130,55,0.25)] ring-1 ring-primary/20 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(145deg,rgba(255,255,255,0.06)_0%,transparent_42%,transparent_100%)] before:opacity-70 md:rounded-[1.35rem]"
        : "overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-mystical md:rounded-2xl";
  const imgClass =
    variant === "heroChart"
      ? "max-h-[min(380px,82vw)] w-full object-contain object-center sm:max-h-[min(480px,88vw)] md:max-h-[560px]"
      : variant === "heroDashboard"
        ? "max-h-[min(340px,92vw)] w-full object-contain object-center sm:max-h-[min(420px,88vw)] lg:max-h-[min(520px,72vh)] xl:max-h-[580px]"
        : variant === "containTop"
          ? "max-h-[400px] w-full object-contain object-top md:max-h-[520px]"
          : "max-h-[420px] w-full object-cover object-top md:max-h-[520px]";

  return (
    <figure className={variant === "heroDashboard" ? "mt-0" : "mt-3"}>
      <div
        className={
          variant === "heroDashboard"
            ? `${frame} lg:motion-safe:[transform:perspective(1200px)_rotateY(-4deg)_rotateX(2deg)] lg:transition-transform lg:duration-500 lg:ease-out lg:motion-safe:hover:[transform:perspective(1200px)_rotateY(-2deg)_rotateX(1deg)]`
            : frame
        }
      >
        <img
          src={src}
          alt={alt}
          className={`relative ${imgClass}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? ({ fetchPriority: "high" } as const) : {})}
        />
      </div>
      {caption ? (
        <figcaption
          className={`mt-2 text-xs text-muted-foreground ${variant === "heroDashboard" ? "mx-auto max-w-2xl text-center" : "text-center"}`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

type Testimonial = {
  name: string;
  sign: string;
  quote: string;
  initial: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Juliana M.",
    sign: "Sol em Leão",
    initial: "J",
    quote:
      "Sempre li meu horóscopo mas nunca entendi por que não me encaixava no perfil de Leão. O mapa me mostrou que tenho Lua em Virgem e Ascendente em Capricórnio — foi a primeira vez que me reconheci de verdade.",
  },
  {
    name: "Rafael S.",
    sign: "Sol em Escorpião",
    initial: "R",
    quote:
      "Comprei por curiosidade e fiquei horas lendo. A parte dos padrões especiais me explicou algo que eu sempre senti mas não conseguia nomear. Vale muito o preço.",
  },
  {
    name: "Ana P.",
    sign: "Sol em Câncer",
    initial: "A",
    quote:
      "Presenteei minha mãe com o mapa dela. Ela ficou emocionada com a interpretação do Sol na Casa 4 — parecia que estava descrevendo a história de vida dela.",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex gap-1" aria-label="5 estrelas">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
        ))}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
          {testimonial.initial}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground">{testimonial.sign}</p>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const mapaPriceFormatted = formatSubscriptionPriceBrl(amountForSubscriptionPlan("mapa"));
  const forWho = forWhoBullets(mapaPriceFormatted);
  const { user } = useAuth();
  const scrollDepthSent = useRef<Set<number>>(new Set());

  usePageEngagement(ENGAGEMENT_ROUTES.landing, ENGAGEMENT_TOPICS.landing_open);

  const emitCta = useCallback(
    (zone: string) => {
      recordLandingEngagement(supabase, user?.id ?? null, ENGAGEMENT_TOPICS.landing_cta_click, {
        zone,
        produto: "mapa",
      });
      trackMetaEvent("Lead", { content_name: zone, content_category: "landing_cta" });
    },
    [user?.id],
  );

  useEffect(() => {
    const onScroll = () => {
      setShowStickyCta(window.scrollY > 500);
      if (!user?.id) return;
      const el = document.documentElement;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const ratio = el.scrollTop / maxScroll;
      for (const mark of [25, 50, 75, 100] as const) {
        if (ratio >= mark / 100 && !scrollDepthSent.current.has(mark)) {
          scrollDepthSent.current.add(mark);
          recordLandingEngagement(supabase, user.id, ENGAGEMENT_TOPICS.landing_scroll_depth, {
            pct: mark,
          });
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [user?.id]);

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
              <Link
                to="/assinatura"
                search={MAPA_COMPRA_SEARCH}
                onClick={() => emitCta("header_comprar")}
              >
                Comprar mapa
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Dobra 1 — Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 md:pb-24 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />
        <div
          className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-[100px] md:h-96 md:w-96"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-violet-500/10 blur-[90px] md:h-80 md:w-80"
          aria-hidden
        />
        <div className="container relative z-[1] mx-auto px-4">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Mapa natal
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold md:text-5xl md:leading-[1.12] xl:text-[3.25rem] text-gradient-mystical">
              Descubra o que o céu diz sobre você
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Painel completo com roda natal, essência (Sol, Lua, Asc) e leituras do dia — por{" "}
              <strong className="text-foreground">{mapaPriceFormatted}</strong>, pagamento único.
            </p>

            <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2">
              {["13 planetas", "12 casas", "interpretações em PT", "pagamento único"].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 text-xs text-primary"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              1.200+ mapas gerados&nbsp;·&nbsp;Nota 4.9/5
            </p>

            <div className="relative mx-auto mt-8 w-full max-w-5xl">
              <LandingScreenshot
                src={`${LANDING_PUBLIC}/hero-dashboard-app.png`}
                alt="AstroMap: painel Meu Mapa Principal com roda natal, Sol em Sagitário, Lua em Escorpião, Ascendente em Sagitário, e painel Horóscopo hoje com leituras personalizadas"
                priority
                variant="heroDashboard"
                caption="Visualização real do seu painel — mapa principal e horóscopo contextual ao mesmo tempo."
              />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button
                asChild
                size="lg"
                className="w-full bg-mystical text-white shadow-mystical hover:opacity-90 sm:w-auto"
              >
                <Link
                  to="/assinatura"
                  search={MAPA_COMPRA_SEARCH}
                  onClick={() => emitCta("hero_below_screenshot")}
                >
                  Ir para checkout · {mapaPriceFormatted}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <a
                href="#detalhe"
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Ver como é o mapa antes de comprar ↓
              </a>
            </div>

            <TrustBadges />
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
                {step.illustration === "payment" ? (
                  <RoadmapPaymentIllustration />
                ) : step.imageSrc && step.imageAlt ? (
                  <LandingScreenshot
                    src={step.imageSrc}
                    alt={step.imageAlt}
                    caption={step.imageCaption}
                    variant="containTop"
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
            <Link
              to="/assinatura"
              search={MAPA_COMPRA_SEARCH}
              onClick={() => emitCta("roadmap_cta")}
            >
              Continuar para o mapa · {mapaPriceFormatted}
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
            <Link
              to="/assinatura"
              search={MAPA_COMPRA_SEARCH}
              onClick={() => emitCta("diferenca_cta")}
            >
              Quero esse nível de detalhe
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <TrustBadges />
        </div>
      </section>

      <SectionRule />

      {/* Depoimentos */}
      <section id="depoimentos" className="py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">
            O que dizem os usuários
          </p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold md:text-4xl">
            Quem já tem o mapa natal
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
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
                    variant="containTop"
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
            <Link
              to="/assinatura"
              search={MAPA_COMPRA_SEARCH}
              onClick={() => emitCta("detalhe_cta")}
            >
              Ver preço e checkout
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
          <div className="mt-8 flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Garantia de satisfação de 7 dias
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Se não ficar satisfeito nos primeiros 7 dias após a compra, devolvemos 100% do
                valor. Sem burocracia, sem perguntas.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border-2 border-primary bg-card p-8 text-center shadow-mystical">
            <p className="font-display text-5xl font-bold text-primary">{mapaPriceFormatted}</p>
            <p className="mt-1 text-sm text-muted-foreground">pagamento único</p>
            <p className="mt-4 text-sm text-muted-foreground">Acesso permanente ao seu mapa</p>
            <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
              <Link
                to="/assinatura"
                search={MAPA_COMPRA_SEARCH}
                onClick={() => emitCta("preco_card_cta")}
              >
                Comprar mapa natal
              </Link>
            </Button>
          </div>
          <ul className="mx-auto mt-8 max-w-md space-y-2 text-center text-sm text-muted-foreground">
            <li>Pix ou cartão (Mercado Pago)</li>
            <li>Cobrança só após confirmar no checkout</li>
            <li>Mapa disponível imediatamente após pagamento</li>
          </ul>
          <p className="mx-auto mt-8 max-w-md text-center text-sm text-muted-foreground">
            O valor no checkout é o mesmo desta página ({mapaPriceFormatted}). Acesso permanente na
            sua conta após a compra.
          </p>
          <p className="mx-auto mt-3 max-w-md text-center text-xs text-muted-foreground">
            Dúvidas sobre{" "}
            <Link to="/#faq" className="text-primary underline underline-offset-2">
              hora de nascimento, reembolso ou privacidade
            </Link>
            .
          </p>
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
                  <strong className="text-foreground">Garantia de 7 dias.</strong> Se não ficar
                  satisfeito nos primeiros 7 dias após a compra, devolvemos 100% do valor — sem
                  burocracia. Após esse período, a compra é considerada confirmada (o mapa permanece
                  na sua conta). Para solicitar, entre em contato via suporte com o e-mail da sua
                  conta.
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
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH} onClick={() => emitCta("final_cta")}>
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
        <>
          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">
                Mapa natal · {mapaPriceFormatted} · pagamento único
              </p>
              <p className="text-[10px] text-muted-foreground">
                Garantia de 7 dias · Acesso imediato
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0 bg-mystical text-white hover:opacity-90">
              <Link
                to="/assinatura"
                search={MAPA_COMPRA_SEARCH}
                onClick={() => emitCta("sticky_mobile")}
              >
                Comprar
              </Link>
            </Button>
          </div>
          <div className="fixed top-14 left-0 right-0 z-30 hidden border-b border-border/80 bg-background/95 py-2 backdrop-blur-md md:block">
            <div className="container mx-auto flex items-center justify-between gap-4 px-4">
              <p className="text-sm font-medium tabular-nums text-foreground">
                Mapa natal — {mapaPriceFormatted}
              </p>
              <Button
                asChild
                size="sm"
                className="shrink-0 bg-mystical text-white hover:opacity-90"
              >
                <Link
                  to="/assinatura"
                  search={MAPA_COMPRA_SEARCH}
                  onClick={() => emitCta("sticky_desktop")}
                >
                  Comprar mapa
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
