import api from "./api";
import type { Series } from "@/types/api";
import { normalizeCoverList } from "@/lib/utils";

export interface DiscoverResponse {
  recentlyAdded: Series[];
  recentlyUpdated: Series[];
  mostViewed: Series[];
}

function normalizeDiscoverPayload(payload: unknown): DiscoverResponse {
  if (!payload || typeof payload !== "object") {
    return {
      recentlyAdded: [],
      recentlyUpdated: [],
      mostViewed: [],
    };
  }

  const rawPayload = payload as {
    recentlyAdded?: Series[];
    recentlyUpdated?: Series[];
    mostViewed?: Series[];
    sections?: {
      recentlyAdded?: Series[];
      recentlyUpdated?: Series[];
      mostViewed?: Series[];
    };
  };

  const source = rawPayload.sections ?? rawPayload;

  return {
    recentlyAdded: normalizeCoverList(
      Array.isArray(source.recentlyAdded) ? source.recentlyAdded : [],
    ),
    recentlyUpdated: normalizeCoverList(
      Array.isArray(source.recentlyUpdated) ? source.recentlyUpdated : [],
    ),
    mostViewed: normalizeCoverList(
      Array.isArray(source.mostViewed) ? source.mostViewed : [],
    ),
  };
}

export const discoverService = {
  /** Retorna todos os carrosséis de uma vez */
  async getAll(): Promise<DiscoverResponse> {
    const response = await api.get<unknown>("/discover");
    return normalizeDiscoverPayload(response.data);
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
