import api from "./api";
import type { Series, CollectionItem, SeriesStatus } from "@/types/api";
import { normalizeCoverUrl } from "@/lib/utils";

type CollectionResponse =
  | CollectionItem[]
  | { items?: CollectionItem[]; data?: CollectionItem[] };

function extractItems(payload: CollectionResponse): CollectionItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

// Função auxiliar para extrair séries de CollectionItems
function extractSeriesFromItems(items: CollectionItem[]): Series[] {
  const seenSeries = new Set<string>();

  return items.flatMap((item) => {
    if (!item.series) {
      return [];
    }

    const normalizedSeries = normalizeCoverUrl(item.series);
    if (seenSeries.has(normalizedSeries.id)) {
      return [];
    }

    seenSeries.add(normalizedSeries.id);
    return [normalizedSeries];
  });
}

async function getCollectionSeries(path: string): Promise<Series[]> {
  const response = await api.get<CollectionResponse>(path);
  return extractSeriesFromItems(extractItems(response.data));
}

export const userListsService = {
  // ===== FAVORITOS =====
  async getFavorites(): Promise<Series[]> {
    return getCollectionSeries("/favorites");
  },

  async toggleFavorite(seriesId: string): Promise<void> {
    await api.post(`/favorites/toggle`, { seriesId });
  },

  // ===== LENDO =====
  async getReading(): Promise<Series[]> {
    return getCollectionSeries("/reading");
  },

  async toggleReading(seriesId: string): Promise<void> {
    await api.post(`/reading/toggle`, { seriesId });
  },

  // ===== HISTÓRICO =====
  async getHistory(): Promise<Series[]> {
    return getCollectionSeries("/history");
  },

  // ===== STATUS DA SÉRIE =====
  async getSeriesStatus(seriesId: string): Promise<SeriesStatus> {
    const response = await api.get<SeriesStatus>(`/series-status/${seriesId}`);
    return response.data;
  },
};
