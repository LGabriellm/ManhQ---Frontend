"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { providerService } from "@/services/provider.service";
import type {
  CatalogSearchParams,
  TrackTitleRequest,
  UpdateTrackedTitleRequest,
  TrackedTitlesParams,
  KeiyoushiParams,
  BulkImportRequest,
  SuwayomiExtensionsParams,
  ChapterStatusResponse,
  UpdateChapterRequest,
  ReimportFromRequest,
} from "@/types/api";

// ===== Query Keys =====
export const providerKeys = {
  all: ["providers"] as const,
  list: () => [...providerKeys.all, "list"] as const,
  stats: () => [...providerKeys.all, "stats"] as const,
  catalogSearch: (provider: string, params: CatalogSearchParams) =>
    [...providerKeys.all, "catalog", provider, params] as const,
  catalogTitle: (provider: string, externalId: string) =>
    [...providerKeys.all, "catalog", provider, "title", externalId] as const,
  tracked: (params?: TrackedTitlesParams) =>
    [...providerKeys.all, "tracked", params] as const,
  trackedDetail: (id: string) =>
    [...providerKeys.all, "tracked", "detail", id] as const,
  keiyoushiStats: () => [...providerKeys.all, "keiyoushi", "stats"] as const,
  keiyoushiSources: (params?: KeiyoushiParams) =>
    [...providerKeys.all, "keiyoushi", "sources", params] as const,
  chapterStatus: (chapterId: string) =>
    [...providerKeys.all, "chapter", "status", chapterId] as const,
  suwayomiHealth: () => [...providerKeys.all, "suwayomi", "health"] as const,
  suwayomiExtensions: () =>
    [...providerKeys.all, "suwayomi", "extensions"] as const,
};

async function syncProviderQueries(qc: QueryClient, queryKeys: QueryKey[]) {
  await Promise.all(
    queryKeys.map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}

/**
 * Schedule a follow-up invalidation of all tracked title detail queries.
 * This bridges the gap between import/retry mutations (chapter is PENDING)
 * and the BullMQ worker picking up the job (chapter becomes DOWNLOADING),
 * which then activates the polling in `useTrackedTitle`.
 */
function scheduleDetailRefetch(qc: QueryClient, delayMs = 3000) {
  setTimeout(() => {
    qc.invalidateQueries({
      queryKey: [...providerKeys.all, "tracked", "detail"],
    });
  }, delayMs);
}

// ===== Provider Discovery =====
export function useProviders() {
  return useQuery({
    queryKey: providerKeys.list(),
    queryFn: ({ signal }) => providerService.listProviders(signal),
    staleTime: 1000 * 60 * 2,
  });
}

export function useProviderStats() {
  return useQuery({
    queryKey: providerKeys.stats(),
    queryFn: ({ signal }) => providerService.getStats(signal),
    staleTime: 1000 * 15,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActiveImports =
        data &&
        (data.chapters.downloading > 0 ||
          data.chapters.pending > 0 ||
          data.titles.importing > 0);
      return hasActiveImports ? 1000 * 10 : 1000 * 60 * 2;
    },
  });
}

// ===== Catalog Search =====
export function useCatalogSearch(
  provider: string,
  params: CatalogSearchParams,
  enabled = true,
) {
  return useQuery({
    queryKey: providerKeys.catalogSearch(provider, params),
    queryFn: ({ signal }) =>
      providerService.searchCatalog(provider, params, signal),
    enabled: enabled && !!provider,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCatalogTitle(
  provider: string,
  externalId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: providerKeys.catalogTitle(provider, externalId),
    queryFn: ({ signal }) =>
      providerService.getTitleDetails(provider, externalId, signal),
    enabled: enabled && !!provider && !!externalId,
    staleTime: 1000 * 60 * 10,
  });
}

// ===== Title Tracking =====
export function useTrackTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TrackTitleRequest) => providerService.trackTitle(data),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
  });
}

export function useTrackedTitles(params?: TrackedTitlesParams) {
  return useQuery({
    queryKey: providerKeys.tracked(params),
    queryFn: ({ signal }) => providerService.listTracked(params, signal),
    staleTime: 1000 * 60,
  });
}

export function useTrackedTitle(id: string, enabled = true) {
  return useQuery({
    queryKey: providerKeys.trackedDetail(id),
    queryFn: ({ signal }) => providerService.getTracked(id, signal),
    enabled: enabled && !!id,
    staleTime: 1000 * 15,
    refetchInterval: (query) => {
      const pt = query.state.data?.providerTitle;
      if (!pt) return false;

      // Poll when the title itself is importing (bulk import flow)
      if (pt.importStatus === "IMPORTING") return 1000 * 5;

      // Poll when ANY chapter is actively being processed by a worker.
      // This is the core fix: single-chapter imports and retries don't
      // change title.importStatus, so we must check chapter-level
      // statuses to keep the UI in sync with the backend.
      const hasActiveChapters = pt.chapters?.some(
        (ch) =>
          ch.importStatus === "DOWNLOADING" || ch.importStatus === "DOWNLOADED",
      );
      if (hasActiveChapters) return 1000 * 5;

      // Stats-based fallback (for responses without the chapters array)
      const stats = pt.chapterStats;
      if (stats && stats.downloading > 0) return 1000 * 5;

      return false;
    },
  });
}

export function useUpdateTrackedTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTrackedTitleRequest;
    }) => providerService.updateTracked(id, data),
    onSuccess: (_result, variables) =>
      syncProviderQueries(qc, [
        providerKeys.tracked(),
        providerKeys.trackedDetail(variables.id),
        providerKeys.stats(),
      ]),
  });
}

export function useDeleteTrackedTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerService.deleteTracked(id),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
  });
}

