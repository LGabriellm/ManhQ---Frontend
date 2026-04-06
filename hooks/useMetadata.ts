"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "@/services/metadata.service";
import type { ReviewSeriesMetadataRequest } from "@/types/metadata";

const metadataKeys = {
  providers: ["metadata", "providers"] as const,
  catalog: ["metadata", "catalog"] as const,
  series: (id: string) => ["metadata", "series", id] as const,
};

export function useMetadataProviders() {
  return useQuery({
    queryKey: metadataKeys.providers,
    queryFn: svc.fetchMetadataProviders,
    staleTime: 300_000,
  });
}

export function useMetadataCatalog() {
  return useQuery({
    queryKey: metadataKeys.catalog,
    queryFn: svc.fetchMetadataCatalog,
    staleTime: 300_000,
  });
}

export function useSeriesMetadata(seriesId: string | null) {
  return useQuery({
    queryKey: metadataKeys.series(seriesId ?? ""),
    queryFn: () => svc.fetchSeriesMetadata(seriesId!),
    enabled: !!seriesId,
    staleTime: 30_000,
  });
}

export function useRefreshSeriesMetadata(seriesId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      args?: string | { seriesId: string; data?: Record<string, unknown> },
    ) => {
      if (typeof args === "object" && args !== null && "seriesId" in args) {
        return svc.refreshSeriesMetadata(args.seriesId, args.data);
      }
      const resolvedId =
        (typeof args === "string" ? args : undefined) ?? seriesId;
      if (!resolvedId) throw new Error("seriesId is required");
      return svc.refreshSeriesMetadata(resolvedId);
    },
    onSuccess: (_data, args) => {
      const resolvedId =
        typeof args === "object" && args !== null && "seriesId" in args
          ? args.seriesId
          : ((typeof args === "string" ? args : undefined) ?? seriesId);
      if (resolvedId) {
        qc.invalidateQueries({ queryKey: metadataKeys.series(resolvedId) });
      }
    },
  });
}

export function useReviewSeriesMetadata(seriesId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      args:
        | ReviewSeriesMetadataRequest
        | { seriesId: string; payload: ReviewSeriesMetadataRequest }
        | { seriesId: string; data: ReviewSeriesMetadataRequest },
    ) => {
      if ("seriesId" in args) {
        const payload =
          "payload" in args ? args.payload : "data" in args ? args.data : args;
        return svc.reviewSeriesMetadata(
          args.seriesId,
          payload as ReviewSeriesMetadataRequest,
        );
      }
      const resolvedId = seriesId;
      if (!resolvedId) throw new Error("seriesId is required");
      return svc.reviewSeriesMetadata(
        resolvedId,
        args as ReviewSeriesMetadataRequest,
      );
    },
    onSuccess: () => {
      if (seriesId) {
        qc.invalidateQueries({ queryKey: metadataKeys.series(seriesId) });
      }
    },
  });
}

export function useMetadataSearch(
  params: { q: string; workTypeHint?: string } | string,
  source?: string,
) {
  const query = typeof params === "string" ? params : params.q;
  const resolvedSource =
    typeof params === "string" ? source : params.workTypeHint;
  return useQuery({
    queryKey: ["metadata", "search", query, resolvedSource] as const,
    queryFn: () => svc.searchMetadata(query, resolvedSource),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}
