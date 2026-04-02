import api from "./api";
import type { Series } from "@/types/api";
import { normalizeCoverList } from "@/lib/utils";

const DEFAULT_SEARCH_PAGE = 1;
const DEFAULT_SEARCH_LIMIT = 24;
const MAX_SEARCH_LIMIT = 50;
const DEFAULT_SUGGESTIONS_LIMIT = 6;
const MAX_SUGGESTIONS_LIMIT = 20;

export interface SearchSeriesResponse {
  items: Series[];
  total: number;
  page: number;
  limit: number;
}

function normalizePositiveInt(
  value: number,
  fallback: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.trunc(value)));
}

function normalizeSearchPayload(
  payload: unknown,
  limit: number,
): SearchSeriesResponse {
  if (Array.isArray(payload)) {
    const items = normalizeCoverList(payload as Series[]).slice(0, limit);
    return {
      items,
      total: items.length,
      page: 1,
      limit: Math.min(limit, items.length),
    };
  }

  if (payload && typeof payload === "object") {
    const data = payload as {
      items?: Series[];
      data?: Series[];
      total?: number;
      page?: number;
      limit?: number;
    };

    const list = data.items ?? data.data ?? [];
    const items = normalizeCoverList(list).slice(0, limit);

    return {
      items,
      total: data.total ?? items.length,
      page: data.page ?? 1,
      limit: Math.min(data.limit ?? items.length, limit),
    };
  }

  return {
    items: [],
    total: 0,
    page: 1,
    limit: 0,
  };
}

function normalizeSuggestionPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    if (payload.every((item) => typeof item === "string")) {
      return payload as string[];
    }

    return (payload as Series[])
      .map((item) => item.title)
      .filter((title): title is string => typeof title === "string");
  }

  if (payload && typeof payload === "object") {
    const data = payload as {
      suggestions?: string[];
      items?: Series[];
      data?: string[];
    };

    if (Array.isArray(data.suggestions)) return data.suggestions;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) {
      return data.items
        .map((item) => item.title)
        .filter((title): title is string => typeof title === "string");
    }
  }

  return [];
}

export const searchService = {
  async searchSeries(
    query: string,
    page = DEFAULT_SEARCH_PAGE,
    limit = DEFAULT_SEARCH_LIMIT,
    signal?: AbortSignal,
  ): Promise<SearchSeriesResponse> {
    const normalizedQuery = query.trim();
    const normalizedPage = normalizePositiveInt(page, DEFAULT_SEARCH_PAGE, 1000);
    const normalizedLimit = normalizePositiveInt(
      limit,
      DEFAULT_SEARCH_LIMIT,
      MAX_SEARCH_LIMIT,
    );
    const response = await api.get<unknown>("/search", {
      params: {
        q: normalizedQuery,
        page: normalizedPage,
        limit: normalizedLimit,
      },
      signal,
    });

    return normalizeSearchPayload(response.data, normalizedLimit);
  },

  async getSuggestions(
    query: string,
    limit = DEFAULT_SUGGESTIONS_LIMIT,
    signal?: AbortSignal,
  ): Promise<string[]> {
    const normalizedLimit = normalizePositiveInt(
      limit,
      DEFAULT_SUGGESTIONS_LIMIT,
      MAX_SUGGESTIONS_LIMIT,
    );
    const response = await api.get<unknown>("/search/suggestions", {
      params: {
        q: query.trim(),
        limit: normalizedLimit,
      },
      signal,
    });

    return normalizeSuggestionPayload(response.data).slice(0, normalizedLimit);
  },
};
