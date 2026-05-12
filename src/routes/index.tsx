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
      {
        title: "AstroMap — mapa natal, trânsitos ao vivo e sinastria com leituras em português",
      },
      {
        name: "description",
        content:
          "Pare de ler horóscopo genérico: veja o céu de hoje sobre o seu mapa, sinastria, previsão anual e IA que fala com os seus dados. Assinatura Mensal ou Anual com pagamento por Pix e/ou cartão.",
      },
    ],
    links: [{ rel: "prefetch", href: "/auth" }],
  }),
  component: Landing,
});

const PAID_PLAN_FEATURES = [
  "Mapas ilimitados para você, família, amigos e parceiros",
  "Sinastria e mapa composto com leitura longa",
  "IA que interpreta o seu mapa completo, sem limite de pedidos",
  "Trânsitos diários com score e previsão anual",
  "PDF do mapa e cartão do dia prontos para compartilhar",
  "Diário de humor ligado ao céu para ver padrões no tempo",
];

const FOR_WHO = [
  "Se você já cansou de texto que poderia ser para qualquer pessoa do mesmo signo",
  "Se quer uma ferramenta séria ao lado de terapia, meditação ou escrita reflexiva",
  "Se está pronta ou pronto para casas, aspectos e trânsitos — não só «sou de Leão»",
  "Se quando falam em retrógrado você quer saber onde isso cai na sua vida, não no feed",
  "Se prefere clareza a misticismo vazio",
  "Se tratar bem a cabeça faz parte do seu dia a dia, não de um fim de semana esotérico",
];

