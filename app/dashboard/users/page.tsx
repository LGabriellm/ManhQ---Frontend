"use client";

import React, { useState } from "react";
import {
  useAdminUsers,
  useUsersStats,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useRevokeSessions,
} from "@/hooks/useAdmin";
import type {
  AdminUserItem,
  AdminUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/types/api";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
  Search,
  X,
  Loader2,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Crown,
  PenTool,
  User as UserIcon,
} from "lucide-react";

const ROLES = ["ADMIN", "EDITOR", "SUBSCRIBER", "FREE"] as const;
const SUB_STATUSES = ["ACTIVE", "INACTIVE", "PAST_DUE", "CANCELED"] as const;

function roleBadge(role: string) {
  const map: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    ADMIN: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      icon: <Crown className="h-3 w-3" />,
    },
    EDITOR: {
      bg: "bg-blue-500/15",
      text: "text-blue-400",
      icon: <PenTool className="h-3 w-3" />,
    },
    SUBSCRIBER: {
      bg: "bg-green-500/15",
      text: "text-green-400",
      icon: <ShieldCheck className="h-3 w-3" />,
    },
    FREE: {
      bg: "bg-zinc-500/15",
      text: "text-zinc-400",
      icon: <UserIcon className="h-3 w-3" />,
    },
  };
  const s = map[role] || map.FREE;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.icon} {role}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-500/15 text-green-400",
    INACTIVE: "bg-zinc-500/15 text-zinc-400",
    PAST_DUE: "bg-yellow-500/15 text-yellow-400",
    CANCELED: "bg-red-500/15 text-red-400",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.INACTIVE}`}
    >
      {status}
    </span>
  );
}

// ===== Create/Edit User Modal =====
function UserModal({
  user,
  onClose,
}: {
  user: AdminUserItem | null;
  onClose: () => void;
}) {
  const isEdit = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "FREE");
  const [subStatus, setSubStatus] = useState(user?.subStatus || "ACTIVE");
  const [maxDevices, setMaxDevices] = useState(user?.maxDevices ?? 3);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        const data: UpdateUserRequest = { name, role, subStatus, maxDevices };
        if (password) data.password = password;
        await updateMutation.mutateAsync({ id: user.id, data });
        toast.success("Usuário atualizado");
      } else {
        const data: CreateUserRequest = {
          name,
          email,
          password,
          role,
          subStatus,
        };
        await createMutation.mutateAsync(data);
        toast.success("Usuário criado");
      }
      onClose();
    } catch {
      toast.error(
        isEdit ? "Erro ao atualizar usuário" : "Erro ao criar usuário",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            {isEdit ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              {isEdit ? "Nova Senha (deixe vazio para manter)" : "Senha"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={8}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1">
                Status
              </label>
              <select
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              >
                {SUB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1">
                Máx. Dispositivos
              </label>
              <input
                type="number"
                value={maxDevices}
                onChange={(e) => setMaxDevices(Number(e.target.value))}
                min={1}
                max={10}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Delete Confirm =====
function DeleteConfirm({
  user,
  onClose,
}: {
  user: AdminUserItem;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteUser();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(user.id);
      toast.success("Usuário excluído");
      onClose();
    } catch {
      toast.error("Erro ao excluir usuário");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-3">
          Excluir Usuário
        </h2>
        <p className="text-sm text-[var(--color-textDim)] mb-6">
          Tem certeza que deseja excluir{" "}
          <strong className="text-[var(--color-textMain)]">{user.name}</strong>?
          Todos os dados associados serão removidos permanentemente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] text-sm font-medium hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleteMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Page =====
export default function UsersPage() {
  const [params, setParams] = useState<AdminUsersParams>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUserItem | null>(null);

  const queryParams: AdminUsersParams = {
    ...params,
    ...(search && { search }),
    ...(filterRole && { role: filterRole }),
    ...(filterStatus && { subStatus: filterStatus }),
  };

  const { data, isLoading } = useAdminUsers(queryParams);
  const { data: stats } = useUsersStats();
  const revokeMutation = useRevokeSessions();

  const users = data?.users || [];
  const pagination = data?.pagination;

  const handleRevoke = async (userId: string, userName: string) => {
    try {
      const result = await revokeMutation.mutateAsync(userId);
      toast.success(
        `${result.sessionsRevoked} sessão(ões) de ${userName} revogada(s)`,
      );
    } catch {
      toast.error("Erro ao revogar sessões");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
            Usuários
          </h1>
          <p className="text-sm text-[var(--color-textDim)]">
            Gerenciamento de contas e permissões
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:brightness-110"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-xs text-[var(--color-textDim)]">Total</span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.totalUsers}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-red-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Admins
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.byRole?.ADMIN || 0}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <PenTool className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Editores
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.activeEditors}
            </p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span className="text-xs text-[var(--color-textDim)]">
                Ativos
              </span>
            </div>
            <p className="text-xl font-bold text-[var(--color-textMain)]">
              {stats.byStatus?.ACTIVE || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setParams((p) => ({ ...p, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/10 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setParams((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/10 text-sm text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">Todas as roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setParams((p) => ({ ...p, page: 1 }));
          }}
          className="px-3 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/10 text-sm text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
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
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-10 w-10 text-[var(--color-textDim)] mx-auto mb-3" />
            <p className="text-sm text-[var(--color-textDim)]">
              Nenhum usuário encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-[var(--color-textDim)] px-4 py-3">
                    Usuário
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--color-textDim)] px-4 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--color-textDim)] px-4 py-3 hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--color-textDim)] px-4 py-3 hidden md:table-cell">
                    Sessões
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--color-textDim)] px-4 py-3 hidden lg:table-cell">
                    Criado
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--color-textDim)] px-4 py-3">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          {u.name}
                        </p>
                        <p className="text-xs text-[var(--color-textDim)]">
                          {u.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {statusBadge(u.subStatus)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-[var(--color-textDim)]">
                        {u._count.sessions}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-[var(--color-textDim)]">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-blue-400 hover:bg-blue-500/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRevoke(u.id, u.name)}
                          title="Revogar sessões"
                          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          title="Excluir"
                          className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-[var(--color-textDim)]">
              {pagination.total} usuário(s) · Página {pagination.page} de{" "}
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
      {(showCreate || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowCreate(false);
            setEditingUser(null);
          }}
        />
      )}
      {deletingUser && (
        <DeleteConfirm
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}
