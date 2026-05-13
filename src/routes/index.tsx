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
import { MAPA_INCLUDED_ITEMS } from "@/lib/mapa-product-copy";
import { amountForSubscriptionPlan, formatSubscriptionPriceBrl } from "@/lib/subscription-pricing";

const MAPA_COMPRA_SEARCH = { produto: "mapa" as const };
const AUTH_REDIRECT_MAPA = { redirect: "/assinatura?produto=mapa" as const };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "AstroMap — mapa natal interativo, interpretações em português",
      },
      {
        name: "description",
        content:
          "Mapa natal completo: roda interativa com planetas, casas e aspectos, mais interpretações em português geradas a partir da sua data, hora e local de nascimento. Pagamento único, acesso permanente na app.",
      },
    ],
    links: [{ rel: "prefetch", href: "/auth" }],
  }),
  component: Landing,
});

/** Bullets da pré-visualização (exemplo ilustrativo, não mapa real). */
const HERO_MOCKUP_LINES = [
  "13 pontos celestes nas casas (planetas e pontos sensíveis usados na app)",
  "Aspectos desenhados na roda (por exemplo: trígono, quadratura, oposição)",
  "Sol em Leão · Casa 10",
  "Lua em Câncer · Casa 4",
  "Ascendente em Escorpião",
] as const;

const DIFFERENTIATION_POINTS = [
  {
    title: "Roda explorável",
    body: "Toque num ponto e leia a interpretação desse lugar no seu mapa.",
  },
  {
    title: "Textos com contexto",
    body: "Signo, casa e aspectos — não frases genéricas só por signo solar.",
  },
  {
    title: "Gerado a partir do seu mapa calculado",
    body: "Data, hora e local definem a geometria e as leituras.",
  },
] as const;

const FOR_WHO_BULLETS = [
  "Quer ver o seu mapa desenhado com dados de nascimento — não um texto genérico de signo solar.",
  "Valoriza casas, aspectos e uma roda em que pode explorar cada ponto individualmente.",
  "Prefere um pagamento único e manter o mapa na conta para sempre.",
  "Quer leituras em português ancoradas no mapa calculado com o seu nascimento.",
] as const;

