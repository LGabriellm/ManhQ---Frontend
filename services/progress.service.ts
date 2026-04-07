import api from "./api";
import { getCoverUrl } from "@/lib/utils";
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

function mapMediaProgress(raw: unknown): MediaProgress {
  const payload =
    raw && typeof raw === "object" && "progress" in raw
      ? (raw as { progress?: unknown }).progress
      : raw;
  const item = toRecord(payload);

  // Backend pode retornar page: 0 como fallback — normaliza para 1
  const rawPage = asNumber(item.page, 1);

  return {
    page: rawPage > 0 ? rawPage : 1,
    finished: asBoolean(item.finished),
    startedAt: asString(item.startedAt),
    lastReadAt: asString(item.lastReadAt),
    readCount: asNumber(item.readCount),
  };
}

function mapContinueReadingItem(raw: unknown): ContinueReadingItem {
  const item = toRecord(raw);
  const mediaId = asString(item.mediaId);
  const coverUrl = getCoverUrl(asString(item.coverUrl));

  return {
    progressId: asString(item.progressId) || null,
    mediaId,
    mediaTitle: asString(item.mediaTitle),
    mediaNumber: asNumber(item.mediaNumber),
    seriesId: asString(item.seriesId),
    seriesTitle: asString(item.seriesTitle),
    coverUrl,
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
  const coverUrl = getCoverUrl(asString(item.coverUrl));

  return {
    progressId: asString(item.progressId) || asString(item.id),
    mediaId: asString(item.mediaId),
    mediaTitle: asString(item.mediaTitle),
    mediaNumber: asNumber(item.mediaNumber),
    seriesId: asString(item.seriesId),
    seriesTitle: asString(item.seriesTitle),
    coverUrl,
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

function extractCollection(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);

  if (Array.isArray(record.items)) {
    return record.items;
  }

  if (Array.isArray(record.data)) {
    return record.data;
  }

  return [];
}

export const progressService = {
  async getMediaProgress(mediaId: string): Promise<MediaProgress> {
    const response = await api.get<unknown>(`/progress/${mediaId}`);
    return mapMediaProgress(response.data);
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

    return extractCollection(response.data).map(mapContinueReadingItem);
  },

  async getHistory(
    params?: ProgressHistoryParams,
  ): Promise<ProgressHistoryResponse> {
    const response = await api.get<unknown>("/progress/history", { params });
    const raw = response.data;

    // Backend pode retornar { items, total, hasMore } ou array direto
    const payload = toRecord(raw);
    const collection = extractCollection(raw);

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
    return extractCollection(response.data).map((item) => {
      const series = toRecord(item);
      const seriesId = asString(series.seriesId) || asString(series.id);
      const coverUrl = getCoverUrl(
        asString(series.coverUrl) ||
          (asString(series.coverPath)
            ? `/public/series/${seriesId}/cover`
            : ""),
      );

      return {
        seriesId,
        title: asString(series.title),
        coverUrl,
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
