import { useQuery } from "@tanstack/react-query";
import {
  discoverService,
  type DiscoverResponse,
} from "@/services/discover.service";

interface UseDiscoverOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * Busca todos os carrosséis de uma vez (recentlyAdded, recentlyUpdated, mostViewed).
 * Ideal para a home page — uma única request em vez de três.
 */
export function useDiscover(options: UseDiscoverOptions = {}) {
  const limit = options.limit;

  return useQuery<DiscoverResponse>({
    queryKey: ["discover", "home", limit ?? null],
    queryFn: ({ signal }) => discoverService.getAll(limit, signal),
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Séries adicionadas recentemente */
export function useDiscoverRecent(limit?: number) {
  return useQuery({
    queryKey: ["discover", "recent", limit ?? null],
    queryFn: ({ signal }) => discoverService.getRecent(limit, signal),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Séries atualizadas recentemente */
export function useDiscoverUpdated(limit?: number) {
  return useQuery({
    queryKey: ["discover", "updated", limit ?? null],
    queryFn: ({ signal }) => discoverService.getUpdated(limit, signal),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Séries mais populares */
export function useDiscoverPopular(limit?: number) {
  return useQuery({
    queryKey: ["discover", "popular", limit ?? null],
    queryFn: ({ signal }) => discoverService.getPopular(limit, signal),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
