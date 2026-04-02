import api from "./api";

export interface CarouselCover {
  id: string;
  title: string;
  coverUrl: string;
}

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

function normalizeCoverUrl(rawUrl: string): string {
  if (!rawUrl) {
    return rawUrl;
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

export function normalizeCarouselCovers(covers: CarouselCover[]): CarouselCover[] {
  return covers.map((cover) => ({
    ...cover,
    coverUrl: normalizeCoverUrl(
      cover.coverUrl || `/public/series/${cover.id}/cover`,
    ),
  }));
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

    const response = await api.get<CarouselCover[]>("/carousel/covers", {
      params: normalizedParams,
      signal,
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    return normalizeCarouselCovers(response.data);
  },
};
