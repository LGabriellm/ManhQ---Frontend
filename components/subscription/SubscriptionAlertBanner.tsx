"use client";

import { AlertTriangle, Clock3 } from "lucide-react";
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

export function SubscriptionAlertBanner({
  subscription,
  className,
}: SubscriptionAlertBannerProps) {
  if (!subscription) return null;

  if (subscription.status === "CANCELLATION_REQUESTED") {
    return (
      <section
        className={`state-panel state-panel-info flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
      >
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

        {subscription.renewalUrl ? (
          <a
            href={subscription.renewalUrl}
            target={isExternalHref(subscription.renewalUrl) ? "_blank" : undefined}
            rel={isExternalHref(subscription.renewalUrl) ? "noreferrer" : undefined}
            className="ui-btn-secondary px-4 py-2.5 text-sm font-semibold"
          >
            Renovar assinatura
          </a>
        ) : null}
      </section>
    );
  }

  if (subscription.state !== "nearing_expiration") {
    return null;
  }

  const renewalHref = getRenewalHref(subscription);
  const external = isExternalHref(renewalHref);

  return (
    <section
      className={`state-panel state-panel-warning flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
    >
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

      <a
        href={renewalHref}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="ui-btn-secondary px-4 py-2.5 text-sm font-semibold"
      >
        Renovar agora
      </a>
    </section>
  );
}
