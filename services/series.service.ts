import api from "./api";
import type { Series } from "@/types/api";

export const seriesService = {
  // Listar todas as séries
  async getAll(): Promise<Series[]> {
    const response = await api.get<Series[]>("/series");
    return response.data;
  },

  // Obter detalhes de uma série
  async getById(id: string): Promise<Series> {
    const response = await api.get<Series>(`/series/${id}`);
    return response.data;
  },

  // Gerar URL da capa
  async getCoverUrl(series: Series): Promise<string> {
    const response = await api.get(series.coverUrl!, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};
