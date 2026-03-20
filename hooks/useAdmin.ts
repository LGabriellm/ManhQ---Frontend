"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type {
  AdminSeriesParams,
  UpdateSeriesRequest,
  EnrichSeriesRequest,
  ReassignMediaRequest,
  UpdateMediaRequest,
  MergeSeriesRequest,
  AdminMediaListParams,
  SplitMediaRequest,
  BulkDeleteMediaRequest,
  BulkMoveMediaRequest,
  BulkDeleteSeriesRequest,
  AdminUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
  ApprovalsParams,
  RejectRequest,
  BulkApproveRequest,
  BulkRejectRequest,
  SubscriptionsParams,
  ActivationTokensParams,
  CreateManualSubscriptionRequest,
  CancelSubscriptionRequest,
  GoogleDriveFoldersParams,
  GoogleDriveNodesParams,
  GoogleDriveStageRequest,
  UploadPlanPatch,
  Series,
} from "@/types/api";

// ===== Query Keys =====
const adminKeys = {
  all: ["admin"] as const,
  dashboard: () => [...adminKeys.all, "dashboard"] as const,
  series: (params?: AdminSeriesParams) =>
    [...adminKeys.all, "series", params] as const,
  seriesDetail: (seriesId: string) =>
    [...adminKeys.all, "series", "detail", seriesId] as const,
  jobs: () => [...adminKeys.all, "jobs"] as const,
  job: (id: string) => [...adminKeys.all, "jobs", id] as const,
  blockedIPs: () => [...adminKeys.all, "blocked-ips"] as const,
  ipInfo: (ip: string) => [...adminKeys.all, "ip-info", ip] as const,
  metadataSearch: (q: string) =>
    [...adminKeys.all, "metadata-search", q] as const,
  metadataProviders: () => [...adminKeys.all, "metadata-providers"] as const,
  parsePreview: (filename: string) =>
    [...adminKeys.all, "parse-preview", filename] as const,
  medias: (params?: AdminMediaListParams) =>
    [...adminKeys.all, "medias", params] as const,
  mediaDetail: (id: string) => [...adminKeys.all, "medias", id] as const,
  mediaPages: (id: string) =>
    [...adminKeys.all, "medias", id, "pages"] as const,
  scanJobs: () => [...adminKeys.all, "scan-jobs"] as const,
  scanJob: (id: string) => [...adminKeys.all, "scan-jobs", id] as const,
  apiHealth: () => [...adminKeys.all, "api-health"] as const,
  jobsStats: () => [...adminKeys.all, "jobs-stats"] as const,
  users: (params?: AdminUsersParams) =>
    [...adminKeys.all, "users", params] as const,
  usersStats: () => [...adminKeys.all, "users-stats"] as const,
  user: (id: string) => [...adminKeys.all, "users", id] as const,
  approvals: (params?: ApprovalsParams) =>
    [...adminKeys.all, "approvals", params] as const,
  approvalsStats: () => [...adminKeys.all, "approvals-stats"] as const,
  submissions: (params?: { status?: string; page?: number; limit?: number }) =>
    [...adminKeys.all, "submissions", params] as const,
  approvalDetail: (id: string) =>
    [...adminKeys.all, "approvals", "detail", id] as const,
  subscriptionsStats: () => [...adminKeys.all, "subscriptions-stats"] as const,
  subscriptions: (params?: SubscriptionsParams) =>
    [...adminKeys.all, "subscriptions", params] as const,
  activationTokens: (params?: ActivationTokensParams) =>
    [...adminKeys.all, "activation-tokens", params] as const,
  googleDriveStatus: () =>
    [...adminKeys.all, "google-drive", "status"] as const,
  googleDriveFolders: (params: Omit<GoogleDriveFoldersParams, "accessToken">) =>
    [...adminKeys.all, "google-drive", "folders", params] as const,
  googleDriveDraft: (draftId: string) =>
    [...adminKeys.all, "google-drive", "draft", draftId] as const,
  localUploadDraft: (draftId: string) =>
    [...adminKeys.all, "upload", "draft", draftId] as const,
};

