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
    const rawCoverUrl = series.coverUrl || `/public/series/${series.id}/cover`;
    let normalizedCoverPath = rawCoverUrl;
    if (rawCoverUrl.startsWith("http://") || rawCoverUrl.startsWith("https://")) {
      try {
        const parsed = new URL(rawCoverUrl);
        normalizedCoverPath = `${parsed.pathname}${parsed.search}`;
      } catch {
        normalizedCoverPath = rawCoverUrl;
      }
    }
    if (normalizedCoverPath.startsWith("/series/")) {
      normalizedCoverPath = normalizedCoverPath.replace(
        "/series/",
        "/public/series/",
      );
    }
    const requestPath = normalizedCoverPath.startsWith("/api/")
      ? normalizedCoverPath.slice(4)
      : normalizedCoverPath;

    const response = await api.get(requestPath, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },
};
