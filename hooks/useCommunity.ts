import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { communityService } from "@/services/community.service";
import { commentsService } from "@/services/comments.service";
import type {
  CommentModerationCommentsResponse,
  CommentModerationRepliesResponse,
  CommentQueryParams,
  CommunityBadgesResponse,
  CommunityLeaderboardCategoriesResponse,
  CommunityLeaderboardParams,
  CommunityLeaderboardResponse,
  CommunityOverviewResponse,
  CommunityProfileResponse,
  CommunityUserProfileResponse,
  CreateCommentRequest,
  CreateCommentReplyRequest,
  ModerateCommentRequest,
  UpdateCommentRequest,
  UpdateCommentReplyRequest,
  VoteCommentRequest,
} from "@/types/api";

export const communityKeys = {
  all: ["community"] as const,
  seriesComments: (seriesId: string, params?: CommentQueryParams) =>
    [...communityKeys.all, "series-comments", seriesId, params] as const,
  mediaComments: (mediaId: string, params?: CommentQueryParams) =>
    [...communityKeys.all, "media-comments", mediaId, params] as const,
  commentReplies: (
    commentId: string,
    params?: Pick<CommentQueryParams, "limit" | "sortBy">,
  ) => [...communityKeys.all, "comment-replies", commentId, params] as const,
  moderationComments: (params?: Pick<CommentQueryParams, "limit" | "offset">) =>
    [...communityKeys.all, "moderation-comments", params] as const,
  moderationReplies: (params?: Pick<CommentQueryParams, "limit" | "offset">) =>
    [...communityKeys.all, "moderation-replies", params] as const,
  profile: () => [...communityKeys.all, "profile"] as const,
  badges: () => [...communityKeys.all, "badges"] as const,
  leaderboard: (params?: CommunityLeaderboardParams) =>
    [...communityKeys.all, "leaderboard", params] as const,
  leaderboardCategories: () =>
    [...communityKeys.all, "leaderboard-categories"] as const,
  overview: () => [...communityKeys.all, "overview"] as const,
  userProfile: (userId: string) =>
    [...communityKeys.all, "user-profile", userId] as const,
};

export function useInfiniteSeriesComments(
  seriesId: string | undefined,
  params?: Omit<CommentQueryParams, "offset">,
) {
  const limit = params?.limit || 20;

  return useInfiniteQuery({
    queryKey: communityKeys.seriesComments(seriesId || "", {
      ...params,
      limit,
      offset: undefined,
    }),
    queryFn: ({ pageParam }) =>
      commentsService.getSeriesComments(seriesId!, {
        ...params,
        limit,
        offset: pageParam as number,
      }),
    enabled: !!seriesId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.comments.length,
        0,
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 1000 * 30,
  });
}

export function useInfiniteMediaComments(
  mediaId: string | undefined,
  params?: Omit<CommentQueryParams, "offset">,
) {
  const limit = params?.limit || 20;

  return useInfiniteQuery({
    queryKey: communityKeys.mediaComments(mediaId || "", {
      ...params,
      limit,
      offset: undefined,
    }),
    queryFn: ({ pageParam }) =>
      commentsService.getMediaComments(mediaId!, {
        ...params,
        limit,
        offset: pageParam as number,
      }),
    enabled: !!mediaId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.comments.length,
        0,
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 1000 * 30,
  });
}

export function useInfiniteCommentReplies(
  commentId: string | undefined,
  params?: Pick<CommentQueryParams, "limit" | "sortBy">,
) {
  const limit = params?.limit || 20;

  return useInfiniteQuery({
    queryKey: communityKeys.commentReplies(commentId || "", {
      ...params,
      limit,
    }),
    queryFn: ({ pageParam }) =>
      commentsService.getCommentReplies(commentId!, {
        ...params,
        limit,
        offset: pageParam as number,
      }),
    enabled: !!commentId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.replies.length,
        0,
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateSeriesComment(seriesId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) =>
      commentsService.createSeriesComment(seriesId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useCreateMediaComment(mediaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) =>
      commentsService.createMediaComment(mediaId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useVoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      data,
    }: {
      commentId: string;
      data: VoteCommentRequest;
    }) => commentsService.voteComment(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      data,
    }: {
      commentId: string;
      data: UpdateCommentRequest;
    }) => commentsService.updateComment(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function usePinComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsService.pinComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useUnpinComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsService.unpinComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useCreateCommentReply(commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentReplyRequest) =>
      commentsService.createCommentReply(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useUpdateCommentReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      replyId,
      data,
    }: {
      replyId: string;
      data: UpdateCommentReplyRequest;
    }) => commentsService.updateCommentReply(replyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useDeleteCommentReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (replyId: string) => commentsService.deleteCommentReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useVoteCommentReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      replyId,
      data,
    }: {
      replyId: string;
      data: VoteCommentRequest;
    }) => commentsService.voteCommentReply(replyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useModerationComments(
  params?: Pick<CommentQueryParams, "limit" | "offset">,
  enabled = true,
) {
  return useQuery<CommentModerationCommentsResponse>({
    queryKey: communityKeys.moderationComments(params),
    queryFn: () => commentsService.getModerationComments(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useModerationReplies(
  params?: Pick<CommentQueryParams, "limit" | "offset">,
  enabled = true,
) {
  return useQuery<CommentModerationRepliesResponse>({
    queryKey: communityKeys.moderationReplies(params),
    queryFn: () => commentsService.getModerationReplies(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useModerateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      data,
    }: {
      commentId: string;
      data: ModerateCommentRequest;
    }) => commentsService.moderateComment(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useModerateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      replyId,
      data,
    }: {
      replyId: string;
      data: ModerateCommentRequest;
    }) => commentsService.moderateReply(replyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

export function useCommunityProfile(enabled = true) {
  return useQuery<CommunityProfileResponse>({
    queryKey: communityKeys.profile(),
    queryFn: () => communityService.getMyProfile(),
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useCommunityBadges(enabled = true) {
  return useQuery<CommunityBadgesResponse>({
    queryKey: communityKeys.badges(),
    queryFn: () => communityService.getBadges(),
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useCommunityLeaderboard(
  params?: CommunityLeaderboardParams,
  enabled = true,
) {
  return useQuery<CommunityLeaderboardResponse>({
    queryKey: communityKeys.leaderboard(params),
    queryFn: () => communityService.getLeaderboard(params),
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useCommunityLeaderboardCategories(enabled = true) {
  return useQuery<CommunityLeaderboardCategoriesResponse>({
    queryKey: communityKeys.leaderboardCategories(),
    queryFn: () => communityService.getLeaderboardCategories(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCommunityOverview(enabled = true) {
  return useQuery<CommunityOverviewResponse>({
    queryKey: communityKeys.overview(),
    queryFn: () => communityService.getOverview(),
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useCommunityUserProfile(
  userId: string | undefined,
  enabled = true,
) {
  return useQuery<CommunityUserProfileResponse>({
    queryKey: communityKeys.userProfile(userId || ""),
    queryFn: () => communityService.getUserProfile(userId!),
    enabled: enabled && !!userId,
    staleTime: 1000 * 60,
  });
}
