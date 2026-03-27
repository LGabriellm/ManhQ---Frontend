export type UploadSource = "LOCAL" | "GOOGLE_DRIVE";

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

export type UploadItemStatus =
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

export type UploadApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type UploadOptimizationStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "SKIPPED";

export type UploadDecision = "EXISTING_SERIES" | "NEW_SERIES" | "SKIP";

export type UploadSuggestionDecision =
  | "PRESELECTED"
  | "STRONG_SUGGESTION"
  | "MANUAL_REVIEW";

export type UploadSuggestionConfidence = "low" | "medium" | "high";

export type UploadStageName =
  | "UPLOAD_RECEIVED"
  | "FILE_VALIDATION"
  | "ARCHIVE_INSPECTION"
  | "METADATA_EXTRACTION"
  | "EVIDENCE_COLLECTION"
  | "TITLE_NORMALIZATION"
  | "SERIES_MATCHING"
  | "CONFIDENCE_DECISION"
  | "OPTIMIZATION"
  | "PERSISTENCE";

export type UploadStageStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "SKIPPED"
  | "FAILED";

export interface UploadSessionMetadata {
  autoSubmitRequested?: boolean;
  forcedSeriesTitle?: string | null;
  targetSeriesId?: string | null;
  folderNameHint?: string | null;
  manualSelectionConfirmed?: boolean;
  deferRemoteDownload?: boolean;
  workflow?: string;
  userRole?: string;
}

export interface UploadSessionSummary {
  id: string;
  source: UploadSource;
  status: UploadSessionStatus;
  inputName: string | null;
  metadata: UploadSessionMetadata;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  finalizedAt: string | null;
  canceledAt: string | null;
  counts: {
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
  };
  lastError: {
    code: string | null;
    message: string | null;
  } | null;
}

export interface UploadSessionDetail extends UploadSessionSummary {
  items: UploadItem[];
}

