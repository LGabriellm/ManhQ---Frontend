"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { metadataReviewService } from "@/services/metadata-review.service";
import type {
  RefreshSeriesMetadataRequest,
  ReviewSeriesMetadataRequest,
  WorkType,
} from "@/types/metadata-review";

const metadataReviewKeys = {
  all: ["metadata-review"] as const,
  providers: () => [...metadataReviewKeys.all, "providers"] as const,
  catalog: () => [...metadataReviewKeys.all, "catalog"] as const,
  search: (params: { q: string; limit?: number; workTypeHint?: WorkType }) =>
    [...metadataReviewKeys.all, "search", params] as const,
  series: (seriesId: string) =>
    [...metadataReviewKeys.all, "series", seriesId] as const,
};

export function useMetadataProviders(enabled = true) {
  return useQuery({
    queryKey: metadataReviewKeys.providers(),
    queryFn: () => metadataReviewService.getProviders(),
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

export function useMetadataCatalog(enabled = true) {
  return useQuery({
    queryKey: metadataReviewKeys.catalog(),
    queryFn: () => metadataReviewService.getCatalog(),
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

export function useSeriesMetadata(seriesId: string, enabled = true) {
  return useQuery({
    queryKey: metadataReviewKeys.series(seriesId),
    queryFn: () => metadataReviewService.getSeriesMetadata(seriesId),
    enabled: enabled && !!seriesId,
    staleTime: 1000 * 15,
  });
}

export function useMetadataSearch(params: {
  q: string;
  limit?: number;
  workTypeHint?: WorkType;
}) {
  const normalizedQuery = params.q.trim();

  return useQuery({
    queryKey: metadataReviewKeys.search({
      ...params,
      q: normalizedQuery,
    }),
    queryFn: () =>
      metadataReviewService.searchMetadata({
        ...params,
        q: normalizedQuery,
      }),
    enabled: normalizedQuery.length >= 2,
    staleTime: 1000 * 30,
  });
}

export function useRefreshSeriesMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      data,
    }: {
      seriesId: string;
      data: RefreshSeriesMetadataRequest;
    }) => metadataReviewService.refreshSeriesMetadata(seriesId, data),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: metadataReviewKeys.series(variables.seriesId),
      });
      await queryClient.refetchQueries({
        queryKey: metadataReviewKeys.series(variables.seriesId),
      });
    },
  });
}

export function useReviewSeriesMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      data,
    }: {
      seriesId: string;
      data: ReviewSeriesMetadataRequest;
    }) => metadataReviewService.reviewSeriesMetadata(seriesId, data),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: metadataReviewKeys.series(variables.seriesId),
      });
      await queryClient.refetchQueries({
        queryKey: metadataReviewKeys.series(variables.seriesId),
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "dashboard"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin", "series"],
      });
    },
  });
}

export { metadataReviewKeys };
