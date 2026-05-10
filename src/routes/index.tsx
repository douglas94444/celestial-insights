import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Stars, Heart, CalendarRange, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AstroMap — Descubra seu Mapa Astral" },
      { name: "description", content: "Crie gratuitamente seu mapa astral completo: planetas, casas, aspectos e interpretações em português." },
    ],
  }),
  component: Landing,
});

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
      <section className="relative overflow-hidden pt-32 pb-24">
        <div className="absolute inset-0 bg-cosmic opacity-[0.04]" />
        <div className="absolute inset-0 starfield opacity-30" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Astrologia moderna em português
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight md:text-7xl">
            Descubra seu <span className="text-gradient-mystical">mapa astral</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Cálculos precisos, interpretações profundas e visualização interativa.
            O céu da sua hora exata de nascimento, em um só lugar.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-mystical text-white shadow-mystical hover:opacity-90">
              <Link to="/auth">Criar meu mapa grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="como-funciona" className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Tudo que você precisa para se conhecer pelas estrelas
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Stars, title: "Mapa Natal Completo", desc: "10 planetas, 12 casas, aspectos e interpretações detalhadas." },
              { icon: Heart, title: "Sinastria", desc: "Compare dois mapas e descubra a compatibilidade entre vocês." },
              { icon: CalendarRange, title: "Trânsitos", desc: "Saiba quando os planetas ativam pontos importantes do seu mapa." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Planos</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Comece grátis. Faça upgrade quando quiser explorar mais profundamente.
          </p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8">
              <h3 className="font-display text-2xl font-semibold">Free</h3>
              <p className="mt-1 text-sm text-muted-foreground">Para começar sua jornada</p>
              <p className="mt-6 font-display text-4xl font-bold">R$ 0</p>
              <ul className="mt-6 space-y-3 text-sm">
                {["1 mapa astral salvo", "Sol, Lua e Ascendente", "Visualização interativa", "Horóscopo diário"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t}</li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full" variant="outline">
                <Link to="/auth">Começar grátis</Link>
              </Button>
            </div>
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-mystical">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mystical px-3 py-1 text-xs font-semibold text-white">
                MAIS POPULAR
              </div>
              <h3 className="font-display text-2xl font-semibold">Premium</h3>
              <p className="mt-1 text-sm text-muted-foreground">Toda a profundidade do céu</p>
              <p className="mt-6 font-display text-4xl font-bold">
                R$ 24,90<span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Mapas ilimitados",
                  "10 planetas + casas + aspectos",
                  "Sinastria completa",
                  "Trânsitos personalizados",
                  "Download em PDF",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t}</li>
                ))}
              </ul>
              <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
                <Link to="/auth">Começar trial</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Dúvidas frequentes</h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="1">
              <AccordionTrigger>O que é um mapa astral?</AccordionTrigger>
              <AccordionContent>
                É uma fotografia do céu no momento exato em que você nasceu, mostrando a posição dos planetas em relação aos signos e casas. Cada elemento revela aspectos da sua personalidade, talentos e desafios.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Preciso saber a hora exata?</AccordionTrigger>
              <AccordionContent>
                A hora é importante para calcular o Ascendente e as casas. Se não souber, você ainda pode criar um mapa usando 12:00 — mas o Ascendente pode não ser preciso.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Meus dados são privados?</AccordionTrigger>
              <AccordionContent>
                Sim. Apenas você acessa seus mapas, e nossos cálculos respeitam regras rígidas de privacidade.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
