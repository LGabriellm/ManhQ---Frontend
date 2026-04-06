/* ─────────────────────────────────────────────────────────────────────────────
 * Upload Pipeline — Domain Types
 *
 * Strictly follows UPLOAD_FRONTEND_INTEGRATION.md and API_ENDPOINTS.md.
 * ───────────────────────────────────────────────────────────────────────────── */

// ── Enums / Union Types ─────────────────────────────────────────────────────

export type UploadSource = "LOCAL" | "GOOGLE_DRIVE";

export type SeriesStatus = "ONGOING" | "COMPLETED" | "HIATUS" | "DROPPED" | "UNKNOWN";

export const SERIES_STATUS_OPTIONS: { value: SeriesStatus; label: string }[] = [
  { value: "ONGOING", label: "Em andamento" },
  { value: "COMPLETED", label: "Completo" },
  { value: "HIATUS", label: "Hiato" },
  { value: "DROPPED", label: "Abandonado" },
  { value: "UNKNOWN", label: "Desconhecido" },
];

// ── Validation Limits (must match backend Zod schema) ─────────────────────
export const UPLOAD_LIMITS = {
  TAGS_MAX_COUNT: 50,
  TAG_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 5_000,
  AUTHOR_MAX_LENGTH: 200,
  ARTIST_MAX_LENGTH: 200,
  NEW_SERIES_TITLE_MAX_LENGTH: 500,
} as const;

export type UploadSessionStatus =
  | "ANALYZING"
  | "READY_FOR_REVIEW"
  | "APPROVAL_PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_FAILURE"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

export type WorkflowState =
  | "ANALYZING"
  | "REVIEW_REQUIRED"
  | "READY_TO_CONFIRM"
  | "APPROVAL_PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_FAILURE"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

export type WorkflowNextAction =
  | "POLL_ANALYSIS"
  | "REVIEW_ITEMS"
  | "CONFIRM_UPLOAD"
  | "WAIT_APPROVAL"
  | "POLL_PROCESSING"
  | "RETRY_FAILED_ITEMS"
  | "START_NEW_UPLOAD"
  | "DONE";

export type ItemStatus =
  | "RECEIVED"
  | "ANALYZING"
  | "READY_FOR_REVIEW"
  | "APPROVAL_PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "REJECTED"
  | "CANCELED";

export type ItemDecision = "EXISTING_SERIES" | "NEW_SERIES" | "SKIP";

export type SuggestionConfidence = "low" | "medium" | "high";

export type OperationalState =
  | "analyzing"
  | "review_required"
  | "approval_pending"
  | "queued"
  | "retrying"
  | "running"
  | "cancel_requested"
  | "stuck"
  | "completed"
  | "failed"
  | "skipped"
  | "rejected"
  | "canceled"
  | "unknown";

// ── Workflow Summary ────────────────────────────────────────────────────────

export interface WorkflowCounts {
  total: number;
  pendingAnalysis: number;
  reviewRequired: number;
  confirmable: number;
  approvalPending: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
  alreadyHandled: number;
}

export interface WorkflowSummary {
  state: WorkflowState;
  nextAction: WorkflowNextAction;
  canEdit: boolean;
  canConfirm: boolean;
  canExtend: boolean;
  isTerminal: boolean;
  submitted: boolean;
  progressPercent: number;
  counts: WorkflowCounts;
}

// ── Session Operational ─────────────────────────────────────────────────────

export interface SessionOperational {
  state: OperationalState;
  canCancel: boolean;
  counts: {
    total: number;
    active: number;
    cancelRequested: number;
    stuck: number;
    failed: number;
    completed: number;
  };
  cancelRequestedAt: string | null;
  cancelReason: string | null;
  lastActivityAt: string | null;
  heartbeatTimeoutMs: number | null;
}

// ── Session Callbacks ───────────────────────────────────────────────────────

export interface SessionCallbacks {
  poll: string;
  events: string;
  draft: string | null;
}

// ── Session Summary & Counts ────────────────────────────────────────────────

export interface SessionCounts {
  total: number;
  analyzed: number;
  reviewRequired: number;
  approvalPending: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  rejected: number;
  skipped: number;
}

export interface SessionSummary {
  id: string;
  source: UploadSource;
  status: UploadSessionStatus;
  workflow: WorkflowSummary;
  operational: SessionOperational;
  inputName: string | null;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  cancelRequestedAt: string | null;
  canceledAt: string | null;
  counts: SessionCounts;
  lastError: { code: string; message: string } | null;
  callbacks: SessionCallbacks;
}

