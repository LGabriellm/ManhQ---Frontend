import api from "./api";
import { postKeepalive } from "./keepalive.service";
import type {
  ChapterInfo,
  ReadProgress,
  ReadProgressRequest,
} from "@/types/api";

function toPositivePage(pageNumber: number): number {
  if (!Number.isFinite(pageNumber)) {
    return 1;
  }

  return Math.max(1, Math.trunc(pageNumber));
}

function normalizeNeighbor(
  chapter: ChapterInfo["nextChapter"] | ChapterInfo["prevChapter"],
) {
  if (!chapter) {
    return null;
  }

  return {
    id: chapter.id,
    number: Number.isFinite(chapter.number) ? chapter.number : 0,
  };
}

function normalizeChapterInfo(chapter: ChapterInfo): ChapterInfo {
  return {
    ...chapter,
    number: Number.isFinite(chapter.number) ? chapter.number : 0,
    pageCount: toPositivePage(chapter.pageCount),
    nextChapter: normalizeNeighbor(chapter.nextChapter),
    prevChapter: normalizeNeighbor(chapter.prevChapter),
  };
}

function normalizeReadProgress(payload: unknown): ReadProgress {
  const source =
    payload && typeof payload === "object" && "progress" in payload
      ? (payload as { progress?: ReadProgress }).progress
      : payload;

  return source as ReadProgress;
}

export const readerService = {
  // Obter informações do capítulo
  async getChapterInfo(chapterId: string): Promise<ChapterInfo> {
    const response = await api.get<ChapterInfo>(`/read/${chapterId}/info`);
    return normalizeChapterInfo(response.data);
  },

  // Buscar página com autenticação e retornar blob URL
  async getPageBlob(chapterId: string, pageNumber: number): Promise<string> {
    const safePage = toPositivePage(pageNumber);
    const response = await api.get(`/read/${chapterId}/page/${safePage}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },

  // Gerar URL da página (para referência)
  getPageUrl(chapterId: string, pageNumber: number): string {
    const safePage = toPositivePage(pageNumber);
    return `/api/read/${chapterId}/page/${safePage}`;
  },

  // Atualizar progresso de leitura
  async updateProgress(
    chapterId: string,
    data: ReadProgressRequest,
  ): Promise<ReadProgress> {
    const response = await api.post<unknown>(`/read/${chapterId}/progress`, {
      ...data,
      page: toPositivePage(data.page),
    });
    return normalizeReadProgress(response.data);
  },

  async updateProgressKeepalive(
    chapterId: string,
    data: ReadProgressRequest,
  ): Promise<void> {
    await postKeepalive(`/read/${chapterId}/progress`, {
      ...data,
      page: toPositivePage(data.page),
    });
  },
};
