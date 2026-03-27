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
    const response = await api.get<CarouselCover[]>("/carousel/covers", {
      params,
      signal,
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    return normalizeCarouselCovers(response.data);
  },
};
