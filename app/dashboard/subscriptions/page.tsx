"use client";

import React, { useState } from "react";
import {
  useSubscriptionsStats,
  useSubscriptions,
  useActivationTokens,
  useCreateManualSubscription,
  useCancelSubscription,
  useReactivateSubscription,
  useCheckExpiredSubscriptions,
} from "@/hooks/useAdmin";
import type {
  SubscriptionsParams,
  ActivationTokensParams,
  SubscriptionItem,
  ActivationTokenItem,
  CreateManualSubscriptionRequest,
} from "@/types/api";
import toast from "react-hot-toast";
import {
  CreditCard,
  Search,
  X,
  Loader2,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ban,
  RotateCcw,
  Key,
  Timer,
} from "lucide-react";

const SUB_STATUSES = [
  "ACTIVE",
  "SETUP_PENDING",
  "PAST_DUE",
  "CANCELLATION_REQUESTED",
  "CANCELED",
  "REFUNDED",
  "EXPIRED",
] as const;
const TOKEN_STATUSES = ["PENDING", "USED", "EXPIRED", "REVOKED"] as const;

function subStatusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-500/15 text-green-400",
    SETUP_PENDING: "bg-sky-500/15 text-sky-400",
    PAST_DUE: "bg-yellow-500/15 text-yellow-400",
    CANCELLATION_REQUESTED: "bg-amber-500/15 text-amber-400",
    CANCELED: "bg-red-500/15 text-red-400",
    REFUNDED: "bg-orange-500/15 text-orange-400",
    EXPIRED: "bg-zinc-500/15 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.EXPIRED}`}
    >
      {status}
    </span>
  );
}

