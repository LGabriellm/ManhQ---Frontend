import api from "./api";
import type {
  AdminDashboardResponse,
  AdminSeriesListResponse,
  AdminSeriesParams,
  UpdateSeriesRequest,
  MetadataSearchResponse,
  MetadataProvidersResponse,
  EnrichSeriesRequest,
  EnrichSeriesResponse,
  AdminJob,
  JobsResponse,
  JobsStats,
  JobDetailResponse,
  JobLogsResponse,
  UploadResponse,
  UploadBulkResponse,
  UploadFolderResponse,
  UploadSerieResponse,
  BlockedIPsResponse,
  IPInfo,
  Series,
  ReassignMediaRequest,
  ReassignMediaResponse,
  UpdateMediaRequest,
  UpdateMediaResponse,
  MergeSeriesRequest,
  MergeSeriesResponse,
  ParsePreviewResponse,
  AdminMediaListParams,
  AdminMediaListResponse,
  AdminMediaDetail,
  AdminMediaPagesResponse,
  DeletePagesResponse,
  ReorderPagesResponse,
  AddPagesResponse,
  ReplacePageResponse,
  SplitMediaRequest,
  SplitMediaResponse,
  BulkDeleteMediaRequest,
  BulkDeleteMediaResponse,
  BulkMoveMediaRequest,
  BulkMoveMediaResponse,
  ApiHealthResponse,
  BulkDeleteSeriesRequest,
  BulkDeleteSeriesResponse,
  JobQueueControlResponse,
  ScanJob,
  ScanJobsResponse,
} from "@/types/api";

// Helpers para flatten jobs da API
function flattenJobs(data: JobsResponse): AdminJob[] {
  const { jobs } = data;

  // Se o backend retornar array direto (com filtro ?completed=true ou ?failed=true)
  if (Array.isArray(jobs)) return jobs;

  // Formato padrão: { waiting: [], active: [], delayed: [], completed: [], failed: [] }
  const all: AdminJob[] = [];
  if (jobs.active) all.push(...jobs.active);
  if (jobs.waiting) all.push(...jobs.waiting);
  if (jobs.delayed) all.push(...jobs.delayed);
  if (jobs.completed) all.push(...jobs.completed);
  if (jobs.failed) all.push(...jobs.failed);
  return all;
}

export interface JobsFullResponse {
  stats: JobsStats;
  jobs: AdminJob[];
}

