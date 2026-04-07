import type {
  SubscriptionActions,
  SubscriptionState,
  SubscriptionStatus,
  SubscriptionView,
  User,
} from "@/types/api";

export const SUBSCRIPTION_CHECKOUT_URL =
  "https://pay.kirvano.com/fa717258-dae4-4eea-9368-970ee9cee695";
export const SUBSCRIPTION_MANAGEMENT_ROUTE = "/subscription";
export const SUBSCRIPTION_RENEW_ROUTE = "/subscription/renew";
export const EMPTY_SUBSCRIPTION: SubscriptionView = {
  state: "inactive",
  accessGranted: false,
  reminder: {
    lastSentAt: null,
    lastSentDays: null,
    nextReminderWindowDays: null,
  },
  actions: {
    canCancel: false,
    canRenew: true,
  },
};

const PUBLIC_PATH_PREFIXES = [
  "/auth/",
  "/termos-de-servico",
  "/politica-de-privacidade",
  SUBSCRIPTION_RENEW_ROUTE,
];

const INACTIVE_ACCESS_PREFIXES = [
  "/profile",
  SUBSCRIPTION_MANAGEMENT_ROUTE,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(
  input: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = input[key];
  return typeof value === "string" ? value : undefined;
}

function readNullableString(
  input: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = input[key];
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function readBoolean(
  input: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = input[key];
  return typeof value === "boolean" ? value : undefined;
}

function normalizeActions(
  payload: Record<string, unknown>,
): SubscriptionActions {
  const rawActions = isRecord(payload.actions) ? payload.actions : null;

  return {
    canCancel:
      (rawActions && typeof rawActions.canCancel === "boolean"
        ? rawActions.canCancel
        : undefined) ??
      readBoolean(payload, "canCancel") ??
      false,
    canRenew:
      (rawActions && typeof rawActions.canRenew === "boolean"
        ? rawActions.canRenew
        : undefined) ??
      readBoolean(payload, "canRenew") ??
      true,
  };
}

export function normalizeSubscriptionView(
  payload: unknown,
): SubscriptionView | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const reminderPayload = isRecord(payload.reminder) ? payload.reminder : null;
  const userPayload = isRecord(payload.user) ? payload.user : null;
  const state = readString(payload, "state") as SubscriptionState | undefined;
  const status = readString(payload, "status") as SubscriptionStatus | undefined;

  return {
    id: readString(payload, "id"),
    provider: readString(payload, "provider"),
    plan: readString(payload, "plan"),
    status,
    state: state ?? "inactive",
    accessGranted: readBoolean(payload, "accessGranted") ?? false,
    paymentMethod: readNullableString(payload, "paymentMethod"),
    isRecurring:
      typeof payload.isRecurring === "boolean" ? payload.isRecurring : null,
    buyerEmail: readString(payload, "buyerEmail"),
    buyerName: readNullableString(payload, "buyerName"),
    startsAt: readNullableString(payload, "startsAt"),
    currentPeriodEnd: readNullableString(payload, "currentPeriodEnd"),
    cancelAtPeriodEnd: readBoolean(payload, "cancelAtPeriodEnd") ?? false,
    cancellationRequestedAt: readNullableString(
      payload,
      "cancellationRequestedAt",
    ),
    cancellationEffectiveAt: readNullableString(
      payload,
      "cancellationEffectiveAt",
    ),
    canceledAt: readNullableString(payload, "canceledAt"),
    cancelReason: readNullableString(payload, "cancelReason"),
    lastPaymentConfirmedAt: readNullableString(
      payload,
      "lastPaymentConfirmedAt",
    ),
    setupCompletedAt: readNullableString(payload, "setupCompletedAt"),
    renewalUrl: readNullableString(payload, "renewalUrl"),
    reminder: reminderPayload
      ? {
          lastSentAt: readNullableString(reminderPayload, "lastSentAt") ?? null,
          lastSentDays:
            typeof reminderPayload.lastSentDays === "number"
              ? reminderPayload.lastSentDays
              : null,
          nextReminderWindowDays:
            typeof reminderPayload.nextReminderWindowDays === "number"
              ? reminderPayload.nextReminderWindowDays
              : null,
        }
      : EMPTY_SUBSCRIPTION.reminder,
    actions: normalizeActions(payload),
    amount: typeof payload.amount === "number" ? payload.amount : null,
    user: userPayload
      ? {
          id: readString(userPayload, "id") ?? "",
          email: readString(userPayload, "email") ?? "",
          name: readNullableString(userPayload, "name") ?? null,
          role: readString(userPayload, "role") ?? "SUBSCRIBER",
          subStatus: readNullableString(userPayload, "subStatus"),
        }
      : undefined,
  };
}

export function isPublicAppPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === "/" ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function isInactiveAccessPath(pathname?: string | null): boolean {
  if (!pathname) return false;
  return INACTIVE_ACCESS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function requiresActiveSubscription(pathname?: string | null): boolean {
  if (!pathname) return false;

  if (isPublicAppPath(pathname)) {
    return false;
  }

  if (pathname.startsWith("/dashboard")) {
    return false;
  }

  return !isInactiveAccessPath(pathname);
}

export function hasSubscriptionAccess(user?: User | null): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "EDITOR") return true;
  if (typeof user.subscription?.accessGranted === "boolean") {
    return user.subscription.accessGranted;
  }
  return Boolean(user.accessGranted);
}

