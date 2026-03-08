import api from "./api";
import type {
  MediaProgress,
  SeriesProgress,
  ContinueReadingItem,
  ProgressHistoryResponse,
  ContinueReadingParams,
  ProgressHistoryParams,
  Series,
  ProgressStats,
} from "@/types/api";
import { normalizeCoverUrl } from "@/lib/utils";

export const progressService = {
  // Progresso detalhado de um capítulo específico
  async getMediaProgress(mediaId: string): Promise<MediaProgress> {
    const response = await api.get<MediaProgress>(`/progress/${mediaId}`);
    return response.data;
  },

  // Progresso completo de uma série
  async getSeriesProgress(seriesId: string): Promise<SeriesProgress> {
    const response = await api.get<SeriesProgress>(
      `/progress/series/${seriesId}`,
    );
    return response.data;
  },

  // Lista últimas mídias lidas (botão "Continuar Lendo")
  async getContinueReading(
    params?: ContinueReadingParams,
  ): Promise<ContinueReadingItem[]> {
    const response = await api.get<ContinueReadingItem[]>(
      "/progress/continue-reading",
      { params },
    );
    return response.data;
  },

  // Histórico detalhado com paginação
  async getHistory(
    params?: ProgressHistoryParams,
  ): Promise<ProgressHistoryResponse> {
    const response = await api.get<ProgressHistoryResponse>(
      "/progress/history",
      { params },
    );
    return response.data;
  },

  // Lista todas as séries que o usuário já começou a ler
  async getSeriesList(): Promise<Series[]> {
    const response = await api.get<Series[]>("/progress/series-list");
    return response.data.map(normalizeCoverUrl);
  },

  // Marca capítulo como lido (100%)
  async markAsRead(mediaId: string): Promise<void> {
    await api.post(`/progress/${mediaId}/mark-read`);
  },

  // Remove progresso (marca como não lido)
  async removeProgress(mediaId: string): Promise<void> {
    await api.delete(`/progress/${mediaId}`);
  },

  // Marca TODOS os capítulos da série como lidos
  async markAllAsRead(seriesId: string): Promise<void> {
    await api.post(`/progress/series/${seriesId}/mark-all-read`);
  },

  // Remove progresso de TODOS os capítulos da série
  async removeSeriesProgress(seriesId: string): Promise<void> {
    await api.delete(`/progress/series/${seriesId}`);
  },

  // Estatísticas básicas de leitura (legado)
  async getStats(): Promise<ProgressStats> {
    const response = await api.get<ProgressStats>("/progress/stats");
    return response.data;
  },
};
