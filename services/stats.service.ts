import api from "./api";
import type {
  UserStatsResponse,
  UserReadingStats,
  UserLibraryStats,
  UserStreakStats,
  UserTimeStats,
  UserGenreStats,
  UserMilestoneStats,
  RecordStatsRequest,
  DailyStats,
  StatsDashboardResponse,
  StatsWeekResponse,
  StatsAllTimeResponse,
} from "@/types/api";

export const statsService = {
  // Todas as estatísticas de uma vez
  async getAll(): Promise<UserStatsResponse> {
    const response = await api.get<UserStatsResponse>("/user/stats");
    return response.data;
  },

  // Core de leitura
  async getReading(): Promise<UserReadingStats> {
    const response = await api.get<UserReadingStats>("/user/stats/reading");
    return response.data;
  },

  // Estatísticas da biblioteca
  async getLibrary(): Promise<UserLibraryStats> {
    const response = await api.get<UserLibraryStats>("/user/stats/library");
    return response.data;
  },

  // Streaks
  async getStreaks(): Promise<UserStreakStats> {
    const response = await api.get<UserStreakStats>("/user/stats/streaks");
    return response.data;
  },

  // Tempo de leitura
  async getTime(): Promise<UserTimeStats> {
    const response = await api.get<UserTimeStats>("/user/stats/time");
    return response.data;
  },

  // Gêneros
  async getGenres(): Promise<UserGenreStats> {
    const response = await api.get<UserGenreStats>("/user/stats/genres");
    return response.data;
  },

  // Conquistas
  async getMilestones(): Promise<UserMilestoneStats> {
    const response = await api.get<UserMilestoneStats>(
      "/user/stats/milestones",
    );
    return response.data;
  },

  // ===== Analytics =====

  // Dashboard completo (semana, mês, all-time)
  async getDashboard(): Promise<StatsDashboardResponse> {
    const response = await api.get<StatsDashboardResponse>("/stats/dashboard");
    return response.data;
  },

  // Estatísticas da semana
  async getWeek(): Promise<StatsWeekResponse> {
    const response = await api.get<StatsWeekResponse>("/stats/week");
    return response.data;
  },

  // Estatísticas do mês
  async getMonth(): Promise<StatsWeekResponse> {
    const response = await api.get<StatsWeekResponse>("/stats/month");
    return response.data;
  },

  // Estatísticas totais (all-time)
  async getAllTime(): Promise<StatsAllTimeResponse> {
    const response = await api.get<StatsAllTimeResponse>("/stats/all-time");
    return response.data;
  },

  // Registrar leitura de páginas (chamado pelo reader durante leitura)
  async record(data: RecordStatsRequest): Promise<DailyStats> {
    const response = await api.post<DailyStats>("/stats/record", data);
    return response.data;
  },
};