// ── Draft Summary (list endpoint) ───────────────────────────────────────────

export interface DraftSummary {
  id: string;
  source: UploadSource;
  status: UploadSessionStatus;
  inputName: string | null;
  createdAt: string;
  expiresAt: string | null;
  itemCount: number;
  workflow: {
    state: string;
    nextAction: string;
    canEdit: boolean;
    canConfirm: boolean;
    progressPercent: number;
  };
  counts: {
    total: number;
    reviewRequired: number;
    completed: number;
    failed: number;
  };
}

// ── Draft Detail ────────────────────────────────────────────────────────────

export interface DraftDetail {
  id: string;
  source: UploadSource;
  createdAt: string;
  expiresAt: string | null;
  sessionStatus: UploadSessionStatus;
  workflow: WorkflowSummary;
  operational: SessionOperational;
  items: UploadItem[];
  rejected: UploadItem[];
  callbacks: SessionCallbacks;
}

// ── Upload Item ─────────────────────────────────────────────────────────────

export interface ItemSuggestion {
  existingSeriesMatch: boolean;
  confidence: SuggestionConfidence;
  confidenceScore: number;
  decision: string;
  reviewRequired: boolean;
  matchedSeriesId?: string;
  matchedSeriesTitle?: string;
  candidates: unknown[];
  warnings: string[];
  conflicts: string[];
  decisionReason?: string;
}

export interface ItemParsing {
  chapterNumber: number | null;
  chapterDisplay: string | null;
  confidence: SuggestionConfidence | null;
  requiresManualReview: boolean;
  selectedCandidate: unknown | null;
  candidateOptions: unknown[];
  ignoredCandidates: unknown[];
  notes: string[];
}

export interface ItemPlan {
  decision: string | null;
  targetSeriesId: string | null;
  newSeriesTitle: string | null;
  selectionConfirmed: boolean;
  selectionSource: string | null;
  destinationReady: boolean;
  chapterNumber: number | null;
  chapterDisplay: string | null;
  volume: number | null;
  year: number | null;
  isOneShot: boolean;
  tags: string[];
  description: string;
  status: SeriesStatus | string;
  author: string;
  artist: string;
}

export interface EditableSeries {
  decision: string | null;
  targetSeriesId: string | null;
  newSeriesTitle: string | null;
  selectionConfirmed: boolean;
}

export interface EditableChapter {
  chapterNumber: number | null;
  chapterDisplay: string | null;
  volume: number | null;
  year: number | null;
  isOneShot: boolean;
}

export interface EditableMetadata {
  tags: string[];
  description: string;
  status: SeriesStatus | string;
  author: string;
  artist: string;
}

export interface EditableSections {
  series: EditableSeries;
  chapter: EditableChapter;
  metadata: EditableMetadata;
}

export interface ItemBlocker {
  field: string;
  message: string;
}

export interface ItemJob {
  state: string;
  stage: string | null;
  userActionRequired: boolean;
  canRetry: boolean;
  canCancel: boolean;
  canReview: boolean;
  retrying: boolean;
  isTerminal: boolean;
  isCancelRequested: boolean;
  isStuck: boolean;
  lastProgressPercent: number | null;
  queueJobId: string | null;
  queuedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
  cancelRequestedAt: string | null;
  cancelReason: string | null;
  canceledAt: string | null;
  lastHeartbeatAt: string | null;
  lastActivityAt: string | null;
  heartbeatAgeMs: number | null;
  staleAfterMs: number | null;
}

export interface ItemResult {
  seriesId: string | null;
  seriesTitle: string | null;
  mediaId: string | null;
  queueJobId: string | null;
}

export interface UploadItem {
  id: string;
  source: UploadSource;
  status: ItemStatus;
  currentStage: string | null;
  originalName: string;
  safeName: string;
  extension: string;
  mimeType: string | null;
  sizeBytes: number | null;
  fileHash: string | null;
  detectedFileType: string | null;
  pageCount: number | null;
  archiveEntryCount: number | null;
  archiveSummary: Record<string, unknown> | null;
  embeddedMetadata: Record<string, unknown> | null;
  suggestion: ItemSuggestion;
  parsing: ItemParsing;
  plan: ItemPlan;
  editableSections: EditableSections;
  blockers: ItemBlocker[];
  approval: {
    status: string | null;
    reviewedAt: string | null;
    reason: string | null;
    reviewerId: string | null;
  };
  optimization: {
    status: string | null;
    stats: unknown | null;
  };
  result: ItemResult;
  error: { code: string | null; message: string | null } | null;
  job: ItemJob;
  createdAt: string;
  updatedAt: string;
  queuedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
  cancelRequestedAt: string | null;
  canceledAt: string | null;
  lastHeartbeatAt: string | null;
}

