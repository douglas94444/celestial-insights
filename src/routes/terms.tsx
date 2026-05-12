import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — AstroMap" },
      { name: "description", content: "Termos e condições de uso do AstroMap." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="mb-8 inline-block text-sm text-muted-foreground hover:text-primary">
          ← Voltar ao início
        </Link>
        <h1 className="font-display text-4xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: maio de 2026</p>

        <div className="prose prose-sm dark:prose-invert mt-10 space-y-8 max-w-none">
          <section>
            <h2 className="font-display text-xl font-semibold">1. Aceitação dos termos</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Ao criar uma conta ou utilizar o AstroMap, você concorda com estes Termos de Uso e com
              nossa{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              . Se não concordar, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">2. Descrição do serviço</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O AstroMap oferece análise de mapas astrológicos, interpretações geradas por
              inteligência artificial, acompanhamento de trânsitos planetários e ferramentas de
              autoconhecimento. O serviço é fornecido "como está" e destina-se exclusivamente a fins
              de entretenimento e autoconhecimento pessoal.
            </p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              <strong>Importante:</strong> Astrologia é uma prática simbólica e filosófica. O
              AstroMap não fornece aconselhamento médico, psicológico, financeiro ou jurídico. As
              interpretações não devem substituir orientação profissional qualificada.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">3. Elegibilidade</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Você deve ter pelo menos 16 anos para criar uma conta. Ao se registrar, declara que
              tem a idade mínima exigida.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">4. Sua conta</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Você é responsável por manter a confidencialidade das credenciais de acesso e por
              todas as atividades realizadas na sua conta. Notifique-nos imediatamente em caso de
              acesso não autorizado. É proibido compartilhar credenciais de acesso.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">5. Planos e pagamentos</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O AstroMap oferece assinatura nos planos Mensal e Anual, com o mesmo conjunto de
              recursos; os valores vigentes estão na página pública de planos e na área autenticada.
              O checkout de pagamentos está ativo: as cobranças ocorrem apenas após confirmação
              explícita no fluxo de pagamento (Pix e/ou cartão via provedores indicados na
              interface), nos termos exibidos no momento da compra.
            </p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              As assinaturas pagas poderão ser canceladas conforme as regras exibidas no checkout.
              Não há reembolso para períodos parciais já pagos, exceto quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">6. Conteúdo gerado por IA</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              As interpretações e textos gerados por inteligência artificial são produzidos
              automaticamente com base em dados astrológicos e não representam a opinião do
              AstroMap. Podem conter imprecisões. O usuário é responsável por como interpreta e
              aplica esse conteúdo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">7. Uso aceitável</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">É proibido:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Usar o serviço para fins ilegais ou prejudiciais a terceiros;</li>
              <li>Tentar burlar limitações de uso, cotas ou planos;</li>
              <li>Automatizar requisições de forma abusiva (scraping, bots);</li>
              <li>Inserir dados falsos para contornar restrições;</li>
              <li>Tentar acessar dados de outros usuários.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">8. Propriedade intelectual</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Todo o conteúdo do serviço (código, design, marca, textos não gerados por IA) é
              propriedade do AstroMap e protegido por direitos autorais. As interpretações geradas
              pela IA com base nos seus dados são de uso pessoal do usuário.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">9. Disponibilidade e limitações</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O AstroMap não garante disponibilidade ininterrupta do serviço. Podemos realizar
              manutenções, atualizações ou suspender temporariamente o acesso sem aviso prévio. Não
              somos responsáveis por perdas decorrentes de indisponibilidade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">10. Encerramento de conta</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Você pode encerrar sua conta a qualquer momento em Configurações → Excluir conta. Nos
              reservamos o direito de suspender contas que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">
              11. Limitação de responsabilidade
            </h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              O AstroMap não se responsabiliza por decisões tomadas com base nas interpretações
              astrológicas, por danos indiretos, perda de dados ou lucros cessantes. A
              responsabilidade total do AstroMap fica limitada ao valor pago pelo usuário nos
              últimos 3 meses.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">12. Legislação aplicável</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de
              São Paulo/SP para dirimir eventuais disputas.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">13. Contato</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Dúvidas sobre estes termos: <strong>contato@astromap.app</strong>
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-sm">
          <Link to="/privacy" className="text-primary hover:underline">
            Política de Privacidade
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-primary">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