export interface UploadSessionListResponse {
  success: true;
  sessions: UploadSessionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadSessionDetailResponse {
  success: true;
  session: UploadSessionDetail;
}

export interface UploadDraft {
  id: string;
  source: UploadSource;
  createdAt: number;
  expiresAt: number | null;
  sessionStatus: UploadSessionStatus;
  items: UploadItem[];
  rejected: UploadRejectedItem[];
  processing: {
    state: "processing" | "completed" | "failed";
    totalReceived: number;
    analyzedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    startedAt: number;
    finishedAt?: number;
    error?: string;
  };
}

export interface UploadDraftResponse {
  success: true;
  draft: UploadDraft;
}

export type GoogleDriveDraftResponse = UploadDraftResponse;

export interface UploadRejectedItem {
  itemId?: string;
  fileId?: string;
  filename?: string;
  reason: string;
}

export interface UploadSeriesCandidate {
  normalizedTitle: string;
  evidenceScore: number;
  combinedScore: number;
  evidenceSources: Array<
    | "forced_series_title"
    | "target_series"
    | "embedded_metadata"
    | "folder_name"
    | "archive_root"
    | "archive_entry"
    | "file_name"
    | "parsed_title"
    | "chapter_pattern"
  >;
  sourceCount?: number;
  matchedSeriesId?: string;
  matchedSeriesTitle?: string;
  matchedAlias?: string;
  matchScore?: number;
  matchStrategy?: string;
}

export interface UploadEvidence {
  id: string;
  source: string;
  rawValue: string;
  normalizedTitle?: string;
  accepted: boolean;
  weight: number;
  score?: number;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface UploadStageEvent {
  id: string;
  stage: UploadStageName;
  status: UploadStageStatus;
  detail?: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface UploadSuggestion {
  existingSeriesMatch: boolean;
  confidence: UploadSuggestionConfidence;
  confidenceScore: number;
  decision: UploadSuggestionDecision;
  reviewRequired: boolean;
  matchedSeriesId?: string;
  matchedSeriesTitle?: string;
  candidates: UploadSeriesCandidate[];
  warnings: string[];
  conflicts: string[];
  stages: UploadStageEvent[];
  evidence: UploadEvidence[];
  decisionReason?: string;
}

export interface UploadPlan {
  decision: UploadDecision;
  targetSeriesId: string | null;
  newSeriesTitle: string | null;
  selectionConfirmed: boolean;
  selectionSource: string | null;
  destinationReady: boolean;
  chapterNumber: number | null;
  volume: number | null;
  year: number | null;
  isOneShot: boolean;
  tags: string[];
  description: string;
  status: string;
  author: string;
  artist: string;
}

export interface UploadApproval {
  status: UploadApprovalStatus;
  reviewedAt: string | null;
  reason: string | null;
  reviewerId: string | null;
}

export interface UploadOptimization {
  status: UploadOptimizationStatus;
  stats: Record<string, unknown> | null;
}

export interface UploadResult {
  seriesId: string | null;
  seriesTitle: string | null;
  mediaId: string | null;
  queueJobId: string | null;
}

export interface UploadErrorInfo {
  code: string | null;
  message: string | null;
}

export interface UploadItem {
  id: string;
  source: UploadSource;
  status: UploadItemStatus;
  currentStage: string | null;
  originalName: string;
  safeName: string;
  extension: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  fileHash: string | null;
  detectedFileType: string | null;
  pageCount: number | null;
  archiveEntryCount: number | null;
  archiveSummary: Record<string, unknown> | null;
  embeddedMetadata: Record<string, unknown> | null;
  suggestion: UploadSuggestion;
  ingestion: Record<string, unknown>;
  plan: UploadPlan;
  approval: UploadApproval;
  optimization: UploadOptimization;
  result: UploadResult;
  error: UploadErrorInfo | null;
  createdAt: string;
  updatedAt: string;
  queuedAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
}

export interface UpdateUploadDraftItemRequest {
  decision?: UploadDecision;
  targetSeriesId?: string;
  newSeriesTitle?: string;
  chapterNumber?: number;
  volume?: number | null;
  year?: number | null;
  isOneShot?: boolean;
  tags?: string[];
  description?: string;
  status?: string;
  author?: string;
  artist?: string;
}

export interface BulkUpdateUploadDraftRequest {
  targetSeriesId?: string;
  seriesTitle?: string;
  items?: Array<{
    itemId: string;
    selected?: boolean;
    chapterNumber?: number;
    volume?: number | null;
    year?: number | null;
    isOneShot?: boolean;
  }>;
}

export interface UploadDraftItemResponse {
  success: true;
  item: UploadItem;
}

export interface UploadDraftBulkResponse {
  success: true;
  draft: UploadDraft;
}

export interface UploadDraftCancelResponse {
  success: true;
  canceled: true;
}

export interface UploadDraftConfirmResponse {
  success: true;
  accepted: Array<{
    itemId: string;
    filename: string;
    jobId?: string;
    queueState: "APPROVAL_PENDING" | "QUEUED";
  }>;
  rejected: Array<{
    itemId: string;
    filename: string;
    reason: string;
  }>;
  skipped: Array<{
    itemId: string;
    filename: string;
  }>;
  totals: {
    accepted: number;
    rejected: number;
    skipped: number;
  };
  session: UploadSessionDetail;
}

export interface UploadRetryItemResponse {
  success: true;
  session: UploadSessionDetail;
}

export interface StageLocalUploadResponse {
  success: true;
  draftId: string;
  status: UploadSessionStatus;
  expiresAt: string | null;
  session: Pick<UploadSessionSummary, "id" | "status">;
  nextStep: string;
}

export interface UploadSessionCreatedResponse {
  success: true;
  message: string;
  sessionId: string;
  session: Pick<UploadSessionSummary, "id" | "status">;
}

export interface GoogleDriveAccount {
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleDriveAuthUrlResponse {
  url: string;
}

export interface GoogleDriveStatusResponse {
  connected: boolean;
  account?: GoogleDriveAccount;
}

export interface GoogleDriveCallbackResponse {
  success: true;
  connected: boolean;
  account?: GoogleDriveAccount;
}

export interface GoogleDriveDisconnectResponse {
  success: true;
  connected: false;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
  driveId?: string | null;
  modifiedTime?: string | null;
  shared?: boolean | null;
  ownedByMe?: boolean | null;
  owners?: Array<{
    displayName?: string | null;
    emailAddress?: string | null;
  }>;
}

export interface GoogleDriveFoldersResponse {
  success: true;
  folders: GoogleDriveFolder[];
  nextPageToken?: string | null;
}

export interface GoogleDriveFoldersParams {
  parentId?: string;
  pageToken?: string;
  pageSize?: number;
}

export interface GoogleDriveNodeFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string | null;
  modifiedTime?: string | null;
  parents?: string[];
  driveId?: string | null;
  supported: boolean;
}

export interface GoogleDriveNodesResponse {
  success: true;
  folders: GoogleDriveFolder[];
  files: GoogleDriveNodeFile[];
  nextPageToken?: string | null;
}

export interface GoogleDriveNodesParams {
  parentId: string;
  pageToken?: string;
  pageSize?: number;
}

export interface GoogleDrivePreviewResponse {
  success: true;
  recursive: boolean;
  maxFiles: number;
  supportedFiles: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string | null;
    modifiedTime?: string | null;
    parents?: string[];
    driveId?: string | null;
  }>;
  supportedCount: number;
  unsupportedCount: number;
}

export interface GoogleDriveStageRequest {
  folderId?: string;
  fileIds?: string[];
  recursive?: boolean;
  maxFiles?: number;
  forcedSeriesTitle?: string;
  folderNameHint?: string;
}

export interface GoogleDriveStageResponse {
  success: true;
  draftId: string;
  status: UploadSessionStatus;
  expiresAt: string | null;
  session: UploadSessionSummary;
  rejected: Array<{
    fileId?: string;
    filename?: string;
    reason: string;
  }>;
  nextStep: string;
}

export interface GoogleDriveImportRequest {
  folderId?: string;
  fileIds?: string[];
  recursive?: boolean;
  maxFiles?: number;
  dryRun?: boolean;
  targetSeriesId?: string;
  newSeriesTitle?: string;
  folderNameHint?: string;
}

export interface GoogleDriveImportDryRunResponse {
  success: true;
  dryRun: true;
  folderId?: string;
  recursive: boolean;
  maxFiles: number;
  supportedCount: number;
  unsupportedCount: number;
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size?: string | null;
    modifiedTime?: string | null;
    parents?: string[];
    driveId?: string | null;
  }>;
}

export interface GoogleDriveImportResponse {
  success: true;
  message: string;
  folderId?: string;
  recursive: boolean;
  maxFiles: number;
  supportedCount: number;
  unsupportedCount: number;
  sessionId: string;
  session: UploadSessionSummary;
}

export interface UploadApprovalListItem extends UploadItem {
  approvalId: string;
  sessionId: string;
  submitterId: string;
  submitterName?: string | null;
  submitterEmail?: string | null;
  createdAt: string;
  fileExists?: boolean;
}