// ── Edit Request Types ──────────────────────────────────────────────────────

export interface UpdateItemRequest {
  decision?: ItemDecision;
  targetSeriesId?: string;
  newSeriesTitle?: string;
  chapterNumber?: number;
  chapterDisplay?: string;
  volume?: number | null;
  year?: number | null;
  isOneShot?: boolean;
  tags?: string[];
  description?: string;
  status?: SeriesStatus | string;
  author?: string;
  artist?: string;
}

export interface BulkUpdateRequest {
  targetSeriesId?: string;
  seriesTitle?: string;
  items?: Array<{
    itemId: string;
    selected?: boolean;
    chapterNumber?: number;
    chapterDisplay?: string;
  }>;
}

// ── Confirm Response ────────────────────────────────────────────────────────

export interface ConfirmResult {
  success: boolean;
  accepted: Array<{
    itemId: string;
    filename: string;
    jobId?: string;
    queueState?: string;
  }>;
  rejected: Array<{ itemId: string; filename: string; reason: string }>;
  skipped: Array<{ itemId: string; filename: string }>;
  alreadyHandled: Array<{
    itemId: string;
    filename: string;
    status: string;
    reason: string;
  }>;
  noOp: boolean;
  totals: {
    accepted: number;
    rejected: number;
    skipped: number;
    alreadyHandled: number;
  };
  session: SessionSummary & { items: UploadItem[] };
}

// ── Stage Response ──────────────────────────────────────────────────────────

export interface StageResponse {
  success: boolean;
  draftId: string;
  status: string;
  expiresAt: string | null;
  session: SessionSummary;
  nextStep: string;
}

// ── Cancel Response ─────────────────────────────────────────────────────────

export interface CancelDraftResult {
  success: boolean;
  canceled: boolean;
  session: SessionSummary & { items: UploadItem[] };
  results: Array<{
    itemId: string;
    outcome: "canceled" | "requested" | "already_terminal";
    status?: string;
  }>;
  totals: { canceled: number; requested: number; alreadyTerminal: number };
}

// ── Google Drive Types ──────────────────────────────────────────────────────

export interface GoogleDriveStatusConnected {
  connected: true;
  status: "CONNECTED";
  account: Record<string, unknown>;
}

export interface GoogleDriveAuthChallenge {
  connected: false;
  status: "AUTH_REQUIRED";
  googleDrive: {
    connected: false;
    authUrl: string;
    intent: string | null;
  };
}

export type GoogleDriveStatus =
  | GoogleDriveStatusConnected
  | GoogleDriveAuthChallenge;

export interface GoogleDriveNode {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  [key: string]: unknown;
}

export interface GoogleDriveNodesResponse {
  success: boolean;
  folders: GoogleDriveNode[];
  files: GoogleDriveNode[];
  nextPageToken?: string;
}

export interface GoogleDriveStageRequest {
  folderId?: string;
  fileIds?: string[];
  recursive?: boolean;
  maxFiles?: number;
  forcedSeriesTitle?: string;
  folderNameHint?: string;
}

export interface GoogleDriveStageResponse extends StageResponse {
  rejected: Array<{ fileId?: string; filename?: string; reason: string }>;
}

export interface GoogleDriveCallbackMessage {
  source: "google_drive_callback";
  success: boolean;
  connected: boolean;
  account?: { email?: string; name?: string; picture?: string };
  error?: string;
  errorCode?: string;
  nextAction?: string;
}

// ── SSE Event Types ─────────────────────────────────────────────────────────

export type SseEventType =
  | "session_created"
  | "session_updated"
  | "session_progress"
  | "session_confirmed"
  | "session_finalized"
  | "session_expired"
  | "session_canceled"
  | "item_updated"
  | "item_stage_changed"
  | "item_heartbeat";

export interface SseProgressPayload {
  progressPercent: number;
  state: WorkflowState;
  nextAction: WorkflowNextAction;
  counts: WorkflowCounts;
}

export interface SseItemHeartbeatPayload {
  itemId: string;
  status: ItemStatus;
  stage: string | null;
  progressPercent: number;
  heartbeatAt: string;
}

