"use client";

import React, { useState, useMemo } from "react";
import {
  useApprovals,
  useApprovalStats,
  useApproveContent,
  useRejectContent,
  useBulkApprove,
  useBulkReject,
} from "@/hooks/useAdmin";
import type { Approval, ApprovalsParams, ApprovalStatus } from "@/types/api";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  AlertTriangle,
  CheckCheck,
  Ban,
  User,
  HardDrive,
} from "lucide-react";
import toast from "react-hot-toast";

// ===== Status tab config =====
const statusTabs: {
  key: ApprovalStatus | "";
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "PENDING", label: "Pendentes", icon: Clock },
  { key: "APPROVED", label: "Aprovados", icon: CheckCircle2 },
  { key: "REJECTED", label: "Rejeitados", icon: XCircle },
  { key: "", label: "Todos", icon: FileText },
];

// ===== Rejection Modal =====
function RejectModal({
  approval,
  onClose,
  onReject,
  isPending,
}: {
  approval: Approval;
  onClose: () => void;
  onReject: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
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
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-red-400 font-medium">
                {approval.originalName}
              </span>
              <br />
              <span className="text-[var(--color-textDim)]">
                Enviado por {approval.submitter.name}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Motivo da rejeição (obrigatório)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)] resize-none"
              placeholder="Ex: Arquivo corrompido, conteúdo duplicado, qualidade insuficiente..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => reason.trim() && onReject(reason.trim())}
              disabled={isPending || !reason.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Rejeitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Bulk Reject Modal =====
function BulkRejectModal({
  count,
  onClose,
  onReject,
  isPending,
}: {
  count: number;
  onClose: () => void;
  onReject: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Rejeitar {count} item(ns)
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Motivo da rejeição (obrigatório)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)] resize-none"
              placeholder="Motivo para rejeição em lote..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => reason.trim() && onReject(reason.trim())}
              disabled={isPending || !reason.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Rejeitar Todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Approval Row =====
function ApprovalRow({
  approval,
  selected,
  onSelect,
  onApprove,
  onReject,
  isApprovePending,
}: {
  approval: Approval;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  isApprovePending: boolean;
}) {
  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusColor = {
    PENDING: "text-yellow-400",
    APPROVED: "text-green-400",
    REJECTED: "text-red-400",
  };

  const statusLabel = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
  };

  return (
    <>
      {/* Desktop Row */}
      <tr className="hidden md:table-row hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-3">
          {approval.status === "PENDING" && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              className="rounded border-white/20 bg-transparent text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-background)] flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-[var(--color-textDim)]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--color-textMain)] truncate max-w-[250px]">
                {approval.originalName}
              </div>
              <div className="text-xs text-[var(--color-textDim)] flex items-center gap-2">
                <HardDrive className="h-3 w-3" />
                {formatSize(approval.fileSize)}
                {approval.forcedSeriesTitle && (
                  <span className="text-blue-400">
                    → {approval.forcedSeriesTitle}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[var(--color-textDim)]" />
            <span className="text-sm text-[var(--color-textMain)]">
              {approval.submitter.name}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`text-sm font-medium ${statusColor[approval.status]}`}
          >
            {statusLabel[approval.status]}
          </span>
          {approval.rejectionReason && (
            <div
              className="text-xs text-red-400/70 mt-0.5 truncate max-w-[200px]"
              title={approval.rejectionReason}
            >
              {approval.rejectionReason}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-[var(--color-textDim)]">
          {formatDate(approval.createdAt)}
        </td>
        <td className="px-4 py-3">
          {approval.status === "PENDING" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onApprove}
                disabled={isApprovePending}
                title="Aprovar"
                className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-50"
              >
                {isApprovePending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={onReject}
                title="Rejeitar"
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}
          {approval.reviewer && (
            <span className="text-xs text-[var(--color-textDim)]">
              por {approval.reviewer.name}
            </span>
          )}
        </td>
      </tr>

      {/* Mobile Card */}
      <div className="md:hidden p-4 border-b border-white/5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {approval.status === "PENDING" && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(e.target.checked)}
                className="rounded border-white/20 bg-transparent text-[var(--color-primary)] focus:ring-[var(--color-primary)] flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--color-textMain)] truncate">
                {approval.originalName}
              </div>
              <div className="text-xs text-[var(--color-textDim)]">
                {formatSize(approval.fileSize)} • {approval.submitter.name}
              </div>
            </div>
          </div>
          <span
            className={`text-xs font-medium flex-shrink-0 ${statusColor[approval.status]}`}
          >
            {statusLabel[approval.status]}
          </span>
        </div>
        {approval.status === "PENDING" && (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={isApprovePending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/30 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprovar
            </button>
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/30 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              Rejeitar
            </button>
          </div>
        )}
        {approval.rejectionReason && (
          <div className="text-xs text-red-400/70 bg-red-500/5 px-2 py-1 rounded">
            {approval.rejectionReason}
          </div>
        )}
      </div>
    </>
  );
}

// ===== Main Page =====
export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "PENDING">(
    "PENDING",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectingApproval, setRejectingApproval] = useState<Approval | null>(
    null,
  );
  const [showBulkReject, setShowBulkReject] = useState(false);

  const approveMutation = useApproveContent();
  const rejectMutation = useRejectContent();
  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();

  const params = useMemo<ApprovalsParams>(() => {
    const p: ApprovalsParams = { page, limit: 20 };
    if (statusFilter) p.status = statusFilter as ApprovalStatus;
    return p;
  }, [statusFilter, page]);

  const { data: statsData } = useApprovalStats();
  const { data, isLoading } = useApprovals(params);

  const filteredApprovals = useMemo(() => {
    if (!data?.approvals || !search) return data?.approvals || [];
    const q = search.toLowerCase();
    return data.approvals.filter(
      (a) =>
        a.originalName.toLowerCase().includes(q) ||
        a.submitter.name.toLowerCase().includes(q),
    );
  }, [data, search]);

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Conteúdo aprovado!");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      toast.error("Erro ao aprovar");
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectMutation.mutateAsync({ id, reason });
      toast.success("Conteúdo rejeitado");
      setRejectingApproval(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch {
      toast.error("Erro ao rejeitar");
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      const result = await bulkApproveMutation.mutateAsync(ids);
      toast.success(result.message);
      setSelectedIds(new Set());
    } catch {
      toast.error("Erro ao aprovar em lote");
    }
  };

  const handleBulkReject = async (reason: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      const result = await bulkRejectMutation.mutateAsync({ ids, reason });
      toast.success(result.message);
      setSelectedIds(new Set());
      setShowBulkReject(false);
    } catch {
      toast.error("Erro ao rejeitar em lote");
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const pending = filteredApprovals
        .filter((a) => a.status === "PENDING")
        .map((a) => a.id);
      setSelectedIds(new Set(pending));
    } else {
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Aprovação de Conteúdo
        </h1>
        <p className="text-sm text-[var(--color-textDim)] mt-1">
          Revise e aprove uploads enviados por editores
        </p>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-yellow-400">
              {statsData.pending}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Pendentes
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-orange-400">
              {statsData.todayPending}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Hoje Pendentes
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-green-400">
              {statsData.approved}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Aprovados
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-red-400">
              {statsData.rejected}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Rejeitados
            </div>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 bg-[var(--color-surface)] rounded-xl border border-white/5 p-1">
        {statusTabs.map((tab) => {
          const isActive =
            statusFilter === tab.key || (!statusFilter && !tab.key);
          const count =
            tab.key === "PENDING"
              ? statsData?.pending
              : tab.key === "APPROVED"
                ? statsData?.approved
                : tab.key === "REJECTED"
                  ? statsData?.rejected
                  : undefined;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key as ApprovalStatus | "PENDING");
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                isActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "text-[var(--color-textDim)] hover:bg-white/5"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count !== undefined && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
          <input
            type="text"
            placeholder="Buscar por arquivo ou editor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {bulkApproveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Aprovar ({selectedIds.size})
            </button>
            <button
              onClick={() => setShowBulkReject(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Ban className="h-4 w-4" />
              Rejeitar ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Approvals List */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : !filteredApprovals.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-textDim)]">
            <CheckCircle2 className="h-12 w-12 mb-3 opacity-40" />
            <p>Nenhum conteúdo encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs text-[var(--color-textDim)] uppercase tracking-wider">
                    <th className="px-4 py-3 w-10">
                      {statusFilter === "PENDING" && (
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size > 0 &&
                            selectedIds.size ===
                              filteredApprovals.filter(
                                (a) => a.status === "PENDING",
                              ).length
                          }
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="rounded border-white/20 bg-transparent text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                      )}
                    </th>
                    <th className="px-4 py-3">Arquivo</th>
                    <th className="px-4 py-3">Editor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Enviado em</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredApprovals.map((approval) => (
                    <ApprovalRow
                      key={approval.id}
                      approval={approval}
                      selected={selectedIds.has(approval.id)}
                      onSelect={(checked) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(approval.id);
                          else next.delete(approval.id);
                          return next;
                        });
                      }}
                      onApprove={() => handleApprove(approval.id)}
                      onReject={() => setRejectingApproval(approval)}
                      isApprovePending={approveMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden">
              {filteredApprovals.map((approval) => (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  selected={selectedIds.has(approval.id)}
                  onSelect={(checked) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(approval.id);
                      else next.delete(approval.id);
                      return next;
                    });
                  }}
                  onApprove={() => handleApprove(approval.id)}
                  onReject={() => setRejectingApproval(approval)}
                  isApprovePending={approveMutation.isPending}
                />
              ))}
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <span className="text-sm text-[var(--color-textDim)]">
                  {data.pagination.total} item(ns) — Página {page} /{" "}
                  {data.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPage(Math.min(data.pagination.totalPages, page + 1))
                    }
                    disabled={page >= data.pagination.totalPages}
                    className="p-2 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {rejectingApproval && (
        <RejectModal
          approval={rejectingApproval}
          onClose={() => setRejectingApproval(null)}
          onReject={(reason) => handleReject(rejectingApproval.id, reason)}
          isPending={rejectMutation.isPending}
        />
      )}
      {showBulkReject && (
        <BulkRejectModal
          count={selectedIds.size}
          onClose={() => setShowBulkReject(false)}
          onReject={handleBulkReject}
          isPending={bulkRejectMutation.isPending}
        />
      )}
    </div>
  );
}
