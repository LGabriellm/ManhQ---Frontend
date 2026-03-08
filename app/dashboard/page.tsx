"use client";

import React from "react";
import { useAdminDashboard } from "@/hooks/useAdmin";
import { AuthCover } from "@/components/AuthCover";
import {
  BookOpen,
  FileText,
  Users,
  Image,
  AlertTriangle,
  Tags,
  ImageOff,
  Activity,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  color = "var(--color-primary)",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--color-textMain)]">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      <p className="text-sm text-[var(--color-textDim)] mt-1">{label}</p>
    </div>
  );
}

function HealthCard({
  label,
  value,
  icon: Icon,
  severity,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  severity: "ok" | "warning" | "danger";
}) {
  const colors = {
    ok: "#22c55e",
    warning: "#eab308",
    danger: "#ef4444",
  };
  const color = colors[severity];

  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-white/5 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-textDim)]">{label}</p>
        <p className="text-lg font-semibold" style={{ color }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, refetch, isRefetching } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--color-textDim)]">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p>Erro ao carregar dashboard</p>
      </div>
    );
  }

  const { overview, health, recentSeries } = data;

  const healthSeverity = (val: number): "ok" | "warning" | "danger" => {
    if (val === 0) return "ok";
    if (val <= 5) return "warning";
    return "danger";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
            Dashboard
          </h1>
          <p className="text-[var(--color-textDim)] text-sm mt-1">
            Visão geral do sistema
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors text-sm"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Séries"
          value={overview.totalSeries}
          icon={BookOpen}
          color="#6366f1"
        />
        <StatCard
          label="Total de Capítulos"
          value={overview.totalChapters}
          icon={FileText}
          color="#8b5cf6"
        />
        <StatCard
          label="Total de Usuários"
          value={overview.totalUsers}
          icon={Users}
          color="#22c55e"
        />
        <StatCard
          label="Total de Páginas"
          value={overview.totalPages}
          icon={Image}
          color="#eab308"
        />
      </div>

      {/* Health */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--color-primary)]" />
          Saúde da Biblioteca
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HealthCard
            label="Sem Metadados"
            value={health.seriesWithoutMeta}
            icon={AlertTriangle}
            severity={healthSeverity(health.seriesWithoutMeta)}
          />
          <HealthCard
            label="Sem Tags"
            value={health.seriesWithoutTags}
            icon={Tags}
            severity={healthSeverity(health.seriesWithoutTags)}
          />
          <HealthCard
            label="Sem Capa"
            value={health.seriesWithoutCover}
            icon={ImageOff}
            severity={healthSeverity(health.seriesWithoutCover)}
          />
        </div>
      </div>

      {/* Recent Series */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--color-primary)]" />
          Séries Recentes
        </h2>
        <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium">
                    Série
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium hidden sm:table-cell">
                    Capítulos
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium hidden md:table-cell">
                    Adicionada em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentSeries.map((series) => (
                  <tr
                    key={series.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {series.coverUrl ? (
                          <AuthCover
                            coverUrl={series.coverUrl}
                            alt={series.title}
                            className="w-10 h-14 rounded-md object-cover shrink-0"
                            compact
                          />
                        ) : (
                          <div className="w-10 h-14 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-4 w-4 text-[var(--color-textDim)]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[var(--color-textMain)] font-medium truncate">
                            {series.title}
                          </p>
                          {series.author && (
                            <p className="text-xs text-[var(--color-textDim)] truncate">
                              {series.author}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-textDim)] hidden sm:table-cell">
                      {series.chaptersCount}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-textDim)] hidden md:table-cell">
                      {new Date(series.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {recentSeries.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-[var(--color-textDim)]"
                    >
                      Nenhuma série recente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