async function syncAdminQueries(qc: QueryClient, queryKeys: QueryKey[]) {
  await Promise.all(
    queryKeys.map(async (queryKey) => {
      await qc.invalidateQueries({ queryKey });
      await qc.refetchQueries({ queryKey, type: "active" });
    }),
  );
}

// ===== Dashboard =====
export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: () => adminService.getDashboard(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

// ===== Series =====
export function useAdminSeries(params?: AdminSeriesParams, enabled = true) {
  return useQuery({
    queryKey: adminKeys.series(params),
    queryFn: () => adminService.getSeries(params),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSeriesRequest }) =>
      adminService.updateSeries(id, data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteFiles }: { id: string; deleteFiles?: boolean }) =>
      adminService.deleteSeries(id, deleteFiles),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useSeriesDetails(seriesId: string, enabled = true) {
  return useQuery<Series>({
    queryKey: adminKeys.seriesDetail(seriesId),
    queryFn: () => adminService.getSeriesDetails(seriesId),
    enabled: enabled && !!seriesId,
    staleTime: 1000 * 60,
  });
}

export function useSetSeriesCoverFromChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      seriesId,
      mediaId,
    }: {
      seriesId: string;
      mediaId: string;
    }) => adminService.setSeriesCoverFromChapter(seriesId, mediaId),
    onSuccess: (_result, variables) =>
      syncAdminQueries(qc, [
        adminKeys.all,
        adminKeys.seriesDetail(variables.seriesId),
      ]),
  });
}

export function useSetSeriesCoverFromUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seriesId, cover }: { seriesId: string; cover: File }) =>
      adminService.setSeriesCoverFromUpload(seriesId, cover),
    onSuccess: (_result, variables) =>
      syncAdminQueries(qc, [
        adminKeys.all,
        adminKeys.seriesDetail(variables.seriesId),
      ]),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteMedia(id),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

// ===== Metadata =====
export function useMetadataSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.metadataSearch(query),
    queryFn: () => adminService.searchMetadata(query),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 10,
  });
}

export function useEnrichSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      seriesId,
      data,
    }: {
      seriesId: string;
      data: EnrichSeriesRequest;
    }) => adminService.enrichSeries(seriesId, data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useEnrichAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.enrichAll(),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useMetadataProviders() {
  return useQuery({
    queryKey: adminKeys.metadataProviders(),
    queryFn: () => adminService.getMetadataProviders(),
    staleTime: 1000 * 60 * 30, // 30min — raramente muda
  });
}

export function useParsePreview(filename: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.parsePreview(filename),
    queryFn: () => adminService.parsePreview(filename),
    enabled: enabled && filename.length >= 3,
    staleTime: 1000 * 60 * 10,
  });
}

// ===== Media Management =====
export function useReassignMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mediaId,
      data,
    }: {
      mediaId: string;
      data: ReassignMediaRequest;
    }) => adminService.reassignMedia(mediaId, data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useUpdateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mediaId,
      data,
    }: {
      mediaId: string;
      data: UpdateMediaRequest;
    }) => adminService.updateMedia(mediaId, data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useMergeSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MergeSeriesRequest) => adminService.mergeSeries(data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

// ===== Upload =====
export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminService.upload(file),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useUploadBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => adminService.uploadBulk(files),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useUploadFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      folderName,
      files,
    }: {
      folderName: string;
      files: File[];
    }) => adminService.uploadFolder(folderName, files),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs(), adminKeys.all]),
  });
}

export function useUploadToSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seriesId, files }: { seriesId: string; files: File[] }) =>
      adminService.uploadToSeries(seriesId, files),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs(), adminKeys.all]),
  });
}

export function useLocalUploadStage() {
  return useMutation({
    mutationFn: ({
      files,
      folderName,
    }: {
      files: File[];
      folderName?: string;
    }) => adminService.stageLocalUpload(files, folderName),
  });
}

export function useLocalUploadDraft(draftId: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.localUploadDraft(draftId),
    queryFn: () => adminService.getLocalUploadDraft(draftId),
    enabled: enabled && !!draftId,
    staleTime: 1000 * 2,
    refetchInterval: 1200,
  });
}

export function useUpdateLocalUploadDraftItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      draftId,
      itemId,
      data,
    }: {
      draftId: string;
      itemId: string;
      data: UploadPlanPatch;
    }) => adminService.updateLocalUploadDraftItem(draftId, itemId, data),
    onSuccess: async (_result, variables) => {
      qc.invalidateQueries({
        queryKey: adminKeys.localUploadDraft(variables.draftId),
      });
      await qc.refetchQueries({
        queryKey: adminKeys.localUploadDraft(variables.draftId),
      });
    },
  });
}

export function useCancelLocalUploadDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) =>
      adminService.cancelLocalUploadDraft(draftId),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useConfirmLocalUploadDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      draftId,
      idempotencyKey,
    }: {
      draftId: string;
      idempotencyKey?: string;
    }) => adminService.confirmLocalUploadDraft(draftId, idempotencyKey),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs(), adminKeys.all]),
  });
}

export function useLocalUploadStageWithSeries() {
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
      adminService.stageLocalUploadWithSeries(files, seriesTitle, folderName),
  });
}

export function useBulkUpdateLocalUploadDraftItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      draftId,
      data,
    }: {
      draftId: string;
      data: {
        itemIds: string[];
        updates: {
          chapterNumber?: number;
          startChapterNumber?: number;
          seriesTitle?: string;
        };
      };
    }) => adminService.bulkUpdateLocalUploadDraftItems(draftId, data),
    onSuccess: async (_result, variables) => {
      qc.invalidateQueries({
        queryKey: adminKeys.localUploadDraft(variables.draftId),
      });
      await qc.refetchQueries({
        queryKey: adminKeys.localUploadDraft(variables.draftId),
      });
    },
  });
}

// ===== Google Drive Integration =====
export function useGoogleDriveStatus(enabled = true) {
  return useQuery({
    queryKey: adminKeys.googleDriveStatus(),
    queryFn: () => adminService.getGoogleDriveStatus(),
    enabled,
    staleTime: 1000 * 15,
  });
}

export function useGoogleDriveAuthUrl() {
  return useMutation({
    mutationFn: () => adminService.getGoogleDriveAuthUrl(),
  });
}

export function useGoogleDriveCallback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => adminService.handleGoogleDriveCallback(code),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.googleDriveStatus(), adminKeys.all]),
  });
}

export function useGoogleDriveDisconnect() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => adminService.disconnectGoogleDrive(),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.googleDriveStatus(), adminKeys.all]),
  });
}

export function useGoogleDriveFolders(
  params: GoogleDriveFoldersParams,
  enabled = true,
) {
  const { parentId, pageToken, pageSize } = params;

  return useQuery({
    queryKey: adminKeys.googleDriveFolders({
      parentId,
      pageToken,
      pageSize,
    }),
    queryFn: () => adminService.getGoogleDriveFolders(params),
    enabled,
    staleTime: 1000 * 15,
  });
}

export function useGoogleDriveNodes(
  params: GoogleDriveNodesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...adminKeys.all, "google-drive", "nodes", params],
    queryFn: () => adminService.getGoogleDriveNodes(params),
    enabled: enabled && !!params.parentId,
    staleTime: 1000 * 15,
  });
}

export function useGoogleDriveStage() {
  return useMutation({
    mutationFn: ({
      data,
      idempotencyKey,
    }: {
      data: GoogleDriveStageRequest;
      idempotencyKey?: string;
    }) => adminService.stageGoogleDriveUpload(data, idempotencyKey),
  });
}

export function useGoogleDriveDraft(draftId: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.googleDriveDraft(draftId),
    queryFn: () => adminService.getGoogleDriveDraft(draftId),
    enabled: enabled && !!draftId,
    staleTime: 1000 * 10,
  });
}

export function useUpdateGoogleDriveDraftItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      draftId,
      itemId,
      data,
    }: {
      draftId: string;
      itemId: string;
      data: UploadPlanPatch;
    }) => adminService.updateGoogleDriveDraftItem(draftId, itemId, data),
    onSuccess: async (_result, variables) => {
      qc.invalidateQueries({
        queryKey: adminKeys.googleDriveDraft(variables.draftId),
      });
      await qc.refetchQueries({
        queryKey: adminKeys.googleDriveDraft(variables.draftId),
      });
    },
  });
}

