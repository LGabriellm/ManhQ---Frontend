"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * Upload Pipeline — React Query Hooks
 *
 * One hook per concern. No giant orchestrator.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "@/services/upload.service";
import type {
  BulkUpdateRequest,
  DraftDetail,
  GoogleDriveStageRequest,
  UpdateItemRequest,
} from "@/types/upload";

// ── Query Keys ──────────────────────────────────────────────────────────────

export const uploadKeys = {
  all: ["upload"] as const,
  drafts: () => [...uploadKeys.all, "drafts"] as const,
  draft: (id: string) => [...uploadKeys.all, "draft", id] as const,
  sessions: () => [...uploadKeys.all, "sessions"] as const,
  session: (id: string) => [...uploadKeys.all, "session", id] as const,
  gdriveStatus: () => [...uploadKeys.all, "gdrive-status"] as const,
  gdriveNodes: (parentId?: string) =>
    [...uploadKeys.all, "gdrive-nodes", parentId] as const,
  seriesSearch: (q: string) => [...uploadKeys.all, "series-search", q] as const,
};

// ── Drafts List ─────────────────────────────────────────────────────────────

export function useDrafts(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...uploadKeys.drafts(), page, limit],
    queryFn: () => svc.fetchDrafts(page, limit),
    staleTime: 10_000,
    refetchOnMount: "always",
  });
}

// ── Draft Detail ────────────────────────────────────────────────────────────

export function useDraft(draftId: string | null) {
  return useQuery({
    queryKey: uploadKeys.draft(draftId ?? ""),
    queryFn: () => svc.fetchDraft(draftId!),
    enabled: !!draftId,
    staleTime: 5_000,
    // Always refetch when the component mounts — draft state changes fast
    refetchOnMount: "always",
    // Refetch when the tab regains focus (user may have been away)
    refetchOnWindowFocus: true,
    // Retry harder for drafts — the backend may not be ready immediately
    // after staging (race between redirect and backend commit)
    retry: (failureCount, error) => {
      const status = (error as { statusCode?: number })?.statusCode;
      // Terminal: draft was truly deleted/expired — stop retrying
      if (status === 410) return false;
      // 404 can be transient (staging not committed yet) — retry a few times
      if (status === 404) return failureCount < 3;
      // Auth errors — stop
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    refetchInterval: (query) => {
      const draft = query.state.data;
      if (!draft) return false;
      const state = draft.workflow.state;
      // Fast poll during analysis, slower during processing, off otherwise
      if (state === "ANALYZING") return 3_000;
      if (state === "PROCESSING" || state === "APPROVAL_PENDING") return 5_000;
      return false;
    },
  });
}

// ── Stage Local Files ───────────────────────────────────────────────────────

export function useStageLocal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      files: File[];
      folderName?: string;
      seriesTitle?: string;
    }) => svc.stageLocalFiles(args.files, args),
    onSuccess: (result) => {
      // Pre-seed the draft cache so the editor page doesn't start empty
      if (result.draftId) {
        qc.invalidateQueries({ queryKey: uploadKeys.draft(result.draftId) });
      }
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

export function useStageLocalForSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { files: File[]; seriesTitle: string }) =>
      svc.stageLocalForSeries(args.files, args.seriesTitle),
    onSuccess: (result) => {
      if (result.draftId) {
        qc.invalidateQueries({ queryKey: uploadKeys.draft(result.draftId) });
      }
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

export function useStageLocalForExistingSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { seriesId: string; files: File[] }) =>
      svc.stageLocalForExistingSeries(args.seriesId, args.files),
    onSuccess: (result) => {
      if (result.draftId) {
        qc.invalidateQueries({ queryKey: uploadKeys.draft(result.draftId) });
      }
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

// ── Item Editing ────────────────────────────────────────────────────────────

export function useUpdateItem(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { itemId: string; patch: UpdateItemRequest }) =>
      svc.updateItem(draftId, args.itemId, args.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.draft(draftId) });
    },
  });
}

