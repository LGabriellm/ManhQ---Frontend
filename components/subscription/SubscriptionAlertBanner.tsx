"use client";

import { AlertTriangle, Ban, Clock3, CreditCard, XCircle } from "lucide-react";
import {
  formatSubscriptionDate,
  getRenewalHref,
  isExternalHref,
} from "@/lib/subscription";
import type { SubscriptionView } from "@/types/api";

interface SubscriptionAlertBannerProps {
  subscription?: SubscriptionView | null;
  className?: string;
}

function RenewalLink({
  subscription,
  label,
}: {
  subscription: SubscriptionView;
  label: string;
}) {
  const renewalHref = getRenewalHref(subscription);
  const external = isExternalHref(renewalHref);

  return (
    <a
      href={renewalHref}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="ui-btn-secondary shrink-0 px-4 py-2.5 text-sm font-semibold"
    >
      {label}
    </a>
  );
}

export function SubscriptionAlertBanner({
  subscription,
  className,
}: SubscriptionAlertBannerProps) {
  if (!subscription) return null;

  const base = `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`;

  // Cancellation requested — access still active until period end
  if (subscription.status === "CANCELLATION_REQUESTED") {
    return (
      <section className={`state-panel state-panel-info ${base}`}>
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-textMain)]">
              Cancelamento agendado
            </p>
            <p className="mt-1 text-sm leading-6">
              Seu acesso segue disponível até{" "}
              {formatSubscriptionDate(
                subscription.cancellationEffectiveAt ||
                  subscription.currentPeriodEnd,
              )}
              .
            </p>
          </div>
        </div>

        {subscription.actions.canRenew ? (
          <RenewalLink subscription={subscription} label="Renovar assinatura" />
        ) : null}
      </section>
    );
  }

  // Nearing expiration — PIX subscription about to expire
  if (subscription.state === "nearing_expiration") {
    return (
      <section className={`state-panel state-panel-warning ${base}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-textMain)]">
              Sua assinatura está perto do vencimento
            </p>
            <p className="mt-1 text-sm leading-6">
              Renove antes de{" "}
              {formatSubscriptionDate(subscription.currentPeriodEnd)} para evitar
              interrupções no acesso.
            </p>
          </div>
        </div>

        <RenewalLink subscription={subscription} label="Renovar agora" />
      </section>
    );
  }

  // Renewal pending — non-recurring PIX expired, awaiting manual renewal
  if (subscription.state === "renewal_pending") {
    return (
      <section className={`state-panel state-panel-danger ${base}`}>
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-textMain)]">
              Renovação necessária
            </p>
            <p className="mt-1 text-sm leading-6">
              Seu período pago terminou. Renove a assinatura para recuperar o
              acesso à leitura.
            </p>
          </div>
        </div>

        <RenewalLink subscription={subscription} label="Renovar assinatura" />
      </section>
    );
  }

  // Past due — payment failed
  if (subscription.state === "past_due") {
    return (
      <section className={`state-panel state-panel-danger ${base}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-textMain)]">
              Pagamento pendente
            </p>
            <p className="mt-1 text-sm leading-6">
              Houve um problema com a cobrança recorrente. Regularize o pagamento
              para restaurar o acesso.
            </p>
          </div>
        </div>

        {subscription.actions.canRenew ? (
          <RenewalLink subscription={subscription} label="Regularizar pagamento" />
        ) : null}
      </section>
    );
  }

  // Expired — subscription period ended without renewal
  if (subscription.state === "expired") {
    return (
      <section className={`state-panel state-panel-danger ${base}`}>
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-textMain)]">
              Assinatura expirada
            </p>
            <p className="mt-1 text-sm leading-6">
              O período pago terminou sem renovação. Renove para recuperar o
              acesso premium.
            </p>
          </div>
        </div>

        <RenewalLink subscription={subscription} label="Renovar agora" />
      </section>
    );
  }

  // Cancelled with access still active — grace period
  if (subscription.state === "cancelled" && subscription.accessGranted) {
    return (
      <section className={`state-panel state-panel-warning ${base}`}>
        <div className="flex items-start gap-3">
          <Ban className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--color-textMain)]">
              Assinatura cancelada
            </p>
            <p className="mt-1 text-sm leading-6">
              Seu acesso continua disponível até{" "}
              {formatSubscriptionDate(subscription.currentPeriodEnd)}. Depois
              disso, será necessário assinar novamente.
            </p>
          </div>
        </div>

        {subscription.actions.canRenew ? (
          <RenewalLink subscription={subscription} label="Assinar novamente" />
        ) : null}
      </section>
    );
  }

  return null;
}