export function getDefaultAuthenticatedPath(user?: User | null): string {
  return hasSubscriptionAccess(user) ? "/home" : SUBSCRIPTION_MANAGEMENT_ROUTE;
}

export function getRenewalHref(subscription?: SubscriptionView | null): string {
  return subscription?.renewalUrl || SUBSCRIPTION_RENEW_ROUTE;
}

export function isExternalHref(href?: string | null): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href);
}

export function formatSubscriptionDate(date?: string | null): string {
  if (!date) return "Ainda não definido";

  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatSubscriptionDateTime(date?: string | null): string {
  if (!date) return "Ainda não definido";

  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPaymentMethodLabel(method?: string | null): string {
  if (!method) return "Não informado";

  const labels: Record<string, string> = {
    CREDIT_CARD: "Cartão de crédito",
    PIX: "PIX (renovação manual)",
    AUTO_PIX: "PIX automático",
  };

  return labels[method] ?? method;
}

export function getSubscriptionStateLabel(state?: SubscriptionState): string {
  const labels: Record<SubscriptionState, string> = {
    inactive: "Sem assinatura",
    setup_pending: "Configuração pendente",
    active: "Ativa",
    nearing_expiration: "Próxima do vencimento",
    renewal_pending: "Renovação pendente",
    past_due: "Pagamento em atraso",
    cancelled: "Cancelada",
    expired: "Expirada",
    refunded: "Reembolsada",
  };

  return state ? labels[state] : "Sem assinatura";
}

export function getSubscriptionStatusLabel(status?: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    ACTIVE: "ACTIVE",
    SETUP_PENDING: "SETUP_PENDING",
    PAST_DUE: "PAST_DUE",
    CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED",
    CANCELED: "CANCELED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  };

  return status ? labels[status] : "Sem status";
}

export function getSubscriptionStateMeta(subscription?: SubscriptionView | null): {
  title: string;
  description: string;
  tone: "default" | "danger" | "warning" | "info";
} {
  if (!subscription) {
    return {
      title: "Nenhuma assinatura encontrada",
      description:
        "Sua conta não tem uma assinatura vinculada no momento. Se você acabou de comprar, aguarde a confirmação por email.",
      tone: "info",
    };
  }

  if (subscription.status === "CANCELLATION_REQUESTED") {
    return {
      title: "Cancelamento agendado",
      description:
        "Seu acesso segue disponível até o fim do período atual. Se quiser continuar depois disso, renove antes da data limite.",
      tone: "warning",
    };
  }

  switch (subscription.state) {
    case "active":
      return {
        title: "Assinatura em dia",
        description:
          "Seu acesso premium está liberado normalmente. Você pode continuar lendo e gerenciar a assinatura quando quiser.",
        tone: "default",
      };
    case "nearing_expiration":
      return {
        title: "Renovação recomendada",
        description:
          "Seu ciclo atual está perto do fim. Renove agora para evitar interrupções no acesso.",
        tone: "warning",
      };
    case "renewal_pending":
      return {
        title: "Renovação necessária",
        description:
          "O período pago terminou e sua assinatura precisa ser renovada para liberar novamente a leitura.",
        tone: "danger",
      };
    case "past_due":
      return {
        title: "Pagamento pendente",
        description:
          "Detectamos um problema no pagamento recorrente. Regularize a cobrança para restaurar o acesso.",
        tone: "danger",
      };
    case "cancelled":
      return {
        title: "Assinatura encerrada",
        description:
          "Sua assinatura foi cancelada. Se quiser voltar a ler, basta iniciar uma nova renovação.",
        tone: "danger",
      };
    case "expired":
      return {
        title: "Assinatura expirada",
        description:
          "O período pago terminou sem renovação. Renove para recuperar o acesso premium.",
        tone: "danger",
      };
    case "refunded":
      return {
        title: "Assinatura bloqueada",
        description:
          "Essa assinatura foi reembolsada e o acesso está bloqueado. Se precisar, fale com o suporte para revisar o caso.",
        tone: "danger",
      };
    case "setup_pending":
      return {
        title: "Configuração pendente",
        description:
          "Seu pagamento já foi confirmado, mas a criação da conta ainda não foi concluída. Use o link enviado por email para terminar o acesso.",
        tone: "info",
      };
    case "inactive":
    default:
      return {
        title: "Assinatura não encontrada",
        description:
          "Não encontramos uma assinatura ativa para esta conta. Se você já pagou, confira o email de ativação ou fale com o suporte.",
        tone: "info",
      };
  }
}
