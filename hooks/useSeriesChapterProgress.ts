import { useMemo } from "react";
import { useContinueReading, useProgressHistory } from "./useApi";
import type { Media } from "@/types/api";

interface ChapterProgress {
  page: number;
  finished: boolean;
}

interface SeriesContinueItem {
  mediaId: string;
  mediaTitle: string;
  mediaNumber: number;
  page: number;
}

/**
 * Hook unificado para progresso de leitura dos capítulos de uma série.
 *
 * Combina dados de "continue reading" e histórico para fornecer:
 * - Mapa de progresso por capítulo (lido/em progresso/não lido)
 * - Item de continuação da leitura (se houver capítulo em andamento)
 *
 * Dados do histórico fornecem cobertura ampla (capítulos antigos concluídos),
 * enquanto dados de "continue reading" fornecem informações mais recentes e
 * sobrescrevem o histórico quando disponíveis.
 */
export function useSeriesChapterProgress(
  seriesId: string | undefined,
  medias?: Media[],
) {
  // Limitar buscas ao essencial — os dados são filtrados por série abaixo
  const { data: continueReadingItems } = useContinueReading({ limit: 50 });
  const { data: historyData } = useProgressHistory({
    limit: medias?.length ?? 100,
  });

  return useMemo(() => {
    const progressMap = new Map<string, ChapterProgress>();

    if (!medias?.length || !seriesId) {
      return { progressMap, continueItem: null as SeriesContinueItem | null };
    }

    const chapterIds = new Set(medias.map((m) => m.id));

    // 1. Preencher com dados do histórico (cobertura ampla, inclui capítulos antigos)
    if (historyData?.items) {
      for (const item of historyData.items) {
        if (chapterIds.has(item.mediaId)) {
          progressMap.set(item.mediaId, {
            page: item.page,
            finished: item.finished,
          });
        }
      }
    }

    // 2. Sobrescrever com dados de "continue reading" (mais recentes e precisos)
    if (continueReadingItems) {
      for (const item of continueReadingItems) {
        if (chapterIds.has(item.mediaId)) {
          progressMap.set(item.mediaId, {
            page: item.page,
            finished: item.finished,
          });
        }
      }
    }

    // 3. Encontrar item de continuação para esta série específica
    const crItem = continueReadingItems?.find(
      (item) => item.seriesId === seriesId && !item.finished,
    );

    const continueItem: SeriesContinueItem | null = crItem
      ? {
          mediaId: crItem.mediaId,
          mediaTitle: crItem.mediaTitle,
          mediaNumber: crItem.mediaNumber,
          page: crItem.page,
        }
      : null;

    return { progressMap, continueItem };
  }, [seriesId, medias, continueReadingItems, historyData]);
}
