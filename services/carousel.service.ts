import api from "./api";

export interface CarouselCover {
  id: string;
  title: string;
  coverUrl: string;
}

interface RawCarouselCover {
  id: string;
  title: string;
  coverUrl: string | null;
}

type CarouselCollectionResponse =
  | RawCarouselCover[]
  | {
      items?: RawCarouselCover[];
      data?: RawCarouselCover[];
      results?: RawCarouselCover[];
    };

export interface CarouselCoversQueryParams {
  sort?: "recent" | "popular" | "random";
  limit?: number;
}

const DEFAULT_CAROUSEL_SORT: CarouselCoversQueryParams["sort"] = "recent";
const DEFAULT_CAROUSEL_LIMIT = 24;
const MAX_CAROUSEL_LIMIT = 48;

function normalizeCarouselLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_CAROUSEL_LIMIT;
  }

  const safeLimit = limit as number;
  return Math.min(MAX_CAROUSEL_LIMIT, Math.max(1, Math.trunc(safeLimit)));
}

function normalizeCarouselSort(
  sort: CarouselCoversQueryParams["sort"],
): CarouselCoversQueryParams["sort"] {
  if (sort === "popular" || sort === "random" || sort === "recent") {
    return sort;
  }

  return DEFAULT_CAROUSEL_SORT;
}

function normalizeCoverUrl(rawUrl: string | null | undefined, fallbackId: string): string {
  if (!rawUrl) {
    return `/api/public/series/${fallbackId}/cover`;
  }

  let normalizedInput = rawUrl.startsWith("/series/")
    ? rawUrl.replace("/series/", "/public/series/")
    : rawUrl;

  if (
    normalizedInput.startsWith("http://") ||
    normalizedInput.startsWith("https://")
  ) {
    try {
      const incoming = new URL(normalizedInput);
      normalizedInput = `${incoming.pathname}${incoming.search}`;
    } catch {
      return normalizedInput;
    }
  }

  if (
    normalizedInput.startsWith("http://") ||
    normalizedInput.startsWith("https://") ||
    normalizedInput.startsWith("data:") ||
    normalizedInput.startsWith("blob:")
  ) {
    return normalizedInput;
  }

  if (normalizedInput.startsWith("/api/")) {
    return normalizedInput;
  }

  if (normalizedInput.startsWith("/")) {
    return `/api${normalizedInput}`;
  }

  return `/api/${normalizedInput}`;
}

export function normalizeCarouselCovers(
  covers: RawCarouselCover[],
): CarouselCover[] {
  return covers
    .filter((cover) => typeof cover?.id === "string" && cover.id.trim() !== "")
    .map((cover) => ({
    ...cover,
    coverUrl: normalizeCoverUrl(cover.coverUrl, cover.id),
    }));
}

function extractCarouselCovers(payload: CarouselCollectionResponse): RawCarouselCover[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
}

export const carouselService = {
  async getCovers(
    params: CarouselCoversQueryParams,
    signal?: AbortSignal,
  ): Promise<CarouselCover[]> {
    const normalizedParams = {
      sort: normalizeCarouselSort(params.sort),
      limit: normalizeCarouselLimit(params.limit),
    };

    const response = await api.get<CarouselCollectionResponse>("/carousel/covers", {
      params: normalizedParams,
      signal,
    });

    return normalizeCarouselCovers(extractCarouselCovers(response.data));
  },
};