export function useCancelGoogleDriveDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) =>
      adminService.cancelGoogleDriveDraft(draftId),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useConfirmGoogleDriveDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      draftId,
      idempotencyKey,
    }: {
      draftId: string;
      idempotencyKey?: string;
    }) => adminService.confirmGoogleDriveDraft(draftId, idempotencyKey),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs(), adminKeys.all]),
  });
}

// ===== Jobs =====
export function useAdminJobs() {
  return useQuery({
    queryKey: adminKeys.jobs(),
    queryFn: () => adminService.getJobs(),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  });
}

export function useAdminJob(jobId: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.job(jobId),
    queryFn: () => adminService.getJob(jobId),
    enabled,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 10,
  });
}

export function useClearCompletedJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.clearCompletedJobs(),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useRetryJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => adminService.retryJob(jobId),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useJobLogs(jobId: string, enabled = true) {
  return useQuery({
    queryKey: [...adminKeys.job(jobId), "logs"],
    queryFn: () => adminService.getJobLogs(jobId),
    enabled,
    staleTime: 1000 * 30,
  });
}

// ===== Scan =====
export function useScanLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incremental?: boolean) =>
      adminService.scanLibrary(incremental),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.jobs(), adminKeys.scanJobs()]),
  });
}

export function useScanJobs() {
  return useQuery({
    queryKey: adminKeys.scanJobs(),
    queryFn: () => adminService.getScanJobs(),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  });
}

export function useScanJob(jobId: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.scanJob(jobId),
    queryFn: () => adminService.getScanJob(jobId),
    enabled: enabled && !!jobId,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 10,
  });
}

// ===== Security =====
export function useBlockedIPs() {
  return useQuery({
    queryKey: adminKeys.blockedIPs(),
    queryFn: () => adminService.getBlockedIPs(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useIPInfo(ip: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.ipInfo(ip),
    queryFn: () => adminService.getIPInfo(ip),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUnblockIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ip: string) => adminService.unblockIP(ip),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.blockedIPs()]),
  });
}

// ===== Media Management =====
export function useAdminMedias(params?: AdminMediaListParams) {
  return useQuery({
    queryKey: adminKeys.medias(params),
    queryFn: () => adminService.getMedias(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMediaDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.mediaDetail(id),
    queryFn: () => adminService.getMediaDetail(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60,
  });
}

export function useMediaPages(id: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.mediaPages(id),
    queryFn: () => adminService.getMediaPages(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 30,
  });
}

export function useDeletePages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, pages }: { mediaId: string; pages: number[] }) =>
      adminService.deletePages(mediaId, pages),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useReorderPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, order }: { mediaId: string; order: number[] }) =>
      adminService.reorderPages(mediaId, order),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useAddPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mediaId,
      files,
      insertAt,
    }: {
      mediaId: string;
      files: File[];
      insertAt?: number;
    }) => adminService.addPages(mediaId, files, insertAt),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useReplacePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mediaId,
      page,
      file,
    }: {
      mediaId: string;
      page: number;
      file: File;
    }) => adminService.replacePage(mediaId, page, file),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useSplitMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mediaId,
      data,
    }: {
      mediaId: string;
      data: SplitMediaRequest;
    }) => adminService.splitMedia(mediaId, data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useBulkDeleteMedias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkDeleteMediaRequest) =>
      adminService.bulkDeleteMedias(data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

export function useBulkMoveMedias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkMoveMediaRequest) =>
      adminService.bulkMoveMedias(data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

// ===== Bulk Delete Series =====
export function useBulkDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkDeleteSeriesRequest) =>
      adminService.bulkDeleteSeries(data),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.all]),
  });
}

// ===== Job Queue Control =====
export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => adminService.deleteJob(jobId),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useRetryAllJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.retryAllJobs(),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function usePauseJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.pauseJobs(),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useResumeJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.resumeJobs(),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useDrainJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.drainJobs(),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.jobs()]),
  });
}

export function useJobsStats() {
  return useQuery({
    queryKey: adminKeys.jobsStats(),
    queryFn: () => adminService.getJobsStats(),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  });
}

