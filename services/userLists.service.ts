import api from "./api";
import type { Series, CollectionItem, SeriesStatus } from "@/types/api";
import { normalizeCoverUrl } from "@/lib/utils";

// Função auxiliar para extrair séries de CollectionItems
function extractSeriesFromItems(items: CollectionItem[]): Series[] {
  return items
    .filter((item) => item.series)
    .map((item) => normalizeCoverUrl(item.series!));
}

export const userListsService = {
  // ===== FAVORITOS =====
  async getFavorites(): Promise<Series[]> {
    const response = await api.get<CollectionItem[]>("/favorites");
    return extractSeriesFromItems(response.data);
  },

  async toggleFavorite(seriesId: string): Promise<void> {
    await api.post(`/favorites/toggle`, { seriesId });
  },

  // ===== LENDO =====
  async getReading(): Promise<Series[]> {
    const response = await api.get<CollectionItem[]>("/reading");
    return extractSeriesFromItems(response.data);
  },

  async toggleReading(seriesId: string): Promise<void> {
    await api.post(`/reading/toggle`, { seriesId });
  },

  // ===== HISTÓRICO =====
  async getHistory(): Promise<Series[]> {
    const response = await api.get<CollectionItem[]>("/history");
    return extractSeriesFromItems(response.data);
  },

  // ===== STATUS DA SÉRIE =====
  async getSeriesStatus(seriesId: string): Promise<SeriesStatus> {
    const response = await api.get<SeriesStatus>(`/series-status/${seriesId}`);
    return response.data;
  },
};
