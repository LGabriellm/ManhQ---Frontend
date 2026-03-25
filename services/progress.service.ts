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

type UnknownRecord = Record<string, unknown>;

function toRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null) {
    return value as UnknownRecord;
  }
  return {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function mapContinueReadingItem(raw: unknown): ContinueReadingItem {
  const item = toRecord(raw);

  return {
    progressId: asString(item.progressId) || null,
    mediaId: asString(item.mediaId),
    mediaTitle: asString(item.mediaTitle),
    mediaNumber: asNumber(item.mediaNumber),
    seriesId: asString(item.seriesId),
    seriesTitle: asString(item.seriesTitle),
    coverUrl: asString(item.coverUrl),
    page: asNumber(item.page),
    pageCount: asNumber(item.pageCount),
    percent: asNumber(item.percent),
    finished: asBoolean(item.finished),
    lastReadAt: asString(item.lastReadAt),
    startedAt: asString(item.startedAt) || null,
    type: item.type === "next-chapter" ? "next-chapter" : "in-progress",
  };
}

function mapHistoryItem(raw: unknown): ProgressHistoryItem {
  const item = toRecord(raw);

  return {
    progressId: asString(item.progressId) || asString(item.id),
    mediaId: asString(item.mediaId),
    mediaTitle: asString(item.mediaTitle),
    mediaNumber: asNumber(item.mediaNumber),
    seriesId: asString(item.seriesId),
    seriesTitle: asString(item.seriesTitle),
    coverUrl: asString(item.coverUrl),
    page: asNumber(item.page),
    pageCount: asNumber(item.pageCount),
    percent: asNumber(item.percent),
    finished: asBoolean(item.finished),
    startedAt: asString(item.startedAt),
    lastReadAt: asString(item.lastReadAt),
    completedAt: asString(item.completedAt) || null,
    readCount: asNumber(item.readCount),
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
    const response = await api.get<unknown>(`/progress/series/${seriesId}`);
    const raw = toRecord(response.data);
    const chapters = Array.isArray(raw.chapters)
      ? (raw.chapters as SeriesProgress["chapters"])
      : undefined;
    const chaptersRead = asNumber(raw.chaptersRead, asNumber(raw.readChapters));
    const progressPercent = asNumber(
      raw.progressPercent,
      asNumber(raw.completionPercentage),
    );

    return {
      seriesId: asString(raw.seriesId),
      totalChapters: asNumber(raw.totalChapters),
      readChapters: chaptersRead,
      chaptersRead,
      chaptersInProgress: asNumber(raw.chaptersInProgress),
      completionPercentage: progressPercent,
      progressPercent,
      chapters,
    };
  },

  async getContinueReading(
    params?: ContinueReadingParams,
  ): Promise<ContinueReadingItem[]> {
    const response = await api.get<unknown>("/progress/continue-reading", {
      params,
    });
    if (!Array.isArray(response.data)) {
      return [];
    }
    return response.data.map(mapContinueReadingItem);
  },

  async getHistory(
    params?: ProgressHistoryParams,
  ): Promise<ProgressHistoryResponse> {
    const response = await api.get<unknown>("/progress/history", { params });
    const raw = response.data;

    // Backend pode retornar { items, total, hasMore } ou array direto
    const payload = toRecord(raw);
    const collection = Array.isArray(raw)
      ? raw
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : [];

    const total = Array.isArray(raw)
      ? raw.length
      : asNumber(payload.total, collection.length);
    const hasMore = Array.isArray(raw) ? false : asBoolean(payload.hasMore);

    return {
      items: collection.map(mapHistoryItem),
      total,
      hasMore,
    };
  },

  async getSeriesList(): Promise<SeriesListItem[]> {
    const response = await api.get<unknown>("/progress/series-list");
    if (!Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((item) => {
      const series = toRecord(item);
      const seriesId = asString(series.seriesId) || asString(series.id);

      return {
        seriesId,
        title: asString(series.title),
        coverUrl:
          asString(series.coverUrl) ||
          (asString(series.coverPath) ? `/series/${seriesId}/cover` : ""),
        totalChapters: asNumber(series.totalChapters),
        chaptersRead: asNumber(series.chaptersRead),
        progressPercent: asNumber(series.progressPercent),
        lastReadAt: asString(series.lastReadAt),
      };
    });
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
