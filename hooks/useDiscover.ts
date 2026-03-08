import { useQuery } from "@tanstack/react-query";
import {
  discoverService,
  type DiscoverResponse,
} from "@/services/discover.service";

/**
 * Busca todos os carrosséis de uma vez (recentlyAdded, recentlyUpdated, mostViewed).
 * Ideal para a home page — uma única request em vez de três.
 */
export function useDiscover() {
  return useQuery<DiscoverResponse>({
    queryKey: ["discover"],
    queryFn: () => discoverService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/** Séries adicionadas recentemente */
export function useDiscoverRecent() {
  return useQuery({
    queryKey: ["discover", "recent"],
    queryFn: () => discoverService.getRecent(),
    staleTime: 1000 * 60 * 5,
  });
}

/** Séries atualizadas recentemente */
export function useDiscoverUpdated() {
  return useQuery({
    queryKey: ["discover", "updated"],
    queryFn: () => discoverService.getUpdated(),
    staleTime: 1000 * 60 * 5,
  });
}

/** Séries mais populares */
export function useDiscoverPopular() {
  return useQuery({
    queryKey: ["discover", "popular"],
    queryFn: () => discoverService.getPopular(),
    staleTime: 1000 * 60 * 5,
  });
}