export interface SseItemUpdatedPayload {
  itemId: string;
  item: UploadItem;
  session: SessionSummary;
}

export interface SseFinalizedPayload {
  session: SessionSummary;
  finalStatus: UploadSessionStatus;
}

// ── Display Helpers ─────────────────────────────────────────────────────────

export const WORKFLOW_STATE_LABELS: Record<WorkflowState, string> = {
  ANALYZING: "Analisando",
  REVIEW_REQUIRED: "Revisão necessária",
  READY_TO_CONFIRM: "Pronto para confirmar",
  APPROVAL_PENDING: "Aguardando aprovação",
  PROCESSING: "Processando",
  COMPLETED: "Concluído",
  PARTIAL_FAILURE: "Falha parcial",
  FAILED: "Falhou",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  RECEIVED: "Recebido",
  ANALYZING: "Analisando",
  READY_FOR_REVIEW: "Para revisão",
  APPROVAL_PENDING: "Aguardando aprovação",
  QUEUED: "Na fila",
  PROCESSING: "Processando",
  COMPLETED: "Concluído",
  FAILED: "Falhou",
  SKIPPED: "Ignorado",
  REJECTED: "Rejeitado",
  CANCELED: "Cancelado",
};

export type ToneColor = "info" | "success" | "warning" | "danger" | "neutral";

export const WORKFLOW_STATE_TONE: Record<WorkflowState, ToneColor> = {
  ANALYZING: "info",
  REVIEW_REQUIRED: "warning",
  READY_TO_CONFIRM: "success",
  APPROVAL_PENDING: "info",
  PROCESSING: "info",
  COMPLETED: "success",
  PARTIAL_FAILURE: "warning",
  FAILED: "danger",
  CANCELED: "neutral",
  EXPIRED: "neutral",
};

export const ITEM_STATUS_TONE: Record<ItemStatus, ToneColor> = {
  RECEIVED: "neutral",
  ANALYZING: "info",
  READY_FOR_REVIEW: "warning",
  APPROVAL_PENDING: "info",
  QUEUED: "neutral",
  PROCESSING: "info",
  COMPLETED: "success",
  FAILED: "danger",
  SKIPPED: "neutral",
  REJECTED: "danger",
  CANCELED: "neutral",
};

export const OPERATIONAL_STATE_LABELS: Record<OperationalState, string> = {
  analyzing: "Analisando",
  review_required: "Revisão necessária",
  approval_pending: "Aguardando aprovação",
  queued: "Na fila",
  retrying: "Retentando",
  running: "Executando",
  cancel_requested: "Cancelamento solicitado",
  stuck: "Travado",
  completed: "Concluído",
  failed: "Falhou",
  skipped: "Ignorado",
  rejected: "Rejeitado",
  canceled: "Cancelado",
  unknown: "Desconhecido",
};

export const OPERATIONAL_STATE_TONE: Record<OperationalState, ToneColor> = {
  analyzing: "info",
  review_required: "warning",
  approval_pending: "info",
  queued: "neutral",
  retrying: "warning",
  running: "info",
  cancel_requested: "warning",
  stuck: "danger",
  completed: "success",
  failed: "danger",
  skipped: "neutral",
  rejected: "danger",
  canceled: "neutral",
  unknown: "neutral",
};

export const CONFIDENCE_LABELS: Record<SuggestionConfidence, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const CONFIDENCE_TONE: Record<SuggestionConfidence, ToneColor> = {
  low: "danger",
  medium: "warning",
  high: "success",
};

// ── Tone CSS Class Map ──────────────────────────────────────────────────────

export const TONE_CLASSES: Record<
  ToneColor,
  { bg: string; text: string; border: string; dot: string }
