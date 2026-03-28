import api from "./api";
import type {
  CreateFeedPostRequest,
  FeedListResponse,
  FeedModerationListResponse,
  FeedPost,
  FeedPostMutationResponse,
  FeedQueryParams,
  FeedReactionRequest,
  FeedReactionResponse,
  ModerateFeedPostRequest,
  UpdateFeedPostRequest,
} from "@/types/api";

type FeedScopeParams = Pick<FeedQueryParams, "cursor" | "limit" | "type">;
type FeedCursorParams = Pick<FeedQueryParams, "cursor" | "limit">;

export const feedService = {
  async getFeed(params?: FeedQueryParams): Promise<FeedListResponse> {
    const response = await api.get<FeedListResponse>("/feed", { params });
    return response.data;
  },

  async getMyFeed(params?: FeedCursorParams): Promise<FeedListResponse> {
    const response = await api.get<FeedListResponse>("/feed/me", { params });
    return response.data;
  },

  async getSeriesFeed(
    seriesId: string,
    params?: FeedScopeParams,
  ): Promise<FeedListResponse> {
    const response = await api.get<FeedListResponse>(`/feed/series/${seriesId}`, {
      params,
    });
    return response.data;
  },

  async getMediaFeed(
    mediaId: string,
    params?: FeedCursorParams,
  ): Promise<FeedListResponse> {
    const response = await api.get<FeedListResponse>(`/feed/media/${mediaId}`, {
      params,
    });
    return response.data;
  },

  async getUserFeed(
    userId: string,
    params?: FeedCursorParams,
  ): Promise<FeedListResponse> {
    const response = await api.get<FeedListResponse>(`/feed/users/${userId}`, {
      params,
    });
    return response.data;
  },

  async createPost(
    data: CreateFeedPostRequest,
  ): Promise<FeedPostMutationResponse> {
    const response = await api.post<FeedPostMutationResponse>("/feed", data);
    return response.data;
  },

  async getPost(postId: string): Promise<FeedPost> {
    const response = await api.get<FeedPost>(`/feed/${postId}`);
    return response.data;
  },

  async updatePost(
    postId: string,
    data: UpdateFeedPostRequest,
  ): Promise<FeedPostMutationResponse> {
    const response = await api.patch<FeedPostMutationResponse>(
      `/feed/${postId}`,
      data,
    );
    return response.data;
  },

  async deletePost(postId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/feed/${postId}`);
    return response.data;
  },

  async reactToPost(
    postId: string,
    data: FeedReactionRequest,
  ): Promise<FeedReactionResponse> {
    const response = await api.post<FeedReactionResponse>(
      `/feed/${postId}/react`,
      data,
    );
    return response.data;
  },

  async removeReaction(postId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/feed/${postId}/react`,
    );
    return response.data;
  },

  async getModerationPosts(params?: {
    limit?: number;
    offset?: number;
  }): Promise<FeedModerationListResponse> {
    const response = await api.get<FeedModerationListResponse>(
      "/feed/moderation",
      { params },
    );
    return response.data;
  },

  async moderatePost(
    postId: string,
    data: ModerateFeedPostRequest,
  ): Promise<FeedPostMutationResponse> {
    const response = await api.post<FeedPostMutationResponse>(
      `/feed/moderation/${postId}`,
      data,
    );
    return response.data;
  },
};
