import api from "./api";
import type { Series } from "@/types/api";
import { normalizeCoverList } from "@/lib/utils";

export interface DiscoverResponse {
  recentlyAdded: Series[];
  recentlyUpdated: Series[];
  mostViewed: Series[];
  trending?: Series[];
  partial?: boolean;
  unavailableSections?: string[];
}

const DEFAULT_DISCOVER_LIMIT = 18;
const MAX_DISCOVER_LIMIT = 50;

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_DISCOVER_LIMIT;
  }

  const safeLimit = limit as number;
  return Math.min(MAX_DISCOVER_LIMIT, Math.max(1, Math.trunc(safeLimit)));
}

function normalizeSeriesList(list: unknown, limit: number): Series[] {
  return normalizeCoverList(Array.isArray(list) ? (list as Series[]) : []).slice(
    0,
    limit,
  );
}

function extractSeriesPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as {
      items?: Series[];
      data?: Series[];
      results?: Series[];
    };

    return record.items ?? record.data ?? record.results ?? [];
  }

  return [];
}

function normalizeDiscoverPayload(
  payload: unknown,
  limit: number,
): DiscoverResponse {
  if (!payload || typeof payload !== "object") {
    return {
      recentlyAdded: [],
      recentlyUpdated: [],
      mostViewed: [],
      trending: [],
      partial: false,
      unavailableSections: [],
    };
  }

  const rawPayload = payload as {
    recentlyAdded?: Series[];
    recentlyUpdated?: Series[];
    mostViewed?: Series[];
    trending?: Series[];
    sections?: {
      recentlyAdded?: Series[];
      recentlyUpdated?: Series[];
      mostViewed?: Series[];
      trending?: Series[];
    };
    partial?: boolean;
    unavailableSections?: unknown;
  };

  const source = rawPayload.sections ?? rawPayload;

  return {
    recentlyAdded: normalizeSeriesList(source.recentlyAdded, limit),
    recentlyUpdated: normalizeSeriesList(source.recentlyUpdated, limit),
    mostViewed: normalizeSeriesList(source.mostViewed, limit),
    trending: normalizeSeriesList(source.trending, limit),
    partial: rawPayload.partial === true,
    unavailableSections: Array.isArray(rawPayload.unavailableSections)
      ? rawPayload.unavailableSections.filter(
          (section): section is string => typeof section === "string",
        )
      : [],
  };
}

export const discoverService = {
  /** Retorna todos os carrosséis de uma vez */
  async getAll(limit?: number, signal?: AbortSignal): Promise<DiscoverResponse> {
    const normalizedLimit = normalizeLimit(limit);
    const response = await api.get<unknown>("/discover/home", {
      params: { limit: normalizedLimit },
      signal,
    });
    return normalizeDiscoverPayload(response.data, normalizedLimit);
  },

  /** Séries adicionadas recentemente */
  async getRecent(limit?: number, signal?: AbortSignal): Promise<Series[]> {
    const normalizedLimit = normalizeLimit(limit);
    const response = await api.get<unknown>("/discover/recent", {
      params: { limit: normalizedLimit },
      signal,
    });
    return normalizeSeriesList(extractSeriesPayload(response.data), normalizedLimit);
  },

  /** Séries atualizadas recentemente */
  async getUpdated(limit?: number, signal?: AbortSignal): Promise<Series[]> {
    const normalizedLimit = normalizeLimit(limit);
    const response = await api.get<unknown>("/discover/updated", {
      params: { limit: normalizedLimit },
      signal,
    });
    return normalizeSeriesList(extractSeriesPayload(response.data), normalizedLimit);
  },

  /** Séries mais populares (ranking por leitores únicos) */
  async getPopular(limit?: number, signal?: AbortSignal): Promise<Series[]> {
    const normalizedLimit = normalizeLimit(limit);
    const response = await api.get<unknown>("/discover/popular", {
      params: { limit: normalizedLimit },
      signal,
    });
    return normalizeSeriesList(extractSeriesPayload(response.data), normalizedLimit);
  },

  /** Séries em tendência recente */
  async getTrending(limit?: number, signal?: AbortSignal): Promise<Series[]> {
    const normalizedLimit = normalizeLimit(limit);
    const response = await api.get<unknown>("/discover/trending", {
      params: { limit: normalizedLimit },
      signal,
    });
    return normalizeSeriesList(extractSeriesPayload(response.data), normalizedLimit);
  },
};
