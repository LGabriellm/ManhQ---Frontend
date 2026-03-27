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
  UploadDraftBulkResponse,
  UploadDraftCancelResponse,
  UploadDraftConfirmResponse,
  UploadDraftItemResponse,
  UploadDraftResponse,
  UploadRetryItemResponse,
  UploadSessionCreatedResponse,
  UploadSessionDetailResponse,
  UploadSessionListResponse,
  UploadSource,
  UploadSessionStatus,
} from "@/types/upload-workflow";

function buildDraftRoute(source: UploadSource, draftId: string): string {
  if (source === "GOOGLE_DRIVE") {
    return `/integrations/google-drive/drafts/${draftId}`;
  }

  return `/upload/drafts/${draftId}`;
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
    return response.data;
  },

  async getSession(sessionId: string): Promise<UploadSessionDetailResponse> {
    const response = await api.get<UploadSessionDetailResponse>(
      `/upload/sessions/${sessionId}`,
    );
    return response.data;
  },

  async stageLocalUpload(
    files: File[],
    folderName?: string,
  ): Promise<StageLocalUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files[]", file));
    if (folderName?.trim()) {
      formData.append("folderName", folderName.trim());
    }

    const response = await api.post<StageLocalUploadResponse>(
      "/upload/stage",
      formData,
    );
    return response.data;
  },

  async stageLocalUploadWithSeriesTitle(
    files: File[],
    seriesTitle: string,
    folderName?: string,
  ): Promise<StageLocalUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files[]", file));
    formData.append("seriesTitle", seriesTitle.trim());
    if (folderName?.trim()) {
      formData.append("folderName", folderName.trim());
    }

    const response = await api.post<StageLocalUploadResponse>(
      "/upload/workflow/series-stage",
      formData,
    );
    return response.data;
  },

  async uploadToExistingSeries(
    seriesId: string,
    files: File[],
  ): Promise<UploadSessionCreatedResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files[]", file));

    const response = await api.post<UploadSessionCreatedResponse>(
      `/upload/series/${seriesId}`,
      formData,
    );
    return response.data;
  },

  async getDraft(
    source: UploadSource,
    draftId: string,
  ): Promise<UploadDraftResponse | GoogleDriveDraftResponse> {
    const response = await api.get<UploadDraftResponse | GoogleDriveDraftResponse>(
      buildDraftRoute(source, draftId),
    );
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
  },

  async getGoogleDriveAuthUrl(): Promise<GoogleDriveAuthUrlResponse> {
    const response = await api.get<GoogleDriveAuthUrlResponse>(
      "/integrations/google-drive/auth-url",
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
    return response.data;
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
    return response.data;
  },
};
