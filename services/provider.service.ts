import api from "./api";
import type {
  CatalogSearchParams,
  CatalogSearchResponse,
  CatalogTitleResponse,
  TrackTitleRequest,
  TrackTitleResponse,
  TrackedTitlesParams,
  TrackedTitlesResponse,
  TrackedTitleResponse,
  UpdateTrackedTitleRequest,
  SyncChaptersResponse,
  ImportChapterResponse,
  BulkImportRequest,
  BulkImportResponse,
  ProvidersListResponse,
  ProviderStatsResponse,
  KeiyoushiStatsResponse,
  KeiyoushiSourcesResponse,
  KeiyoushiParams,
  SuwayomiHealthResponse,
  SuwayomiExtensionsParams,
  SuwayomiExtensionsResponse,
  SuwayomiFetchResponse,
  SuwayomiInstallResponse,
  SuwayomiUninstallResponse,
  SuwayomiReloadResponse,
  SuwayomiCacheResponse,
  ClearSuwayomiCacheResponse,
  RetryFailedResponse,
  RetryChapterResponse,
  ChapterStatusResponse,
  CleanupStaleResponse,
  UpdateChapterRequest,
  UpdateChapterResponse,
  ReimportFromRequest,
  ReimportFromResponse,
  ChapterHealthSummary,
  SeriesProviderMapping,
  DuplicateCandidate,
} from "@/types/api";

