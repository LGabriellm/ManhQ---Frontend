"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { FeedbackState } from "@/components/FeedbackState";
import { useAuth } from "@/contexts/AuthContext";
import {
  SUBSCRIPTION_CHECKOUT_URL,
  getDefaultAuthenticatedPath,
} from "@/lib/subscription";

type RenewalPhase = "neutral" | "success" | "pending" | "cancelled" | "error";

function normalizePhaseValue(rawValue?: string | null): RenewalPhase {
  if (!rawValue) return "neutral";

  const value = rawValue.trim().toLowerCase();

  if (["approved", "success", "paid", "completed"].includes(value)) {
    return "success";
  }

  if (["pending", "processing", "waiting"].includes(value)) {
    return "pending";
  }

  if (["cancelled", "canceled", "abandoned"].includes(value)) {
    return "cancelled";
  }

  if (["failed", "error", "refused", "denied"].includes(value)) {
    return "error";
  }

  return "neutral";
}

function getRenewalCopy(phase: RenewalPhase) {
  switch (phase) {
    case "success":
      return {
        title: "Pagamento em análise final",
        description:
          "Se o pagamento foi aprovado, o backend libera o acesso assim que o webhook for confirmado. Você pode verificar o status abaixo sem ficar preso em uma tela de espera.",
        tone: "info" as const,
      };
    case "pending":
      return {
        title: "Renovação iniciada",
        description:
          "Seu pagamento ainda está em processamento. Quando a confirmação chegar, a assinatura será atualizada automaticamente.",
        tone: "warning" as const,
      };
    case "cancelled":
      return {
        title: "Renovação interrompida",
        description:
          "Você pode retomar a renovação agora mesmo ou voltar depois. Nenhum acesso novo será liberado até a confirmação do pagamento.",
        tone: "warning" as const,
      };
    case "error":
      return {
        title: "Não foi possível concluir a renovação",
        description:
          "Tente iniciar um novo checkout. Se o pagamento já foi feito, aguarde alguns instantes e verifique novamente o status da assinatura.",
        tone: "danger" as const,
      };
    case "neutral":
    default:
      return {
        title: "Renove sua assinatura",
        description:
          "Esta página serve como ponto estável para renovação e retorno do checkout. Abra um novo pagamento ou confira se o acesso já foi atualizado.",
        tone: "default" as const,
      };
  }
}

export default function RenewalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    accessGranted,
    defaultAuthenticatedPath,
    isAuthenticated,
    refreshUser,
    subscription,
  } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const phase = useMemo(() => {
    return normalizePhaseValue(
      searchParams.get("status") ||
        searchParams.get("result") ||
        searchParams.get("outcome") ||
        searchParams.get("paymentStatus") ||
        searchParams.get("checkoutStatus"),
    );
  }, [searchParams]);

  const email = searchParams.get("email");
  const subscriptionId = searchParams.get("subscriptionId");
  const message = searchParams.get("message") || searchParams.get("error");
  const copy = getRenewalCopy(phase);

  const verifyAccess = async () => {
    setIsRefreshing(true);

    try {
      const refreshedUser = await refreshUser();

      if (!refreshedUser) {
        router.replace("/auth/login");
        return;
      }

      router.replace(
        refreshedUser.subscription?.accessGranted
          ? getDefaultAuthenticatedPath(refreshedUser)
          : "/subscription",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="surface-panel rounded-[32px] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="section-kicker">Renovação</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-textMain sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-textDim sm:text-base">
                {copy.description}
              </p>

              {message ? (
                <div className="state-panel state-panel-info mt-5">
                  <p className="text-sm font-medium text-textMain">
                    Detalhe recebido
                  </p>
                  <p className="mt-2 text-sm leading-6">{message}</p>
                </div>
              ) : null}
            </div>

            <div className="surface-panel-muted rounded-[24px] p-5 lg:min-w-[18rem]">
              <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
                Status atual
              </p>
              <p className="mt-3 text-lg font-semibold text-textMain">
                {accessGranted ? "Acesso já liberado" : "Aguardando atualização"}
              </p>
              <p className="mt-2 text-sm leading-6 text-textDim">
                {accessGranted
                  ? "Sua assinatura já está ativa. Você pode voltar direto para a leitura."
                  : "Se o pagamento já aconteceu, use o botão abaixo para verificar novamente sem reiniciar todo o fluxo."}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-panel rounded-[30px] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Próximos passos</p>
                <h2 className="mt-2 text-xl font-semibold text-textMain">
                  O que acontece depois do pagamento
                </h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-sm font-semibold text-textMain">
                  Se você já tinha conta
                </p>
                <p className="mt-1 text-sm leading-6 text-textDim">
                  O acesso volta automaticamente assim que a confirmação for
                  processada. Depois disso, você pode continuar normalmente.
                </p>
              </div>

              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-sm font-semibold text-textMain">
                  Se esta é sua primeira compra
                </p>
                <p className="mt-1 text-sm leading-6 text-textDim">
                  Você recebe um email com link único para definir senha,
                  escolher username e concluir a ativação da conta.
                </p>
              </div>

              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-sm font-semibold text-textMain">
                  Se algo falhar
                </p>
                <p className="mt-1 text-sm leading-6 text-textDim">
                  Você pode reabrir esta página, iniciar um novo checkout ou
                  verificar novamente o status sem perder o contexto do fluxo.
                </p>
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-[30px] p-5 sm:p-6">
            <p className="section-kicker">Ações</p>
            <h2 className="mt-2 text-xl font-semibold text-textMain">
              Escolha a próxima ação
            </h2>

            <div className="mt-5 flex flex-col gap-3">
              <a
                href={SUBSCRIPTION_CHECKOUT_URL}
                target="_blank"
                rel="noreferrer"
                className="ui-btn-primary px-5 py-3 text-sm font-semibold"
              >
                <CreditCard className="h-4 w-4" />
                Abrir novo checkout
              </a>

              <button
                type="button"
                onClick={() => void verifyAccess()}
                disabled={isRefreshing}
                className="ui-btn-secondary px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Verificar status agora
                  </>
                )}
              </button>

              {isAuthenticated ? (
                <Link
                  href={accessGranted ? defaultAuthenticatedPath : "/subscription"}
                  className="ui-btn-ghost px-5 py-3 text-sm font-semibold"
                >
                  {accessGranted ? "Voltar para a leitura" : "Abrir minha assinatura"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="ui-btn-ghost px-5 py-3 text-sm font-semibold"
                >
                  Já tenho conta
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
                  Email
                </p>
                <p className="mt-2 text-sm font-medium text-textMain">
                  {email || subscription?.user?.email || "Não informado"}
                </p>
              </div>

              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
                  Referência
                </p>
                <p className="mt-2 text-sm font-medium text-textMain">
                  {subscriptionId || subscription?.id || "Sem referência"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {phase === "success" ? (
          <FeedbackState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title="Pagamento recebido"
            description="Se a atualização ainda não apareceu na conta, aguarde alguns instantes e use o botão de verificar status. O acesso não depende de manter esta página aberta."
            tone="info"
          />
        ) : phase === "error" ? (
          <FeedbackState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Renovação ainda não confirmada"
            description="Abra um novo checkout ou faça login para conferir se a assinatura já mudou de estado."
            tone="danger"
          />
        ) : null}
      </div>
    </main>
  );
}
