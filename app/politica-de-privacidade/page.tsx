import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | ManHQ",
  description: "Política de Privacidade da plataforma ManHQ.",
};

const PRIVACY_SECTIONS = [
  {
    title: "1. Dados coletados",
    body: "Podemos coletar dados de cadastro, informações de uso da plataforma, dados técnicos de navegação e registros de autenticação necessários para operação e segurança do serviço.",
  },
  {
    title: "2. Finalidade do tratamento",
    body: "Utilizamos os dados para autenticar usuários, prestar funcionalidades do produto, aprimorar a experiência, prevenir fraudes, cumprir obrigações legais e oferecer suporte.",
  },
  {
    title: "3. Compartilhamento de dados",
    body: "Dados podem ser compartilhados com fornecedores de infraestrutura e serviços essenciais ao funcionamento da plataforma, sempre observando medidas de segurança e conformidade legal.",
  },
  {
    title: "4. Cookies e sessão",
    body: "Utilizamos cookies e identificadores de sessão para manter autenticação, segurança e preferências básicas de navegação.",
  },
  {
    title: "5. Retenção e segurança",
    body: "Mantemos dados pelo tempo necessário às finalidades descritas e adotamos medidas técnicas e organizacionais para proteção contra acessos não autorizados e incidentes.",
  },
  {
    title: "6. Direitos do titular",
    body: "Você pode solicitar acesso, correção, atualização ou exclusão de dados pessoais, conforme legislação aplicável, pelos canais oficiais de atendimento.",
  },
  {
    title: "7. Atualizações desta política",
    body: "Esta Política pode ser alterada para refletir melhorias do serviço ou mudanças legais. A versão vigente será sempre publicada nesta página.",
  },
  {
    title: "8. Contato",
    body: "Em caso de dúvidas sobre privacidade e dados pessoais, entre em contato com o ManHQ por seus canais oficiais.",
  },
] as const;

const PRIVACY_LAST_UPDATED = "2026-03-17";

export default function PrivacyPolicyPage() {
  return (
    <main id="top" className="page-shell space-y-6">
      <header className="page-header">
        <div>
          <p className="section-kicker">Institucional</p>
          <h1 className="section-title">Política de Privacidade</h1>
          <p className="section-description max-w-3xl">
            Transparência sobre dados, autenticação, segurança e uso da
            plataforma. Esta página concentra a versão pública vigente da
            política do ManHQ.
          </p>
        </div>

        <time
          dateTime={PRIVACY_LAST_UPDATED}
          className="surface-panel-muted rounded-[24px] px-4 py-3 text-sm text-textDim"
        >
          Última atualização: 17 de março de 2026
        </time>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1fr]">
        <nav
          aria-label="Navegação da política de privacidade"
          className="surface-panel rounded-[30px] p-5 sm:p-6"
        >
          <p className="section-kicker">Atalhos</p>
          <h2 className="mt-2 text-xl font-semibold text-textMain">
            Links úteis
          </h2>

          <div className="mt-5 space-y-3">
            <Link
              href="/termos-de-servico"
              className="surface-panel-muted block rounded-[22px] p-4 text-sm text-textDim transition-colors hover:bg-white/6 hover:text-textMain"
            >
              Ler os Termos de Serviço
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
                {PRIVACY_SECTIONS.map((section, index) => {
                  const sectionId = `privacy-section-${index + 1}`;
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
          aria-labelledby="privacy-policy-title"
          className="surface-panel rounded-[30px] p-5 sm:p-6"
        >
          <p className="section-kicker">Documento</p>
          <h2
            id="privacy-policy-title"
            className="sr-only"
          >
            Conteúdo completo da Política de Privacidade
          </h2>
          <div className="mt-5 space-y-5">
            {PRIVACY_SECTIONS.map((section, index) => (
              <section
                key={section.title}
                id={`privacy-section-${index + 1}`}
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
