import api from "./api";
import type { Series } from "@/types/api";
import { normalizeCoverList } from "@/lib/utils";

export interface DiscoverResponse {
  recentlyAdded: Series[];
  recentlyUpdated: Series[];
  mostViewed: Series[];
}

const DEFAULT_DISCOVER_LIMIT = 18;
const MAX_DISCOVER_LIMIT = 36;

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_DISCOVER_LIMIT;
  }

  const safeLimit = limit as number;
  return Math.min(MAX_DISCOVER_LIMIT, Math.max(1, Math.trunc(safeLimit)));
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
  async getAll(limit?: number): Promise<DiscoverResponse> {
    const response = await api.get<unknown>("/discover", {
      params: { limit: normalizeLimit(limit) },
    });
    return normalizeDiscoverPayload(response.data);
  },

  /** Séries adicionadas recentemente */
  async getRecent(limit?: number): Promise<Series[]> {
    const response = await api.get<Series[]>("/discover/recent", {
      params: { limit: normalizeLimit(limit) },
    });
    return normalizeCoverList(response.data);
  },

  /** Séries atualizadas recentemente */
  async getUpdated(limit?: number): Promise<Series[]> {
    const response = await api.get<Series[]>("/discover/updated", {
      params: { limit: normalizeLimit(limit) },
    });
    return normalizeCoverList(response.data);
  },

  /** Séries mais populares (ranking por leitores únicos) */
  async getPopular(limit?: number): Promise<Series[]> {
    const response = await api.get<Series[]>("/discover/popular", {
      params: { limit: normalizeLimit(limit) },
    });
    return normalizeCoverList(response.data);
  },
};
