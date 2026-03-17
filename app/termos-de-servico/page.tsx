import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Serviço | ManHQ",
  description: "Termos de Serviço da plataforma ManHQ.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-textMain">
            Termos de Serviço
          </h1>
          <p className="text-sm text-textDim">
            Última atualização: 17 de março de 2026
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            1. Aceitação dos Termos
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Ao acessar e utilizar o ManHQ, você concorda com estes Termos de
            Serviço. Caso não concorde, interrompa o uso da plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            2. Uso da Plataforma
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Você se compromete a utilizar o serviço de forma lícita, sem violar
            direitos de terceiros, sem tentar acessar áreas restritas e sem
            comprometer a segurança do sistema.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            3. Conta de Usuário
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Você é responsável pela confidencialidade das credenciais da sua
            conta e por todas as atividades realizadas sob sua autenticação.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            4. Propriedade Intelectual
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Marcas, logotipos, interface e demais elementos do ManHQ são
            protegidos por legislação aplicável. É vedada a reprodução não
            autorizada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            5. Suspensão e Encerramento
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Podemos suspender ou encerrar contas em caso de violação destes
            termos, fraude, abuso da plataforma ou por exigência legal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            6. Limitação de Responsabilidade
          </h2>
          <p className="text-sm leading-6 text-textDim">
            O serviço é fornecido na forma em que se encontra. Não garantimos
            disponibilidade ininterrupta e não nos responsabilizamos por danos
            indiretos decorrentes do uso da plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">
            7. Alterações dos Termos
          </h2>
          <p className="text-sm leading-6 text-textDim">
            Estes termos podem ser atualizados periodicamente. A versão mais
            recente estará sempre disponível nesta página.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-textMain">8. Contato</h2>
          <p className="text-sm leading-6 text-textDim">
            Para dúvidas sobre estes Termos de Serviço, entre em contato pelos
            canais oficiais do ManHQ.
          </p>
        </section>
      </div>
    </main>
  );
}
