import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — AstroMap" },
      { name: "description", content: "Como o AstroMap coleta, usa e protege seus dados pessoais." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="mb-8 inline-block text-sm text-muted-foreground hover:text-primary">
          ← Voltar ao início
        </Link>
        <h1 className="font-display text-4xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: maio de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)
        </p>

        <div className="prose prose-sm dark:prose-invert mt-10 space-y-8 max-w-none">
          <section>
            <h2 className="font-display text-xl font-semibold">1. Quem somos</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O AstroMap é um serviço de astrologia psicológica digital. Neste documento, "AstroMap",
              "nós" ou "nosso" refere-se ao responsável pelo tratamento dos seus dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">2. Dados que coletamos</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Dados de cadastro:</strong> nome, endereço de email e senha (armazenada com
                hash seguro pelo Supabase).
              </li>
              <li>
                <strong>Dados astrológicos:</strong> data, hora e local de nascimento inseridos para
                geração do mapa natal.
              </li>
              <li>
                <strong>Dados de uso:</strong> páginas acessadas, funcionalidades utilizadas e
                duração das sessões — coletados de forma agregada e anonimizada para melhoria do
                serviço.
              </li>
              <li>
                <strong>Dados de humor:</strong> registros voluntários no diário de humor (escala
                1–10 e tags emocionais), usados exclusivamente para exibição pessoal.
              </li>
              <li>
                <strong>Dados técnicos:</strong> endereço IP e informações do dispositivo para
                segurança e prevenção de fraudes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">3. Finalidade do tratamento</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Tratamos seus dados para: (a) prestar o serviço de análise astrológica personalizada;
              (b) enviar interpretações geradas por inteligência artificial com base no seu mapa;
              (c) enviar digest de trânsitos por email, se você optar por esse recurso; (d) melhorar
              continuamente a qualidade e relevância do serviço; (e) cumprir obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">4. Uso de inteligência artificial</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              As interpretações geradas por IA utilizam dados astrológicos (posições planetárias,
              aspectos, casas) derivados das suas informações de nascimento. Esses dados são
              processados por modelos de linguagem (Anthropic Claude ou OpenAI GPT) via chamadas de
              servidor seguras. <strong>Nenhum dado pessoal identificável</strong> (nome, email,
              endereço) é enviado ao modelo de IA. Interpretações são armazenadas em cache para
              evitar chamadas repetidas e reduzir custos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">5. Compartilhamento de dados</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Seus dados <strong>não são vendidos</strong> a terceiros. Utilizamos os seguintes
              subprocessadores:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                <strong>Supabase</strong> — banco de dados, autenticação e armazenamento de arquivos
                (infraestrutura na AWS).
              </li>
              <li>
                <strong>Anthropic / OpenAI</strong> — processamento de interpretações por IA (apenas
                dados astrológicos numéricos).
              </li>
              <li>
                <strong>Resend</strong> — envio de emails transacionais e digest de trânsitos.
              </li>
              <li>
                <strong>Cloudflare</strong> — hospedagem e CDN do serviço.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">6. Segurança dos dados</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Seus dados são protegidos por Row Level Security (RLS) no banco de dados, garantindo
              que apenas você acesse seus próprios mapas, interpretações e registros. As comunicações
              são criptografadas via HTTPS/TLS. Senhas nunca são armazenadas em texto simples.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">7. Seus direitos (LGPD, Art. 18)</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              De acordo com a LGPD, você tem direito a:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Confirmar a existência de tratamento dos seus dados;</li>
              <li>Acessar seus dados pessoais;</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>Solicitar a exclusão dos seus dados (disponível em Configurações → Excluir conta);</li>
              <li>Revogar o consentimento a qualquer momento;</li>
              <li>Portabilidade dos dados (mediante solicitação por email).</li>
            </ul>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou tirar dúvidas, entre em contato pelo email:{" "}
              <strong>privacidade@astromap.app</strong>
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">8. Retenção dos dados</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, todos
              os dados associados (mapas, interpretações, registros de humor) são removidos em até 30
              dias. Logs técnicos podem ser mantidos por até 90 dias para fins de segurança.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">9. Cookies e rastreamento</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O AstroMap utiliza cookies de sessão estritamente necessários para autenticação. Não
              utilizamos cookies de publicidade ou rastreamento de terceiros.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">10. Alterações nesta política</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Esta política pode ser atualizada periodicamente. Alterações significativas serão
              comunicadas por email ou notificação no aplicativo com antecedência mínima de 15 dias.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-sm">
          <Link to="/terms" className="text-primary hover:underline">
            Termos de Uso
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-primary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
