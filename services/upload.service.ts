/* ─────────────────────────────────────────────────────────────────────────────
 * Upload Pipeline — API Service
 *
 * All upload/draft/Google Drive calls go through the Next proxy (/api).
 * Follows the contracts in UPLOAD_FRONTEND_INTEGRATION.md exactly.
 * ───────────────────────────────────────────────────────────────────────────── */

import { api } from "@/services/api";
import type {
  BulkUpdateRequest,
  CancelDraftResult,
  ConfirmResult,
  DraftDetail,
  DraftSummary,
  GoogleDriveNodesResponse,
  GoogleDriveStageRequest,
  GoogleDriveStageResponse,
  GoogleDriveStatus,
  SessionSummary,
  StageResponse,
  UpdateItemRequest,
  UploadItem,
} from "@/types/upload";

// ── Drafts ──────────────────────────────────────────────────────────────────

export async function fetchDrafts(
  page = 1,
  limit = 20,
): Promise<{
  drafts: DraftSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { data } = await api.get("/upload/drafts", { params: { page, limit } });
  return data;
}

export async function fetchDraft(draftId: string): Promise<DraftDetail> {
  const { data } = await api.get(`/upload/drafts/${draftId}`);
  return data.draft;
}

export async function extendDraft(draftId: string): Promise<DraftDetail> {
  const { data } = await api.post(`/upload/drafts/${draftId}/extend`);
  return data.draft;
}

export async function cancelDraft(draftId: string): Promise<CancelDraftResult> {
  const { data } = await api.delete(`/upload/drafts/${draftId}`);
  return data;
}

// ── Item Editing ────────────────────────────────────────────────────────────

export async function updateItem(
  draftId: string,
  itemId: string,
  patch: UpdateItemRequest,
): Promise<UploadItem> {
  const { data } = await api.patch(
    `/upload/drafts/${draftId}/items/${itemId}`,
    patch,
  );
  return data.item;
}

export async function bulkUpdateItems(
  draftId: string,
  payload: BulkUpdateRequest,
): Promise<DraftDetail> {
  const { data } = await api.patch(
    `/upload/drafts/${draftId}/items/bulk`,
    payload,
  );
  return data.draft;
}

export async function applyAllFromItem(
  draftId: string,
  sourceItemId: string,
): Promise<DraftDetail> {
  const { data } = await api.post(`/upload/drafts/${draftId}/apply-all`, {
    sourceItemId,
  });
  return data.draft;
}

// ── Confirm ─────────────────────────────────────────────────────────────────

export async function confirmDraft(draftId: string): Promise<ConfirmResult> {
  const { data } = await api.post(`/upload/drafts/${draftId}/confirm`);
  return data;
}

export async function confirmSelectedItems(
  draftId: string,
  itemIds: string[],
): Promise<ConfirmResult> {
  const { data } = await api.post(
    `/upload/drafts/${draftId}/confirm-selected`,
    { itemIds },
  );
  return data;
}

// ── Item Actions ────────────────────────────────────────────────────────────

export async function retryItem(itemId: string): Promise<SessionSummary> {
  const { data } = await api.post(`/upload/items/${itemId}/retry`);
  return data.session;
}

export async function cancelItem(
  itemId: string,
): Promise<{ outcome: string; session: SessionSummary }> {
  const { data } = await api.delete(`/upload/items/${itemId}`);
  return data.cancellation;
}

// ── Local Upload Staging ────────────────────────────────────────────────────

export async function stageLocalFiles(
  files: File[],
  options?: { folderName?: string; seriesTitle?: string },
): Promise<StageResponse> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  if (options?.folderName) form.append("folderName", options.folderName);
  if (options?.seriesTitle) form.append("seriesTitle", options.seriesTitle);

  const { data } = await api.post("/upload/stage", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
  });
  return data;
}

export async function stageLocalForSeries(
  files: File[],
  seriesTitle: string,
): Promise<StageResponse> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("seriesTitle", seriesTitle);

  const { data } = await api.post("/upload/workflow/series-stage", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
  });
  return data;
}

export async function stageLocalForExistingSeries(
  seriesId: string,
  files: File[],
): Promise<StageResponse> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));

  const { data } = await api.post(`/upload/series/${seriesId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120_000,
  });
  return data;
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function fetchSessions(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{
  sessions: SessionSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { data } = await api.get("/upload/sessions", { params });
  return data;
}

export async function fetchSession(
  sessionId: string,
): Promise<SessionSummary & { items: UploadItem[] }> {
  const { data } = await api.get(`/upload/sessions/${sessionId}`);
  return data.session;
}

// ── Google Drive ────────────────────────────────────────────────────────────

export async function fetchGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  const { data } = await api.get("/integrations/google-drive/status");
  return data;
}

export async function fetchGoogleDriveAuthUrl(params?: {
  draftId?: string;
  returnUrl?: string;
  intent?: string;
}): Promise<{ url: string }> {
  const { data } = await api.get("/integrations/google-drive/auth-url", {
    params,
  });
  return data;
}

export async function disconnectGoogleDrive(): Promise<void> {
  await api.delete("/integrations/google-drive/disconnect");
}

export async function fetchGoogleDriveNodes(params?: {
  parentId?: string;
  pageToken?: string;
  pageSize?: number;
}): Promise<GoogleDriveNodesResponse> {
  const { data } = await api.get("/integrations/google-drive/nodes", {
    params: { ...params, parentId: params?.parentId || "root" },
  });
  return data;
}

export async function stageFromGoogleDrive(
  payload: GoogleDriveStageRequest,
): Promise<GoogleDriveStageResponse> {
  const { data } = await api.post("/integrations/google-drive/stage", payload);
  return data;
}

export async function confirmGoogleDriveDraft(
  draftId: string,
): Promise<ConfirmResult> {
  const { data } = await api.post(
    `/integrations/google-drive/drafts/${draftId}/confirm`,
  );
  return data;
}

// ── Search Series (for item assignment) ─────────────────────────────────────

export async function searchSeries(
  query: string,
  limit = 10,
): Promise<Array<{ id: string; title: string }>> {
  const { data } = await api.get("/search/suggestions", {
    params: { q: query, limit },
  });
  return data.items ?? [];
}
