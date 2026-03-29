import type {
  UploadDraft,
  UploadJobState,
  UploadItem,
  UploadItemStatus,
  UploadSessionDetail,
  UploadSessionStatus,
  UploadSessionSummary,
  UploadSource,
  UploadStageEvent,
  UploadStageName,
  UploadWorkflow,
  UploadWorkflowCounts,
  UploadWorkflowNextAction,
  UploadWorkflowState,
} from "@/types/upload-workflow";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const TERMINAL_WORKFLOW_STATES = new Set<UploadWorkflowState>([
  "COMPLETED",
  "PARTIAL_FAILURE",
  "FAILED",
  "CANCELED",
  "EXPIRED",
]);

const POLLING_WORKFLOW_ACTIONS = new Set<UploadWorkflowNextAction>([
  "POLL_ANALYSIS",
  "WAIT_APPROVAL",
  "POLL_PROCESSING",
]);

export const WORKFLOW_STATE_META: Record<
  UploadWorkflowState,
  { label: string; tone: StatusTone }
> = {
  ANALYZING: { label: "Analisando", tone: "info" },
  REVIEW_REQUIRED: { label: "Revisão necessária", tone: "warning" },
  READY_FOR_REVIEW: { label: "Revisão necessária", tone: "warning" },
  READY_TO_CONFIRM: { label: "Pronto para confirmar", tone: "info" },
  APPROVAL_PENDING: { label: "Aguardando aprovação", tone: "warning" },
  PROCESSING: { label: "Processando", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  PARTIAL_FAILURE: { label: "Parcialmente concluído", tone: "warning" },
  FAILED: { label: "Falhou", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
  EXPIRED: { label: "Expirado", tone: "neutral" },
};

export const SESSION_STATUS_META = WORKFLOW_STATE_META as Record<
  UploadSessionStatus,
  { label: string; tone: StatusTone }
>;

export const NEXT_ACTION_META: Record<
  UploadWorkflowNextAction,
  { label: string; description: string }
> = {
  POLL_ANALYSIS: {
    label: "Aguardando análise",
    description:
      "O backend ainda está analisando os arquivos e montando as sugestões.",
  },
  REVIEW_ITEMS: {
    label: "Revisar itens",
    description:
      "Há itens em revisão manual. Ajuste as escolhas pendentes antes de continuar.",
  },
  CONFIRM_UPLOAD: {
    label: "Confirmar envio",
    description:
      "Os itens restantes já estão válidos para envio. Confirme quando estiver satisfeito.",
  },
  WAIT_APPROVAL: {
    label: "Esperando aprovação",
    description:
      "O envio foi submetido e agora depende de aprovação administrativa.",
  },
  POLL_PROCESSING: {
    label: "Acompanhar processamento",
    description:
      "Os arquivos já foram enfileirados e o backend está processando o lote.",
  },
  RETRY_FAILED_ITEMS: {
    label: "Repetir falhas",
    description:
      "Há itens com falha. Você pode reenfileirar somente os que falharam.",
  },
  START_NEW_UPLOAD: {
    label: "Iniciar novo upload",
    description:
      "Este draft não pode mais continuar. É preciso iniciar um novo envio.",
  },
  DONE: {
    label: "Fluxo concluído",
    description:
      "O backend não está aguardando nenhuma ação adicional para esta sessão.",
  },
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

export const JOB_STATE_META: Record<
  UploadJobState,
  { label: string; tone: StatusTone }
> = {
  analyzing: { label: "Analisando", tone: "info" },
  review_required: { label: "Revisão pendente", tone: "warning" },
  approval_pending: { label: "Aguardando aprovação", tone: "warning" },
  queued: { label: "Na fila", tone: "info" },
  retrying: { label: "Reprocessando", tone: "warning" },
  running: { label: "Processando", tone: "info" },
  completed: { label: "Concluído", tone: "success" },
  failed: { label: "Falhou", tone: "danger" },
  skipped: { label: "Ignorado", tone: "neutral" },
  rejected: { label: "Rejeitado", tone: "danger" },
  canceled: { label: "Cancelado", tone: "neutral" },
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
  neutral: "border-white/10 bg-white/6 text-[var(--color-textDim)]",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-200",
};

function countItemsByStatus(
  items: UploadItem[] | undefined,
  statuses: UploadItemStatus[],
): number {
  if (!items?.length) {
    return 0;
  }

  const statusSet = new Set(statuses);
  return items.filter((item) => statusSet.has(item.status)).length;
}

function buildFallbackWorkflowCounts(args: {
  items?: UploadItem[];
  workflowCounts?: Partial<UploadWorkflowCounts> | null;
  totalItems?: number;
  processing?: UploadDraft["processing"] | null;
  reviewRequiredHint?: number;
  failedHint?: number;
}): UploadWorkflowCounts {
  const {
    items,
    workflowCounts,
    totalItems = items?.length ?? args.processing?.totalReceived ?? 0,
    processing,
    reviewRequiredHint,
    failedHint,
  } = args;

  const pendingAnalysis =
    workflowCounts?.pendingAnalysis ??
    (processing
      ? Math.max(processing.totalReceived - processing.analyzedCount, 0)
      : countItemsByStatus(items, ["RECEIVED", "ANALYZING"]));

  const reviewRequired =
    workflowCounts?.reviewRequired ??
    reviewRequiredHint ??
    countItemsByStatus(items, ["READY_FOR_REVIEW"]);

  const confirmable =
    workflowCounts?.confirmable ??
    items?.filter(
      (item) =>
        item.status === "READY_FOR_REVIEW" &&
        item.plan.selectionConfirmed === true,
    ).length ??
    Math.max(totalItems - pendingAnalysis - reviewRequired, 0);

  const failed =
    workflowCounts?.failed ??
    failedHint ??
    countItemsByStatus(items, ["FAILED", "REJECTED"]);

  return {
    pendingAnalysis,
    reviewRequired,
    confirmable,
    failed,
    alreadyHandled: workflowCounts?.alreadyHandled ?? 0,
  };
}

function getFallbackNextAction(
  state: UploadWorkflowState,
  counts: UploadWorkflowCounts,
): UploadWorkflowNextAction {
  switch (state) {
    case "ANALYZING":
      return "POLL_ANALYSIS";
    case "REVIEW_REQUIRED":
    case "READY_FOR_REVIEW":
      return "REVIEW_ITEMS";
    case "READY_TO_CONFIRM":
      return "CONFIRM_UPLOAD";
    case "APPROVAL_PENDING":
      return "WAIT_APPROVAL";
    case "PROCESSING":
      return "POLL_PROCESSING";
    case "PARTIAL_FAILURE":
      return counts.failed > 0 ? "RETRY_FAILED_ITEMS" : "DONE";
    case "FAILED":
      return counts.failed > 0 ? "RETRY_FAILED_ITEMS" : "START_NEW_UPLOAD";
    case "COMPLETED":
      return "DONE";
    case "CANCELED":
    case "EXPIRED":
      return "START_NEW_UPLOAD";
    default:
      return "DONE";
  }
}

function normalizeWorkflowState(state: UploadWorkflowState): UploadWorkflowState {
  return state === "READY_FOR_REVIEW" ? "REVIEW_REQUIRED" : state;
}

function normalizeWorkflow(args: {
  workflow?: Partial<UploadWorkflow> | null;
  state: UploadWorkflowState;
  items?: UploadItem[];
  totalItems?: number;
  processing?: UploadDraft["processing"] | null;
  reviewRequiredHint?: number;
  failedHint?: number;
  submitted?: boolean;
}): UploadWorkflow {
  const counts = buildFallbackWorkflowCounts({
    items: args.items,
    workflowCounts: args.workflow?.counts,
    totalItems: args.totalItems,
    processing: args.processing,
    reviewRequiredHint: args.reviewRequiredHint,
    failedHint: args.failedHint,
  });

  const state = normalizeWorkflowState(args.workflow?.state ?? args.state);
  const nextAction = args.workflow?.nextAction ?? getFallbackNextAction(state, counts);
  const isTerminal = args.workflow?.isTerminal ?? TERMINAL_WORKFLOW_STATES.has(state);
  const canEdit = args.workflow?.canEdit ?? nextAction === "REVIEW_ITEMS";
  const canConfirm = args.workflow?.canConfirm ?? nextAction === "CONFIRM_UPLOAD";

  return {
    state,
    nextAction,
    canEdit,
    canConfirm,
    isTerminal,
    submitted:
      args.workflow?.submitted ??
      args.submitted ??
      (state === "APPROVAL_PENDING" ||
        state === "PROCESSING" ||
        state === "COMPLETED" ||
        state === "PARTIAL_FAILURE"),
    counts,
  };
}

export function resolveSessionWorkflow(
  session: {
    status: UploadSessionStatus;
    workflow?: Partial<UploadWorkflow> | null;
    counts?: Partial<UploadSessionSummary["counts"]>;
    items?: UploadItem[];
    submittedAt?: string | null;
  },
): UploadWorkflow {
  return normalizeWorkflow({
    workflow: session.workflow,
    state: session.status,
    items: session.items,
    totalItems: session.counts?.total,
    reviewRequiredHint: session.counts?.reviewRequired,
    failedHint:
      (session.counts?.failed ?? 0) + (session.counts?.rejected ?? 0),
    submitted: session.submittedAt ? true : undefined,
  });
}

export function resolveDraftWorkflow(draft: UploadDraft): UploadWorkflow {
  return normalizeWorkflow({
    workflow: draft.workflow,
    state: draft.workflow?.state ?? draft.sessionStatus,
    items: draft.items,
    totalItems: draft.processing.totalReceived || draft.items.length,
    processing: draft.processing,
    reviewRequiredHint: draft.items.filter((item) => item.status === "READY_FOR_REVIEW").length,
    failedHint: draft.items.filter((item) => item.status === "FAILED").length,
  });
}

export function shouldPollWorkflow(workflow: UploadWorkflow | null | undefined): boolean {
  return Boolean(workflow && POLLING_WORKFLOW_ACTIONS.has(workflow.nextAction));
}

export function workflowNeedsDraft(workflow: UploadWorkflow | null | undefined): boolean {
  if (!workflow || workflow.isTerminal) {
    return false;
  }

  return (
    workflow.nextAction === "POLL_ANALYSIS" ||
    workflow.canEdit ||
    workflow.canConfirm
  );
}

export function getWorkflowSummary(
  workflow: UploadWorkflow | null | undefined,
): { label: string; description: string } | null {
  if (!workflow) {
    return null;
  }

  return NEXT_ACTION_META[workflow.nextAction];
}

export function itemNeedsManualChoice(item: UploadItem): boolean {
  const reviewStatus =
    item.status === "READY_FOR_REVIEW" || item.job.state === "review_required";

  return Boolean(
    reviewStatus &&
      (item.job.userActionRequired ||
        item.parsing.requiresManualReview ||
        item.parsing.confidence === "low" ||
        item.plan.selectionConfirmed !== true),
  );
}

export function itemCanBeEdited(
  item: UploadItem,
  workflow: UploadWorkflow | null | undefined,
): boolean {
  return Boolean(
    workflow?.canEdit &&
      item.status === "READY_FOR_REVIEW" &&
      item.job.canReview,
  );
}

export function itemNeedsRetry(item: UploadItem): boolean {
  return item.job.canRetry || item.job.state === "failed";
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
    confidence_decision: "Decisão de confiança",
    optimization: "Otimização",
    persistence: "Persistência",
    file_validation: "Validação do arquivo",
    metadata_extraction: "Extração de metadados",
    archive_inspection: "Inspeção do pacote",
    evidence_collection: "Coleta de evidências",
    title_normalization: "Normalização do título",
    series_matching: "Busca de série",
  };

  return map[stage] || stage;
}

export function getItemHeadline(item: UploadItem): string {
  return (
    item.plan.newSeriesTitle ||
    item.suggestion.matchedSeriesTitle ||
    item.originalName
  );
}

export function getSourceLabel(source: UploadSource): string {
  return source === "GOOGLE_DRIVE" ? "Google Drive" : "Upload local";
}

export function isReviewPhase(status: UploadSessionStatus): boolean {
  return (
    status === "ANALYZING" ||
    status === "REVIEW_REQUIRED" ||
    status === "READY_FOR_REVIEW" ||
    status === "READY_TO_CONFIRM"
  );
}

export function isTerminalSession(status: UploadSessionStatus): boolean {
  return TERMINAL_WORKFLOW_STATES.has(status);
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