function tokenStatusBadge(status: string) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    PENDING: {
      cls: "bg-yellow-500/15 text-yellow-400",
      icon: <Clock className="h-3 w-3" />,
    },
    USED: {
      cls: "bg-green-500/15 text-green-400",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    EXPIRED: {
      cls: "bg-zinc-500/15 text-zinc-400",
      icon: <Timer className="h-3 w-3" />,
    },
    REVOKED: {
      cls: "bg-red-500/15 text-red-400",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const s = map[status] || map.EXPIRED;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}
    >
      {s.icon} {status}
    </span>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "Sem data";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount?: number | null) {
  if (typeof amount !== "number") return "N/A";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export default function SubscriptionsPage() {
  // Tab: 'subscriptions' | 'tokens'
  const [tab, setTab] = useState<"subscriptions" | "tokens">("subscriptions");

  // Subscription filters
  const [subParams, setSubParams] = useState<SubscriptionsParams>({
    page: 1,
    limit: 20,
  });
  const [subSearch, setSubSearch] = useState("");

  // Token filters
  const [tokenParams, setTokenParams] = useState<ActivationTokensParams>({
    page: 1,
    limit: 20,
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionItem | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelImmediately, setCancelImmediately] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading } = useSubscriptionsStats();
  const { data: subsData, isLoading: subsLoading } =
    useSubscriptions(subParams);
  const { data: tokensData, isLoading: tokensLoading } =
    useActivationTokens(tokenParams);

  // Mutations
  const createManual = useCreateManualSubscription();
  const cancelSub = useCancelSubscription();
  const reactivateSub = useReactivateSubscription();
  const checkExpired = useCheckExpiredSubscriptions();

  // Search handler
  const handleSubSearch = () => {
    setSubParams((p) => ({ ...p, search: subSearch || undefined, page: 1 }));
  };

  const handleCreateManual = async (data: CreateManualSubscriptionRequest) => {
    try {
      const result = await createManual.mutateAsync(data);
      toast.success(
        result.action === "activation_sent"
          ? "Email de ativação enviado!"
          : "Conta criada com sucesso!",
      );
      setShowCreateModal(false);
    } catch {
      toast.error("Erro ao criar assinatura");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget?.user?.id) return;
    try {
      await cancelSub.mutateAsync({
        userId: cancelTarget.user!.id,
        data:
          cancelReason || cancelImmediately
            ? {
                ...(cancelReason ? { reason: cancelReason } : {}),
                immediate: cancelImmediately,
              }
            : undefined,
      });
      toast.success("Assinatura cancelada");
      setCancelTarget(null);
      setCancelReason("");
      setCancelImmediately(false);
    } catch {
      toast.error("Erro ao cancelar assinatura");
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await reactivateSub.mutateAsync(userId);
      toast.success("Assinatura reativada");
    } catch {
      toast.error("Erro ao reativar assinatura");
    }
  };

  const handleCheckExpired = async () => {
    try {
      const result = await checkExpired.mutateAsync();
      toast.success(result.message);
    } catch {
      toast.error("Erro ao verificar assinaturas expiradas");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)] flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-[var(--color-primary)]" />
            Assinaturas
          </h1>
          <p className="text-sm text-[var(--color-textDim)] mt-1">
            Gerencie assinaturas e tokens de ativação
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckExpired}
            disabled={checkExpired.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] text-[var(--color-textMain)] rounded-lg text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {checkExpired.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Verificar Expiradas
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Nova Assinatura
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <StatCard
            label="Total"
            value={stats.totalSubscriptions}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <StatCard
            label="Ativas"
            value={stats.active}
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            label="Setup"
            value={stats.setupPending}
            icon={<Clock className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            label="Cancel. agendado"
            value={stats.cancellationRequested}
            icon={<Timer className="h-5 w-5" />}
            color="yellow"
          />
          <StatCard
            label="Em Atraso"
            value={stats.pastDue}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="yellow"
          />
          <StatCard
            label="Canceladas"
            value={stats.canceled}
            icon={<XCircle className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            label="Expiradas"
            value={stats.expired}
            icon={<Ban className="h-5 w-5" />}
            color="orange"
          />
          <StatCard
            label="Reembolsadas"
            value={stats.refunded}
            icon={<RotateCcw className="h-5 w-5" />}
            color="orange"
          />
          <StatCard
            label="Tokens"
            value={stats.pendingActivations}
            icon={<Clock className="h-5 w-5" />}
            color="blue"
          />
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab("subscriptions")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "subscriptions"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          Assinaturas
        </button>
        <button
          onClick={() => setTab("tokens")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "tokens"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          Tokens de Ativação
        </button>
      </div>

      {/* Content */}
      {tab === "subscriptions" ? (
        <SubscriptionsTab
          data={subsData}
          isLoading={subsLoading}
          params={subParams}
          setParams={setSubParams}
          search={subSearch}
          setSearch={setSubSearch}
          onSearch={handleSubSearch}
          onCancel={setCancelTarget}
          onReactivate={handleReactivate}
          reactivateLoading={reactivateSub.isPending}
        />
      ) : (
        <TokensTab
          data={tokensData}
          isLoading={tokensLoading}
          params={tokenParams}
          setParams={setTokenParams}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateManualModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateManual}
          isLoading={createManual.isPending}
        />
      )}

      {/* Cancel Confirm Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md border border-white/10">
            <h3 className="text-lg font-semibold text-[var(--color-textMain)] mb-2">
              Cancelar Assinatura
            </h3>
            <p className="text-sm text-[var(--color-textDim)] mb-4">
              Cancelar assinatura de{" "}
              <strong className="text-[var(--color-textMain)]">
                {cancelTarget.user?.name ||
                  cancelTarget.user?.email ||
                  cancelTarget.buyerName ||
                  cancelTarget.buyerEmail}
              </strong>
              ?
            </p>
            <label className="mb-4 flex items-center gap-2 text-sm text-[var(--color-textDim)]">
              <input
                type="checkbox"
                checked={cancelImmediately}
                onChange={(event) => setCancelImmediately(event.target.checked)}
              />
              Cancelar imediatamente
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="w-full px-3 py-2 bg-[var(--color-background)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none mb-4 resize-none h-20"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                  setCancelImmediately(false);
                }}
                className="px-4 py-2 text-sm text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelSub.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelSub.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancelar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Stat Card =====
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    orange: "text-orange-400",
    blue: "text-blue-400",
  };
  const textColor = color ? colorMap[color] : "text-[var(--color-textMain)]";

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5">
      <div className={`mb-2 ${textColor}`}>{icon}</div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-[var(--color-textDim)] mt-1">{label}</p>
    </div>
  );
}

// ===== Subscriptions Tab =====
function SubscriptionsTab({
  data,
  isLoading,
  params,
  setParams,
  search,
  setSearch,
  onSearch,
  onCancel,
  onReactivate,
  reactivateLoading,
}: {
  data: ReturnType<typeof useSubscriptions>["data"];
  isLoading: boolean;
  params: SubscriptionsParams;
  setParams: React.Dispatch<React.SetStateAction<SubscriptionsParams>>;
  search: string;
  setSearch: (v: string) => void;
  onSearch: () => void;
  onCancel: (sub: SubscriptionItem) => void;
  onReactivate: (userId: string) => void;
  reactivateLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="flex-1 relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email ou nome..."
            className="w-full pl-10 pr-10 py-2 bg-[var(--color-surface)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setParams((p) => ({ ...p, search: undefined, page: 1 }));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <select
          value={params.status || ""}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              status: e.target.value || undefined,
              page: 1,
            }))
          }
          className="px-3 py-2 bg-[var(--color-surface)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">Todos os status</option>
          {SUB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : !data?.subscriptions?.length ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-[var(--color-textDim)] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--color-textDim)] text-sm">
            Nenhuma assinatura encontrada
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Usuário
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Plano
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Cobrança
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Expira em
                  </th>
                  <th className="text-right py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((sub: SubscriptionItem) => (
                  <tr
                    key={sub.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="py-3 px-3">
                      <p className="text-[var(--color-textMain)] font-medium">
                        {sub.user?.name || sub.buyerName || "Sem vínculo"}
                      </p>
                      <p className="text-[var(--color-textDim)] text-xs">
                        {sub.user?.email || sub.buyerEmail || "Sem email"}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textMain)] capitalize">
                      {sub.plan || "premium"}
                    </td>
                    <td className="py-3 px-3">
                      {subStatusBadge(sub.status || "EXPIRED")}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textMain)]">
                      <p>{sub.paymentMethod || "Não informado"}</p>
                      <p className="text-xs text-[var(--color-textDim)]">
                        {sub.isRecurring ? "Recorrente" : "Manual"}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textDim)]">
                      {formatDate(sub.currentPeriodEnd || "")}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-end gap-1">
                        {(sub.actions.canCancel && sub.user?.id) ||
                        ((sub.status === "ACTIVE" ||
                          sub.status === "PAST_DUE" ||
                          sub.status === "CANCELLATION_REQUESTED") &&
                          sub.user?.id) ? (
                          <button
                            onClick={() => onCancel(sub)}
                            title="Cancelar"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : null}
                        {(sub.status === "CANCELED" ||
                          sub.status === "EXPIRED" ||
                          sub.status === "CANCELLATION_REQUESTED") &&
                        sub.user?.id ? (
                          <button
                            onClick={() => onReactivate(sub.user!.id)}
                            disabled={reactivateLoading}
                            title="Reativar"
                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              onPage={(p) => setParams((prev) => ({ ...prev, page: p }))}
            />
          )}
        </>
      )}
    </div>
  );
}

// ===== Tokens Tab =====
function TokensTab({
  data,
  isLoading,
  params,
  setParams,
}: {
  data: ReturnType<typeof useActivationTokens>["data"];
  isLoading: boolean;
  params: ActivationTokensParams;
  setParams: React.Dispatch<React.SetStateAction<ActivationTokensParams>>;
}) {
  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={params.status || ""}
          onChange={(e) =>
            setParams((p) => ({
              ...p,
              status: e.target.value || undefined,
              page: 1,
            }))
          }
          className="px-3 py-2 bg-[var(--color-surface)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="">Todos os status</option>
          {TOKEN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : !data?.tokens?.length ? (
        <div className="text-center py-12">
          <Key className="h-12 w-12 text-[var(--color-textDim)] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--color-textDim)] text-sm">
            Nenhum token encontrado
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Email / Nome
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Produto
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Status
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Valor
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Criado em
                  </th>
                  <th className="text-left py-3 px-3 text-[var(--color-textDim)] font-medium">
                    Expira em
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.tokens.map((token: ActivationTokenItem) => (
                  <tr
                    key={token.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="py-3 px-3">
                      <p className="text-[var(--color-textMain)] font-medium">
                        {token.name}
                      </p>
                      <p className="text-[var(--color-textDim)] text-xs">
                        {token.email}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textMain)]">
                      {token.productName}
                    </td>
                    <td className="py-3 px-3">
                      {tokenStatusBadge(token.status)}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textMain)]">
                      {formatCurrency(token.amount)}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textDim)]">
                      {formatDate(token.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-textDim)]">
                      {formatDate(token.expiresAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination && data.pagination.totalPages > 1 && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              onPage={(p) => setParams((prev) => ({ ...prev, page: p }))}
            />
          )}
        </>
      )}
    </div>
  );
}

// ===== Create Manual Modal =====
function CreateManualModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: CreateManualSubscriptionRequest) => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sendActivation, setSendActivation] = useState(true);
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateManualSubscriptionRequest = {
      email,
      name,
      sendActivation,
    };
    if (!sendActivation && password) {
      data.password = password;
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-textMain)]">
            Nova Assinatura Manual
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-textMain)] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[var(--color-background)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-textMain)] mb-1">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[var(--color-background)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendActivation"
              checked={sendActivation}
              onChange={(e) => setSendActivation(e.target.checked)}
              className="rounded border-white/20 bg-[var(--color-background)] text-[var(--color-primary)]"
            />
            <label
              htmlFor="sendActivation"
              className="text-sm text-[var(--color-textMain)]"
            >
              Enviar email de ativação
            </label>
          </div>

          {!sendActivation && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-textMain)] mb-1">
                Senha (conta direta)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!sendActivation}
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 bg-[var(--color-background)] text-[var(--color-textMain)] rounded-lg text-sm border border-white/10 focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Pagination =====
function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-[var(--color-textDim)]">
        {total} resultado{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-[var(--color-textDim)]">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
