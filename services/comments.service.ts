import api from "./api";
import type {
  CommentItem,
  CommentsResponse,
  CommentQueryParams,
  CreateCommentRequest,
  UpdateCommentRequest,
  VoteCommentRequest,
  CommentVoteResponse,
} from "@/types/api";

export const commentsService = {
  async getSeriesComments(
    seriesId: string,
    params?: CommentQueryParams,
  ): Promise<CommentsResponse> {
    const response = await api.get<CommentsResponse>(
      `/v1/comments/series/${seriesId}`,
      {
        params,
      },
    );
    return response.data;
  },

  async createSeriesComment(
    seriesId: string,
    data: CreateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.post<CommentItem>(
      `/v1/comments/series/${seriesId}`,
      data,
    );
    return response.data;
  },

  async getMediaComments(
    mediaId: string,
    params?: CommentQueryParams,
  ): Promise<CommentsResponse> {
    const response = await api.get<CommentsResponse>(
      `/v1/comments/media/${mediaId}`,
      {
        params,
      },
    );
    return response.data;
  },

  async createMediaComment(
    mediaId: string,
    data: CreateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.post<CommentItem>(
      `/v1/comments/media/${mediaId}`,
      data,
    );
    return response.data;
  },

  async updateComment(
    commentId: string,
    data: UpdateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.put<CommentItem>(
      `/v1/comments/${commentId}`,
      data,
    );
    return response.data;
  },

  async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/v1/comments/${commentId}`,
    );
    return response.data;
  },

  async voteComment(
    commentId: string,
    data: VoteCommentRequest,
  ): Promise<CommentVoteResponse> {
    const response = await api.post<CommentVoteResponse>(
      `/v1/comments/${commentId}/vote`,
      data,
    );
    return response.data;
  },
};
