import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ratingsService } from "@/services/ratings.service";
import type {
  CreateRatingRequest,
  CreateReviewRequest,
  RatingListResponse,
  RatingQueryParams,
  RatingStats,
  ReviewListResponse,
  ReviewQueryParams,
  UpdateReviewRequest,
} from "@/types/api";

export const ratingsKeys = {
  all: ["ratings"] as const,
  series: (seriesId: string) => [...ratingsKeys.all, "series", seriesId] as const,
  list: (seriesId: string, params?: RatingQueryParams) =>
    [...ratingsKeys.series(seriesId), "list", params] as const,
  stats: (seriesId: string) => [...ratingsKeys.series(seriesId), "stats"] as const,
  reviews: (seriesId: string, params?: ReviewQueryParams) =>
    [...ratingsKeys.series(seriesId), "reviews", params] as const,
};

export function useSeriesRatings(
  seriesId: string | undefined,
  params?: RatingQueryParams,
  enabled = true,
) {
  return useQuery<RatingListResponse>({
    queryKey: ratingsKeys.list(seriesId || "", params),
    queryFn: () => ratingsService.getRatings(seriesId!, params),
    enabled: enabled && !!seriesId,
    staleTime: 1000 * 30,
  });
}

export function useRatingStats(
  seriesId: string | undefined,
  enabled = true,
) {
  return useQuery<RatingStats>({
    queryKey: ratingsKeys.stats(seriesId || ""),
    queryFn: () => ratingsService.getRatingStats(seriesId!),
    enabled: enabled && !!seriesId,
    staleTime: 1000 * 60,
  });
}

export function useSeriesReviews(
  seriesId: string | undefined,
  params?: ReviewQueryParams,
  enabled = true,
) {
  return useQuery<ReviewListResponse>({
    queryKey: ratingsKeys.reviews(seriesId || "", params),
    queryFn: () => ratingsService.getReviews(seriesId!, params),
    enabled: enabled && !!seriesId,
    staleTime: 1000 * 30,
  });
}

export function useCreateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      data,
    }: {
      seriesId: string;
      data: CreateRatingRequest;
    }) => ratingsService.createRating(seriesId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ratingsKeys.series(variables.seriesId),
      });
    },
  });
}

export function useDeleteRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => ratingsService.deleteRating(seriesId),
    onSuccess: (_result, seriesId) => {
      queryClient.invalidateQueries({ queryKey: ratingsKeys.series(seriesId) });
    },
  });
}

export function useMarkRatingHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ratingId: string) => ratingsService.markRatingHelpful(ratingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingsKeys.all });
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      data,
    }: {
      seriesId: string;
      data: CreateReviewRequest;
    }) => ratingsService.createReview(seriesId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ratingsKeys.series(variables.seriesId),
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      data,
    }: {
      reviewId: string;
      data: UpdateReviewRequest;
    }) => ratingsService.updateReview(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingsKeys.all });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => ratingsService.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingsKeys.all });
    },
  });
}

export function useMarkReviewHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => ratingsService.markReviewHelpful(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ratingsKeys.all });
    },
  });
}
