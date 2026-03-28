"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  resolveDraftWorkflow,
  resolveSessionWorkflow,
  shouldPollWorkflow,
} from "@/lib/upload-workflow";
import { uploadWorkflowService } from "@/services/upload-workflow.service";
import type {
  BulkUpdateUploadDraftRequest,
  GoogleDriveFoldersParams,
  GoogleDriveImportRequest,
  GoogleDriveNodesParams,
  GoogleDriveStageRequest,
  UpdateUploadDraftItemRequest,
  UploadDraft,
  UploadSessionDetail,
  UploadSessionStatus,
  UploadSource,
} from "@/types/upload-workflow";

const ACTIVE_WORKFLOW_POLL_INTERVAL_MS = 4000;
const SESSION_LIST_POLL_INTERVAL_MS = 15000;

const uploadWorkflowKeys = {
  all: ["upload-workflow"] as const,
  sessions: (params?: {
    page?: number;
    limit?: number;
    status?: UploadSessionStatus;
  }) => [...uploadWorkflowKeys.all, "sessions", params] as const,
  session: (sessionId: string) =>
    [...uploadWorkflowKeys.all, "session", sessionId] as const,
  draft: (source: UploadSource, draftId: string) =>
    [...uploadWorkflowKeys.all, "draft", source, draftId] as const,
  googleDriveStatus: () =>
    [...uploadWorkflowKeys.all, "google-drive", "status"] as const,
  googleDriveFolders: (params: GoogleDriveFoldersParams) =>
    [...uploadWorkflowKeys.all, "google-drive", "folders", params] as const,
  googleDriveNodes: (params: GoogleDriveNodesParams) =>
    [...uploadWorkflowKeys.all, "google-drive", "nodes", params] as const,
  googleDrivePreview: (params: {
    folderId: string;
    recursive?: boolean;
    maxFiles?: number;
  }) => [...uploadWorkflowKeys.all, "google-drive", "preview", params] as const,
};

function shouldPollSessionList(
  sessions:
    | Array<{
        workflow?: UploadSessionDetail["workflow"];
        status: UploadSessionStatus;
      }>
    | undefined,
): boolean {
  return Boolean(
    sessions?.some((session) =>
      shouldPollWorkflow(
        resolveSessionWorkflow({
          status: session.status,
          workflow: session.workflow,
        }),
      ),
    ),
  );
}

function hydrateDraft(
  queryClient: ReturnType<typeof useQueryClient>,
  source: UploadSource,
  draft: UploadDraft,
) {
  queryClient.setQueryData(uploadWorkflowKeys.draft(source, draft.id), {
    success: true,
    draft,
  });
}

function hydrateSession(
  queryClient: ReturnType<typeof useQueryClient>,
  session: UploadSessionDetail,
) {
  queryClient.setQueryData(uploadWorkflowKeys.session(session.id), {
    success: true,
    session,
  });
}

async function invalidateWorkflowQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  workflowId?: string,
  source?: UploadSource,
) {
  await queryClient.invalidateQueries({
    queryKey: uploadWorkflowKeys.sessions(),
  });

  if (workflowId) {
    await queryClient.invalidateQueries({
      queryKey: uploadWorkflowKeys.session(workflowId),
    });
  }

  if (workflowId && source) {
    await queryClient.invalidateQueries({
      queryKey: uploadWorkflowKeys.draft(source, workflowId),
    });
  }
}

export function useUploadSessions(params?: {
  page?: number;
  limit?: number;
  status?: UploadSessionStatus;
}) {
  return useQuery({
    queryKey: uploadWorkflowKeys.sessions(params),
    queryFn: () => uploadWorkflowService.getSessions(params),
    staleTime: 1000 * 10,
    refetchInterval: (query) =>
      shouldPollSessionList(query.state.data?.sessions)
        ? SESSION_LIST_POLL_INTERVAL_MS
        : false,
  });
}

export function useUploadSession(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: uploadWorkflowKeys.session(sessionId),
    queryFn: () => uploadWorkflowService.getSession(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 1000 * 2,
    refetchInterval: (query) => {
      const session = query.state.data?.session;
      if (!session) {
        return false;
      }

      return shouldPollWorkflow(resolveSessionWorkflow(session))
        ? ACTIVE_WORKFLOW_POLL_INTERVAL_MS
        : false;
    },
  });
}

export function useUploadDraft(
  source: UploadSource,
  draftId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: uploadWorkflowKeys.draft(source, draftId),
    queryFn: () => uploadWorkflowService.getDraft(source, draftId),
    enabled: enabled && !!draftId,
    staleTime: 1000 * 2,
    refetchInterval: (query) => {
      const draft = query.state.data?.draft;
      if (!draft) {
        return false;
      }

      return shouldPollWorkflow(resolveDraftWorkflow(draft))
        ? ACTIVE_WORKFLOW_POLL_INTERVAL_MS
        : false;
    },
  });
}

export function useStageLocalUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      folderName,
    }: {
      files: File[];
      folderName?: string;
    }) => uploadWorkflowService.stageLocalUpload(files, folderName),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: uploadWorkflowKeys.sessions(),
      }),
  });
}

export function useStageLocalUploadWithSeriesTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      seriesTitle,
      folderName,
    }: {
      files: File[];
      seriesTitle: string;
      folderName?: string;
    }) =>
      uploadWorkflowService.stageLocalUploadWithSeriesTitle(
        files,
        seriesTitle,
        folderName,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: uploadWorkflowKeys.sessions(),
      }),
  });
}

