"use client";

import React, { useState, useMemo } from "react";
import {
  useAdminUsers,
  useAdminUsersStats,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useRevokeSessions,
} from "@/hooks/useAdmin";
import type {
  AdminUser,
  AdminUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
  UserRole,
  SubStatus,
} from "@/types/api";
import {
  Users,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  LogOut,
  X,
  Loader2,
  Crown,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

// ===== Role badge styling =====
const roleBadge: Record<string, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "bg-red-500/20 text-red-400 border border-red-500/30",
  },
  EDITOR: {
    label: "Editor",
    className: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  },
  SUBSCRIBER: {
    label: "Assinante",
    className: "bg-green-500/20 text-green-400 border border-green-500/30",
  },
  FREE: {
    label: "Grátis",
    className: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Ativo",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  INACTIVE: {
    label: "Inativo",
    className: "bg-gray-500/20 text-gray-400",
  },
  PAST_DUE: {
    label: "Vencido",
    className: "bg-yellow-500/20 text-yellow-400",
  },
  CANCELED: {
    label: "Cancelado",
    className: "bg-red-500/20 text-red-400",
  },
};

// ===== Create/Edit User Modal =====
function UserModal({
  user,
  onClose,
}: {
  user?: AdminUser | null;
  onClose: () => void;
}) {
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const isEditing = !!user;
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(
    (user?.role as UserRole) || "FREE",
  );
  const [subStatus, setSubStatus] = useState<SubStatus>(
    (user?.subStatus as SubStatus) || "ACTIVE",
  );
  const [maxDevices, setMaxDevices] = useState(user?.maxDevices || 3);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && user) {
        const data: UpdateUserRequest = { name, role, subStatus, maxDevices };
        if (password) data.password = password;
        await updateMutation.mutateAsync({ id: user.id, data });
        toast.success("Usuário atualizado!");
      } else {
        const data: CreateUserRequest = {
          name,
          email,
          password,
          role,
          subStatus,
        };
        await createMutation.mutateAsync(data);
        toast.success("Usuário criado!");
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar usuário";
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
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
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="Nome do usuário"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!isEditing}
              disabled={isEditing}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Senha {isEditing && "(deixe em branco para manter)"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditing}
                minLength={8}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 pr-10 text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)]"
                placeholder={isEditing ? "Nova senha..." : "Senha forte..."}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-textDim)]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Função
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="FREE">Grátis</option>
              <option value="SUBSCRIBER">Assinante</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1">
              Status
            </label>
            <select
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value as SubStatus)}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="PAST_DUE">Vencido</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>

          {/* Max Devices (edit only) */}
          {isEditing && (
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1">
                Máx. Dispositivos
              </label>
              <input
                type="number"
                value={maxDevices}
                onChange={(e) =>
                  setMaxDevices(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
                max={10}
                className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary)]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Delete Confirmation Modal =====
function DeleteUserModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteUser();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(user.id);
      toast.success("Usuário excluído!");
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao excluir usuário";
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl border border-white/10 w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-2">
          Excluir Usuário
        </h2>
        <p className="text-[var(--color-textDim)] text-sm mb-6">
          Tem certeza que deseja excluir{" "}
          <strong className="text-[var(--color-textMain)]">{user.name}</strong>?
          Todos os dados associados serão removidos permanentemente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-[var(--color-textDim)] hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

// ===== Main Page =====
export default function UsersManagementPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<SubStatus | "">("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  const revokeMutation = useRevokeSessions();

  const params = useMemo<AdminUsersParams>(() => {
    const p: AdminUsersParams = { page, limit: 20 };
    if (search) p.search = search;
    if (roleFilter) p.role = roleFilter;
    if (statusFilter) p.subStatus = statusFilter;
    return p;
  }, [search, roleFilter, statusFilter, page]);

  const { data: statsData } = useAdminUsersStats();
  const { data, isLoading } = useAdminUsers(params);

  const handleRevokeSessions = async (user: AdminUser) => {
    try {
      const result = await revokeMutation.mutateAsync(user.id);
      toast.success(result.message);
    } catch {
      toast.error("Erro ao revogar sessões");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
            Gerenciamento de Usuários
          </h1>
          <p className="text-sm text-[var(--color-textDim)] mt-1">
            Gerencie contas, funções e permissões
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary)]/80 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-[var(--color-textMain)]">
              {statsData.totalUsers}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Total de Usuários
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-blue-400">
              {statsData.activeEditors}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Editores Ativos
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-green-400">
              {statsData.byStatus?.ACTIVE || 0}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Contas Ativas
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4">
            <div className="text-2xl font-bold text-red-400">
              {statsData.byRole?.ADMIN || 0}
            </div>
            <div className="text-xs text-[var(--color-textDim)] mt-1">
              Admins
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[var(--color-background)] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
              showFilters || roleFilter || statusFilter
                ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-white/10 text-[var(--color-textDim)] hover:bg-white/5"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | "");
                setPage(1);
              }}
              className="bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Todas as funções</option>
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="SUBSCRIBER">Assinante</option>
              <option value="FREE">Grátis</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SubStatus | "");
                setPage(1);
              }}
              className="bg-[var(--color-background)] border border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--color-textMain)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="PAST_DUE">Vencido</option>
              <option value="CANCELED">Cancelado</option>
            </select>
            {(roleFilter || statusFilter) && (
              <button
                onClick={() => {
                  setRoleFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : !data?.users?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--color-textDim)]">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs text-[var(--color-textDim)] uppercase tracking-wider">
                    <th className="px-6 py-3">Usuário</th>
                    <th className="px-6 py-3">Função</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Sessões</th>
                    <th className="px-6 py-3">Submissões</th>
                    <th className="px-6 py-3">Criado em</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-[var(--color-textMain)]">
                            {user.name}
                          </div>
                          <div className="text-xs text-[var(--color-textDim)]">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[user.role]?.className || "bg-gray-500/20 text-gray-400"}`}
                        >
                          {user.role === "ADMIN" && (
                            <Crown className="h-3 w-3 mr-1" />
                          )}
                          {user.role === "EDITOR" && (
                            <Pencil className="h-3 w-3 mr-1" />
                          )}
                          {roleBadge[user.role]?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[user.subStatus || "ACTIVE"]?.className || "bg-gray-500/20 text-gray-400"}`}
                        >
                          {statusBadge[user.subStatus || "ACTIVE"]?.label ||
                            user.subStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-textDim)]">
                        {user._count?.sessions ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-textDim)]">
                        {user._count?.submittedApprovals ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-textDim)]">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingUser(user)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRevokeSessions(user)}
                            title="Revogar sessões"
                            className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingUser(user)}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-[var(--color-textDim)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
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

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {data.users.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--color-textMain)]">
                        {user.name}
                      </div>
                      <div className="text-xs text-[var(--color-textDim)]">
                        {user.email}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[user.role]?.className || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {roleBadge[user.role]?.label || user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-textDim)]">
                    <span
                      className={`px-2 py-0.5 rounded-full ${statusBadge[user.subStatus || "ACTIVE"]?.className}`}
                    >
                      {statusBadge[user.subStatus || "ACTIVE"]?.label}
                    </span>
                    <span>{user._count?.sessions ?? 0} sessões</span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-[var(--color-textDim)] hover:bg-white/5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleRevokeSessions(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sessões
                    </button>
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <span className="text-sm text-[var(--color-textDim)]">
                  {data.pagination.total} usuário(s) — Página {page} de{" "}
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
      {(showCreateModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
        />
      )}
      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}