const TRANSIT_MOCK = [
  { planet: "Saturno △ Vênus", score: 82, label: "Casa 2 · dinheiro e valor" },
  { planet: "Júpiter ☌ Sol", score: 95, label: "Casa 10 · carreira e imagem" },
  { planet: "Marte □ Lua", score: 41, label: "Casa 4 · lar e emoção" },
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
              <Link to="/auth">Já tenho conta</Link>
            </Button>
            <Button asChild size="sm" className="bg-mystical text-white hover:opacity-90">
              <Link to="/assinatura">Ver planos</Link>
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
            Um único lugar para o seu mapa natal, o céu de agora em cima dele, sinastria e leituras
            com IA — tudo em português, com o seu nome e as suas casas, não um parágrafo para doze
            milhões de pessoas.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-mystical text-white shadow-mystical hover:opacity-90"
            >
              <Link to="/assinatura">
                Escolher plano
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Por que não é horóscopo ↓</a>
            </Button>
          </div>
          <p className="mx-auto mt-6 text-xs text-muted-foreground">
            Mensal ou Anual · mesmo pacote de recursos · pagamento com Pix ou cartão · conexão
            criptografada (HTTPS/TLS)
          </p>

          {/* Mock visual do produto */}
          <div className="mx-auto mt-14 max-w-sm rounded-2xl border bg-card/80 p-5 text-left shadow-mystical backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Hoje no seu mapa
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
              ✦ Cada barra usa o seu mapa — não um modelo genérico
            </p>
          </div>
        </div>
      </section>

      {/* Diferenciação */}
      <section id="como-funciona" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Passo 2 da esteira: entenda o que você está comprando
          </h2>
          <div className="mt-8 space-y-6">
            <p className="text-lg leading-relaxed text-muted-foreground">
              O AstroMap não «adivinha personalidade» por signo solar. Ele ancora{" "}
              <strong className="text-foreground">13 corpos no mapa do seu nascimento</strong> e
              cruza isso com{" "}
              <strong className="text-foreground">o movimento real do céu hoje</strong> — o mesmo
              céu para todos, mas o efeito em cada um é outro porque a geometria do mapa é outra.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Resultado: em vez de um texto que cabe num story de Instagram, você recebe leituras,
              trânsitos e alertas que mencionam{" "}
              <strong className="text-foreground">as suas casas, aspectos e timing</strong>. É o
              passo seguinte para quem já sabe que o mapa existe e quer usá-lo no dia a dia.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-8">
            <Link to="/auth">Abrir conta e ver meu mapa →</Link>
          </Button>
        </div>
      </section>

      {/* Para Quem — movido para cá para qualificar cedo */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            Passo 3: é para você?
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Qualificação rápida —{" "}
            <span className="text-gradient-mystical">se marcou três, siga em frente</span>
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
            Se procura atalhos mágicos, há outros caminhos. Se procura clareza com rigor simbólico,
            bem-vindo ou bem-vinda.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura">
              Ver planos e valores
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
            Mapa natal interativo
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            O centro da experiência: a roda do seu nascimento
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Sol, Lua, planetas, Quíron, nodos — posicionados no instante em que você nasceu. Não é
            PDF estático: é uma roda em que cada toque abre camadas de interpretação alinhadas ao
            que está desenhado ali, não a um arquétipo genérico.
          </p>
          <div className="mt-8 rounded-2xl border bg-card p-6">
            <p className="font-semibold">✨ Leituras geradas a partir do desenho real</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A IA usa signo, casa e rede de aspectos do seu mapa para produzir texto que soa
              específico — porque foi construído em cima dos seus dados, não de um template de
              «Áries semana 12».
            </p>
          </div>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Experimentar meu mapa →</Link>
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
            Um ritual diário: mensagem + céu de hoje sobre o seu mapa
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Às 7h ou quando abrir a app, recebe um resumo que cruza{" "}
            <strong className="text-foreground">trânsitos atuais</strong> com{" "}
            <strong className="text-foreground">a sua configuração natal</strong>. Não é «Lua em
            Gêmeos para todos»; é linguagem que assume o seu mapa como ponto zero.
          </p>
          <blockquote className="mt-6 rounded-xl border-l-4 border-primary bg-primary/5 px-6 py-4 italic text-muted-foreground">
            &ldquo;Marina, Saturno em sextil com a sua Vênus na Casa 2 — bom dia para fechar contas
            criativas com método, sem matar a inspiração.&rdquo;
          </blockquote>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">☕ Tom próximo e claro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Acolhe sem infantilizar: útil para começar o dia com contexto simbólico, não com
                pressão de «energia do universo».
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="font-semibold">🎨 Cartão pronto para redes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Gera imagem do momento — partilha ou guarde como registo visual do dia.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ver como chega minha mensagem →</Link>
          </Button>
        </div>
      </section>

      {/* Trânsitos */}
      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <CalendarRange className="h-3 w-3" />
            Trânsitos em tempo real
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Cada aspecto com peso, casa e horário — não só um meme de retrógrado
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Aqui o alerta vem com contexto: onde isso cai no seu mapa e com que força. Você enxerga:
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Score de intensidade só seu (0 a 100)",
              "Quais áreas de vida estão acesas (casas tocadas)",
              "Momento aproximado em que o aspecto aperta (ex.: 14h37)",
              "Registro de humor para cruzar sensação com trânsitos anteriores",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 italic text-muted-foreground">
            Menos slogan, mais painel: você decide o que merece atenção hoje.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Abrir meus trânsitos →</Link>
          </Button>
        </div>
      </section>

      {/* Sinastria */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Heart className="h-3 w-3" />
            Sinastria e relações
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Relacionamento com dados: sobreposição de mapas + leitura longa
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Cruze o seu mapa com o de parceiro, familiar ou amigo e leia a dinâmica em camadas — não
            um «porcentagem de amor» solta:
          </p>
          <ul className="mt-6 space-y-3">
            <li className="rounded-xl border bg-card p-4 text-sm">
              <strong>Indicadores por tema:</strong>{" "}
              <span className="text-muted-foreground">
                exemplo: vínculo (78/100), diálogo (65/100), valores (82/100)
              </span>
            </li>
            <li className="rounded-xl border bg-card p-4 text-sm">
              <strong>Aspectos cruzados explicados:</strong>{" "}
              <span className="text-muted-foreground">
                &ldquo;Seu Sol aciona a Casa 7 do outro mapa — luz sobre o que essa pessoa busca em
                parceria.&rdquo;
              </span>
            </li>
            <li className="rounded-xl border bg-card p-4 text-sm">
              <strong>Texto profundo:</strong>{" "}
              <span className="text-muted-foreground">
                milhares de palavras conectando tensões e pontos de apoio reais entre vocês
              </span>
            </li>
          </ul>
          <p className="mt-8 italic text-muted-foreground">
            Útil para conversas difíceis com vocabulário comum — não para «cravar» o crush no
            Tinder.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Montar uma sinastria →</Link>
          </Button>
        </div>
      </section>

      {/* Previsão Anual */}
      <section className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Telescope className="h-3 w-3" />
            Previsão anual
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Linha do tempo de 2026 no seu mapa — antes da agenda encher
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Um painel de 12 meses com o que mais mexe na sua configuração:
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Ingressos e mudanças de signo que batem nas suas casas",
              "Janelas de Mercúrio, Vênus e Marte retrógrados com datas",
              "Meses mais carregados versus mais leves para planejar energia",
              "Eclipses e formações raras que marcam viradas de ciclo",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 italic text-muted-foreground">
            Não é controle do futuro — é calendário simbólico para decidir onde investir foco.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ver minha linha do ano →</Link>
          </Button>
        </div>
      </section>

      {/* Diário de Humor */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <TrendingUp className="h-3 w-3" />
            Diário de humor
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Feche o ciclo: humor registrado + céu no mesmo gráfico
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Marque de 1 a 10 como foi o dia, escolha tags (ansioso, focado, exausto…). Depois de uma
            semana, compare a curva com os trânsitos — padrões aparecem sem mystificação.
          </p>
          <blockquote className="mt-6 rounded-xl border-l-4 border-primary bg-primary/5 px-6 py-4 italic text-muted-foreground">
            Às vezes não é «fase ruim»; é Lua ou Saturno batendo numa casa sensível — e nomear isso
            já muda o jogo.
          </blockquote>
          <p className="mt-6 text-muted-foreground">
            Bom para quem já acompanha saúde mental e quer correlato simbólico honesto.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/auth">Ativar meu diário →</Link>
          </Button>
        </div>
      </section>

      {/* Planos — Mensal + Anual */}
      <section id="planos" className="py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Último passo: escolha o ritmo de cobrança (mesmo produto)
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Mensal e anual liberam o mesmo pacote depois da primeira semana: desbloqueio gradual,
              um pouco a cada dia, fuso de São Paulo. Depois de criar a conta, na página de
              assinatura você escolhe o plano e paga com Pix e/ou cartão (Mercado Pago), conforme o
              que estiver disponível no momento.
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
            Valores abaixo são os da aplicação; o resumo e o total final aparecem no checkout antes
            de confirmar.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 shadow-soft">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl font-semibold">Mensal</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Flexível, renova mês a mês</p>
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
                <Link to="/auth">Criar conta e assinar</Link>
              </Button>
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-mystical">
              <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
                <span className="whitespace-nowrap rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Menor preço por mês
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <h3 className="font-display text-2xl font-semibold">Anual</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Compromisso anual, mais conta no bolso
              </p>
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
              <p className="mt-4 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-foreground">
                Cobrança só após você concluir o pagamento no checkout (Pix ou cartão, conforme
                disponível).
              </p>
              <Button asChild className="mt-8 w-full bg-mystical text-white hover:opacity-90">
                <Link to="/auth">Criar conta e assinar</Link>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Após o login, a página Planos mostra o estado da assinatura.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto max-w-2xl px-4">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">
            Dúvidas antes de clicar em criar conta
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            <AccordionItem value="1">
              <AccordionTrigger>O que exatamente é um mapa astral aqui?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  É o céu congelado no instante do seu nascimento: 13 pontos celestes em posições
                  únicas, ligados por dezenas de aspectos. Dois irmãos nascidos minutos aparte já
                  podem ter Ascendentes diferentes — por isso insistimos em dados de nascimento
                  precisos.
                </p>
                <p>
                  O mapa não é bola de cristal: é linguagem simbólica para falar de motivações,
                  tensões e talentos. A IA entra para traduzir isso em texto legível, sempre
                  ancorada no desenho.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Preciso da hora certinha de nascimento?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  Quanto mais precisa, melhor. A hora posiciona Ascendente e casas — sem isso,
                  grande parte da interpretação perde chão.
                </p>
                <p>
                  <strong>Sem a hora na certidão?</strong> Use 12h00 para um mapa solar; o app avisa
                  quando os dados são aproximados. Sempre que achar a hora exata, atualize e o mapa
                  refina.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Quem vê meus mapas e leituras?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  Por padrão, só você. As regras no banco impedem que outro utilizador navegue pelos
                  seus dados. Exportar ou apagar tudo fica em Configurações, quando quiser.
                </p>
                <p className="font-medium">
                  Não revendemos nem compartilhamos os seus dados com terceiros comerciais.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>Mensal versus anual — muda alguma funcionalidade?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  <strong>Depois da primeira semana:</strong> nenhuma diferença de recurso. Ambos
                  desbloqueiam o mesmo conjunto (mapas ilimitados, sinastria, IA, trânsitos, ano,
                  PDF, diário) com o mesmo ritmo de abertura nos 7 primeiros dias (calendário de São
                  Paulo).
                </p>
                <p>
                  <strong>Diferença real:</strong> no mensal você paga R$&nbsp;24,90 por mês; no
                  anual, R$&nbsp;147 à vista no ano (cerca de R$&nbsp;12,25/mês), mantendo o mesmo
                  céu dentro do app.
                </p>
                <p className="italic text-muted-foreground">
                  Escolha o que combina com o seu fluxo de caixa; a experiência premium é a mesma.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="5">
              <AccordionTrigger>A IA inventa coisas sobre mim?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  O modelo recebe o mapa completo (corpos, casas, aspectos), o contexto do dia e
                  instruções para não cair em clichê de signo solar.
                </p>
                <p>
                  Não vendemos frases tipo &ldquo;Áries corajoso&rdquo;. O caminho é outro: &ldquo;O
                  seu Sol em Áries na Casa 10, apoiado por Júpiter na 2, fala de visibilidade
                  pública ligada a recursos próprios; hoje Saturno em sextil com a sua Vênus pede
                  revisão de contratos afetivos com calma…&rdquo; — isto é exemplo de tom, não
                  previsão literal.
                </p>
                <p>Use como reflexão, não como ordem do universo.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="6">
              <AccordionTrigger>Como funciona o pagamento e a renovação?</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p>
                  O checkout está ativo na área autenticada: você escolhe Mensal ou Anual e paga com
                  Pix (SyncPay) e/ou cartão via Mercado Pago (incluindo Checkout Pro), conforme o
                  que aparecer na página de assinatura.
                </p>
                <p>
                  A cobrança só ocorre depois que você confirma o fluxo de pagamento. No plano
                  mensal, há renovação conforme o ciclo escolhido; no anual, o valor integral do ano
                  é acordado no checkout. Os valores divulgados aqui (R$&nbsp;24,90/mês e
                  R$&nbsp;147/ano) são os da app; alterações futuras serão comunicadas com
                  antecedência razoável.
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
            Pronto para deixar de adivinhar sozinho?{" "}
            <span className="text-gradient-mystical">O mapa já tem pistas.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-muted-foreground">
            Crie a conta, abra a página de assinatura e conclua o pagamento quando fizer sentido
            para você. O premium desbloqueia conforme o calendário da app — sem surpresa antes de
            confirmar no checkout.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-mystical text-white shadow-mystical hover:opacity-90"
          >
            <Link to="/assinatura">
              Ir para planos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-6 space-y-1 text-xs text-muted-foreground">
            <p>Mensal R$&nbsp;24,90/mês · Anual R$&nbsp;147/ano · pagamento no checkout</p>
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

      {/* Sticky CTA — mobile only */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
          <p className="truncate text-xs font-medium">
            Mensal ou anual — Pix ou cartão no checkout
          </p>
          <Button asChild size="sm" className="shrink-0 bg-mystical text-white hover:opacity-90">
            <Link to="/assinatura">Planos</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
