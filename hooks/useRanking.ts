"use client";

import { useQuery } from "@tanstack/react-query";
import { rankingService } from "@/services/ranking.service";
import { useAuth } from "@/contexts/AuthContext";
import type { RankMetric } from "@/types/api";

export function useRanking(metric: RankMetric, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["ranking", metric, limit, offset],
    queryFn: ({ signal }) => rankingService.getRanking(metric, limit, offset, signal),
    staleTime: 1000 * 60 * 2, // 2 min — rankings update frequently
    refetchOnWindowFocus: false,
  });
}

export function useMyRank(metric: RankMetric) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["ranking", "me", metric],
    queryFn: ({ signal }) => rankingService.getMyRank(metric, signal),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
