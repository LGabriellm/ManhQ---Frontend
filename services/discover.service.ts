import api from "./api";
import type { Series } from "@/types/api";
import { normalizeCoverList } from "@/lib/utils";

export interface DiscoverResponse {
  recentlyAdded: Series[];
  recentlyUpdated: Series[];
  mostViewed: Series[];
}

export const discoverService = {
  /** Retorna todos os carrosséis de uma vez */
  async getAll(): Promise<DiscoverResponse> {
    const response = await api.get<DiscoverResponse>("/discover");
    return {
      recentlyAdded: normalizeCoverList(response.data.recentlyAdded),
      recentlyUpdated: normalizeCoverList(response.data.recentlyUpdated),
      mostViewed: normalizeCoverList(response.data.mostViewed),
    };
  },

  /** Séries adicionadas recentemente */
  async getRecent(): Promise<Series[]> {
    const response = await api.get<Series[]>("/discover/recent");
    return normalizeCoverList(response.data);
  },

  /** Séries atualizadas recentemente */
  async getUpdated(): Promise<Series[]> {
    const response = await api.get<Series[]>("/discover/updated");
    return normalizeCoverList(response.data);
  },

  /** Séries mais populares (ranking por leitores únicos) */
  async getPopular(): Promise<Series[]> {
    const response = await api.get<Series[]>("/discover/popular");
    return normalizeCoverList(response.data);
  },
};