export const adminService = {
  // ===== Dashboard =====
  async getDashboard(): Promise<AdminDashboardResponse> {
    const response = await api.get<AdminDashboardResponse>("/admin/dashboard");
    return response.data;
  },

  // ===== Series Management =====
  async getSeries(
    params?: AdminSeriesParams,
  ): Promise<AdminSeriesListResponse> {
    const response = await api.get<AdminSeriesListResponse>("/admin/series", {
      params,
    });
    return response.data;
  },

  async updateSeries(
    id: string,
    data: UpdateSeriesRequest,
  ): Promise<{ success: boolean; series: Series }> {
    const response = await api.put<{ success: boolean; series: Series }>(
      `/admin/series/${id}`,
      data,
    );
    return response.data;
  },

  async deleteSeries(
    id: string,
    deleteFiles = false,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/admin/series/${id}`,
      { params: deleteFiles ? { deleteFiles: true } : undefined },
    );
    return response.data;
  },

  async bulkDeleteSeries(
    data: BulkDeleteSeriesRequest,
  ): Promise<BulkDeleteSeriesResponse> {
    const response = await api.post<BulkDeleteSeriesResponse>(
      "/admin/series/bulk-delete",
      data,
    );
    return response.data;
  },

  async deleteMedia(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/admin/media/${id}`,
    );
    return response.data;
  },

  // ===== Metadata / Multi-Source =====
  async getMetadataProviders(): Promise<MetadataProvidersResponse> {
    const response = await api.get<MetadataProvidersResponse>(
      "/admin/metadata/providers",
    );
    return response.data;
  },

  async searchMetadata(
    query: string,
    limit?: number,
  ): Promise<MetadataSearchResponse> {
    const response = await api.get<MetadataSearchResponse>(
      "/admin/metadata/search",
      {
        params: { q: query, limit },
      },
    );
    return response.data;
  },

  async enrichSeries(
    seriesId: string,
    data: EnrichSeriesRequest,
  ): Promise<EnrichSeriesResponse> {
    const response = await api.post<EnrichSeriesResponse>(
      `/admin/series/${seriesId}/enrich`,
      data,
    );
    return response.data;
  },

  async enrichAll(): Promise<{
    success: boolean;
    message: string;
    total: number;
  }> {
    const response = await api.post<{
      success: boolean;
      message: string;
      total: number;
    }>("/admin/enrich-all");
    return response.data;
  },

  async parsePreview(filename: string): Promise<ParsePreviewResponse> {
    const response = await api.get<ParsePreviewResponse>(
      "/admin/parse-preview",
      { params: { filename } },
    );
    return response.data;
  },

  // ===== Media Management =====
  async reassignMedia(
    mediaId: string,
    data: ReassignMediaRequest,
  ): Promise<ReassignMediaResponse> {
    const response = await api.post<ReassignMediaResponse>(
      `/admin/media/${mediaId}/reassign`,
      data,
    );
    return response.data;
  },

  async updateMedia(
    mediaId: string,
    data: UpdateMediaRequest,
  ): Promise<UpdateMediaResponse> {
    const response = await api.put<UpdateMediaResponse>(
      `/admin/media/${mediaId}`,
      data,
    );
    return response.data;
  },

  // ===== Series Merge =====
  async mergeSeries(data: MergeSeriesRequest): Promise<MergeSeriesResponse> {
    const response = await api.post<MergeSeriesResponse>(
      "/admin/series/merge",
      data,
    );
    return response.data;
  },

  // ===== Upload =====
  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<UploadResponse>("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async uploadBulk(files: File[]): Promise<UploadBulkResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const response = await api.post<UploadBulkResponse>(
      "/upload/bulk",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async uploadFolder(
    folderName: string,
    files: File[],
  ): Promise<UploadFolderResponse> {
    const formData = new FormData();
    formData.append("folderName", folderName);
    files.forEach((f) => formData.append("files", f));
    const response = await api.post<UploadFolderResponse>(
      "/upload/folder",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async uploadToSeries(
    seriesId: string,
    files: File[],
  ): Promise<UploadSerieResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const response = await api.post<UploadSerieResponse>(
      `/upload/series/${seriesId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  // ===== Jobs =====
  async getJobs(): Promise<JobsFullResponse> {
    const response = await api.get<JobsResponse>("/jobs");
    const data = response.data;
    return {
      stats: data.stats || {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
      },
      jobs: flattenJobs(data),
    };
  },

  async getJob(jobId: string): Promise<AdminJob> {
    const response = await api.get<JobDetailResponse>(`/jobs/${jobId}`);
    return response.data.job;
  },

  async getJobLogs(jobId: string): Promise<{ logs: string[]; count: number }> {
    const response = await api.get<JobLogsResponse>(`/jobs/${jobId}/logs`);
    return { logs: response.data.logs, count: response.data.count };
  },

  async retryJob(
    jobId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      `/jobs/${jobId}/retry`,
    );
    return response.data;
  },

  async clearCompletedJobs(): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      "/jobs/completed",
    );
    return response.data;
  },

  async deleteJob(
    jobId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/jobs/${jobId}`,
    );
    return response.data;
  },

  async retryAllJobs(): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(
      "/jobs/retry-all",
    );
    return response.data;
  },

  async pauseJobs(): Promise<JobQueueControlResponse> {
    const response = await api.post<JobQueueControlResponse>("/jobs/pause");
    return response.data;
  },

  async resumeJobs(): Promise<JobQueueControlResponse> {
    const response = await api.post<JobQueueControlResponse>("/jobs/resume");
    return response.data;
  },

  async drainJobs(): Promise<JobQueueControlResponse> {
    const response = await api.post<JobQueueControlResponse>("/jobs/drain");
    return response.data;
  },

  async getJobsStats(): Promise<JobsStats> {
    const response = await api.get<{ stats: JobsStats }>("/jobs/stats");
    return response.data.stats;
  },

  // ===== Scan =====
  async scanLibrary(
    incremental = false,
  ): Promise<{ message: string; jobId?: string }> {
    const response = await api.post<{ message: string; jobId?: string }>(
      "/scan",
      null,
      { params: incremental ? { incremental: true } : undefined },
    );
    return response.data;
  },

  async getScanJobs(): Promise<ScanJobsResponse> {
    const response = await api.get<ScanJobsResponse>("/scan/jobs");
    return response.data;
  },

  async getScanJob(jobId: string): Promise<ScanJob> {
    const response = await api.get<ScanJob>(`/scan/jobs/${jobId}`);
    return response.data;
  },

  // ===== API Health =====
  async getApiHealth(): Promise<ApiHealthResponse> {
    const response = await api.get<ApiHealthResponse>("/");
    return response.data;
  },

  // ===== Blocked IPs =====
  async getBlockedIPs(): Promise<BlockedIPsResponse> {
    const response = await api.get<BlockedIPsResponse>("/admin/blocked-ips");
    return response.data;
  },

  async getIPInfo(ip: string): Promise<IPInfo> {
    const response = await api.get<IPInfo>(`/admin/ip-info/${ip}`);
    return response.data;
  },

  async unblockIP(ip: string): Promise<{ message: string; ip: string }> {
    const response = await api.post<{ message: string; ip: string }>(
      "/admin/unblock-ip",
      { ip },
    );
    return response.data;
  },

  // ===== Media Management (New Endpoints) =====
  async getMedias(
    params?: AdminMediaListParams,
  ): Promise<AdminMediaListResponse> {
    const response = await api.get<AdminMediaListResponse>("/admin/medias", {
      params,
    });
    return response.data;
  },

  async getMediaDetail(id: string): Promise<AdminMediaDetail> {
    const response = await api.get<AdminMediaDetail>(`/admin/medias/${id}`);
    return response.data;
  },

  async getMediaPages(id: string): Promise<AdminMediaPagesResponse> {
    const response = await api.get<AdminMediaPagesResponse>(
      `/admin/medias/${id}/pages`,
    );
    return response.data;
  },

  getMediaThumbnailUrl(mediaId: string, page: number, width = 200): string {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${base}/admin/medias/${mediaId}/pages/${page}/thumbnail?width=${width}`;
  },

  async deletePages(
    mediaId: string,
    pages: number[],
  ): Promise<DeletePagesResponse> {
    const response = await api.post<DeletePagesResponse>(
      `/admin/medias/${mediaId}/pages/delete`,
      { pages },
    );
    return response.data;
  },

  async reorderPages(
    mediaId: string,
    order: number[],
  ): Promise<ReorderPagesResponse> {
    const response = await api.post<ReorderPagesResponse>(
      `/admin/medias/${mediaId}/pages/reorder`,
      { order },
    );
    return response.data;
  },

  async addPages(
    mediaId: string,
    files: File[],
    insertAt?: number,
  ): Promise<AddPagesResponse> {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const params = insertAt ? { insertAt } : undefined;
    const response = await api.post<AddPagesResponse>(
      `/admin/medias/${mediaId}/pages/add`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" }, params },
    );
    return response.data;
  },

  async replacePage(
    mediaId: string,
    page: number,
    file: File,
  ): Promise<ReplacePageResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.put<ReplacePageResponse>(
      `/admin/medias/${mediaId}/pages/${page}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async splitMedia(
    mediaId: string,
    data: SplitMediaRequest,
  ): Promise<SplitMediaResponse> {
    const response = await api.post<SplitMediaResponse>(
      `/admin/medias/${mediaId}/split`,
      data,
    );
    return response.data;
  },

  async bulkDeleteMedias(
    data: BulkDeleteMediaRequest,
  ): Promise<BulkDeleteMediaResponse> {
    const response = await api.post<BulkDeleteMediaResponse>(
      "/admin/medias/bulk-delete",
      data,
    );
    return response.data;
  },

  async bulkMoveMedias(
    data: BulkMoveMediaRequest,
  ): Promise<BulkMoveMediaResponse> {
    const response = await api.post<BulkMoveMediaResponse>(
      "/admin/medias/bulk-move",
      data,
    );
    return response.data;
  },
};
