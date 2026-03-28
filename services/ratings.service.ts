import api from "./api";
import type {
  CreateRatingRequest,
  CreateReviewRequest,
  HelpfulResponse,
  RatingListResponse,
  RatingMutationResponse,
  RatingQueryParams,
  RatingStats,
  ReviewListResponse,
  ReviewMutationResponse,
  ReviewQueryParams,
  UpdateReviewRequest,
} from "@/types/api";

export const ratingsService = {
  async createRating(
    seriesId: string,
    data: CreateRatingRequest,
  ): Promise<RatingMutationResponse> {
    const response = await api.post<RatingMutationResponse>(
      `/ratings/${seriesId}`,
      data,
    );
    return response.data;
  },

  async getRatings(
    seriesId: string,
    params?: RatingQueryParams,
  ): Promise<RatingListResponse> {
    const response = await api.get<RatingListResponse>(`/ratings/${seriesId}`, {
      params,
    });
    return response.data;
  },

  async getRatingStats(seriesId: string): Promise<RatingStats> {
    const response = await api.get<RatingStats>(`/ratings/${seriesId}/stats`);
    return response.data;
  },

  async deleteRating(seriesId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/ratings/${seriesId}`);
    return response.data;
  },

  async markRatingHelpful(ratingId: string): Promise<HelpfulResponse> {
    const response = await api.post<HelpfulResponse>(
      `/ratings/${ratingId}/helpful`,
    );
    return response.data;
  },

  async createReview(
    seriesId: string,
    data: CreateReviewRequest,
  ): Promise<ReviewMutationResponse> {
    const response = await api.post<ReviewMutationResponse>(
      `/ratings/reviews/${seriesId}`,
      data,
    );
    return response.data;
  },

  async getReviews(
    seriesId: string,
    params?: ReviewQueryParams,
  ): Promise<ReviewListResponse> {
    const response = await api.get<ReviewListResponse>(
      `/ratings/reviews/${seriesId}`,
      { params },
    );
    return response.data;
  },

  async updateReview(
    reviewId: string,
    data: UpdateReviewRequest,
  ): Promise<ReviewMutationResponse> {
    const response = await api.put<ReviewMutationResponse>(
      `/ratings/reviews/${reviewId}`,
      data,
    );
    return response.data;
  },

  async deleteReview(reviewId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/ratings/reviews/${reviewId}`,
    );
    return response.data;
  },

  async markReviewHelpful(reviewId: string): Promise<HelpfulResponse> {
    const response = await api.post<HelpfulResponse>(
      `/ratings/reviews/${reviewId}/helpful`,
    );
    return response.data;
  },
};