> = {
  info: {
    bg: "bg-sky-500/10",
    text: "text-sky-300",
    border: "border-sky-500/20",
    dot: "bg-sky-400",
  },
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  danger: {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  neutral: {
    bg: "bg-slate-500/10",
    text: "text-slate-300",
    border: "border-slate-500/20",
    dot: "bg-slate-400",
  },
};

// ── Flat tone → className string (used by admin dashboard pages) ────────────

export const TONE_STYLES: Record<ToneColor, string> = {
  info: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  neutral: "bg-slate-500/10 text-slate-300 border-slate-500/20",
};

// ── Compound meta records (label + tone) used by admin pages ────────────────

export const CONFIDENCE_META: Record<
  SuggestionConfidence,
  { label: string; tone: ToneColor }
> = {
  low: { label: "Baixa", tone: "danger" },
  medium: { label: "Média", tone: "warning" },
  high: { label: "Alta", tone: "success" },
};

export const ITEM_STATUS_META: Record<
  ItemStatus,
  { label: string; tone: ToneColor }
> = {
  RECEIVED: { label: "Recebido", tone: "neutral" },
  ANALYZING: { label: "Analisando", tone: "info" },
  READY_FOR_REVIEW: { label: "Para revisão", tone: "warning" },
  APPROVAL_PENDING: { label: "Aguardando aprovação", tone: "info" },
  QUEUED: { label: "Na fila", tone: "neutral" },
  PROCESSING: { label: "Processando", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
  SKIPPED: { label: "Ignorado", tone: "neutral" },
  REJECTED: { label: "Rejeitado", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
};

export const OPERATIONAL_STATE_META: Record<
  OperationalState,
  { label: string; tone: ToneColor; description: string }
> = {
  analyzing: {
    label: "Analisando",
    tone: "info",
    description: "Arquivo em análise.",
  },
  review_required: {
    label: "Revisão necessária",
    tone: "warning",
    description: "Necessita decisão manual.",
  },
  approval_pending: {
    label: "Aprovação pendente",
    tone: "info",
    description: "Aguardando admin.",
  },
  queued: {
    label: "Na fila",
    tone: "neutral",
    description: "Aguardando processamento.",
  },
  retrying: {
    label: "Retentando",
    tone: "warning",
    description: "Reprocessando após falha.",
  },
  running: {
    label: "Executando",
    tone: "info",
    description: "Em processamento ativo.",
  },
  cancel_requested: {
    label: "Cancelando",
    tone: "warning",
    description: "Cancelamento solicitado.",
  },
  stuck: {
    label: "Travado",
    tone: "danger",
    description: "Sem heartbeat recente.",
  },
  completed: {
    label: "Concluído",
    tone: "success",
    description: "Processado com sucesso.",
  },
  failed: { label: "Falhou", tone: "danger", description: "O job falhou." },
  skipped: {
    label: "Ignorado",
    tone: "neutral",
    description: "Ignorado pelo usuário.",
  },
  rejected: {
    label: "Rejeitado",
    tone: "danger",
    description: "Rejeitado pelo admin.",
  },
  canceled: { label: "Cancelado", tone: "neutral", description: "Cancelado." },
  unknown: {
    label: "Desconhecido",
    tone: "neutral",
    description: "Estado não identificado.",
  },
};

// ── Formatting Utilities ────────────────────────────────────────────────────

export function formatDateTime(
  iso: string | number | null | undefined,
): string {
  if (iso == null) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return `${min}m ${rem}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Math.round(value)}%`;
}

export function formatUploadStage(stage: string | null | undefined): string {
  if (!stage) return "—";
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Admin-specific types (approvals, jobs) ──────────────────────────────────

export interface UploadApprovalListItem {
  approvalId: string;
  id: string;
  sessionId: string;
  status: ItemStatus;
  originalName: string;
  suggestion: {
    confidence: SuggestionConfidence;
    confidenceScore: number;
    existingSeriesMatch: boolean;
    decision: string;
    reviewRequired: boolean;
    matchedSeriesId?: string;
    matchedSeriesTitle: string | null;
    warnings: string[];
    conflicts: string[];
    candidates: Array<{
      normalizedTitle: string;
      matchedSeriesTitle?: string;
      combinedScore: number;
      evidenceSources: string[];
    }>;
  };
  plan: {
    decision: string | null;
    targetSeriesId: string | null;
    newSeriesTitle: string | null;
    selectionConfirmed: boolean;
    selectionSource: string | null;
  };
  approval: {
    status: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
    reviewedAt: string | null;
    reason: string | null;
    reviewerId: string | null;
  };
  result: {
    seriesId: string | null;
    seriesTitle: string | null;
    mediaId: string | null;
  };
  error: { code: string | null; message: string | null } | null;
  fileExists: boolean;
  submitterId: string;
  submitterName: string | null;
  submitterEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadJob {
  state: OperationalState;
  stage: string | null;
  userActionRequired: boolean;
  canRetry: boolean;
  canCancel: boolean;
  retrying: boolean;
  isTerminal: boolean;
  isCancelRequested: boolean;
  isStuck: boolean;
  lastProgressPercent: number | null;
  heartbeatAgeMs: number | null;
  cancelReason: string | null;
}

export type UploadSessionDetail = SessionSummary & { items: UploadItem[] };
