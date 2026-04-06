"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * DraftCard — Compact card for draft list view.
 * Shows key draft info: name, status, counts, progress, actions.
 * ───────────────────────────────────────────────────────────────────────────── */

import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Cloud,
  HardDrive,
} from "lucide-react";
import type { DraftSummary } from "@/types/upload";
import { WORKFLOW_STATE_LABELS, WORKFLOW_STATE_TONE } from "@/types/upload";
import { StatusBadge } from "@/components/upload/StatusBadge";
import { ProgressBar } from "@/components/upload/ProgressBar";

interface DraftCardProps {
  draft: DraftSummary;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime() - 3_600_000;
}

export function DraftCard({ draft }: DraftCardProps) {
  const wfState = draft.workflow.state as keyof typeof WORKFLOW_STATE_LABELS;
  const tone = WORKFLOW_STATE_TONE[wfState] ?? "neutral";
  const label = WORKFLOW_STATE_LABELS[wfState] ?? wfState;
  const expiring = isExpiringSoon(draft.expiresAt);

  return (
    <Link
      href={`/dashboard/uploads/${draft.id}`}
      className="group block rounded-xl border border-white/5 bg-[var(--color-surface)] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.02]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {draft.source === "GOOGLE_DRIVE" ? (
              <Cloud className="h-4 w-4 flex-shrink-0 text-sky-400" />
            ) : (
              <HardDrive className="h-4 w-4 flex-shrink-0 text-slate-400" />
            )}
            <h3 className="truncate text-sm font-medium text-[var(--color-textMain)]">
              {draft.inputName || `Draft ${draft.id.slice(0, 8)}`}
            </h3>
          </div>
          <p className="mt-1 text-xs text-[var(--color-textDim)]">
            {draft.itemCount} {draft.itemCount === 1 ? "arquivo" : "arquivos"} ·{" "}
            {formatRelativeTime(draft.createdAt)}
          </p>
        </div>
        <StatusBadge
          label={label}
          tone={tone}
          pulse={wfState === "ANALYZING" || wfState === "PROCESSING"}
        />
      </div>

      {/* Counts summary */}
      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-textDim)]">
        {draft.counts.reviewRequired > 0 && (
          <span className="flex items-center gap-1 text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            {draft.counts.reviewRequired} para revisão
          </span>
        )}
        {draft.counts.completed > 0 && (
          <span className="flex items-center gap-1 text-emerald-300">
            <Check className="h-3 w-3" />
            {draft.counts.completed} concluídos
          </span>
        )}
        {draft.counts.failed > 0 && (
          <span className="flex items-center gap-1 text-rose-300">
            <X className="h-3 w-3" />
            {draft.counts.failed} falhas
          </span>
        )}
      </div>

      {/* Progress */}
      {draft.workflow.progressPercent > 0 &&
        draft.workflow.progressPercent < 100 && (
          <ProgressBar
            percent={draft.workflow.progressPercent}
            className="mt-3"
          />
        )}

      {/* Expiry warning */}
      {expiring && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-300">
          <Clock className="h-3 w-3" />
          Expira em breve — abra para estender
        </div>
      )}

      {/* Processing safe indicator */}
      {!expiring &&
        (draft.workflow.state === "PROCESSING" ||
          (draft.counts.total > 0 &&
            draft.counts.total -
              draft.counts.completed -
              draft.counts.failed >
              0 &&
            draft.workflow.state !== "REVIEW_REQUIRED" &&
            draft.workflow.state !== "READY_TO_CONFIRM")) && (
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-300/60">
            <Check className="h-3 w-3" />
            Não expira enquanto houver itens processando
          </div>
        )}
    </Link>
  );
}
