"use client";

import { useMemo } from "react";
import toast from "react-hot-toast";
import {
  useFavorites as useApiFavorites,
  useToggleFavorite,
  useSeriesStatus,
} from "./useApi";

export function useFavorites(seriesId?: string) {
  const { data: favorites, isLoading: isLoadingFavorites } = useApiFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const { data: seriesStatus } = useSeriesStatus(seriesId);

  // IDs de séries favoritas
  const favoriteIds = useMemo(() => {
    const ids = new Set<string>();
    favorites?.forEach((series) => {
      ids.add(series.id);
    });
    return ids;
  }, [favorites]);

  // Verificar se uma série é favorita
  const isFavorite = (id: string): boolean => {
    // Se temos o status específico da série, usar ele
    if (seriesId === id && seriesStatus) {
      return seriesStatus.isFavorite;
    }
    // Caso contrário, verificar na lista
    return favoriteIds.has(id);
  };

  // Toggle favorito
  const toggleFavorite = async (id: string) => {
    // Capturar estado ANTES da mutação (após a mutação o cache já está atualizado)
    const wasFavorite = isFavorite(id);

    try {
      await toggleFavoriteMutation.mutateAsync(id);

      if (wasFavorite) {
        toast.success("Removido dos favoritos!");
      } else {
        toast.success("Adicionado aos favoritos!");
      }
    } catch (error) {
      console.error("Erro ao alternar favorito:", error);
      toast.error("Erro ao alterar favorito");
      throw error;
    }
  };

  return {
    favorites,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    isLoading: isLoadingFavorites,
    isUpdating: toggleFavoriteMutation.isPending,
  };
}
