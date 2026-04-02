import {
  resolveDraftWorkflow,
  resolveSessionOperational,
  resolveSessionWorkflow,
} from "@/lib/upload-workflow";
import api from "@/services/api";
import type {
  BulkUpdateUploadDraftRequest,
  GoogleDriveAuthUrlResponse,
  GoogleDriveCallbackResponse,
  GoogleDriveDisconnectResponse,
  GoogleDriveDraftResponse,
  GoogleDriveFoldersParams,
  GoogleDriveFoldersResponse,
  GoogleDriveImportDryRunResponse,
  GoogleDriveImportRequest,
  GoogleDriveImportResponse,
  GoogleDriveNodesParams,
  GoogleDriveNodesResponse,
  GoogleDrivePreviewResponse,
  GoogleDriveStageRequest,
  GoogleDriveStageResponse,
  GoogleDriveStatusResponse,
  StageLocalUploadResponse,
  UpdateUploadDraftItemRequest,
  UploadDraft,
  UploadDraftBulkResponse,
  UploadDraftCancelResponse,
  UploadDraftConfirmResponse,
  UploadDraftItemResponse,
  UploadDraftResponse,
  UploadItem,
  UploadItemCancellationResponse,
  UploadJob,
  UploadJobState,
  UploadParsing,
  UploadParsingCandidate,
  UploadRetryItemResponse,
  UploadSessionCreatedResponse,
  UploadSessionCallbacks,
  UploadSessionDetail,
  UploadSessionDetailResponse,
  UploadSessionListResponse,
  UploadSessionOperational,
  UploadSessionSummary,
  UploadSource,
  UploadSessionStatus,
} from "@/types/upload-workflow";

function buildDraftRoute(source: UploadSource, draftId: string): string {
  if (source === "GOOGLE_DRIVE") {
    return `/integrations/google-drive/drafts/${draftId}`;
  }

  return `/upload/drafts/${draftId}`;
}

