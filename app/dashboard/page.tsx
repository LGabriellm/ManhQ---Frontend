"use client";

import React, { useMemo } from "react";
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
  HardDrive,
  UserCheck,
  TrendingUp,
  BarChart3,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// ─── KPI Card with left border accent ──────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="surface-panel rounded-2xl p-5 border-l-[3px] transition-colors hover:bg-white/[0.035]"
      style={{ borderLeftColor: accent }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-textDim)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-textMain)] sm:text-3xl tabular-nums">
            {formatMetric(value)}
          </p>
          {subtitle && (
            <p className="mt-1 text-[11px] text-[var(--color-textDim)]/60">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}

// ─── Simple Bar Chart ──────────────────────────────────────────────────────────

interface BarDatum {
  label: string;
  value: number;
}

function SimpleBarChart({
  data,
  accent = "#e50914",
  valueFormatter,
  height = 140,
}: {
  data: BarDatum[];
  accent?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
}) {
  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-[var(--color-textDim)]">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const fillPct = Math.max((d.value / maxValue) * 100, 2);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
            <span className="text-[9px] tabular-nums font-semibold text-[var(--color-textDim)]/70">
              {valueFormatter ? valueFormatter(d.value) : d.value}
            </span>
            <div className="w-full flex-1 rounded-t-md bg-white/5 relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-500"
                style={{
                  height: `${fillPct}%`,
                  backgroundColor: accent,
                  opacity: fillPct > 50 ? 0.85 : 0.55,
                }}
              />
            </div>
            <span className="text-[9px] text-[var(--color-textDim)]/50 text-center leading-tight truncate w-full">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity Row ──────────────────────────────────────────────────────────────

interface ActivityRow {
  user: string;
  action: string;
  target: string;
  date: string;
}

function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="surface-panel overflow-hidden rounded-[30px]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-white/6">
              <th className="px-5 py-4 text-left font-medium text-[var(--color-textDim)]">
                Usuário
              </th>
              <th className="px-5 py-4 text-left font-medium text-[var(--color-textDim)]">
                Ação
              </th>
              <th className="px-5 py-4 text-left font-medium text-[var(--color-textDim)]">
                Alvo
              </th>
              <th className="px-5 py-4 text-right font-medium text-[var(--color-textDim)]">
                Data
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((row, i) => (
              <tr
                key={i}
                className="transition-colors hover:bg-white/[0.025]"
              >
                <td className="px-5 py-3.5 text-[var(--color-textMain)] font-medium truncate max-w-[160px]">
                  {row.user}
                </td>
                <td className="px-5 py-3.5 text-[var(--color-textDim)]">
                  {row.action}
                </td>
                <td className="px-5 py-3.5 text-[var(--color-textDim)] truncate max-w-[200px]">
                  {row.target}
                </td>
                <td className="px-5 py-3.5 text-right text-[var(--color-textDim)] tabular-nums">
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page Component ────────────────────────────────────────────────────────────

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

  // ─── KPI data ──────────────────────────────────────────────────────
  // TODO: connect "activeToday" and "storageUsed" to real backend endpoints when ready
  const activeToday = undefined as number | undefined; // TODO: fetch from /admin/stats/active-today
  const storageUsed = undefined as string | undefined; // TODO: fetch from /admin/storage status

  const kpiCards = [
    {
      label: "Total de Usuários",
      value: overview.totalUsers,
      icon: Users,
      accent: "#3b82f6",
      subtitle: "Cadastrados na plataforma",
    },
    {
      label: "Ativos Hoje",
      value: activeToday ?? "—",
      icon: UserCheck,
      accent: "#22c55e",
      subtitle: activeToday !== undefined
        ? "Leitores únicos nas últimas 24h"
        : "Disponível em breve",
    },
    {
      label: "Total de Séries",
      value: overview.totalSeries,
      icon: BookOpen,
      accent: "#a855f7",
      subtitle: "No acervo catalogado",
    },
    {
      label: "Armazenamento",
      value: storageUsed ?? "—",
      icon: HardDrive,
      accent: "#f59e0b",
      subtitle: storageUsed !== undefined
        ? "Espaço ocupado em disco"
        : "Disponível em breve",
    },
  ];

  // ─── Chart data ────────────────────────────────────────────────────
  // TODO: connect to real backend endpoints when ready
  // GET /admin/stats/new-users?days=30 and GET /admin/stats/chapters-read?days=7

  // Placeholder: last 30 days new users
  const newUsers30Days: BarDatum[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      label: d.toLocaleDateString("pt-BR", { day: "numeric", month: "numeric" }),
      value: 0, // TODO: populate from real data
    };
  });

  // Placeholder: last 7 days chapters read
  const chapters7Days: BarDatum[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      value: 0, // TODO: populate from real data
    };
  });

  // ─── Activity data ─────────────────────────────────────────────────
  // TODO: connect to GET /audit-log?limit=10 when backend endpoint is ready
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _auditLogRows: ActivityRow[] = []; // TODO: fetch from backend

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

      {/* ─── KPI Cards Row ──────────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={TrendingUp}
          label="Métricas"
          title="Indicadores principais"
          description="Visão de alto nível da saúde da plataforma e da base de usuários."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              accent={kpi.accent}
            />
          ))}
        </div>
      </section>

      {/* ─── Standard Stat Cards (existing) ─────────────────────────── */}
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

      {/* ─── Charts Section ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={BarChart3}
          label="Análise"
          title="Gráficos de atividade"
          description="Acompanhe o crescimento de usuários e o volume de leitura ao longo dos dias."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* New users chart */}
          <div className="surface-panel rounded-[30px] p-5 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-textMain)]">
              <Users className="h-4 w-4 text-blue-400" />
              Novos usuários — últimos 30 dias
            </h3>
            <SimpleBarChart
              data={newUsers30Days}
              accent="#3b82f6"
              valueFormatter={(v) => (v > 0 ? String(v) : "")}
              height={120}
            />
            {newUsers30Days.every((d) => d.value === 0) && (
              <p className="mt-3 text-center text-xs text-[var(--color-textDim)]/60">
                TODO: conectar ao endpoint real quando o backend estiver pronto
              </p>
            )}
          </div>

          {/* Chapters read chart */}
          <div className="surface-panel rounded-[30px] p-5 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-textMain)]">
              <BookOpen className="h-4 w-4 text-purple-400" />
              Capítulos lidos — últimos 7 dias
            </h3>
            <SimpleBarChart
              data={chapters7Days}
              accent="#a855f7"
              valueFormatter={(v) => (v > 0 ? String(v) : "")}
              height={120}
            />
            {chapters7Days.every((d) => d.value === 0) && (
              <p className="mt-3 text-center text-xs text-[var(--color-textDim)]/60">
                TODO: conectar ao endpoint real quando o backend estiver pronto
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── Health section (existing) ──────────────────────────────── */}
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

      {/* ─── Recent activity table ──────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={List}
          label="Atividade"
          title="Registro recente"
          description="Últimas ações registradas no sistema. Inclui uploads, edições e moderação."
        />

        {_auditLogRows.length > 0 ? (
          <ActivityTable rows={_auditLogRows} />
        ) : (
          <div className="surface-panel rounded-[30px] p-8 text-center">
            <List className="mx-auto h-8 w-8 text-[var(--color-textDim)]/30" />
            <p className="mt-3 text-sm font-medium text-[var(--color-textDim)]">
              Nenhuma atividade registrada
            </p>
            <p className="mt-1 text-xs text-[var(--color-textDim)]/60">
              TODO: conectar ao endpoint <code className="rounded bg-white/5 px-1 py-0.5 text-[10px]">GET /audit-log</code> quando o backend estiver pronto
            </p>
          </div>
        )}
      </section>

      {/* ─── Recent series (existing) ───────────────────────────────── */}
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
