import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Serviço | ManHQ",
  description: "Termos de Serviço da plataforma ManHQ.",
};

const TERMS_SECTIONS = [
  {
    title: "1. Aceitação dos termos",
    body: "Ao acessar e utilizar o ManHQ, você concorda com estes Termos de Serviço. Caso não concorde, interrompa o uso da plataforma.",
  },
  {
    title: "2. Uso da plataforma",
    body: "Você se compromete a utilizar o serviço de forma lícita, sem violar direitos de terceiros, sem tentar acessar áreas restritas e sem comprometer a segurança do sistema.",
  },
  {
    title: "3. Conta de usuário",
    body: "Você é responsável pela confidencialidade das credenciais da sua conta e por todas as atividades realizadas sob sua autenticação.",
  },
  {
    title: "4. Propriedade intelectual",
    body: "Marcas, logotipos, interface e demais elementos do ManHQ são protegidos por legislação aplicável. É vedada a reprodução não autorizada.",
  },
  {
    title: "5. Suspensão e encerramento",
    body: "Podemos suspender ou encerrar contas em caso de violação destes termos, fraude, abuso da plataforma ou por exigência legal.",
  },
  {
    title: "6. Limitação de responsabilidade",
    body: "O serviço é fornecido na forma em que se encontra. Não garantimos disponibilidade ininterrupta e não nos responsabilizamos por danos indiretos decorrentes do uso da plataforma.",
  },
  {
    title: "7. Alterações dos termos",
    body: "Estes termos podem ser atualizados periodicamente. A versão mais recente estará sempre disponível nesta página.",
  },
  {
    title: "8. Contato",
    body: "Para dúvidas sobre estes Termos de Serviço, entre em contato pelos canais oficiais do ManHQ.",
  },
] as const;

const TERMS_LAST_UPDATED = "2026-03-17";

export default function TermsOfServicePage() {
  return (
    <main id="top" className="page-shell space-y-6">
      <header className="page-header">
        <div>
          <p className="section-kicker">Institucional</p>
          <h1 className="section-title">Termos de Serviço</h1>
          <p className="section-description max-w-3xl">
            Regras públicas de uso da plataforma, limites operacionais e
            responsabilidades relacionadas ao acesso ao ManHQ.
          </p>
        </div>

        <time
          dateTime={TERMS_LAST_UPDATED}
          className="surface-panel-muted rounded-[24px] px-4 py-3 text-sm text-textDim"
        >
          Última atualização: 17 de março de 2026
        </time>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1fr]">
        <nav
          aria-label="Navegação dos termos de serviço"
          className="surface-panel rounded-[30px] p-5 sm:p-6"
        >
          <p className="section-kicker">Atalhos</p>
          <h2 className="mt-2 text-xl font-semibold text-textMain">
            Navegação rápida
          </h2>

          <div className="mt-5 space-y-3">
            <Link
              href="/politica-de-privacidade"
              className="surface-panel-muted block rounded-[22px] p-4 text-sm text-textDim transition-colors hover:bg-white/6 hover:text-textMain"
            >
              Ler a Política de Privacidade
            </Link>
            <Link
              href="/subscription"
              className="surface-panel-muted block rounded-[22px] p-4 text-sm text-textDim transition-colors hover:bg-white/6 hover:text-textMain"
            >
              Ver central da assinatura
            </Link>
            <Link
              href="/auth/login"
              className="surface-panel-muted block rounded-[22px] p-4 text-sm text-textDim transition-colors hover:bg-white/6 hover:text-textMain"
            >
              Entrar na conta
            </Link>

            <div className="surface-panel-muted rounded-[22px] p-4">
              <p className="text-sm font-semibold text-textMain">
                Ir direto para uma seção
              </p>
              <div className="mt-3 space-y-2">
                {TERMS_SECTIONS.map((section, index) => {
                  const sectionId = `terms-section-${index + 1}`;
                  return (
                    <a
                      key={section.title}
                      href={`#${sectionId}`}
                      className="block text-sm text-textDim transition-colors hover:text-textMain"
                    >
                      {section.title}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        <article
          aria-labelledby="terms-of-service-title"
          className="surface-panel rounded-[30px] p-5 sm:p-6"
        >
          <p className="section-kicker">Documento</p>
          <h2 id="terms-of-service-title" className="sr-only">
            Conteúdo completo dos Termos de Serviço
          </h2>
          <div className="mt-5 space-y-5">
            {TERMS_SECTIONS.map((section, index) => (
              <section
                key={section.title}
                id={`terms-section-${index + 1}`}
                className="surface-panel-muted rounded-[24px] p-5"
              >
                <h2 className="text-lg font-semibold text-textMain">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-textDim">
                  {section.body}
                </p>
                <a
                  href="#top"
                  className="mt-4 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Voltar ao topo
                </a>
              </section>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
