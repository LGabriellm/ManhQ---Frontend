import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { feedService } from "@/services/feed.service";
import type {
  CreateFeedPostRequest,
  FeedListResponse,
  FeedModerationListResponse,
  FeedPost,
  FeedQueryParams,
  FeedReactionRequest,
  ModerateFeedPostRequest,
  UpdateFeedPostRequest,
} from "@/types/api";

type FeedListParams = Omit<FeedQueryParams, "cursor">;

export const feedKeys = {
  all: ["feed"] as const,
  list: (params?: FeedListParams) => [...feedKeys.all, "list", params] as const,
  mine: (params?: Pick<FeedQueryParams, "limit">) =>
    [...feedKeys.all, "mine", params] as const,
  series: (seriesId: string, params?: FeedListParams) =>
    [...feedKeys.all, "series", seriesId, params] as const,
  media: (mediaId: string, params?: Pick<FeedQueryParams, "limit">) =>
    [...feedKeys.all, "media", mediaId, params] as const,
  user: (userId: string, params?: Pick<FeedQueryParams, "limit">) =>
    [...feedKeys.all, "user", userId, params] as const,
  post: (postId: string) => [...feedKeys.all, "post", postId] as const,
  moderation: (params?: { limit?: number; offset?: number }) =>
    [...feedKeys.all, "moderation", params] as const,
};

function useCursorFeedQuery(
  queryKey: readonly unknown[],
  queryFn: (cursor?: string) => Promise<FeedListResponse>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn((pageParam as string | null) || undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useInfiniteFeed(params?: FeedListParams, enabled = true) {
  return useCursorFeedQuery(
    feedKeys.list(params),
    (cursor) => feedService.getFeed({ ...params, cursor }),
    enabled,
  );
}

export function useInfiniteMyFeed(
  params?: Pick<FeedQueryParams, "limit">,
  enabled = true,
) {
  return useCursorFeedQuery(
    feedKeys.mine(params),
    (cursor) => feedService.getMyFeed({ ...params, cursor }),
    enabled,
  );
}

export function useInfiniteSeriesFeed(
  seriesId: string | undefined,
  params?: FeedListParams,
  enabled = true,
) {
  return useCursorFeedQuery(
    feedKeys.series(seriesId || "", params),
    (cursor) => feedService.getSeriesFeed(seriesId!, { ...params, cursor }),
    enabled && !!seriesId,
  );
}

export function useInfiniteMediaFeed(
  mediaId: string | undefined,
  params?: Pick<FeedQueryParams, "limit">,
  enabled = true,
) {
  return useCursorFeedQuery(
    feedKeys.media(mediaId || "", params),
    (cursor) => feedService.getMediaFeed(mediaId!, { ...params, cursor }),
    enabled && !!mediaId,
  );
}

export function useInfiniteUserFeed(
  userId: string | undefined,
  params?: Pick<FeedQueryParams, "limit">,
  enabled = true,
) {
  return useCursorFeedQuery(
    feedKeys.user(userId || "", params),
    (cursor) => feedService.getUserFeed(userId!, { ...params, cursor }),
    enabled && !!userId,
  );
}

export function useFeedPost(postId: string | undefined, enabled = true) {
  return useQuery<FeedPost>({
    queryKey: feedKeys.post(postId || ""),
    queryFn: () => feedService.getPost(postId!),
    enabled: enabled && !!postId,
    staleTime: 1000 * 30,
  });
}

export function useFeedModeration(
  params?: { limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery<FeedModerationListResponse>({
    queryKey: feedKeys.moderation(params),
    queryFn: () => feedService.getModerationPosts(params),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useCreateFeedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeedPostRequest) => feedService.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useUpdateFeedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: string;
      data: UpdateFeedPostRequest;
    }) => feedService.updatePost(postId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(variables.postId) });
    },
  });
}

export function useDeleteFeedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useReactToFeedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: string;
      data: FeedReactionRequest;
    }) => feedService.reactToPost(postId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(variables.postId) });
    },
  });
}

export function useRemoveFeedReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedService.removeReaction(postId),
    onSuccess: (_result, postId) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(postId) });
    },
  });
}

export function useModerateFeedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      data,
    }: {
      postId: string;
      data: ModerateFeedPostRequest;
    }) => feedService.moderatePost(postId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(variables.postId) });
    },
  });
}