export function useUploadToExistingSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      files,
    }: {
      seriesId: string;
      files: File[];
    }) => uploadWorkflowService.uploadToExistingSeries(seriesId, files),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: uploadWorkflowKeys.sessions(),
      }),
  });
}

export function useUpdateUploadDraftItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      source,
      draftId,
      itemId,
      data,
    }: {
      source: UploadSource;
      draftId: string;
      itemId: string;
      data: UpdateUploadDraftItemRequest;
    }) => uploadWorkflowService.updateDraftItem(source, draftId, itemId, data),
    onSuccess: async (_result, variables) => {
      await invalidateWorkflowQueries(
        queryClient,
        variables.draftId,
        variables.source,
      );
    },
  });
}

export function useBulkUpdateUploadDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      source,
      draftId,
      data,
    }: {
      source: UploadSource;
      draftId: string;
      data: BulkUpdateUploadDraftRequest;
    }) => uploadWorkflowService.bulkUpdateDraft(source, draftId, data),
    onSuccess: async (result, variables) => {
      hydrateDraft(queryClient, variables.source, result.draft);
      await invalidateWorkflowQueries(
        queryClient,
        variables.draftId,
        variables.source,
      );
    },
  });
}

export function useConfirmUploadDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      source,
      draftId,
      idempotencyKey,
    }: {
      source: UploadSource;
      draftId: string;
      idempotencyKey?: string;
    }) =>
      uploadWorkflowService.confirmDraft(source, draftId, idempotencyKey),
    onSuccess: async (result, variables) => {
      hydrateSession(queryClient, result.session);
      await invalidateWorkflowQueries(
        queryClient,
        variables.draftId,
        variables.source,
      );
    },
  });
}

export function useCancelUploadDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      source,
      draftId,
    }: {
      source: UploadSource;
      draftId: string;
    }) => uploadWorkflowService.cancelDraft(source, draftId),
    onSuccess: async (_result, variables) => {
      await invalidateWorkflowQueries(
        queryClient,
        variables.draftId,
        variables.source,
      );
    },
  });
}

export function useRetryUploadItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => uploadWorkflowService.retryItem(itemId),
    onSuccess: async (result) => {
      hydrateSession(queryClient, result.session);
      await invalidateWorkflowQueries(
        queryClient,
        result.session.id,
        result.session.source,
      );
    },
  });
}

export function useGoogleDriveStatus(enabled = true) {
  return useQuery({
    queryKey: uploadWorkflowKeys.googleDriveStatus(),
    queryFn: () => uploadWorkflowService.getGoogleDriveStatus(),
    enabled,
    staleTime: 1000 * 10,
  });
}

export function useGoogleDriveAuthUrl() {
  return useMutation({
    mutationFn: (params?: {
      returnUrl?: string;
      intent?: string;
      draftId?: string;
    }) => uploadWorkflowService.getGoogleDriveAuthUrl(params),
  });
}

export function useGoogleDriveCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => uploadWorkflowService.handleGoogleDriveCallback(code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: uploadWorkflowKeys.googleDriveStatus(),
      });
    },
  });
}

export function useGoogleDriveDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => uploadWorkflowService.disconnectGoogleDrive(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: uploadWorkflowKeys.googleDriveStatus(),
      });
    },
  });
}

export function useGoogleDriveFolders(
  params: GoogleDriveFoldersParams,
  enabled = true,
) {
  return useQuery({
    queryKey: uploadWorkflowKeys.googleDriveFolders(params),
    queryFn: () => uploadWorkflowService.getGoogleDriveFolders(params),
    enabled,
    staleTime: 1000 * 15,
  });
}

export function useGoogleDriveNodes(
  params: GoogleDriveNodesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: uploadWorkflowKeys.googleDriveNodes(params),
    queryFn: () => uploadWorkflowService.getGoogleDriveNodes(params),
    enabled: enabled && !!params.parentId,
    staleTime: 1000 * 15,
  });
}

export function useGoogleDrivePreview(params: {
  folderId: string;
  recursive?: boolean;
  maxFiles?: number;
}) {
  return useQuery({
    queryKey: uploadWorkflowKeys.googleDrivePreview(params),
    queryFn: () => uploadWorkflowService.getGoogleDrivePreview(params),
    enabled: !!params.folderId,
    staleTime: 1000 * 30,
  });
}

export function useGoogleDrivePreviewRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      folderId: string;
      recursive?: boolean;
      maxFiles?: number;
    }) => uploadWorkflowService.getGoogleDrivePreview(params),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData(uploadWorkflowKeys.googleDrivePreview(variables), result);
    },
  });
}

export function useStageGoogleDrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: GoogleDriveStageRequest;
      idempotencyKey?: string;
    }) => uploadWorkflowService.stageGoogleDrive(data, idempotencyKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: uploadWorkflowKeys.sessions(),
      });
    },
  });
}

export function useImportFromGoogleDrive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: GoogleDriveImportRequest;
      idempotencyKey?: string;
    }) => uploadWorkflowService.importFromGoogleDrive(data, idempotencyKey),
    onSuccess: async (result) => {
      if (!("dryRun" in result)) {
        await queryClient.invalidateQueries({
          queryKey: uploadWorkflowKeys.sessions(),
        });
      }
    },
  });
}

export { uploadWorkflowKeys };