export function useBulkUpdate(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkUpdateRequest) =>
      svc.bulkUpdateItems(draftId, payload),
    onSuccess: (draft: DraftDetail) => {
      qc.setQueryData(uploadKeys.draft(draftId), draft);
    },
  });
}

export function useApplyAll(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceItemId: string) =>
      svc.applyAllFromItem(draftId, sourceItemId),
    onSuccess: (draft: DraftDetail) => {
      qc.setQueryData(uploadKeys.draft(draftId), draft);
    },
  });
}

// ── Confirm ─────────────────────────────────────────────────────────────────

export function useConfirmDraft(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.confirmDraft(draftId),
    onSuccess: (result) => {
      // The response contains the updated session+items — seed cache
      if (result.session) {
        qc.setQueryData(uploadKeys.draft(draftId), (old: DraftDetail | undefined) => {
          if (!old) return old;
          return {
            ...old,
            sessionStatus: result.session.status,
            workflow: result.session.workflow,
            operational: result.session.operational,
            items: result.session.items ?? old.items,
          };
        });
      }
      qc.invalidateQueries({ queryKey: uploadKeys.draft(draftId) });
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

export function useConfirmSelected(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) =>
      svc.confirmSelectedItems(draftId, itemIds),
    onSuccess: (result) => {
      if (result.session) {
        qc.setQueryData(uploadKeys.draft(draftId), (old: DraftDetail | undefined) => {
          if (!old) return old;
          return {
            ...old,
            sessionStatus: result.session.status,
            workflow: result.session.workflow,
            operational: result.session.operational,
            items: result.session.items ?? old.items,
          };
        });
      }
      qc.invalidateQueries({ queryKey: uploadKeys.draft(draftId) });
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

// ── Cancel ──────────────────────────────────────────────────────────────────

export function useCancelDraft(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.cancelDraft(draftId),
    onSuccess: () => {
      qc.removeQueries({ queryKey: uploadKeys.draft(draftId) });
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

// ── Item Actions ────────────────────────────────────────────────────────────

export function useRetryItem(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => svc.retryItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.draft(draftId) });
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

export function useCancelItem(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => svc.cancelItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.draft(draftId) });
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

// ── Extend Draft ────────────────────────────────────────────────────────────

export function useExtendDraft(draftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => svc.extendDraft(draftId),
    onSuccess: (draft: DraftDetail) => {
      qc.setQueryData(uploadKeys.draft(draftId), draft);
    },
  });
}

// ── Google Drive ────────────────────────────────────────────────────────────

export function useGoogleDriveStatus() {
  return useQuery({
    queryKey: uploadKeys.gdriveStatus(),
    queryFn: svc.fetchGoogleDriveStatus,
    staleTime: 30_000,
    retry: false,
  });
}

export function useGoogleDriveNodes(parentId?: string, enabled = true) {
  return useQuery({
    queryKey: uploadKeys.gdriveNodes(parentId),
    queryFn: () => svc.fetchGoogleDriveNodes({ parentId }),
    enabled,
    staleTime: 30_000,
  });
}

export function useStageFromGoogleDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GoogleDriveStageRequest) =>
      svc.stageFromGoogleDrive(payload),
    onSuccess: (result) => {
      if (result.draftId) {
        qc.invalidateQueries({ queryKey: uploadKeys.draft(result.draftId) });
      }
      qc.invalidateQueries({ queryKey: uploadKeys.drafts() });
    },
  });
}

export function useDisconnectGoogleDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.disconnectGoogleDrive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: uploadKeys.gdriveStatus() });
    },
  });
}

// ── Series Search (for item assignment) ─────────────────────────────────────

export function useSeriesSearch(query: string) {
  return useQuery({
    queryKey: uploadKeys.seriesSearch(query),
    queryFn: () => svc.searchSeries(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
