"use client";

import type { UploadSessionSummary } from "@/types/upload-workflow";
import {
  SESSION_STATUS_META,
  TONE_STYLES,
  formatDateTime,
  getSourceLabel,
} from "@/lib/upload-workflow";

interface UploadSessionListProps {
  sessions: UploadSessionSummary[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
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
        const status = SESSION_STATUS_META[session.status];
        const isActive = activeSessionId === session.id;

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
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[status.tone]}`}
              >
                {status.label}
              </span>
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
                  {session.counts.reviewRequired}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Em fila
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {session.counts.queued + session.counts.processing}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
                  Falhas
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
                  {session.counts.failed + session.counts.rejected}
                </p>
              </div>
            </div>

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
