import { resolveDraftWorkflow, resolveSessionWorkflow } from "@/lib/upload-workflow";
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
  UploadRetryItemResponse,
  UploadSessionCreatedResponse,
  UploadSessionDetail,
  UploadSessionDetailResponse,
  UploadSessionListResponse,
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

function normalizeSessionSummary(
  session: UploadSessionSummary,
): UploadSessionSummary {
  return {
    ...session,
    workflow: resolveSessionWorkflow(session),
  };
}

function normalizeSessionDetail(session: UploadSessionDetail): UploadSessionDetail {
  return {
    ...session,
    workflow: resolveSessionWorkflow(session),
  };
}

function normalizeSessionStub<T extends { id: string; status: UploadSessionStatus }>(
  session: T & { workflow?: UploadSessionSummary["workflow"] },
): T & { workflow: UploadSessionSummary["workflow"] } {
  return {
    ...session,
    workflow: resolveSessionWorkflow({
      status: session.status,
      workflow: session.workflow,
    }),
  };
}

function normalizeDraft(draft: UploadDraft): UploadDraft {
  const normalizedDraft = {
    ...draft,
    workflow: draft.workflow,
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
    session: normalizeSessionDetail(response.session),
  };
}

export const uploadWorkflowService = {
  async getSessions(params?: {
    page?: number;
    limit?: number;
    status?: UploadSessionStatus;
  }): Promise<UploadSessionListResponse> {
    const response = await api.get<UploadSessionListResponse>(
      "/upload/sessions",
      {
        params,
      },
    );

    return {
      ...response.data,
      sessions: response.data.sessions.map(normalizeSessionSummary),
    };
  },

  async getSession(sessionId: string): Promise<UploadSessionDetailResponse> {
    const response = await api.get<UploadSessionDetailResponse>(
      `/upload/sessions/${sessionId}`,
    );

    return {
      ...response.data,
      session: normalizeSessionDetail(response.data.session),
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
    return response.data;
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
    return response.data;
  },

  async retryItem(itemId: string): Promise<UploadRetryItemResponse> {
    const response = await api.post<UploadRetryItemResponse>(
      `/upload/items/${itemId}/retry`,
    );

    return {
      ...response.data,
      session: normalizeSessionDetail(response.data.session),
    };
  },

  async getGoogleDriveAuthUrl(params?: {
    returnUrl?: string;
    intent?: string;
    draftId?: string;
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
      session: normalizeSessionSummary(response.data.session),
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
      session: normalizeSessionSummary(response.data.session),
    };
  },
};
