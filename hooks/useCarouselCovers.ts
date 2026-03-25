"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface CarouselCover {
  id: string;
  title: string;
  coverUrl: string;
}

export interface UseCarouselCoversOptions {
  sort?: "recent" | "popular" | "random";
  limit?: number;
  cacheTTLHours?: number;
}

interface CoversCachePayload {
  data: CarouselCover[];
  timestamp: number;
  sort: UseCarouselCoversOptions["sort"];
  limit: number;
}

const STORAGE_KEY = "carousel_covers_cache_v3";

function normalizeCoverUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  const normalizedInput = rawUrl.startsWith("/series/")
    ? rawUrl.replace("/series/", "/public/series/")
    : rawUrl;

  const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (
    backendBaseUrl &&
    (normalizedInput.startsWith("http://") ||
      normalizedInput.startsWith("https://"))
  ) {
    try {
      const backend = new URL(backendBaseUrl);
      const incoming = new URL(normalizedInput);

      if (incoming.origin === backend.origin) {
        const rawPath = incoming.pathname.startsWith("/api/")
          ? incoming.pathname.slice(4)
          : incoming.pathname;
        const normalizedPath = rawPath.startsWith("/series/")
          ? rawPath.replace("/series/", "/public/series/")
          : rawPath;
        return `/api${normalizedPath}${incoming.search}`;
      }
    } catch {
      // ignora erro de parse e segue fluxo padrão
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

function normalizeCovers(covers: CarouselCover[]): CarouselCover[] {
  return covers.map((cover) => ({
    ...cover,
    coverUrl: normalizeCoverUrl(
      cover.coverUrl || `/public/series/${cover.id}/cover`,
    ),
  }));
}

export function useCarouselCovers(options: UseCarouselCoversOptions = {}) {
  const { sort = "recent", limit = 20, cacheTTLHours = 24 } = options;

  const [covers, setCovers] = useState<CarouselCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxAgeMs = useMemo(() => cacheTTLHours * 3600 * 1000, [cacheTTLHours]);

  const readCache = useCallback((): CoversCachePayload | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CoversCachePayload;
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback(
    (data: CarouselCover[]) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            data,
            timestamp: Date.now(),
            sort,
            limit,
          } satisfies CoversCachePayload),
        );
      } catch {
        // ignora erro de storage (quota/privacidade)
      }
    },
    [limit, sort],
  );

  const isCacheValid = useCallback(
    (payload: CoversCachePayload | null) => {
      if (!payload) return false;
      const age = Date.now() - payload.timestamp;
      const sameRequest = payload.sort === sort && payload.limit === limit;
      return sameRequest && age < maxAgeMs;
    },
    [limit, maxAgeMs, sort],
  );

  const fetchCovers = useCallback(
    async (forceFresh = false) => {
      setLoading(true);
      setError(null);

      const cached = readCache();
      if (!forceFresh && isCacheValid(cached)) {
        setCovers(normalizeCovers(cached?.data ?? []));
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const params = new URLSearchParams({
          sort,
          limit: String(limit),
        });

        const res = await fetch(`/api/carousel/covers?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Erro ${res.status}`);
        }

        const data = (await res.json()) as CarouselCover[];

        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida");
        }

        const normalizedData = normalizeCovers(data);
        setCovers(normalizedData);
        writeCache(normalizedData);
      } catch (err) {
        const fallback = readCache();
        if (fallback?.data?.length) {
          setCovers(normalizeCovers(fallback.data));
          setError(null);
        } else {
          if (err instanceof DOMException && err.name === "AbortError") {
            setError("Tempo de requisição esgotado.");
          } else {
            setError("Não foi possível carregar as capas agora.");
          }
        }
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    },
    [isCacheValid, limit, readCache, sort, writeCache],
  );

  useEffect(() => {
    fetchCovers();
  }, [fetchCovers]);

  const refetch = useCallback(
    (clearCache = false) => {
      if (clearCache) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // noop
        }
      }
      fetchCovers(true);
    },
    [fetchCovers],
  );

  return {
    covers,
    loading,
    error,
    refetch,
    isEmpty: covers.length === 0,
    count: covers.length,
  };
}
