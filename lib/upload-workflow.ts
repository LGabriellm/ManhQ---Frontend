import type {
  UploadItem,
  UploadItemStatus,
  UploadSessionDetail,
  UploadSessionStatus,
  UploadSource,
  UploadStageEvent,
  UploadStageName,
} from "@/types/upload-workflow";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const SESSION_STATUS_META: Record<
  UploadSessionStatus,
  { label: string; tone: StatusTone }
> = {
  ANALYZING: { label: "Analisando", tone: "info" },
  READY_FOR_REVIEW: { label: "Pronto para revisão", tone: "warning" },
  APPROVAL_PENDING: { label: "Aguardando aprovação", tone: "warning" },
  PROCESSING: { label: "Processando", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  PARTIAL_FAILURE: { label: "Concluído com falhas", tone: "warning" },
  FAILED: { label: "Falhou", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
  EXPIRED: { label: "Expirado", tone: "neutral" },
};

export const ITEM_STATUS_META: Record<
  UploadItemStatus,
  { label: string; tone: StatusTone }
> = {
  RECEIVED: { label: "Recebido", tone: "neutral" },
  ANALYZING: { label: "Analisando", tone: "info" },
  READY_FOR_REVIEW: { label: "Pronto para revisão", tone: "warning" },
  APPROVAL_PENDING: { label: "Aguardando aprovação", tone: "warning" },
  QUEUED: { label: "Na fila", tone: "info" },
  PROCESSING: { label: "Processando", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
  SKIPPED: { label: "Ignorado", tone: "neutral" },
  REJECTED: { label: "Rejeitado", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
};

export const CONFIDENCE_META: Record<
  UploadItem["suggestion"]["confidence"],
  { label: string; tone: StatusTone }
> = {
  high: { label: "Alta confiança", tone: "success" },
  medium: { label: "Confiança média", tone: "warning" },
  low: { label: "Baixa confiança", tone: "danger" },
};

export const TONE_STYLES: Record<StatusTone, string> = {
  neutral: "bg-white/6 text-[var(--color-textDim)] border-white/10",
  info: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-200 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-200 border-rose-500/20",
};

export function itemNeedsManualChoice(item: UploadItem): boolean {
  return item.plan.selectionConfirmed !== true;
}

export function itemNeedsRetry(item: UploadItem): boolean {
  return item.status === "FAILED";
}

export function countItemsNeedingManualChoice(items: UploadItem[]): number {
  return items.filter(itemNeedsManualChoice).length;
}

export function countItemsFailed(items: UploadItem[]): number {
  return items.filter((item) => item.status === "FAILED").length;
}

export function getSessionProgress(session: UploadSessionDetail): number {
  const total = session.counts.total || session.items.length;
  if (!total) {
    return 0;
  }

  const completed =
    session.counts.completed +
    session.counts.skipped +
    session.counts.failed +
    session.counts.rejected;

  return Math.round((completed / total) * 100);
}

export function getPrimaryStage(events: UploadStageEvent[]): UploadStageEvent | null {
  return events.find((event) => event.status === "RUNNING") || events.at(-1) || null;
}

export function formatUploadStage(stage: UploadStageName | string | null): string {
  if (!stage) {
    return "Sem etapa";
  }

  const map: Record<string, string> = {
    UPLOAD_RECEIVED: "Recebimento",
    FILE_VALIDATION: "Validação do arquivo",
    ARCHIVE_INSPECTION: "Inspeção do pacote",
    METADATA_EXTRACTION: "Extração de metadados",
    EVIDENCE_COLLECTION: "Coleta de evidências",
    TITLE_NORMALIZATION: "Normalização do título",
    SERIES_MATCHING: "Busca de série",
    CONFIDENCE_DECISION: "Decisão de confiança",
    OPTIMIZATION: "Otimização",
    PERSISTENCE: "Persistência",
  };

  return map[stage] || stage;
}

export function getItemHeadline(item: UploadItem): string {
  return (
    item.plan.newSeriesTitle ||
    item.plan.targetSeriesId ||
    item.suggestion.matchedSeriesTitle ||
    item.originalName
  );
}

export function getSourceLabel(source: UploadSource): string {
  return source === "GOOGLE_DRIVE" ? "Google Drive" : "Upload local";
}

export function isReviewPhase(status: UploadSessionStatus): boolean {
  return status === "ANALYZING" || status === "READY_FOR_REVIEW";
}

export function isTerminalSession(status: UploadSessionStatus): boolean {
  return (
    status === "COMPLETED" ||
    status === "PARTIAL_FAILURE" ||
    status === "FAILED" ||
    status === "CANCELED" ||
    status === "EXPIRED"
  );
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("pt-BR");
}