function appendFilesToFormData(formData: FormData, files: File[]) {
  files.forEach((file) => formData.append("files[]", file));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeDateString(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
}

function normalizePathString(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalized = value.trim();

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsed = new URL(normalized);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return fallback;
    }
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function buildDefaultCallbacks(
  sessionId: string,
  source: UploadSource,
): UploadSessionCallbacks {
  const draftPath =
    source === "GOOGLE_DRIVE"
      ? `/integrations/google-drive/drafts/${sessionId}`
      : `/upload/drafts/${sessionId}`;

  return {
    poll: `/upload/sessions/${sessionId}`,
    events: `/upload/sessions/${sessionId}/events`,
    draft: draftPath,
  };
}

function normalizeSessionCallbacks(
  callbacks: unknown,
  sessionId: string,
  source: UploadSource,
): UploadSessionCallbacks {
  const fallback = buildDefaultCallbacks(sessionId, source);

  if (!callbacks || typeof callbacks !== "object") {
    return fallback;
  }

  const rawCallbacks = callbacks as Partial<UploadSessionCallbacks>;

  return {
    poll: normalizePathString(rawCallbacks.poll, fallback.poll),
    events: normalizePathString(rawCallbacks.events, fallback.events),
    draft: normalizePathString(rawCallbacks.draft, fallback.draft),
  };
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeParsingCandidate(
  candidate: unknown,
): UploadParsingCandidate | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const rawCandidate = candidate as Partial<UploadParsingCandidate>;

  return {
    raw: typeof rawCandidate.raw === "string" ? rawCandidate.raw : "",
    value: normalizeNumber(rawCandidate.value),
    score: normalizeNumber(rawCandidate.score),
    strategy:
      typeof rawCandidate.strategy === "string" ? rawCandidate.strategy : null,
    reasons: normalizeStringArray(rawCandidate.reasons),
    rejectedReasons: normalizeStringArray(rawCandidate.rejectedReasons),
    accepted:
      typeof rawCandidate.accepted === "boolean"
        ? rawCandidate.accepted
        : undefined,
    inParentheses:
      typeof rawCandidate.inParentheses === "boolean"
        ? rawCandidate.inParentheses
        : undefined,
    context:
      typeof rawCandidate.context === "string" ? rawCandidate.context : null,
  };
}

function mapStatusToJobState(status: UploadItem["status"]): UploadJobState {
  switch (status) {
    case "READY_FOR_REVIEW":
      return "review_required";
    case "APPROVAL_PENDING":
      return "approval_pending";
    case "QUEUED":
      return "queued";
    case "PROCESSING":
      return "running";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    case "SKIPPED":
      return "skipped";
    case "REJECTED":
      return "rejected";
    case "CANCELED":
      return "canceled";
    case "ANALYZING":
    case "RECEIVED":
    default:
      return "analyzing";
  }
}

function normalizeItemParsing(item: UploadItem): UploadParsing {
  const rawIngestion = item.ingestion as
    | { parsed?: { parsing?: Partial<UploadParsing> } }
    | undefined;
  const rawParsing =
    (item as UploadItem & { parsing?: Partial<UploadParsing> }).parsing ??
    rawIngestion?.parsed?.parsing;

  const candidateOptions = Array.isArray(rawParsing?.candidateOptions)
    ? rawParsing.candidateOptions
        .map(normalizeParsingCandidate)
        .filter(
          (candidate): candidate is UploadParsingCandidate => candidate !== null,
        )
    : [];

  const ignoredCandidates = Array.isArray(rawParsing?.ignoredCandidates)
    ? rawParsing.ignoredCandidates
        .map(normalizeParsingCandidate)
        .filter(
          (candidate): candidate is UploadParsingCandidate => candidate !== null,
        )
    : [];

  return {
    chapterNumber:
      typeof rawParsing?.chapterNumber === "number"
        ? rawParsing.chapterNumber
        : item.plan.chapterNumber ?? null,
    confidence:
      rawParsing?.confidence ??
      item.suggestion.confidence ??
      null,
    requiresManualReview:
      rawParsing?.requiresManualReview ??
      item.suggestion.reviewRequired ??
      false,
    selectedCandidate:
      normalizeParsingCandidate(rawParsing?.selectedCandidate) ?? null,
    candidateOptions,
    ignoredCandidates,
    notes: normalizeStringArray(rawParsing?.notes),
  };
}

function normalizeItemJob(item: UploadItem): UploadJob {
  const rawJob = (item as UploadItem & { job?: Partial<UploadJob> }).job;
  const queueJobId = rawJob?.queueJobId ?? item.result.queueJobId ?? null;
  const state = rawJob?.state ?? mapStatusToJobState(item.status);
  const isTerminal =
    typeof rawJob?.isTerminal === "boolean"
      ? rawJob.isTerminal
      : ["completed", "failed", "skipped", "rejected", "canceled"].includes(
          state,
        );
  const isCancelRequested =
    typeof rawJob?.isCancelRequested === "boolean"
      ? rawJob.isCancelRequested
      : state === "cancel_requested";
  const isStuck =
    typeof rawJob?.isStuck === "boolean" ? rawJob.isStuck : state === "stuck";

  return {
    state,
    stage:
      typeof rawJob?.stage === "string"
        ? rawJob.stage
        : item.currentStage ?? null,
    retrying:
      typeof rawJob?.retrying === "boolean"
        ? rawJob.retrying
        : state === "retrying",
    userActionRequired:
      typeof rawJob?.userActionRequired === "boolean"
        ? rawJob.userActionRequired
        : item.status === "READY_FOR_REVIEW" ||
          item.status === "APPROVAL_PENDING",
    canRetry:
      typeof rawJob?.canRetry === "boolean"
        ? rawJob.canRetry
        : item.status === "FAILED",
    canCancel:
      typeof rawJob?.canCancel === "boolean" ? rawJob.canCancel : false,
    canReview:
      typeof rawJob?.canReview === "boolean"
        ? rawJob.canReview
        : item.status === "READY_FOR_REVIEW",
    isTerminal,
    isCancelRequested,
    isStuck,
    queueJobId,
    queuedAt: normalizeDateString(rawJob?.queuedAt ?? item.queuedAt),
    processedAt: normalizeDateString(rawJob?.processedAt ?? item.processedAt),
    completedAt: normalizeDateString(rawJob?.completedAt ?? item.completedAt),
    cancelRequestedAt: normalizeDateString(
      rawJob?.cancelRequestedAt ?? item.cancelRequestedAt,
    ),
    cancelReason:
      typeof rawJob?.cancelReason === "string" ? rawJob.cancelReason : null,
    canceledAt: normalizeDateString(rawJob?.canceledAt ?? item.canceledAt),
    lastHeartbeatAt: normalizeDateString(
      rawJob?.lastHeartbeatAt ?? item.lastHeartbeatAt,
    ),
    lastProgressPercent: normalizeNumber(rawJob?.lastProgressPercent),
    lastActivityAt: normalizeDateString(rawJob?.lastActivityAt),
    heartbeatAgeMs: normalizeNumber(rawJob?.heartbeatAgeMs),
    staleAfterMs: normalizeNumber(rawJob?.staleAfterMs),
  };
}

function normalizeUploadItem(item: UploadItem): UploadItem {
  const parsing = normalizeItemParsing(item);
  const job = normalizeItemJob(item);

  return {
    ...item,
    parsing,
    job,
    cancelRequestedAt: normalizeDateString(item.cancelRequestedAt),
    canceledAt: normalizeDateString(item.canceledAt),
    lastHeartbeatAt: normalizeDateString(item.lastHeartbeatAt),
  };
}

export function normalizeUploadSessionSummary(
  session: UploadSessionSummary,
): UploadSessionSummary {
  const normalized = {
    ...session,
    cancelRequestedAt: normalizeDateString(session.cancelRequestedAt),
    canceledAt: normalizeDateString(session.canceledAt),
    callbacks: normalizeSessionCallbacks(session.callbacks, session.id, session.source),
  };

  return {
    ...normalized,
    workflow: resolveSessionWorkflow(normalized),
    operational: resolveSessionOperational(normalized),
  };
}

export function normalizeUploadSessionDetail(
  session: UploadSessionDetail,
): UploadSessionDetail {
  const normalized = {
    ...session,
    items: session.items.map(normalizeUploadItem),
    cancelRequestedAt: normalizeDateString(session.cancelRequestedAt),
    canceledAt: normalizeDateString(session.canceledAt),
    callbacks: normalizeSessionCallbacks(session.callbacks, session.id, session.source),
  };

  return {
    ...normalized,
    workflow: resolveSessionWorkflow(normalized),
    operational: resolveSessionOperational(normalized),
  };
}

function normalizeSessionStub<
  T extends {
    id: string;
    source: UploadSource;
    status: UploadSessionStatus;
    workflow?: Partial<UploadSessionSummary["workflow"]>;
    operational?: Partial<UploadSessionOperational> | null;
    callbacks?: Partial<UploadSessionCallbacks> | null;
  },
>(session: T): T & {
  workflow: UploadSessionSummary["workflow"];
  operational: UploadSessionSummary["operational"];
  callbacks: UploadSessionCallbacks;
} {
  return {
    ...session,
    workflow: resolveSessionWorkflow({
      status: session.status,
      workflow: session.workflow,
    }),
    operational: resolveSessionOperational({
      status: session.status,
      operational: session.operational,
    }),
    callbacks: normalizeSessionCallbacks(session.callbacks, session.id, session.source),
  };
}

function normalizeDraft(draft: UploadDraft): UploadDraft {
  const normalizedDraft = {
    ...draft,
    items: draft.items.map(normalizeUploadItem),
    workflow: draft.workflow,
    operational: resolveSessionOperational({
      status: draft.sessionStatus,
      operational: draft.operational,
      items: draft.items,
    }),
    callbacks: normalizeSessionCallbacks(
      draft.callbacks,
      draft.id,
      draft.source,
    ),
  };

  return {
    ...normalizedDraft,
    workflow: resolveDraftWorkflow(normalizedDraft),
  };
}

function normalizeDraftResponse<
  T extends UploadDraftResponse | GoogleDriveDraftResponse,
>(response: T): T {
  return {
    ...response,
    draft: normalizeDraft(response.draft),
  };
}

function normalizeConfirmResponse(
  response: UploadDraftConfirmResponse,
): UploadDraftConfirmResponse {
  const alreadyHandled = response.alreadyHandled ?? [];

  return {
    ...response,
    alreadyHandled,
    noOp: response.noOp ?? false,
    totals: {
      accepted: response.totals?.accepted ?? response.accepted.length,
      alreadyHandled:
        response.totals?.alreadyHandled ?? alreadyHandled.length,
      rejected: response.totals?.rejected ?? response.rejected.length,
      skipped: response.totals?.skipped ?? response.skipped.length,
    },
    session: normalizeUploadSessionDetail(response.session),
  };
}

function normalizeCancelDraftResponse(
  response: UploadDraftCancelResponse,
): UploadDraftCancelResponse {
  return {
    ...response,
    session: response.session
      ? normalizeUploadSessionDetail(response.session)
      : undefined,
  };
}

function normalizeItemCancellationResponse(
  response: UploadItemCancellationResponse,
): UploadItemCancellationResponse {
  return {
    ...response,
    cancellation: {
      ...response.cancellation,
      session: normalizeUploadSessionDetail(response.cancellation.session),
    },
  };
}

export const uploadWorkflowService = {
  async getSessions(params?: {
    page?: number;
    limit?: number;
    status?: UploadSessionStatus;
  }): Promise<UploadSessionListResponse> {
    const response = await api.get<UploadSessionListResponse>("/upload/sessions", {
      params,
    });

    return {
      ...response.data,
      sessions: response.data.sessions.map(normalizeUploadSessionSummary),
    };
  },

  async getSession(sessionId: string): Promise<UploadSessionDetailResponse> {
    const response = await api.get<UploadSessionDetailResponse>(
      `/upload/sessions/${sessionId}`,
    );

    return {
      ...response.data,
      session: normalizeUploadSessionDetail(response.data.session),
    };
  },

  async getSessionByCallbackPath(
    callbackPath: string,
  ): Promise<UploadSessionDetailResponse> {
    const response = await api.get<UploadSessionDetailResponse>(
      normalizePathString(callbackPath, "/upload/sessions"),
    );

    return {
      ...response.data,
      session: normalizeUploadSessionDetail(response.data.session),
    };
  },

  async stageLocalUpload(
    files: File[],
    folderName?: string,
  ): Promise<StageLocalUploadResponse> {
    const formData = new FormData();
    appendFilesToFormData(formData, files);
    if (folderName?.trim()) {
      formData.append("folderName", folderName.trim());
    }

    const response = await api.post<StageLocalUploadResponse>(
      "/upload/stage",
      formData,
    );

    return {
      ...response.data,
      session: normalizeSessionStub(response.data.session),
    };
  },

  async stageLocalUploadWithSeriesTitle(
    files: File[],
    seriesTitle: string,
    folderName?: string,
  ): Promise<StageLocalUploadResponse> {
    const formData = new FormData();
    appendFilesToFormData(formData, files);
    formData.append("seriesTitle", seriesTitle.trim());
    if (folderName?.trim()) {
      formData.append("folderName", folderName.trim());
    }

    const response = await api.post<StageLocalUploadResponse>(
      "/upload/workflow/series-stage",
      formData,
    );

    return {
      ...response.data,
      session: normalizeSessionStub(response.data.session),
    };
  },

  async uploadToExistingSeries(
    seriesId: string,
    files: File[],
  ): Promise<UploadSessionCreatedResponse> {
    const formData = new FormData();
    appendFilesToFormData(formData, files);

    const response = await api.post<UploadSessionCreatedResponse>(
      `/upload/series/${seriesId}`,
      formData,
    );

    return {
      ...response.data,
      session: normalizeSessionStub(response.data.session),
    };
  },

  async getDraft(
    source: UploadSource,
    draftId: string,
  ): Promise<UploadDraftResponse | GoogleDriveDraftResponse> {
    const response = await api.get<UploadDraftResponse | GoogleDriveDraftResponse>(
      buildDraftRoute(source, draftId),
    );

    return normalizeDraftResponse(response.data);
  },

  async getDraftByCallbackPath(
    callbackPath: string,
  ): Promise<UploadDraftResponse | GoogleDriveDraftResponse> {
    const response = await api.get<UploadDraftResponse | GoogleDriveDraftResponse>(
      normalizePathString(callbackPath, "/upload/drafts"),
    );

    return normalizeDraftResponse(response.data);
  },

  async updateDraftItem(
    source: UploadSource,
    draftId: string,
    itemId: string,
    data: UpdateUploadDraftItemRequest,
  ): Promise<UploadDraftItemResponse> {
    const response = await api.patch<UploadDraftItemResponse>(
      `${buildDraftRoute(source, draftId)}/items/${itemId}`,
      data,
    );

    return {
      ...response.data,
      item: normalizeUploadItem(response.data.item),
    };
  },

  async bulkUpdateDraft(
    source: UploadSource,
    draftId: string,
    data: BulkUpdateUploadDraftRequest,
  ): Promise<UploadDraftBulkResponse> {
    const response = await api.patch<UploadDraftBulkResponse>(
      `${buildDraftRoute(source, draftId)}/items/bulk`,
      data,
    );

    return {
      ...response.data,
      draft: normalizeDraft(response.data.draft),
    };
  },

  async confirmDraft(
    source: UploadSource,
    draftId: string,
    idempotencyKey?: string,
  ): Promise<UploadDraftConfirmResponse> {
    const response = await api.post<UploadDraftConfirmResponse>(
      `${buildDraftRoute(source, draftId)}/confirm`,
      undefined,
      {
        headers: idempotencyKey
          ? {
              "Idempotency-Key": idempotencyKey,
            }
          : undefined,
      },
    );

    return normalizeConfirmResponse(response.data);
  },

  async cancelDraft(
    source: UploadSource,
    draftId: string,
  ): Promise<UploadDraftCancelResponse> {
    const response = await api.delete<UploadDraftCancelResponse>(
      buildDraftRoute(source, draftId),
    );

    return normalizeCancelDraftResponse(response.data);
  },

  async cancelItem(itemId: string): Promise<UploadItemCancellationResponse> {
    const response = await api.delete<UploadItemCancellationResponse>(
      `/upload/items/${itemId}`,
    );

    return normalizeItemCancellationResponse(response.data);
  },

  async retryItem(itemId: string): Promise<UploadRetryItemResponse> {
    const response = await api.post<UploadRetryItemResponse>(
      `/upload/items/${itemId}/retry`,
    );

    return {
      ...response.data,
      session: normalizeUploadSessionDetail(response.data.session),
    };
  },

  async getGoogleDriveAuthUrl(params?: {
    returnUrl?: string;
    intent?: string;
    draftId?: string;
    mode?: "popup" | "redirect" | "json";
  }): Promise<GoogleDriveAuthUrlResponse> {
    const response = await api.get<GoogleDriveAuthUrlResponse>(
      "/integrations/google-drive/auth-url",
      {
        params,
      },
    );
    return response.data;
  },

  async getGoogleDriveStatus(): Promise<GoogleDriveStatusResponse> {
    const response = await api.get<GoogleDriveStatusResponse>(
      "/integrations/google-drive/status",
    );
    return response.data;
  },

  async handleGoogleDriveCallback(
    code: string,
  ): Promise<GoogleDriveCallbackResponse> {
    const response = await api.get<GoogleDriveCallbackResponse>(
      "/integrations/google-drive/callback",
      {
        params: { code },
      },
    );
    return response.data;
  },

  async disconnectGoogleDrive(): Promise<GoogleDriveDisconnectResponse> {
    const response = await api.delete<GoogleDriveDisconnectResponse>(
      "/integrations/google-drive/disconnect",
    );
    return response.data;
  },

  async getGoogleDriveFolders(
    params: GoogleDriveFoldersParams,
  ): Promise<GoogleDriveFoldersResponse> {
    const response = await api.get<GoogleDriveFoldersResponse>(
      "/integrations/google-drive/folders",
      {
        params,
      },
    );
    return response.data;
  },

  async getGoogleDriveNodes(
    params: GoogleDriveNodesParams,
  ): Promise<GoogleDriveNodesResponse> {
    const response = await api.get<GoogleDriveNodesResponse>(
      "/integrations/google-drive/nodes",
      {
        params,
      },
    );
    return response.data;
  },

  async getGoogleDrivePreview(params: {
    folderId: string;
    recursive?: boolean;
    maxFiles?: number;
  }): Promise<GoogleDrivePreviewResponse> {
    const response = await api.get<GoogleDrivePreviewResponse>(
      "/integrations/google-drive/preview",
      {
        params,
      },
    );
    return response.data;
  },

  async stageGoogleDrive(
    data: GoogleDriveStageRequest,
    idempotencyKey?: string,
  ): Promise<GoogleDriveStageResponse> {
    const response = await api.post<GoogleDriveStageResponse>(
      "/integrations/google-drive/stage",
      data,
      {
        headers: idempotencyKey
          ? {
              "Idempotency-Key": idempotencyKey,
            }
          : undefined,
      },
    );

    return {
      ...response.data,
      session: normalizeUploadSessionSummary(response.data.session),
    };
  },

  async importFromGoogleDrive(
    data: GoogleDriveImportRequest,
    idempotencyKey?: string,
  ): Promise<GoogleDriveImportDryRunResponse | GoogleDriveImportResponse> {
    const response = await api.post<
      GoogleDriveImportDryRunResponse | GoogleDriveImportResponse
    >("/integrations/google-drive/import", data, {
      headers: idempotencyKey
        ? {
            "Idempotency-Key": idempotencyKey,
          }
        : undefined,
    });

    if ("dryRun" in response.data) {
      return response.data;
    }

    return {
      ...response.data,
      session: normalizeUploadSessionSummary(response.data.session),
    };
  },
};
