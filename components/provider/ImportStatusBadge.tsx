"use client";

import type { TitleImportStatus, ChapterImportStatus } from "@/types/api";

type ImportStatus = TitleImportStatus | ChapterImportStatus;

const STATUS_STYLES: Record<
  ImportStatus,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  TRACKED: {
    bg: "bg-blue-400/10",
    text: "text-blue-300",
    border: "border-blue-400/20",
    dot: "bg-blue-400",
    label: "Rastreando",
  },
  IMPORTING: {
    bg: "bg-yellow-400/10",
    text: "text-yellow-300",
    border: "border-yellow-400/20",
    dot: "bg-yellow-400",
    label: "Importando",
  },
  IMPORTED: {
    bg: "bg-emerald-400/10",
    text: "text-emerald-300",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
    label: "Importado",
  },
  PAUSED: {
    bg: "bg-slate-400/10",
    text: "text-slate-300",
    border: "border-slate-400/20",
    dot: "bg-slate-400",
    label: "Pausado",
  },
  FAILED: {
    bg: "bg-red-400/10",
    text: "text-red-300",
    border: "border-red-400/20",
    dot: "bg-red-400",
    label: "Falhou",
  },
  PENDING: {
    bg: "bg-blue-400/10",
    text: "text-blue-300",
    border: "border-blue-400/20",
    dot: "bg-blue-400",
    label: "Pendente",
  },
  DOWNLOADING: {
    bg: "bg-yellow-400/10",
    text: "text-yellow-300",
    border: "border-yellow-400/20",
    dot: "bg-yellow-400",
    label: "Baixando",
  },
  DOWNLOADED: {
    bg: "bg-cyan-400/10",
    text: "text-cyan-300",
    border: "border-cyan-400/20",
    dot: "bg-cyan-400",
    label: "Baixado",
  },
  SKIPPED: {
    bg: "bg-slate-400/10",
    text: "text-slate-300",
    border: "border-slate-400/20",
    dot: "bg-slate-400",
    label: "Ignorado",
  },
};

interface ImportStatusBadgeProps {
  status: ImportStatus;
  pulse?: boolean;
  className?: string;
}

export function ImportStatusBadge({
  status,
  pulse,
  className = "",
}: ImportStatusBadgeProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${pulse ? "animate-pulse" : ""}`}
      />
      {styles.label}
    </span>
  );
}
