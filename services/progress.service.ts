import api from "./api";
import type {
  MediaProgress,
  SeriesProgress,
  ContinueReadingItem,
  ProgressHistoryItem,
  ProgressHistoryResponse,
  ContinueReadingParams,
  ProgressHistoryParams,
  ProgressStats,
} from "@/types/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContinueReadingItem(raw: any): ContinueReadingItem {
  return {
    progressId: raw.progressId ?? null,
    mediaId: raw.mediaId || "",
    mediaTitle: raw.mediaTitle || "",
    mediaNumber: raw.mediaNumber || 0,
    seriesId: raw.seriesId || "",
    seriesTitle: raw.seriesTitle || "",
    coverUrl: raw.coverUrl || "",
    page: raw.page || 0,
    pageCount: raw.pageCount || 0,
    percent: raw.percent || 0,
    finished: raw.finished || false,
    lastReadAt: raw.lastReadAt || "",
    startedAt: raw.startedAt ?? null,
    type: raw.type || "in-progress",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHistoryItem(raw: any): ProgressHistoryItem {
  return {
    progressId: raw.progressId || raw.id || "",
    mediaId: raw.mediaId || "",
    mediaTitle: raw.mediaTitle || "",
    mediaNumber: raw.mediaNumber || 0,
    seriesId: raw.seriesId || "",
    seriesTitle: raw.seriesTitle || "",
    coverUrl: raw.coverUrl || "",
    page: raw.page || 0,
    pageCount: raw.pageCount || 0,
    percent: raw.percent || 0,
    finished: raw.finished || false,
    startedAt: raw.startedAt || "",
    lastReadAt: raw.lastReadAt || "",
    completedAt: raw.completedAt ?? null,
    readCount: raw.readCount || 0,
  };
}

export interface SeriesListItem {
  seriesId: string;
  title: string;
  coverUrl: string;
  totalChapters: number;
  chaptersRead: number;
  progressPercent: number;
  lastReadAt: string;
}

export const progressService = {
  async getMediaProgress(mediaId: string): Promise<MediaProgress> {
    const response = await api.get<MediaProgress>(`/progress/${mediaId}`);
    return response.data;
  },

  async getSeriesProgress(seriesId: string): Promise<SeriesProgress> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await api.get<any>(`/progress/series/${seriesId}`);
    const raw = response.data;
    return {
      seriesId: raw.seriesId,
      totalChapters: raw.totalChapters || 0,
      readChapters: raw.chaptersRead ?? raw.readChapters ?? 0,
      chaptersRead: raw.chaptersRead ?? raw.readChapters ?? 0,
      chaptersInProgress: raw.chaptersInProgress ?? 0,
      completionPercentage:
        raw.progressPercent ?? raw.completionPercentage ?? 0,
      progressPercent: raw.progressPercent ?? raw.completionPercentage ?? 0,
      chapters: raw.chapters,
    };
  },

  async getContinueReading(
    params?: ContinueReadingParams,
  ): Promise<ContinueReadingItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await api.get<any[]>("/progress/continue-reading", {
      params,
    });
    return (response.data || []).map(mapContinueReadingItem);
  },

  async getHistory(
    params?: ProgressHistoryParams,
  ): Promise<ProgressHistoryResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await api.get<any>("/progress/history", { params });
    const raw = response.data;

    // Backend pode retornar { items, total, hasMore } ou array direto
    const items = Array.isArray(raw) ? raw : raw.items || raw.data || [];

    const total = Array.isArray(raw) ? raw.length : (raw.total ?? items.length);
    const hasMore = Array.isArray(raw) ? false : (raw.hasMore ?? false);

    return {
      items: items.map(mapHistoryItem),
      total,
      hasMore,
    };
  },

  async getSeriesList(): Promise<SeriesListItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await api.get<any[]>("/progress/series-list");
    return (response.data || []).map((item) => ({
      seriesId: item.seriesId || item.id || "",
      title: item.title || "",
      coverUrl:
        item.coverUrl ||
        (item.coverPath ? `/series/${item.seriesId || item.id}/cover` : ""),
      totalChapters: item.totalChapters || 0,
      chaptersRead: item.chaptersRead || 0,
      progressPercent: item.progressPercent || 0,
      lastReadAt: item.lastReadAt || "",
    }));
  },

  // Marca capítulo como lido (100%)
  async markAsRead(mediaId: string): Promise<void> {
    await api.post(`/progress/${mediaId}/mark-read`);
  },

  // Remove progresso (marca como não lido)
  async removeProgress(mediaId: string): Promise<void> {
    await api.delete(`/progress/${mediaId}`);
  },

  // Marca TODOS os capítulos da série como lidos
  async markAllAsRead(seriesId: string): Promise<void> {
    await api.post(`/progress/series/${seriesId}/mark-all-read`);
  },

  // Remove progresso de TODOS os capítulos da série
  async removeSeriesProgress(seriesId: string): Promise<void> {
    await api.delete(`/progress/series/${seriesId}`);
  },

  // Estatísticas básicas de leitura (legado)
  async getStats(): Promise<ProgressStats> {
    const response = await api.get<ProgressStats>("/progress/stats");
    return response.data;
  },
};
