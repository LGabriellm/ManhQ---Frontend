import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seriesService } from "@/services/series.service";
import { readerService } from "@/services/reader.service";
import { notificationsService } from "@/services/notifications.service";
import { statsService } from "@/services/stats.service";
import { userListsService } from "@/services/userLists.service";
import { progressService } from "@/services/progress.service";
import { authService } from "@/services/auth.service";
import { searchService } from "@/services/search.service";
import { useAuth } from "@/contexts/AuthContext";
import type { ContinueReadingParams, ProgressHistoryParams } from "@/types/api";

interface SearchQueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

// ===== SÉRIES =====
export function useSeries() {
  return useQuery({
    queryKey: ["series"],
    queryFn: () => seriesService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useSeriesById(id: string | undefined) {
  return useQuery({
    queryKey: ["series", id],
    queryFn: () => seriesService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

// ===== BUSCA =====
export function useSeriesSearch(
  query: string,
  page = 1,
  limit = 24,
  options?: SearchQueryOptions,
) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["search", normalizedQuery, page, limit],
    queryFn: ({ signal }) =>
      searchService.searchSeries(normalizedQuery, page, limit, signal),
    enabled: normalizedQuery.length >= 2 && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSearchSuggestions(
  query: string,
  limit = 6,
  options?: SearchQueryOptions,
) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["search", "suggestions", normalizedQuery, limit],
    queryFn: ({ signal }) =>
      searchService.getSuggestions(normalizedQuery, limit, signal),
    enabled: normalizedQuery.length >= 2 && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ===== LEITOR =====
export function useChapterInfo(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-info", chapterId],
    queryFn: () => readerService.getChapterInfo(chapterId!),
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 10, // 10 minutos — dados do capítulo raramente mudam
    refetchOnWindowFocus: false,
  });
}

// ===== NOTIFICAÇÕES =====
export function useNotifications(params?: {
  read?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationsService.getAll(params),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ===== ESTATÍSTICAS DO USUÁRIO =====
export function useUserStats() {
  const { accessGranted, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["user-stats"],
    queryFn: () => statsService.getAll(),
    enabled: isAuthenticated && accessGranted,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ===== LISTAS DO USUÁRIO (FAVORITOS, LENDO, HISTÓRICO) =====
export function useFavorites(options?: SearchQueryOptions) {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => userListsService.getFavorites(),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 3,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => userListsService.toggleFavorite(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["series-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

export function useReading(options?: SearchQueryOptions) {
  return useQuery({
    queryKey: ["reading"],
    queryFn: () => userListsService.getReading(),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 60 * 3,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useToggleReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => userListsService.toggleReading(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading"] });
      queryClient.invalidateQueries({ queryKey: ["series-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

export function useHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () => userListsService.getHistory(),
    staleTime: 1000 * 60 * 3,
  });
}

export function useSeriesStatus(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["series-status", seriesId],
    queryFn: () => userListsService.getSeriesStatus(seriesId!),
    enabled: !!seriesId,
    staleTime: 1000 * 60 * 3, // 3 minutos
  });
}

// ===== PROGRESSO DE LEITURA =====
export function useMediaProgress(mediaId: string | undefined) {
  return useQuery({
    queryKey: ["progress", mediaId],
    queryFn: () => progressService.getMediaProgress(mediaId!),
    enabled: !!mediaId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useSeriesProgress(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["progress", "series", seriesId],
    queryFn: () => progressService.getSeriesProgress(seriesId!),
    enabled: !!seriesId,
  });
}

export function useContinueReading(
  params?: ContinueReadingParams,
  options?: SearchQueryOptions,
) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["progress", "continue-reading", params],
    queryFn: () => progressService.getContinueReading(params),
    enabled: isAuthenticated && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useProgressHistory(
  params?: ProgressHistoryParams,
  options?: SearchQueryOptions,
) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["progress", "history", params],
    queryFn: () => progressService.getHistory(params),
    enabled: isAuthenticated && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 1000 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useProgressSeriesList() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["progress", "series-list"],
    queryFn: () => progressService.getSeriesList(),
    enabled: isAuthenticated,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => progressService.markAsRead(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", "continue-reading"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

export function useRemoveProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => progressService.removeProgress(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", "continue-reading"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => progressService.markAllAsRead(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", "continue-reading"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

export function useRemoveSeriesProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) =>
      progressService.removeSeriesProgress(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", "continue-reading"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}

// ===== SESSÕES / PERFIL =====
export function useSessions(options?: SearchQueryOptions) {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => authService.getSessions(),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 1000 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useLogoutAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logoutAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
