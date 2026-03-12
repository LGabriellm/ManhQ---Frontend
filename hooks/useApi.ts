import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seriesService } from "@/services/series.service";
import { readerService } from "@/services/reader.service";
import { notificationsService } from "@/services/notifications.service";
import { statsService } from "@/services/stats.service";
import { userListsService } from "@/services/userLists.service";
import { progressService } from "@/services/progress.service";
import { useAuth } from "@/contexts/AuthContext";
import type { ContinueReadingParams, ProgressHistoryParams } from "@/types/api";

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

// ===== LEITOR =====
export function useChapterInfo(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-info", chapterId],
    queryFn: () => readerService.getChapterInfo(chapterId!),
    enabled: !!chapterId,
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
  return useQuery({
    queryKey: ["user-stats"],
    queryFn: () => statsService.getAll(),
    staleTime: 1000 * 60 * 5,
  });
}

// ===== LISTAS DO USUÁRIO (FAVORITOS, LENDO, HISTÓRICO) =====
export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => userListsService.getFavorites(),
    staleTime: 1000 * 60 * 3, // 3 minutos
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => userListsService.toggleFavorite(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["series-status"] });
    },
  });
}

export function useReading() {
  return useQuery({
    queryKey: ["reading"],
    queryFn: () => userListsService.getReading(),
    staleTime: 1000 * 60 * 3,
  });
}

export function useToggleReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => userListsService.toggleReading(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading"] });
      queryClient.invalidateQueries({ queryKey: ["series-status"] });
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
  });
}

// ===== PROGRESSO DE LEITURA =====
export function useMediaProgress(mediaId: string | undefined) {
  return useQuery({
    queryKey: ["progress", mediaId],
    queryFn: () => progressService.getMediaProgress(mediaId!),
    enabled: !!mediaId,
  });
}

export function useSeriesProgress(seriesId: string | undefined) {
  return useQuery({
    queryKey: ["progress", "series", seriesId],
    queryFn: () => progressService.getSeriesProgress(seriesId!),
    enabled: !!seriesId,
  });
}

export function useContinueReading(params?: ContinueReadingParams) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["progress", "continue-reading", params],
    queryFn: () => progressService.getContinueReading(params),
    enabled: isAuthenticated,
  });
}

export function useProgressHistory(params?: ProgressHistoryParams) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["progress", "history", params],
    queryFn: () => progressService.getHistory(params),
    enabled: isAuthenticated,
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
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useRemoveProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => progressService.removeProgress(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => progressService.markAllAsRead(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });
}

export function useRemoveSeriesProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) =>
      progressService.removeSeriesProgress(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });
}
