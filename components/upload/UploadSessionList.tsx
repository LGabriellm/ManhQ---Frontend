"use client";

import type { UploadSessionSummary } from "@/types/upload-workflow";
import {
  NEXT_ACTION_META,
  OPERATIONAL_STATE_META,
  TONE_STYLES,
  WORKFLOW_STATE_META,
  formatDateTime,
  getSourceLabel,
} from "@/lib/upload-workflow";

interface UploadSessionListProps {
  sessions: UploadSessionSummary[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

function getResolvedCount(session: UploadSessionSummary): number {
  return (
    session.counts.completed +
    session.counts.skipped +
    session.counts.failed +
    session.counts.rejected
  );
}

export function UploadSessionList({
  sessions,
  activeSessionId,
  onSelect,
}: UploadSessionListProps) {
  if (!sessions.length) {
    return (
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 text-sm text-[var(--color-textDim)]">
        Nenhuma sessão recente. Inicie um upload ou uma importação para abrir o
        workspace de revisão.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {sessions.map((session) => {
        const workflowMeta = WORKFLOW_STATE_META[session.workflow.state];
        const runtimeMeta = OPERATIONAL_STATE_META[session.operational.state];
        const nextActionMeta = NEXT_ACTION_META[session.workflow.nextAction];
        const isActive = activeSessionId === session.id;
        const total = session.counts.total || 0;
        const resolved = getResolvedCount(session);
        const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

        return (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            className={`rounded-3xl border p-4 text-left transition-colors ${
              isActive
                ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/8"
                : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-textMain)]">
                  {session.inputName || `Sessão ${session.id.slice(0, 8)}`}
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  {getSourceLabel(session.source)} · atualizada em{" "}
                  {formatDateTime(session.updatedAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[workflowMeta.tone]}`}
                >
                  {workflowMeta.label}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[runtimeMeta.tone]}`}
                >
                  {runtimeMeta.label}
                </span>
                {isActive && (
                  <span className="inline-flex items-center rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/12 px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)]">
                    Ativa
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.9fr)]">
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Próxima ação
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {nextActionMeta.label}
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  {nextActionMeta.description}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 ${
                  session.operational.state === "stuck"
                    ? "border-rose-500/20 bg-rose-500/10"
                    : session.operational.state === "cancel_requested"
                      ? "border-amber-500/20 bg-amber-500/10"
                      : "border-white/8 bg-black/10"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Saúde operacional
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-textMain)]">
                  {runtimeMeta.description}
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  Ativos {session.operational.counts.active} · cancelando{" "}
                  {session.operational.counts.cancelRequested} · travados{" "}
                  {session.operational.counts.stuck}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-[var(--color-textDim)] sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Itens
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {session.counts.total}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Revisão
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {session.workflow.counts.reviewRequired}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Confirmáveis
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {session.workflow.counts.confirmable}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Falhas
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {session.workflow.counts.failed}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--color-textDim)]">
                <span>Progresso resolvido</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {(session.expiresAt || session.operational.lastActivityAt) && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-textDim)]">
                {session.expiresAt && !session.workflow.isTerminal && (
                  <span>Expira em {formatDateTime(session.expiresAt)}</span>
                )}
                {session.operational.lastActivityAt && (
                  <span>
                    Última atividade {formatDateTime(session.operational.lastActivityAt)}
                  </span>
                )}
              </div>
            )}

            {session.lastError?.message && (
              <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {session.lastError.message}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
