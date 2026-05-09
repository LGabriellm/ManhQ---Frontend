"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { readerService } from "@/services/reader.service";
import * as offlineStorage from "@/services/offline-storage.service";

export function useOfflineReader(chapterId: string, seriesId: string) {
  return useQuery({
    queryKey: ["offline-chapter", chapterId],
    queryFn: () => readerService.getChapterInfoOffline(chapterId, seriesId),
    enabled: !!chapterId && !!seriesId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
}

export function useOfflinePageLoader(
  chapterId: string,
  pageNumber: number,
  seriesId: string,
  enabled: boolean,
) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!enabled || !chapterId || !seriesId) return;

    let cancelled = false;
    let blobUrl: string | null = null;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(false);
        const result = await readerService.getPageBlobOffline(
          chapterId,
          pageNumber,
          seriesId,
        );
        blobUrl = result.src;
        if (!cancelled) {
          setSrc(result.src);
          setFromCache(result.fromCache);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [chapterId, pageNumber, seriesId, enabled]);

  return { src, isLoading, error, fromCache };
}
