import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | ManHQ",
  description: "Política de Privacidade da plataforma ManHQ.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-textMain">
            Política de Privacidade
          </h1>
          <p className="text-sm text-textDim">
            Última atualização: 17 de março de 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            1. Dados Coletados
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Podemos coletar dados de cadastro, informações de uso da plataforma,
            dados técnicos de navegação e registros de autenticação necessários
            para operação e segurança do serviço.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            2. Finalidade do Tratamento
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Utilizamos os dados para autenticar usuários, prestar
            funcionalidades do produto, aprimorar a experiência, prevenir
            fraudes, cumprir obrigações legais e oferecer suporte.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            3. Compartilhamento de Dados
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Dados podem ser compartilhados com fornecedores de infraestrutura e
            serviços essenciais ao funcionamento da plataforma, sempre
            observando medidas de segurança e conformidade legal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            4. Cookies e Sessão
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Utilizamos cookies e identificadores de sessão para manter
            autenticação, segurança e preferências básicas de navegação.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            5. Retenção e Segurança
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Mantemos dados pelo tempo necessário às finalidades descritas e
            adotamos medidas técnicas e organizacionais para proteção contra
            acessos não autorizados e incidentes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            6. Direitos do Titular
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Você pode solicitar acesso, correção, atualização ou exclusão de
            dados pessoais, conforme legislação aplicável, pelos canais oficiais
            de atendimento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            7. Atualizações desta Política
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Esta Política pode ser alterada para refletir melhorias do serviço
            ou mudanças legais. A versão vigente será sempre publicada nesta
            página.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">8. Contato</h2>
          <p className="text-sm leading-6 text-textDim">
            Em caso de dúvidas sobre privacidade e dados pessoais, entre em
            contato com o ManHQ por seus canais oficiais.
          </p>
        </section>
      </div>
    </main>
  );
}
