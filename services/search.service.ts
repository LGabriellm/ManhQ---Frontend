import api from "./api";
import type { Series } from "@/types/api";
import { normalizeCoverList } from "@/lib/utils";

export interface SearchSeriesResponse {
  items: Series[];
  total: number;
  page: number;
  limit: number;
}

function normalizeSearchPayload(payload: unknown): SearchSeriesResponse {
  if (Array.isArray(payload)) {
    const items = normalizeCoverList(payload as Series[]);
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length,
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
    const items = normalizeCoverList(list);

    return {
      items,
      total: data.total ?? items.length,
      page: data.page ?? 1,
      limit: data.limit ?? items.length,
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
    page = 1,
    limit = 24,
  ): Promise<SearchSeriesResponse> {
    const response = await api.get<unknown>("/search", {
      params: {
        q: query,
        page,
        limit,
      },
    });

    return normalizeSearchPayload(response.data);
  },

  async getSuggestions(query: string, limit = 6): Promise<string[]> {
    const response = await api.get<unknown>("/search/suggestions", {
      params: {
        q: query,
        limit,
      },
    });

    return normalizeSuggestionPayload(response.data);
  },
};
