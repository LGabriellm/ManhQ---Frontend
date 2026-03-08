"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { statsService } from "@/services/stats.service";
import type { RecordStatsRequest } from "@/types/api";

// ===== Query Keys =====
const analyticsKeys = {
  all: ["analytics"] as const,
  dashboard: () => [...analyticsKeys.all, "dashboard"] as const,
  week: () => [...analyticsKeys.all, "week"] as const,
  month: () => [...analyticsKeys.all, "month"] as const,
  allTime: () => [...analyticsKeys.all, "all-time"] as const,
};

/**
 * Dashboard consolidado de analytics (semana + mês + all-time).
 * Ideal para visão geral do perfil de leitura.
 */
export function useStatsDashboard() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: () => statsService.getDashboard(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/** Estatísticas detalhadas da semana (dia a dia). */
export function useStatsWeek() {
  return useQuery({
    queryKey: analyticsKeys.week(),
    queryFn: () => statsService.getWeek(),
    staleTime: 1000 * 60 * 5,
  });
}

/** Estatísticas detalhadas do mês. */
export function useStatsMonth() {
  return useQuery({
    queryKey: analyticsKeys.month(),
    queryFn: () => statsService.getMonth(),
    staleTime: 1000 * 60 * 5,
  });
}

/** Estatísticas totais acumuladas (all-time). */
export function useStatsAllTime() {
  return useQuery({
    queryKey: analyticsKeys.allTime(),
    queryFn: () => statsService.getAllTime(),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Mutation para registrar leitura de páginas.
 * Chamado pelo reader durante a leitura ativa (via useProgressSync).
 */
export function useRecordStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordStatsRequest) => statsService.record(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
  });
}
