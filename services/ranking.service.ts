import api from "./api";
import type {
  RankMetric,
  RankingResponse,
  MyRankResponse,
} from "@/types/api";

export const rankingService = {
  async getRanking(
    metric: RankMetric = "chapters",
    limit = 50,
    offset = 0,
    signal?: AbortSignal,
  ): Promise<RankingResponse> {
    const response = await api.get<RankingResponse>("/ranking", {
      params: { metric, limit, offset },
      signal,
    });
    return response.data;
  },

  async getMyRank(
    metric: RankMetric = "chapters",
    signal?: AbortSignal,
  ): Promise<MyRankResponse> {
    const response = await api.get<MyRankResponse>("/ranking/me", {
      params: { metric },
      signal,
    });
    return response.data;
  },
};
