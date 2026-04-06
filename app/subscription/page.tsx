"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Ban,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { FeedbackState } from "@/components/FeedbackState";
import { SubscriptionAlertBanner } from "@/components/subscription/SubscriptionAlertBanner";
import { SubscriptionStateBadge } from "@/components/subscription/SubscriptionStateBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useCancelMySubscription, useSubscription } from "@/hooks/useSubscription";
import {
  EMPTY_SUBSCRIPTION,
  SUBSCRIPTION_CHECKOUT_URL,
  formatSubscriptionDate,
  formatSubscriptionDateTime,
  getRenewalHref,
  getSubscriptionStateLabel,
  getSubscriptionStateMeta,
  getSubscriptionStatusLabel,
  isExternalHref,
} from "@/lib/subscription";

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="surface-panel-muted rounded-[22px] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-textMain">{value}</p>
    </div>
  );
}

function getSubscriptionErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message =
      typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : undefined;

    if (message) {
      return message;
    }

    if (error.response?.status === 504) {
      return "O servidor demorou para responder. Tente novamente em instantes.";
    }
  }

  return error instanceof Error ? error.message : fallback;
}

export default function SubscriptionPage() {
  const {
    accessGranted,
    defaultAuthenticatedPath,
    refreshUser,
    subscription: sessionSubscription,
    user,
  } = useAuth();
  const {
    data,
    error,
    isLoading,
    refetch: refetchSubscription,
  } = useSubscription();
  const cancelSubscription = useCancelMySubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<{
    tone: "info" | "warning" | "danger";
    message: string;
  } | null>(null);
  const cancelDialogTitleId = useId();
  const cancelDialogDescriptionId = useId();
  const cancelReasonRef = useRef<HTMLTextAreaElement | null>(null);

  const subscription = useMemo(
    () => data?.subscription ?? sessionSubscription ?? EMPTY_SUBSCRIPTION,
    [data?.subscription, sessionSubscription],
  );

  const subscriptionMeta = getSubscriptionStateMeta(subscription);
  const renewalHref =
    subscription.state === "inactive"
      ? SUBSCRIPTION_CHECKOUT_URL
      : getRenewalHref(subscription);
  const renewalHrefIsExternal = isExternalHref(renewalHref);
  const canRenew =
    subscription.state === "inactive" || Boolean(subscription.actions.canRenew);
  const cancellationRequested =
    subscription.status === "CANCELLATION_REQUESTED" ||
    subscription.cancelAtPeriodEnd;
  const canCancel =
    Boolean(subscription.actions.canCancel) &&
    subscription.state !== "inactive" &&
    !cancellationRequested;
  const cancelReasonLength = cancelReason.trim().length;

  useEffect(() => {
    if (!showCancelDialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelReasonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cancelSubscription.isPending) {
        setShowCancelDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancelSubscription.isPending, showCancelDialog]);

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    setRefreshFeedback(null);

    try {
      const [subscriptionResult, refreshedUser] = await Promise.all([
        refetchSubscription(),
        refreshUser(),
      ]);

      if (subscriptionResult.error) {
        const message = getSubscriptionErrorMessage(
          subscriptionResult.error,
          "Não foi possível atualizar o status da assinatura agora.",
        );
        setRefreshFeedback({ tone: "warning", message });
        toast.error(message);
        return;
      }

      const message = refreshedUser
        ? "Status da assinatura atualizado."
        : "Verificação concluída. Faça login novamente se o acesso não aparecer.";

      setRefreshFeedback({
        tone: refreshedUser ? "info" : "warning",
        message,
      });
      toast.success(message);
    } catch (error) {
      const message = getSubscriptionErrorMessage(
        error,
        "Não foi possível atualizar o status da assinatura agora.",
      );
      setRefreshFeedback({ tone: "danger", message });
      toast.error(message);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const submitCancellation = async () => {
    try {
      const result = await cancelSubscription.mutateAsync({
        reason: cancelReason.trim() || undefined,
        immediate: cancelImmediately,
      });

      await refreshUser();
      await refetchSubscription();

      toast.success(result.message);
      setShowCancelDialog(false);
      setCancelReason("");
      setCancelImmediately(false);
    } catch (error) {
      toast.error(
        getSubscriptionErrorMessage(
          error,
          "Não foi possível registrar o cancelamento agora.",
        ),
      );
    }
  };

  if (isLoading && !data && !sessionSubscription) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Carregando assinatura"
          description="Estamos verificando o status mais recente da sua assinatura."
          tone="info"
        />
      </main>
    );
  }

  if (error && !data && !sessionSubscription) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Não foi possível carregar sua assinatura"
          description="Verifique a conexão ou tente atualizar novamente."
          tone="danger"
          actionLabel="Tentar novamente"
          onAction={() => {
            void refetchSubscription();
          }}
        />
      </main>
    );
  }

  return (
    <main className="page-shell space-y-6">
      <header className="page-header">
        <div>
          <p className="section-kicker">Assinatura</p>
          <h1 className="section-title">Central da assinatura</h1>
          <p className="section-description">
            Acompanhe o status do acesso, renove quando necessário e gerencie
            cancelamentos sem sair da sua conta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefreshStatus()}
          disabled={isRefreshingStatus}
          className="ui-btn-secondary px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshingStatus ? "animate-spin" : ""}`}
          />
          {isRefreshingStatus ? "Atualizando" : "Atualizar status"}
        </button>
      </header>

      {refreshFeedback ? (
        <section
          className={`state-panel ${
            refreshFeedback.tone === "danger"
              ? "state-panel-danger"
              : refreshFeedback.tone === "warning"
                ? "state-panel-warning"
                : "state-panel-info"
          }`}
          role={refreshFeedback.tone === "danger" ? "alert" : "status"}
          aria-live="polite"
        >
          <p className="text-sm font-medium">{refreshFeedback.message}</p>
        </section>
      ) : null}

      <section className="surface-panel rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <SubscriptionStateBadge state={subscription.state} />
              {subscription.status ? (
                <span className="badge-soft text-textMain">
                  Status backend: {getSubscriptionStatusLabel(subscription.status)}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-textMain sm:text-3xl">
              {subscriptionMeta.title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-textDim sm:text-base">
              {subscriptionMeta.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-textDim">
              <span className="badge-soft text-textMain">
                Plano: {subscription.plan ?? "premium"}
              </span>
              <span className="badge-soft text-textMain">
                Pagamento: {subscription.paymentMethod ?? "Não informado"}
              </span>
              <span className="badge-soft text-textMain">
                {subscription.isRecurring ? "Recorrente" : "Renovação manual"}
              </span>
            </div>
          </div>

          <div className="surface-panel-muted min-w-[16rem] rounded-[24px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
              Situação da conta
            </p>
            <p className="mt-3 text-lg font-semibold text-textMain">
              {accessGranted ? "Acesso liberado" : "Acesso restrito"}
            </p>
            <p className="mt-2 text-sm leading-6 text-textDim">
              {accessGranted
                ? "Sua biblioteca e a leitura continuam disponíveis normalmente."
                : "Você ainda pode acessar conta, sessões e esta central para regularizar a assinatura."}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={accessGranted ? defaultAuthenticatedPath : "/profile/edit"}
                className="ui-btn-primary px-4 py-3 text-sm font-semibold"
              >
                <ShieldCheck className="h-4 w-4" />
                {accessGranted ? "Voltar para a leitura" : "Ajustar minha conta"}
              </Link>

              <Link
                href="/profile"
                className="ui-btn-secondary px-4 py-3 text-sm font-semibold"
              >
                Ver perfil e sessões
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SubscriptionAlertBanner subscription={subscription} />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-panel rounded-[30px] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Resumo</p>
              <h2 className="mt-2 text-xl font-semibold text-textMain">
                Datas e sinais importantes
              </h2>
            </div>
            <CreditCard className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailItem
              label="Próximo vencimento"
              value={formatSubscriptionDate(subscription.currentPeriodEnd)}
            />
            <DetailItem
              label="Última confirmação"
              value={formatSubscriptionDate(subscription.lastPaymentConfirmedAt)}
            />
            <DetailItem
              label="Setup concluído"
              value={formatSubscriptionDate(subscription.setupCompletedAt)}
            />
            <DetailItem
              label="Cancelamento efetivo"
              value={formatSubscriptionDate(
                subscription.cancellationEffectiveAt || subscription.canceledAt,
              )}
            />
          </div>

          {subscription.cancelReason ? (
            <div className="state-panel state-panel-info mt-5">
              <p className="text-sm font-semibold text-textMain">
                Motivo registrado
              </p>
              <p className="mt-2 text-sm leading-6">{subscription.cancelReason}</p>
            </div>
          ) : null}
        </div>

        <div className="surface-panel rounded-[30px] p-5 sm:p-6">
          <p className="section-kicker">Ações</p>
          <h2 className="mt-2 text-xl font-semibold text-textMain">
            O que você pode fazer agora
          </h2>

          <div className="mt-5 space-y-3">
            {canRenew ? (
              renewalHrefIsExternal ? (
                <a
                  href={renewalHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${
                    subscription.state === "inactive"
                      ? "Assinar agora"
                      : "Renovar assinatura"
                  } em uma nova aba`}
                  className="surface-panel-muted block rounded-[24px] p-4 transition-colors hover:bg-white/6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-textMain">
                        {subscription.state === "inactive"
                          ? "Assinar agora"
                          : "Renovar assinatura"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-textDim">
                        {subscription.state === "inactive"
                          ? "Abrir um novo checkout para liberar o acesso da conta."
                          : "Use o link de renovação para evitar ou corrigir a interrupção do acesso."}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-textDim" />
                  </div>
                </a>
              ) : (
                <Link
                  href={renewalHref}
                  className="surface-panel-muted block rounded-[24px] p-4 transition-colors hover:bg-white/6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-textMain">
                        {subscription.state === "inactive"
                          ? "Assinar agora"
                          : "Renovar assinatura"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-textDim">
                        {subscription.state === "inactive"
                          ? "Abrir um novo checkout para liberar o acesso da conta."
                          : "Use o link de renovação para evitar ou corrigir a interrupção do acesso."}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-textDim" />
                  </div>
                </Link>
              )
            ) : null}

            {canCancel ? (
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                className="surface-panel-muted w-full rounded-[24px] p-4 text-left transition-colors hover:bg-white/6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-textMain">
                      Cancelar assinatura
                    </p>
                    <p className="mt-1 text-sm leading-6 text-textDim">
                      Prefira cancelar no fim do período para manter o acesso
                      até a data já paga.
                    </p>
                  </div>
                  <Ban className="h-4 w-4 text-rose-300" />
                </div>
              </button>
            ) : cancellationRequested ? (
              <div className="state-panel state-panel-warning">
                <p className="text-sm font-semibold text-textMain">
                  Cancelamento já registrado
                </p>
                <p className="mt-2 text-sm leading-6">
                  O encerramento está agendado para{" "}
                  {formatSubscriptionDate(
                    subscription.cancellationEffectiveAt ||
                      subscription.currentPeriodEnd,
                  )}
                  .
                </p>
              </div>
            ) : null}

            {subscription.state === "refunded" ? (
              <div className="state-panel state-panel-danger">
                <p className="text-sm font-semibold text-textMain">
                  Precisa de ajuda?
                </p>
                <p className="mt-2 text-sm leading-6">
                  Como houve reembolso, a melhor opção é falar com o suporte se
                  você acredita que isso aconteceu por engano.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[30px] p-5 sm:p-6">
        <p className="section-kicker">Histórico atual</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem
            label="Estado frontend"
            value={getSubscriptionStateLabel(subscription.state)}
          />
          <DetailItem
            label="Início do ciclo"
            value={formatSubscriptionDateTime(subscription.startsAt)}
          />
          <DetailItem
            label="Renovação sugerida"
            value={
              subscription.reminder?.nextReminderWindowDays
                ? `${subscription.reminder.nextReminderWindowDays} dia(s)`
                : "Sem lembrete pendente"
            }
          />
          <DetailItem
            label="Titular"
            value={user?.email || subscription.buyerEmail || "Não informado"}
          />
        </div>
      </section>

      {showCancelDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={cancelDialogTitleId}
            aria-describedby={cancelDialogDescriptionId}
            className="surface-panel w-full max-w-xl rounded-[28px] p-6 sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Cancelar</p>
                <h2
                  id={cancelDialogTitleId}
                  className="mt-2 text-xl font-semibold text-textMain"
                >
                  Como deseja encerrar a assinatura?
                </h2>
                <p
                  id={cancelDialogDescriptionId}
                  className="mt-2 text-sm leading-6 text-textDim"
                >
                  Você pode manter o acesso até o fim do período atual ou
                  encerrar tudo imediatamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="ui-btn-ghost px-3 py-2 text-sm"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <label className="surface-panel-muted flex cursor-pointer items-start gap-3 rounded-[22px] p-4">
                <input
                  type="radio"
                  name="cancelMode"
                  checked={!cancelImmediately}
                  onChange={() => setCancelImmediately(false)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-textMain">
                    Cancelar no fim do período atual
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-textDim">
                    Recomendado quando você ainda tem acesso pago até{" "}
                    {formatSubscriptionDate(subscription.currentPeriodEnd)}.
                  </span>
                </span>
              </label>

              <label className="surface-panel-muted flex cursor-pointer items-start gap-3 rounded-[22px] p-4">
                <input
                  type="radio"
                  name="cancelMode"
                  checked={cancelImmediately}
                  onChange={() => setCancelImmediately(true)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-textMain">
                    Encerrar acesso imediatamente
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-textDim">
                    Use apenas se você realmente quer interromper o acesso agora.
                  </span>
                </span>
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-textMain">
                Motivo do cancelamento
              </span>
              <textarea
                ref={cancelReasonRef}
                id="subscription-cancel-reason"
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Opcional, mas útil para melhorarmos a experiência."
                maxLength={500}
                className="field-textarea min-h-28 rounded-[22px] px-4 py-3 text-sm"
              />
              <p className="mt-2 text-xs text-textDim" aria-live="polite">
                {cancelReasonLength}/500 caracteres
              </p>
            </label>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="ui-btn-ghost px-4 py-3 text-sm font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void submitCancellation()}
                disabled={cancelSubscription.isPending}
                aria-busy={cancelSubscription.isPending}
                className="ui-btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {cancelSubscription.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando
                  </>
                ) : (
                  <>
                    <BadgeCheck className="h-4 w-4" />
                    Confirmar cancelamento
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