const MAPA_DETAIL_BLOCKS = [
  {
    title: "Planetas principais",
    body: "Sol, Lua, Ascendente — a base da leitura natal.",
  },
  {
    title: "Planetas pessoais",
    body: "Mercúrio (comunicação), Vênus (afeto), Marte (ação).",
  },
  {
    title: "Planetas sociais",
    body: "Júpiter (expansão), Saturno (estrutura).",
  },
  {
    title: "Planetas exteriores",
    body: "Urano (mudança), Netuno (sonhos), Plutão (transformação).",
  },
  {
    title: "Pontos sensíveis",
    body: "Quíron, Nodo Norte, Nodo Sul — quando fazem parte do desenho.",
  },
  {
    title: "Padrões especiais",
    body: "Grand Trine, T-Square, Yod… quando aparecem no seu mapa.",
  },
  {
    title: "Essência natal",
    body: "Síntese personalizada que liga o conjunto.",
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  "Crie a sua conta (ou faça login).",
  "Vá à página de assinatura e escolha o produto mapa natal.",
  "No checkout, escolha Pix ou cartão — os meios disponíveis aparecem aí.",
  "Indique data, hora e local de nascimento (ou complete depois na app, conforme o fluxo).",
  "Após confirmação do pagamento, o mapa fica disponível na sua conta.",
] as const;

function IncludedChecklist({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {MAPA_INCLUDED_ITEMS.map((item) => (
        <li key={item.title} className="flex items-start gap-2 text-sm text-muted-foreground">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong className="text-foreground">{item.title}</strong>
            {" — "}
            {item.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Landing() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const mapaPriceFormatted = formatSubscriptionPriceBrl(amountForSubscriptionPlan("mapa"));

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

      {/* Dobra 1 — TL;DR (sem CTA no corpo do hero) */}
      <section className="relative overflow-hidden pt-32 pb-20 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-shell-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.85]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.22]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <h1 className="mt-4 font-display text-4xl font-bold md:text-6xl md:leading-[1.1] text-gradient-mystical">
            O seu mapa natal, desenhado a partir do nascimento.
          </h1>
          <p className="mx-auto mt-4 font-display text-2xl font-semibold text-primary md:text-3xl">
            {mapaPriceFormatted}{" "}
            <span className="text-base font-normal text-muted-foreground md:text-lg">
              pagamento único
            </span>
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Roda interativa e interpretações em português geradas a partir da{" "}
            <strong className="text-foreground">data, hora e local</strong> do seu nascimento — não
            a partir do signo solar isolado.
          </p>

          <div className="mx-auto mt-12 max-w-md rounded-2xl border bg-card/80 p-6 text-left shadow-mystical backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Pré-visualização do mapa
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Exemplo ilustrativo — o seu mapa será calculado com os seus dados.
            </p>
            <ul className="mt-4 space-y-2">
              {HERO_MOCKUP_LINES.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="text-primary" aria-hidden>
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mx-auto mt-10 max-w-xl text-sm text-muted-foreground">
            {mapaPriceFormatted} · acesso permanente na app · sem mensalidade
          </p>
          <p className="mx-auto mt-2 text-xs text-muted-foreground">
            Pix ou cartão · ligação encriptada (HTTPS/TLS)
          </p>
        </div>
      </section>

      {/* Dobra 2 — O que leva na compra */}
      <section id="o-que-leva" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            O que está incluído no {mapaPriceFormatted}
          </h2>
          <ul className="mt-10 space-y-4">
            {MAPA_INCLUDED_ITEMS.map((item) => (
              <li key={item.title} className="rounded-xl border bg-card p-4 text-left">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant="outline" className="mt-10">
            <a href="#diferenca">Por que não é horóscopo ↓</a>
          </Button>
        </div>
      </section>

      {/* Dobra 3 — Diferenciação */}
      <section id="diferenca" className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Não é horóscopo de revista. É o mapa da sua vida.
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            O mapa natal regista onde estavam Sol, Lua, planetas e pontos sensíveis no{" "}
            <strong className="text-foreground">instante</strong> em que você nasceu — não um resumo
            por signo solar para milhões de pessoas.
          </p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
            O AstroMap mostra
          </p>
          <ul className="mt-6 space-y-4">
            {DIFFERENTIATION_POINTS.map((pt) => (
              <li key={pt.title} className="rounded-xl border bg-card p-4">
                <p className="font-medium text-foreground">{pt.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pt.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-lg text-muted-foreground">
            Paga <strong className="text-foreground">uma vez</strong>. O mapa continua na sua conta.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/auth" search={AUTH_REDIRECT_MAPA}>
              Criar conta e ir ao checkout →
            </Link>
          </Button>
        </div>
      </section>

      {/* Dobra 4 — Para quem é */}
      <section id="para-quem" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" aria-hidden />É para você se…
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Feito para quem quer o mapa a sério
          </h2>
          <ul className="mt-10 space-y-4">
            {FOR_WHO_BULLETS.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-muted-foreground">
            Na área autenticada existem <strong className="text-foreground">planos Premium</strong>{" "}
            (trânsitos diários, sinastria, previsão anual, etc.) — <strong>à parte</strong> desta
            compra e opcionais.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Comprar por {mapaPriceFormatted}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Dobra 5 — Detalhamento do produto */}
      <section id="detalhe" className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Stars className="h-3 w-3" aria-hidden />
            Mapa natal completo
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Uma compra. Acesso permanente.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Treze corpos celestes nas casas e os aspectos do momento do nascimento, exploráveis na
            roda interativa, com leituras por posição e padrões quando existirem no desenho.
          </p>
          <ol className="mt-10 space-y-4">
            {MAPA_DETAIL_BLOCKS.map((block, i) => (
              <li key={block.title} className="flex gap-4 rounded-xl border bg-card p-4">
                <span className="font-display text-xl font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{block.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{block.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 rounded-xl border bg-background/80 p-6">
            <p className="text-sm font-semibold text-foreground">O que você recebe</p>
            <IncludedChecklist className="mt-4 space-y-3" />
          </div>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Seguir para pagamento →
            </Link>
          </Button>
        </div>
      </section>

      {/* Dobra 6 — Preço e forma de pagamento */}
      <section id="comprar-mapa" className="py-20">
        <div className="container mx-auto max-w-lg px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Mapa natal</h2>
            <p className="mx-auto mt-3 max-w-md text-lg font-medium text-foreground">
              Pagamento único de {mapaPriceFormatted}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Acesso permanente ao mapa na app — sem mensalidade neste produto.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border-2 border-primary bg-card p-8 shadow-mystical">
            <div className="flex flex-col items-center text-center">
              <p className="font-display text-5xl font-bold text-primary">{mapaPriceFormatted}</p>
              <p className="mt-1 text-sm text-muted-foreground">pagamento único</p>
            </div>
            <p className="mt-6 text-sm font-semibold text-foreground">O que está incluído</p>
            <IncludedChecklist className="mt-4 space-y-3" />
            <div className="mt-8 border-t pt-8 text-left">
              <p className="text-sm font-semibold text-foreground">Como funciona</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
                {HOW_IT_WORKS_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <p className="mt-6 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-center text-xs font-medium text-foreground">
              Cobrança só após confirmar o pagamento no checkout.
            </p>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Pix ou cartão (conforme disponível na página de pagamento).
            </p>
            <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
              <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
                Comprar agora
              </Link>
            </Button>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link to="/auth" search={AUTH_REDIRECT_MAPA}>
                Criar conta e comprar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Dobra 7 — FAQ */}
      <section id="faq" className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Dúvidas sobre o mapa
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="1">
              <AccordionTrigger>O que recebo exatamente?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Roda natal interativa com treze pontos nas casas do momento do nascimento,
                  aspectos desenhados na roda e interpretações completas por posição: Sol, Lua,
                  Ascendente, planetas pessoais e exteriores, Quíron e Nodos quando fizerem parte do
                  mapa.
                </p>
                <p>
                  Quando existirem padrões especiais (Grand Trine, T-Square, Yod…), você recebe a
                  explicação detalhada. Também recebe a{" "}
                  <strong className="text-foreground">essência natal</strong> — síntese do tema
                  central. Acesso permanente na app, sem mensalidade neste produto.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Preciso da hora exata de nascimento?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Sim, para casas e Ascendente fiáveis.</strong>{" "}
                  Sem hora exata, as casas perdem precisão e parte da interpretação perde contexto.
                  O Ascendente depende da hora para ser calculado de forma consistente.
                </p>
                <p>
                  Se não souber, pode pedir certidão de nascimento com horário. Também pode usar uma
                  hora aproximada; o mapa será menos preciso e a app pode indicar limitações.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Como pago?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Crie a sua conta ou faça login, vá à página de assinatura e escolha o produto mapa
                  natal. No checkout, o valor é {mapaPriceFormatted} (pagamento único). Pode pagar
                  com Pix ou cartão —{" "}
                  <strong className="text-foreground">
                    os meios disponíveis aparecem na página de pagamento
                  </strong>{" "}
                  no momento da compra.
                </p>
                <p>
                  Após confirmação do pagamento, o mapa fica disponível na app. O processamento é
                  feito de forma segura; a cobrança só após a confirmação no checkout.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>Os meus dados são privados?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Sim. Data, hora e local de nascimento ficam associados à sua conta privada. Pode
                  gerir dados e privacidade em Configurações. Não vendemos os seus dados a terceiros
                  para marketing.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="5">
              <AccordionTrigger>Posso cancelar ou pedir reembolso?</AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Como é <strong className="text-foreground">pagamento único</strong> (não é
                  assinatura), não há &quot;cancelamento&quot; de plano: o mapa permanece na conta
                  após a compra.
                </p>
                <p>
                  Se houver problema técnico que impeça o acesso, contacte o suporte. Reembolso e
                  litígios seguem os{" "}
                  <Link to="/terms" className="text-primary underline underline-offset-2">
                    Termos de Uso
                  </Link>{" "}
                  e o indicado no checkout.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Dobra 8 — CTA final */}
      <section className="relative overflow-hidden py-28 texture-grain">
        <div className="pointer-events-none absolute inset-0 bg-cosmic opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-[0.6]" />
        <div className="pointer-events-none absolute inset-0 starfield opacity-[0.18]" />
        <div className="container relative z-[1] mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            O mapa com o seu nome no céu.
          </h2>
          <p className="mx-auto mt-4 font-display text-2xl font-semibold text-gradient-mystical md:text-3xl">
            {mapaPriceFormatted}
          </p>
          <p className="mx-auto mt-6 max-w-lg text-muted-foreground">
            Crie a conta, pague uma vez e explore a roda e as leituras quando quiser — sem
            mensalidade neste produto.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura" search={MAPA_COMPRA_SEARCH}>
              Comprar mapa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-6 text-xs text-muted-foreground">
            <p>Pagamento único · {mapaPriceFormatted} · Pix ou cartão</p>
          </div>
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
