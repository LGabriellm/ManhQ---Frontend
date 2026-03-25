import api from "./api";
import { postKeepalive } from "./keepalive.service";
import type {
  ChapterInfo,
  ReadProgress,
  ReadProgressRequest,
} from "@/types/api";

export const readerService = {
  // Obter informações do capítulo
  async getChapterInfo(chapterId: string): Promise<ChapterInfo> {
    const response = await api.get<ChapterInfo>(`/read/${chapterId}/info`);
    return response.data;
  },

  // Buscar página com autenticação e retornar blob URL
  async getPageBlob(chapterId: string, pageNumber: number): Promise<string> {
    const response = await api.get(`/read/${chapterId}/page/${pageNumber}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },

  // Gerar URL da página (para referência)
  getPageUrl(chapterId: string, pageNumber: number): string {
    return `/api/read/${chapterId}/page/${pageNumber}`;
  },

  // Atualizar progresso de leitura
  async updateProgress(
    chapterId: string,
    data: ReadProgressRequest,
  ): Promise<ReadProgress> {
    const response = await api.post<{
      success: boolean;
      progress: ReadProgress;
    }>(`/read/${chapterId}/progress`, data);
    return response.data.progress;
  },

  async updateProgressKeepalive(
    chapterId: string,
    data: ReadProgressRequest,
  ): Promise<void> {
    await postKeepalive(`/read/${chapterId}/progress`, data);
  },
};
