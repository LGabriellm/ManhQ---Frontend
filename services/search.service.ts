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
  totalPages: number;
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
  page: number,
  limit: number,
): SearchSeriesResponse {
  if (Array.isArray(payload)) {
    const items = normalizeCoverList(payload as Series[]).slice(0, limit);
    return {
      items,
      total: items.length,
      page,
      limit,
      totalPages: items.length > 0 ? 1 : 0,
    };
  }

  if (payload && typeof payload === "object") {
    const data = payload as {
      items?: Series[];
      data?: Series[];
      total?: number;
      page?: number;
      limit?: number;
      pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
      };
    };

    const list = data.items ?? data.data ?? [];
    const items = normalizeCoverList(list).slice(0, limit);
    const pagination = data.pagination;
    const normalizedPage = normalizePositiveInt(
      pagination?.page ?? data.page ?? page,
      page,
      1000,
    );
    const normalizedLimit = normalizePositiveInt(
      pagination?.limit ?? data.limit ?? limit,
      limit,
      MAX_SEARCH_LIMIT,
    );
    const total = Math.max(
      items.length,
      Number.isFinite(pagination?.total) ? Number(pagination?.total) : 0,
      Number.isFinite(data.total) ? Number(data.total) : 0,
    );
    const totalPages = Math.max(
      total > 0 ? Math.ceil(total / normalizedLimit) : 0,
      Number.isFinite(pagination?.totalPages)
        ? Number(pagination?.totalPages)
        : 0,
    );

    return {
      items,
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages,
    };
  }

  return {
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
  };
}

function normalizeSuggestionPayload(payload: unknown): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  const pushSuggestion = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    const dedupeKey = normalizedValue.toLocaleLowerCase("pt-BR");
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    suggestions.push(normalizedValue);
  };

  if (Array.isArray(payload)) {
    if (payload.every((item) => typeof item === "string")) {
      payload.forEach((item) => pushSuggestion(item));
      return suggestions;
    }

    (payload as Series[]).forEach((item) => pushSuggestion(item.title));
    return suggestions;
  }

  if (payload && typeof payload === "object") {
    const data = payload as {
      suggestions?: string[];
      items?: Array<Series | { id?: string; title?: string }>;
      data?: string[];
    };

    if (Array.isArray(data.suggestions)) {
      data.suggestions.forEach((item) => pushSuggestion(item));
      return suggestions;
    }

    if (Array.isArray(data.data)) {
      data.data.forEach((item) => pushSuggestion(item));
      return suggestions;
    }

    if (Array.isArray(data.items)) {
      data.items.forEach((item) => pushSuggestion(item.title));
      return suggestions;
    }
  }

  return suggestions;
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

    if (!normalizedQuery) {
      return {
        items: [],
        total: 0,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: 0,
      };
    }

    const response = await api.get<unknown>("/search", {
      params: {
        q: normalizedQuery,
        page: normalizedPage,
        limit: normalizedLimit,
      },
      signal,
    });

    return normalizeSearchPayload(
      response.data,
      normalizedPage,
      normalizedLimit,
    );
  },

  async getSuggestions(
    query: string,
    limit = DEFAULT_SUGGESTIONS_LIMIT,
    signal?: AbortSignal,
  ): Promise<string[]> {
    const normalizedQuery = query.trim();
    const normalizedLimit = normalizePositiveInt(
      limit,
      DEFAULT_SUGGESTIONS_LIMIT,
      MAX_SUGGESTIONS_LIMIT,
    );

    if (!normalizedQuery) {
      return [];
    }

    const response = await api.get<unknown>("/search/suggestions", {
      params: {
        q: normalizedQuery,
        limit: normalizedLimit,
      },
      signal,
    });

    return normalizeSuggestionPayload(response.data).slice(0, normalizedLimit);
  },
};