// ===== API Health =====
export function useApiHealth() {
  return useQuery({
    queryKey: adminKeys.apiHealth(),
    queryFn: () => adminService.getApiHealth(),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  });
}

// ===== User Management =====
export function useUsersStats() {
  return useQuery({
    queryKey: adminKeys.usersStats(),
    queryFn: () => adminService.getUsersStats(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAdminUsers(params?: AdminUsersParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminService.getUsers(params),
    staleTime: 1000 * 60,
  });
}

export function useAdminUser(id: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: () => adminService.getUser(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => adminService.createUser(data),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.users(), adminKeys.usersStats()]),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      adminService.updateUser(id, data),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.users(), adminKeys.usersStats()]),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.users(), adminKeys.usersStats()]),
  });
}

export function useRevokeSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminService.revokeSessions(userId),
    onSuccess: () => syncAdminQueries(qc, [adminKeys.users()]),
  });
}

// ===== Content Approvals =====
export function useApprovalsStats() {
  return useQuery({
    queryKey: adminKeys.approvalsStats(),
    queryFn: () => adminService.getApprovalsStats(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useAdminApprovals(params?: ApprovalsParams) {
  return useQuery({
    queryKey: adminKeys.approvals(params),
    queryFn: () => adminService.getApprovals(params),
    staleTime: 1000 * 30,
  });
}

export function useApproveContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.approveContent(id),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.approvals(), adminKeys.approvalsStats()]),
  });
}

export function useRejectContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectRequest }) =>
      adminService.rejectContent(id, data),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.approvals(), adminKeys.approvalsStats()]),
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkApproveRequest) => adminService.bulkApprove(data),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.approvals(), adminKeys.approvalsStats()]),
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkRejectRequest) => adminService.bulkReject(data),
    onSuccess: () =>
      syncAdminQueries(qc, [adminKeys.approvals(), adminKeys.approvalsStats()]),
  });
}

// ===== Approval Detail =====
export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: adminKeys.approvalDetail(id),
    queryFn: () => adminService.getApprovalDetail(id),
    enabled: !!id,
  });
}

// ===== Subscriptions =====
export function useSubscriptionsStats() {
  return useQuery({
    queryKey: adminKeys.subscriptionsStats(),
    queryFn: () => adminService.getSubscriptionsStats(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useSubscriptions(params?: SubscriptionsParams) {
  return useQuery({
    queryKey: adminKeys.subscriptions(params),
    queryFn: () => adminService.getSubscriptions(params),
    staleTime: 1000 * 30,
  });
}

export function useActivationTokens(params?: ActivationTokensParams) {
  return useQuery({
    queryKey: adminKeys.activationTokens(params),
    queryFn: () => adminService.getActivationTokens(params),
    staleTime: 1000 * 30,
  });
}

export function useCreateManualSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateManualSubscriptionRequest) =>
      adminService.createManualSubscription(data),
    onSuccess: () =>
      syncAdminQueries(qc, [
        adminKeys.subscriptionsStats(),
        adminKeys.subscriptions(),
        adminKeys.activationTokens(),
      ]),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data?: CancelSubscriptionRequest;
    }) => adminService.cancelSubscription(userId, data),
    onSuccess: () =>
      syncAdminQueries(qc, [
        adminKeys.subscriptionsStats(),
        adminKeys.subscriptions(),
      ]),
  });
}

export function useReactivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminService.reactivateSubscription(userId),
    onSuccess: () =>
      syncAdminQueries(qc, [
        adminKeys.subscriptionsStats(),
        adminKeys.subscriptions(),
      ]),
  });
}

export function useCheckExpiredSubscriptions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminService.checkExpiredSubscriptions(),
    onSuccess: () =>
      syncAdminQueries(qc, [
        adminKeys.subscriptionsStats(),
        adminKeys.subscriptions(),
      ]),
  });
}

// ===== Editor Submissions =====
export function useMySubmissions(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: adminKeys.submissions(params),
    queryFn: () => adminService.getMySubmissions(params),
    staleTime: 1000 * 30,
  });
}
