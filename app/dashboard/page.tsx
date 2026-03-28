"use client";

import React from "react";
import { AuthCover } from "@/components/AuthCover";
import { FeedbackState } from "@/components/FeedbackState";
import { useAdminDashboard } from "@/hooks/useAdmin";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Clock,
  FileText,
  Image,
  ImageOff,
  Loader2,
  RefreshCw,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";

function formatMetric(value: string | number) {
  return typeof value === "number" ? value.toLocaleString("pt-BR") : value;
}

function SectionHeading({
  icon: Icon,
  label,
  title,
  description,
}: {
  icon: React.ElementType;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="section-kicker">{label}</p>
        <h2 className="mt-3 flex items-center gap-2 text-xl font-semibold text-[var(--color-textMain)]">
          <Icon className="h-5 w-5 text-[var(--color-primary)]" />
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-[var(--color-textDim)]">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="surface-panel rounded-[28px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
            {label}
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-textMain)] sm:text-4xl">
            {formatMetric(value)}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
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
    warning: "#f59e0b",
    danger: "#ef4444",
  };
  const color = colors[severity];

  return (
    <div className="surface-panel-muted rounded-[26px] p-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--color-textDim)]">{label}</p>
          <p className="mt-1 text-xl font-semibold" style={{ color }}>
            {formatMetric(value)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, refetch, isRefetching } = useAdminDashboard();

  if (isLoading) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Carregando dashboard"
          description="Atualizando os indicadores mais recentes da biblioteca."
          tone="info"
          className="grid min-h-[52vh] place-content-center"
        />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-shell">
        <FeedbackState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Não foi possível carregar o dashboard"
          description="Os indicadores administrativos não responderam. Tente atualizar para buscar uma nova leitura."
          tone="danger"
          actionLabel="Tentar novamente"
          onAction={() => {
            void refetch();
          }}
          className="grid min-h-[52vh] place-content-center"
        />
      </main>
    );
  }

  const { overview, health, recentSeries } = data;

  const healthSeverity = (value: number): "ok" | "warning" | "danger" => {
    if (value === 0) return "ok";
    if (value <= 5) return "warning";
    return "danger";
  };

  const healthCards = [
    {
      label: "Sem perfil canônico",
      value: health.seriesWithoutMetadataProfile ?? health.seriesWithoutMeta,
      icon: Sparkles,
    },
    {
      label: "Revisão de metadata",
      value: health.seriesPendingMetadataReview ?? 0,
      icon: Clock,
    },
    {
      label: "Sem metadados",
      value: health.seriesWithoutMeta,
      icon: AlertTriangle,
    },
    {
      label: "Sem tags",
      value: health.seriesWithoutTags,
      icon: Tags,
    },
    {
      label: "Sem capa",
      value: health.seriesWithoutCover,
      icon: ImageOff,
    },
  ] as const;

  return (
    <main className="page-shell space-y-8">
      <header className="page-header">
        <div>
          <p className="section-kicker">Administração</p>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-description">
            Visão consolidada da biblioteca, com foco em qualidade de metadata,
            cobertura de conteúdo e ritmo de crescimento recente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          disabled={isRefetching}
          className="ui-btn-secondary px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          Atualizar indicadores
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total de séries"
          value={overview.totalSeries}
          icon={BookOpen}
          accent="#6366f1"
        />
        <StatCard
          label="Total de capítulos"
          value={overview.totalChapters}
          icon={FileText}
          accent="#8b5cf6"
        />
        <StatCard
          label="Total de usuários"
          value={overview.totalUsers}
          icon={Users}
          accent="#22c55e"
        />
        <StatCard
          label="Total de páginas"
          value={overview.totalPages}
          icon={Image}
          accent="#f59e0b"
        />
      </section>

      <section className="space-y-4">
        <SectionHeading
          icon={Activity}
          label="Qualidade"
          title="Saúde da biblioteca"
          description="Os cards abaixo destacam as filas que merecem atenção manual antes de novos lotes entrarem em produção."
        />

        <div className="surface-panel rounded-[30px] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm text-[var(--color-textDim)]">
                Completude de metadata
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-[var(--color-textMain)]">
                {health.metadataCompleteness}%
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge-soft text-[var(--color-textMain)]">
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                  {health.seriesPendingMetadataReview ?? 0} aguardando revisão
                </span>
                <span className="badge-soft text-[var(--color-textMain)]">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  {health.seriesWithoutMetadataProfile ?? health.seriesWithoutMeta} sem perfil
                </span>
              </div>
            </div>

            <div className="surface-panel-muted rounded-[26px] px-4 py-3 text-sm text-[var(--color-textDim)]">
              <p className="font-medium text-[var(--color-textMain)]">
                Meta operacional
              </p>
              <p className="mt-1 max-w-xs leading-6">
                Priorize os itens em revisão antes de novas importações para
                manter a taxa de completude alta.
              </p>
            </div>
          </div>

          <div className="mt-5 h-2.5 rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, health.metadataCompleteness))}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {healthCards.map(({ label, value, icon }) => (
            <HealthCard
              key={label}
              label={label}
              value={value}
              icon={icon}
              severity={healthSeverity(value)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          icon={Clock}
          label="Conteúdo"
          title="Séries recentes"
          description="As últimas entradas ajudam a validar se a ingestão e a organização do acervo estão seguindo o padrão esperado."
        />

        <div className="surface-panel overflow-hidden rounded-[30px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="px-5 py-4 text-left font-medium text-[var(--color-textDim)]">
                    Série
                  </th>
                  <th className="px-5 py-4 text-left font-medium text-[var(--color-textDim)]">
                    Capítulos
                  </th>
                  <th className="px-5 py-4 text-left font-medium text-[var(--color-textDim)]">
                    Adicionada em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {recentSeries.map((series) => (
                  <tr key={series.id} className="transition-colors hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {series.coverUrl ? (
                          <AuthCover
                            coverUrl={series.coverUrl}
                            alt={series.title}
                            className="h-16 w-11 shrink-0 rounded-lg object-cover"
                            compact
                          />
                        ) : (
                          <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5">
                            <BookOpen className="h-4 w-4 text-[var(--color-textDim)]" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-textMain)]">
                            {series.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--color-textDim)]">
                            {series.author || "Autor não informado"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--color-textDim)]">
                      {formatMetric(series.chaptersCount)}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-textDim)]">
                      {new Date(series.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}

                {recentSeries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-12 text-center text-[var(--color-textDim)]"
                    >
                      Nenhuma série recente registrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
