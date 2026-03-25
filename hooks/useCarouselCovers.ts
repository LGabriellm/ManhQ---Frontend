"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  carouselService,
  type CarouselCover,
} from "@/services/carousel.service";

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
        setCovers(cached?.data ?? []);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const normalizedData = await carouselService.getCovers(
          {
            sort,
            limit,
          },
          controller.signal,
        );

        setCovers(normalizedData);
        writeCache(normalizedData);
      } catch (err) {
        const fallback = readCache();
        if (fallback?.data?.length) {
          setCovers(fallback.data);
          setError(null);
        } else if (err instanceof DOMException && err.name === "AbortError") {
          setError("Tempo de requisição esgotado.");
        } else {
          setError("Não foi possível carregar as capas agora.");
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