// ===== Sync & Import =====
export function useSyncChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerService.syncChapters(id),
    onSuccess: (_result, id) =>
      syncProviderQueries(qc, [
        providerKeys.trackedDetail(id),
        providerKeys.tracked(),
        providerKeys.stats(),
      ]),
  });
}

export function useCheckUpdates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerService.checkUpdates(id),
    onSuccess: (_result, id) =>
      syncProviderQueries(qc, [
        providerKeys.trackedDetail(id),
        providerKeys.tracked(),
      ]),
  });
}

export function useImportChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) => providerService.importChapter(chapterId),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [...providerKeys.all, "tracked", "detail"],
      });
      // Follow-up refetch to catch PENDING → DOWNLOADING transition
      scheduleDetailRefetch(qc);
    },
  });
}

export function useBulkImportChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: BulkImportRequest }) =>
      providerService.bulkImportChapters(id, data),
    onSuccess: (_result, variables) => {
      syncProviderQueries(qc, [
        providerKeys.trackedDetail(variables.id),
        providerKeys.tracked(),
        providerKeys.stats(),
      ]);
      scheduleDetailRefetch(qc);
    },
  });
}

export function useRefreshTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerService.refreshTitle(id),
    onSuccess: (_result, id) =>
      syncProviderQueries(qc, [
        providerKeys.trackedDetail(id),
        providerKeys.tracked(),
      ]),
  });
}

export function useRetryFailedChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providerService.retryFailedChapters(id),
    onSuccess: (_result, id) => {
      syncProviderQueries(qc, [
        providerKeys.trackedDetail(id),
        providerKeys.tracked(),
        providerKeys.stats(),
      ]);
      scheduleDetailRefetch(qc);
    },
  });
}

// ===== Per-Chapter Retry & Status =====
export function useRetryChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) => providerService.retryChapter(chapterId),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [...providerKeys.all, "tracked", "detail"],
      });
      scheduleDetailRefetch(qc);
    },
  });
}

export function useReimportFrom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      chapterId,
      data,
    }: {
      chapterId: string;
      data: ReimportFromRequest;
    }) => providerService.reimportFrom(chapterId, data),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: [...providerKeys.all, "tracked", "detail"],
      });
      scheduleDetailRefetch(qc);
    },
  });
}

export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      chapterId,
      data,
    }: {
      chapterId: string;
      data: UpdateChapterRequest;
    }) => providerService.updateChapter(chapterId, data),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: [...providerKeys.all, "tracked", "detail"],
      }),
  });
}

export function useCleanupStale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (minutes?: number) => providerService.cleanupStale(minutes),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.tracked(), providerKeys.stats()]),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: [...providerKeys.all, "tracked", "detail"],
      }),
  });
}

export function useChapterStatus(
  chapterId: string,
  enabled = true,
): {
  data: ChapterStatusResponse | undefined;
  isLoading: boolean;
  refetch: () => void;
} {
  const result = useQuery({
    queryKey: providerKeys.chapterStatus(chapterId),
    queryFn: ({ signal }) =>
      providerService.getChapterStatus(chapterId, signal),
    enabled: enabled && !!chapterId,
    staleTime: 1000 * 10,
    refetchInterval: (query) => {
      const state = query.state.data?.job?.state;
      if (state === "active" || state === "waiting") return 3000;
      return false;
    },
  });
  return {
    data: result.data,
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

// ===== Suwayomi =====
export function useSuwayomiHealth(enabled = true) {
  return useQuery({
    queryKey: providerKeys.suwayomiHealth(),
    queryFn: ({ signal }) => providerService.suwayomiHealth(signal),
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useSuwayomiExtensions(
  enabled = true,
  params?: SuwayomiExtensionsParams,
) {
  return useQuery({
    queryKey: [...providerKeys.suwayomiExtensions(), params],
    queryFn: ({ signal }) => providerService.suwayomiExtensions(params, signal),
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useSuwayomiFetchExtensions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => providerService.suwayomiFetchExtensions(),
    onSuccess: () =>
      syncProviderQueries(qc, [providerKeys.suwayomiExtensions()]),
  });
}

export function useSuwayomiInstallExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pkgName: string) =>
      providerService.suwayomiInstallExtension(pkgName),
    onSuccess: () =>
      syncProviderQueries(qc, [
        providerKeys.suwayomiExtensions(),
        providerKeys.list(),
        providerKeys.suwayomiHealth(),
      ]),
  });
}

export function useSuwayomiUninstallExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pkgName: string) =>
      providerService.suwayomiUninstallExtension(pkgName),
    onSuccess: () =>
      syncProviderQueries(qc, [
        providerKeys.suwayomiExtensions(),
        providerKeys.list(),
        providerKeys.suwayomiHealth(),
      ]),
  });
}

export function useSuwayomiReload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => providerService.suwayomiReload(),
    onSuccess: (data) => {
      // Atualizar cache de provedores diretamente com a lista retornada
      if (data.providers) {
        qc.setQueryData(providerKeys.list(), {
          providers: data.providers,
        });
      }
      return syncProviderQueries(qc, [
        providerKeys.suwayomiHealth(),
        providerKeys.suwayomiExtensions(),
      ]);
    },
  });
}

// ===== Keiyoushi =====
export function useKeiyoushiStats() {
  return useQuery({
    queryKey: providerKeys.keiyoushiStats(),
    queryFn: ({ signal }) => providerService.getKeiyoushiStats(signal),
    staleTime: 1000 * 60 * 10,
  });
}

export function useKeiyoushiSources(params?: KeiyoushiParams, enabled = true) {
  return useQuery({
    queryKey: providerKeys.keiyoushiSources(params),
    queryFn: ({ signal }) =>
      providerService.getKeiyoushiSources(params, signal),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
