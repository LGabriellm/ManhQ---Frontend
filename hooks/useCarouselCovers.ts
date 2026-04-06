"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const STORAGE_KEY_PREFIX = "carousel_covers_cache_v4";

function getStorageKey(sort: UseCarouselCoversOptions["sort"], limit: number) {
  return `${STORAGE_KEY_PREFIX}:${sort ?? "recent"}:${limit}`;
}

export function useCarouselCovers(options: UseCarouselCoversOptions = {}) {
  const { sort = "recent", limit = 20, cacheTTLHours = 24 } = options;
  const storageKey = useMemo(() => getStorageKey(sort, limit), [limit, sort]);
  const maxAgeMs = useMemo(() => cacheTTLHours * 3600 * 1000, [cacheTTLHours]);

  const readCache = useCallback((key: string): CoversCachePayload | null => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as CoversCachePayload;
    } catch {
      return null;
    }
  }, []);

  const isCacheValid = useCallback(
    (payload: CoversCachePayload | null) => {
      if (!payload) return false;
      const age = Date.now() - payload.timestamp;
      const sameRequest = payload.sort === sort && payload.limit === limit;
      return sameRequest && age < maxAgeMs;
    },
    [limit, maxAgeMs, sort],
  );

  const initialCachedCovers = useMemo(() => {
    const payload = readCache(storageKey);
    return payload && isCacheValid(payload) ? payload.data : [];
  }, [isCacheValid, readCache, storageKey]);

  const [covers, setCovers] = useState<CarouselCover[]>(() => initialCachedCovers);
  const [loading, setLoading] = useState(initialCachedCovers.length === 0);
  const [error, setError] = useState<string | null>(null);
  const coversCountRef = useRef(initialCachedCovers.length);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    coversCountRef.current = covers.length;
  }, [covers.length]);

  const writeCache = useCallback(
    (key: string, data: CarouselCover[]) => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        window.localStorage.setItem(
          key,
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

  const fetchCovers = useCallback(
    async (forceFresh = false) => {
      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      setError(null);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const cached = readCache(storageKey);
      if (!forceFresh && isCacheValid(cached)) {
        if (!mountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        setCovers(cached?.data ?? []);
        setLoading(false);
        return;
      }

      if (coversCountRef.current === 0) {
        setLoading(true);
      }

      let timedOut = false;
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 10000);

      try {
        const normalizedData = await carouselService.getCovers(
          {
            sort,
            limit,
          },
          controller.signal,
        );

        if (!mountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        setCovers(normalizedData);
        writeCache(storageKey, normalizedData);
      } catch (err) {
        if (!mountedRef.current || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (controller.signal.aborted && !timedOut) {
          return;
        }

        const fallback = readCache(storageKey);
        if (fallback?.data?.length) {
          setCovers(fallback.data);
          setError(null);
        } else if (timedOut || (err instanceof DOMException && err.name === "AbortError")) {
          setError("Tempo de requisição esgotado.");
        } else {
          setError("Não foi possível carregar as capas agora.");
        }
      } finally {
        clearTimeout(timeout);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }

        if (mountedRef.current && activeRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [isCacheValid, limit, readCache, sort, storageKey, writeCache],
  );

  useEffect(() => {
    fetchCovers();
  }, [fetchCovers]);

  const refetch = useCallback(
    (clearCache = false) => {
      if (clearCache) {
        if (typeof window === "undefined") {
          return;
        }

        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // noop
        }
      }
      fetchCovers(true);
    },
    [fetchCovers, storageKey],
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