export const providerService = {
  // ===== Provider Discovery =====
  async listProviders(signal?: AbortSignal): Promise<ProvidersListResponse> {
    const res = await api.get<ProvidersListResponse>("/admin/providers", {
      signal,
    });
    return res.data;
  },

  async getStats(signal?: AbortSignal): Promise<ProviderStatsResponse> {
    const res = await api.get<ProviderStatsResponse>("/admin/providers/stats", {
      signal,
    });
    return res.data;
  },

  // ===== Catalog Search & Metadata =====
  async searchCatalog(
    provider: string,
    params: CatalogSearchParams,
    signal?: AbortSignal,
  ): Promise<CatalogSearchResponse> {
    const res = await api.get<CatalogSearchResponse>(
      `/admin/providers/${provider}/search`,
      { params, signal },
    );
    return res.data;
  },

  async getTitleDetails(
    provider: string,
    externalId: string,
    signal?: AbortSignal,
  ): Promise<CatalogTitleResponse> {
    const res = await api.get<CatalogTitleResponse>(
      `/admin/providers/${provider}/title/${externalId}`,
      { signal },
    );
    return res.data;
  },

  // ===== Title Tracking =====
  async trackTitle(data: TrackTitleRequest): Promise<TrackTitleResponse> {
    const res = await api.post<TrackTitleResponse>(
      "/admin/providers/track",
      data,
    );
    return res.data;
  },

  async listTracked(
    params?: TrackedTitlesParams,
    signal?: AbortSignal,
  ): Promise<TrackedTitlesResponse> {
    const res = await api.get<TrackedTitlesResponse>(
      "/admin/providers/tracked",
      { params, signal },
    );
    return res.data;
  },

  async getTracked(
    id: string,
    signal?: AbortSignal,
  ): Promise<TrackedTitleResponse> {
    const res = await api.get<TrackedTitleResponse>(
      `/admin/providers/tracked/${id}`,
      { signal },
    );
    return res.data;
  },

  async updateTracked(
    id: string,
    data: UpdateTrackedTitleRequest,
  ): Promise<TrackedTitleResponse> {
    const res = await api.patch<TrackedTitleResponse>(
      `/admin/providers/tracked/${id}`,
      data,
    );
    return res.data;
  },

  async deleteTracked(id: string): Promise<void> {
    await api.delete(`/admin/providers/tracked/${id}`);
  },

  // ===== Sync & Import =====
  async syncChapters(id: string): Promise<SyncChaptersResponse> {
    const res = await api.post<SyncChaptersResponse>(
      `/admin/providers/tracked/${id}/sync`,
    );
    return res.data;
  },

  async checkUpdates(id: string): Promise<SyncChaptersResponse> {
    const res = await api.post<SyncChaptersResponse>(
      `/admin/providers/tracked/${id}/check-updates`,
    );
    return res.data;
  },

  async importChapter(chapterId: string): Promise<ImportChapterResponse> {
    const res = await api.post<ImportChapterResponse>(
      `/admin/providers/chapters/${chapterId}/import`,
    );
    return res.data;
  },

  async bulkImportChapters(
    id: string,
    data?: BulkImportRequest,
  ): Promise<BulkImportResponse> {
    const res = await api.post<BulkImportResponse>(
      `/admin/providers/tracked/${id}/import`,
      data ?? {},
    );
    return res.data;
  },

  async refreshTitle(id: string): Promise<TrackedTitleResponse> {
    const res = await api.post<TrackedTitleResponse>(
      `/admin/providers/tracked/${id}/refresh`,
    );
    return res.data;
  },

  async retryFailedChapters(id: string): Promise<RetryFailedResponse> {
    const res = await api.post<RetryFailedResponse>(
      `/admin/providers/tracked/${id}/retry-failed`,
    );
    return res.data;
  },

  async retryChapter(chapterId: string): Promise<RetryChapterResponse> {
    const res = await api.post<RetryChapterResponse>(
      `/admin/providers/chapters/${chapterId}/retry`,
    );
    return res.data;
  },

  async getChapterStatus(
    chapterId: string,
    signal?: AbortSignal,
  ): Promise<ChapterStatusResponse> {
    const res = await api.get<ChapterStatusResponse>(
      `/admin/providers/chapters/${chapterId}/status`,
      { signal },
    );
    return res.data;
  },

  async updateChapter(
    chapterId: string,
    data: UpdateChapterRequest,
  ): Promise<UpdateChapterResponse> {
    const res = await api.patch<UpdateChapterResponse>(
      `/admin/providers/chapters/${chapterId}`,
      data,
    );
    return res.data;
  },

  async cleanupStale(minutes?: number): Promise<CleanupStaleResponse> {
    const res = await api.post<CleanupStaleResponse>(
      "/admin/providers/cleanup-stale",
      undefined,
      { params: minutes ? { minutes } : undefined },
    );
    return res.data;
  },

  async reimportFrom(
    chapterId: string,
    data: ReimportFromRequest,
  ): Promise<ReimportFromResponse> {
    const res = await api.post<ReimportFromResponse>(
      `/admin/providers/chapters/${chapterId}/reimport-from`,
      data,
    );
    return res.data;
  },

  // ===== Suwayomi Sidecar =====
  async suwayomiHealth(signal?: AbortSignal): Promise<SuwayomiHealthResponse> {
    const res = await api.get<SuwayomiHealthResponse>(
      "/admin/providers/suwayomi/health",
      { signal },
    );
    return res.data;
  },

  async suwayomiReload(): Promise<SuwayomiReloadResponse> {
    const res = await api.post<SuwayomiReloadResponse>(
      "/admin/providers/suwayomi/reload",
    );
    return res.data;
  },

  async suwayomiExtensions(
    params?: SuwayomiExtensionsParams,
    signal?: AbortSignal,
  ): Promise<SuwayomiExtensionsResponse> {
    const res = await api.get<SuwayomiExtensionsResponse>(
      "/admin/providers/suwayomi/extensions",
      { params, signal },
    );
    return res.data;
  },

  async suwayomiFetchExtensions(): Promise<SuwayomiFetchResponse> {
    const res = await api.post<SuwayomiFetchResponse>(
      "/admin/providers/suwayomi/extensions/fetch",
    );
    return res.data;
  },

  async suwayomiInstallExtension(
    pkgName: string,
  ): Promise<SuwayomiInstallResponse> {
    const res = await api.post<SuwayomiInstallResponse>(
      "/admin/providers/suwayomi/extensions/install",
      { pkgName },
    );
    return res.data;
  },

  async suwayomiUninstallExtension(
    pkgName: string,
  ): Promise<SuwayomiUninstallResponse> {
    const res = await api.post<SuwayomiUninstallResponse>(
      "/admin/providers/suwayomi/extensions/uninstall",
      { pkgName },
    );
    return res.data;
  },

  async suwayomiCache(signal?: AbortSignal): Promise<SuwayomiCacheResponse> {
    const res = await api.get<SuwayomiCacheResponse>(
      "/admin/providers/suwayomi/cache",
      { signal },
    );
    return res.data;
  },

  async clearSuwayomiCache(
    dirs?: ("downloads" | "thumbnails" | "temp")[],
  ): Promise<ClearSuwayomiCacheResponse> {
    const res = await api.delete<ClearSuwayomiCacheResponse>(
      "/admin/providers/suwayomi/cache",
      { data: dirs ? { dirs } : {} },
    );
    return res.data;
  },

  // ===== Chapter Health =====
  async getChapterHealth(providerTitleId: string): Promise<ChapterHealthSummary> {
    const res = await api.get<ChapterHealthSummary>(
      `/admin/provider-titles/${providerTitleId}/chapter-health`,
    );
    return res.data;
  },

  async validateChapters(providerTitleId: string): Promise<{ queued: boolean }> {
    const res = await api.post<{ queued: boolean }>(
      `/admin/provider-titles/${providerTitleId}/validate-chapters`,
    );
    return res.data;
  },

  async runGlobalValidation(limit?: number): Promise<{ queued: boolean; message?: string }> {
    const res = await api.post<{ queued: boolean; message?: string }>(
      "/admin/chapter-health/run-validation-pass",
      { limit },
    );
    return res.data;
  },

  // ===== Multi-Provider Sources =====
  async getSeriesSources(seriesId: string): Promise<{ sources: SeriesProviderMapping[] }> {
    const res = await api.get<{ sources: SeriesProviderMapping[] }>(
      `/admin/series/${seriesId}/provider-sources`,
    );
    return res.data;
  },

  async linkProviderToSeries(
    providerTitleId: string,
    data: { seriesId: string; priority?: number; isPrimary?: boolean; language?: string; notes?: string },
  ): Promise<{ mapping: SeriesProviderMapping }> {
    const res = await api.post<{ mapping: SeriesProviderMapping }>(
      `/admin/provider-titles/${providerTitleId}/link-to-series`,
      data,
    );
    return res.data;
  },

  async setPrimarySource(seriesId: string, providerTitleId: string): Promise<{ updated: boolean }> {
    const res = await api.patch<{ updated: boolean }>(
      `/admin/series/${seriesId}/primary-source`,
      { providerTitleId },
    );
    return res.data;
  },

  async removeProviderSource(seriesId: string, mappingId: string): Promise<void> {
    await api.delete(`/admin/series/${seriesId}/provider-sources/${mappingId}`);
  },

  // ===== Duplicate Detection =====
  async findDuplicates(providerTitleId: string): Promise<{ candidates: DuplicateCandidate[] }> {
    const res = await api.get<{ candidates: DuplicateCandidate[] }>(
      `/admin/provider-titles/${providerTitleId}/duplicates`,
    );
    return res.data;
  },

  // ===== Series Search =====
  async searchSeries(
    q: string,
    limit = 10,
  ): Promise<{ series: Array<{ id: string; title: string }> }> {
    const res = await api.get<{ series: Array<{ id: string; title: string }> }>(
      "/admin/series/search",
      { params: { q, limit } },
    );
    return res.data;
  },

  // ===== Keiyoushi Source Registry =====
  async getKeiyoushiStats(
    signal?: AbortSignal,
  ): Promise<KeiyoushiStatsResponse> {
    const res = await api.get<KeiyoushiStatsResponse>(
      "/admin/providers/keiyoushi",
      { signal },
    );
    return res.data;
  },

  async getKeiyoushiSources(
    params?: KeiyoushiParams,
    signal?: AbortSignal,
  ): Promise<KeiyoushiSourcesResponse> {
    const res = await api.get<KeiyoushiSourcesResponse>(
      "/admin/providers/keiyoushi",
      { params, signal },
    );
    return res.data;
  },
};
