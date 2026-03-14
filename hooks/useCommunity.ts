import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { commentsService } from "@/services/comments.service";
import type {
  CommentQueryParams,
  CreateCommentRequest,
  UpdateCommentRequest,
  VoteCommentRequest,
} from "@/types/api";

const communityKeys = {
  all: ["community"] as const,
  seriesComments: (seriesId: string, params?: CommentQueryParams) =>
    [...communityKeys.all, "series-comments", seriesId, params] as const,
  mediaComments: (mediaId: string, params?: CommentQueryParams) =>
    [...communityKeys.all, "media-comments", mediaId, params] as const,
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
