import api from "./api";
import type {
  CommentItem,
  CommentModerationCommentsResponse,
  CommentModerationRepliesResponse,
  CommentReplyItem,
  CommentRepliesResponse,
  CommentsResponse,
  CommentQueryParams,
  CreateCommentRequest,
  CreateCommentReplyRequest,
  ModerateCommentRequest,
  UpdateCommentRequest,
  UpdateCommentReplyRequest,
  VoteCommentRequest,
  CommentVoteResponse,
} from "@/types/api";

export const commentsService = {
  async getSeriesComments(
    seriesId: string,
    params?: CommentQueryParams,
  ): Promise<CommentsResponse> {
    const response = await api.get<CommentsResponse>(`/comments/series/${seriesId}`, {
      params,
    });
    return response.data;
  },

  async createSeriesComment(
    seriesId: string,
    data: CreateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.post<CommentItem>(`/comments/series/${seriesId}`, data);
    return response.data;
  },

  async getMediaComments(
    mediaId: string,
    params?: CommentQueryParams,
  ): Promise<CommentsResponse> {
    const response = await api.get<CommentsResponse>(`/comments/media/${mediaId}`, {
      params,
    });
    return response.data;
  },

  async createMediaComment(
    mediaId: string,
    data: CreateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.post<CommentItem>(`/comments/media/${mediaId}`, data);
    return response.data;
  },

  async updateComment(
    commentId: string,
    data: UpdateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.put<CommentItem>(`/comments/${commentId}`, data);
    return response.data;
  },

  async deleteComment(commentId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/comments/${commentId}`);
    return response.data;
  },

  async voteComment(
    commentId: string,
    data: VoteCommentRequest,
  ): Promise<CommentVoteResponse> {
    const response = await api.post<CommentVoteResponse>(`/comments/${commentId}/vote`, data);
    return response.data;
  },

  async pinComment(commentId: string): Promise<CommentItem> {
    const response = await api.post<CommentItem>(`/comments/${commentId}/pin`);
    return response.data;
  },

  async unpinComment(commentId: string): Promise<CommentItem> {
    const response = await api.delete<CommentItem>(`/comments/${commentId}/pin`);
    return response.data;
  },

  async getCommentReplies(
    commentId: string,
    params?: Pick<CommentQueryParams, "limit" | "offset" | "sortBy">,
  ): Promise<CommentRepliesResponse> {
    const response = await api.get<CommentRepliesResponse>(
      `/comments/${commentId}/replies`,
      { params },
    );
    return response.data;
  },

  async createCommentReply(
    commentId: string,
    data: CreateCommentReplyRequest,
  ): Promise<CommentReplyItem> {
    const response = await api.post<CommentReplyItem>(
      `/comments/${commentId}/replies`,
      data,
    );
    return response.data;
  },

  async updateCommentReply(
    replyId: string,
    data: UpdateCommentReplyRequest,
  ): Promise<CommentReplyItem> {
    const response = await api.put<CommentReplyItem>(
      `/comments/replies/${replyId}`,
      data,
    );
    return response.data;
  },

  async deleteCommentReply(replyId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/comments/replies/${replyId}`,
    );
    return response.data;
  },

  async voteCommentReply(
    replyId: string,
    data: VoteCommentRequest,
  ): Promise<CommentReplyItem> {
    const response = await api.post<CommentReplyItem>(
      `/comments/replies/${replyId}/vote`,
      data,
    );
    return response.data;
  },

  async getModerationComments(
    params?: Pick<CommentQueryParams, "limit" | "offset">,
  ): Promise<CommentModerationCommentsResponse> {
    const response = await api.get<CommentModerationCommentsResponse>(
      "/comments/moderation/comments",
      { params },
    );
    return response.data;
  },

  async moderateComment(
    commentId: string,
    data: ModerateCommentRequest,
  ): Promise<CommentItem> {
    const response = await api.post<CommentItem>(
      `/comments/moderation/comments/${commentId}`,
      data,
    );
    return response.data;
  },

  async getModerationReplies(
    params?: Pick<CommentQueryParams, "limit" | "offset">,
  ): Promise<CommentModerationRepliesResponse> {
    const response = await api.get<CommentModerationRepliesResponse>(
      "/comments/moderation/replies",
      { params },
    );
    return response.data;
  },

  async moderateReply(
    replyId: string,
    data: ModerateCommentRequest,
  ): Promise<CommentReplyItem> {
    const response = await api.post<CommentReplyItem>(
      `/comments/moderation/replies/${replyId}`,
      data,
    );
    return response.data;
  },
};
