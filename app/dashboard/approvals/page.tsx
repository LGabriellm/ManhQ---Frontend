"use client";

import React, { useState } from "react";
import {
  useAdminApprovals,
  useApprovalsStats,
  useApproveContent,
  useRejectContent,
  useBulkApprove,
  useBulkReject,
} from "@/hooks/useAdmin";
import type { ApprovalItem, ApprovalsParams } from "@/types/api";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  Inbox,
} from "lucide-react";

function statusConfig(status: string) {
  const map: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode; label: string }
  > = {
    PENDING: {
      bg: "bg-yellow-500/15",
      text: "text-yellow-400",
      icon: <Clock className="h-3 w-3" />,
      label: "Pendente",
    },
    APPROVED: {
      bg: "bg-green-500/15",
      text: "text-green-400",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Aprovado",
    },
    REJECTED: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      icon: <XCircle className="h-3 w-3" />,
      label: "Rejeitado",
    },
  };
  return map[status] || map.PENDING;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===== Reject Modal =====
function RejectModal({
  approval,
  onClose,
}: {
  approval: ApprovalItem;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const rejectMutation = useRejectContent();

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rejectMutation.mutateAsync({ id: approval.id, data: { reason } });
      toast.success("Conteúdo rejeitado");
      onClose();
    } catch {
      toast.error("Erro ao rejeitar");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Rejeitar Conteúdo
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--color-textDim)] mb-4">
          Rejeitando:{" "}
          <strong className="text-[var(--color-textMain)]">
            {approval.originalName}
          </strong>
        </p>
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Motivo da rejeição
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Descreva o motivo..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending || !reason.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {rejectMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Rejeitar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Bulk Reject Modal =====
function BulkRejectModal({
  ids,
  onClose,
}: {
  ids: string[];
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const bulkRejectMutation = useBulkReject();

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bulkRejectMutation.mutateAsync({ ids, reason });
      toast.success(`${ids.length} item(ns) rejeitado(s)`);
      onClose();
    } catch {
      toast.error("Erro ao rejeitar em lote");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Rejeitar {ids.length} Item(ns)
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Motivo da rejeição
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Descreva o motivo..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={bulkRejectMutation.isPending || !reason.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {bulkRejectMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Rejeitar Todos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Page =====
export default function ApprovalsPage() {
  const [params, setParams] = useState<ApprovalsParams>({
    status: "PENDING",
    page: 1,
    limit: 20,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectingItem, setRejectingItem] = useState<ApprovalItem | null>(null);
  const [showBulkReject, setShowBulkReject] = useState(false);

  const { data, isLoading } = useAdminApprovals(params);
  const { data: stats } = useApprovalsStats();
  const approveMutation = useApproveContent();
  const bulkApproveMutation = useBulkApprove();

  const approvals = data?.approvals || [];
  const pagination = data?.pagination;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === approvals.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(approvals.map((a) => a.id)));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Conteúdo aprovado");
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      toast.error("Erro ao aprovar");
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selected);
    try {
      const result = await bulkApproveMutation.mutateAsync({ ids });
      toast.success(
        `${result.approved.length} aprovado(s), ${result.failed.length} falha(s)`,
      );
      setSelected(new Set());
    } catch {
      toast.error("Erro ao aprovar em lote");
    }
  };

  const statusTabs: {
    status: ApprovalsParams["status"];
    label: string;
    count?: number;
  }[] = [
    { status: "PENDING", label: "Pendentes", count: stats?.pending },
    { status: "APPROVED", label: "Aprovados", count: stats?.approved },
    { status: "REJECTED", label: "Rejeitados", count: stats?.rejected },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Aprovações
        </h1>
        <p className="text-sm text-[var(--color-textDim)]">
          Gerencie conteúdo enviado por editores
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Pendentes
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.pending}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Aprovados
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.approved}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Rejeitados
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.rejected}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Pendentes Hoje
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.todayPending}
            </p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 bg-[var(--color-surface)] rounded-lg p-1 border border-white/5 w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.status}
            onClick={() => {
              setParams((p) => ({ ...p, status: tab.status, page: 1 }));
              setSelected(new Set());
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              params.status === tab.status
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)] hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && params.status === "PENDING" && (
        <div className="flex items-center gap-3 bg-[var(--color-surface)] rounded-lg border border-white/10 px-4 py-3">
          <span className="text-sm text-[var(--color-textDim)]">
            {selected.size} selecionado(s)
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={bulkApproveMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {bulkApproveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Aprovar
          </button>
          <button
            onClick={() => setShowBulkReject(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejeitar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Approvals List */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="h-10 w-10 text-[var(--color-textDim)] mx-auto mb-3" />
            <p className="text-sm text-[var(--color-textDim)]">
              Nenhuma aprovação{" "}
              {params.status === "PENDING" ? "pendente" : "encontrada"}
            </p>
          </div>
        ) : (
          <>
            {/* Select All (only for PENDING) */}
            {params.status === "PENDING" && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
                <input
                  type="checkbox"
                  checked={
                    selected.size === approvals.length && approvals.length > 0
                  }
                  onChange={toggleAll}
                  className="rounded border-white/20 bg-transparent"
                />
                <span className="text-xs text-[var(--color-textDim)]">
                  Selecionar todos
                </span>
              </div>
            )}

            <div className="divide-y divide-white/5">
              {approvals.map((a) => {
                const sc = statusConfig(a.status);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    {params.status === "PENDING" && (
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleSelect(a.id)}
                        className="rounded border-white/20 bg-transparent flex-shrink-0"
                      />
                    )}

                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-[var(--color-textDim)]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
                        {a.originalName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-textDim)]">
                          por {a.submitter.name}
                        </span>
                        <span className="text-xs text-[var(--color-textDim)]">
                          ·
                        </span>
                        <span className="text-xs text-[var(--color-textDim)]">
                          {formatBytes(a.fileSize)}
                        </span>
                        <span className="text-xs text-[var(--color-textDim)]">
                          ·
                        </span>
                        <span className="text-xs text-[var(--color-textDim)]">
                          {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {a.rejectionReason && (
                        <p className="text-xs text-red-400 mt-1 line-clamp-1">
                          Motivo: {a.rejectionReason}
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text} flex-shrink-0`}
                    >
                      {sc.icon} {sc.label}
                    </span>

                    {a.status === "PENDING" && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(a.id)}
                          disabled={approveMutation.isPending}
                          title="Aprovar"
                          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-green-400 hover:bg-green-500/10"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setRejectingItem(a)}
                          title="Rejeitar"
                          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-[var(--color-textDim)]">
              {pagination.total} item(ns) · Página {pagination.page} de{" "}
              {pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() =>
                  setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))
                }
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {rejectingItem && (
        <RejectModal
          approval={rejectingItem}
          onClose={() => setRejectingItem(null)}
        />
      )}
      {showBulkReject && (
        <BulkRejectModal
          ids={Array.from(selected)}
          onClose={() => {
            setShowBulkReject(false);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
