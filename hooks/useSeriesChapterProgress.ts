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

const MIN_CONTINUE_LIMIT = 100;
const MIN_HISTORY_LIMIT = 25;
const MAX_PROGRESS_LIMIT = 500;

/**
 * Hook unificado para progresso de leitura dos capítulos de uma série.
 *
 * Combina dados de "continue reading" e histórico para fornecer:
 * - Mapa de progresso por capítulo (lido/em progresso/não lido)
 * - Item de continuação da leitura (se houver capítulo em andamento)
 */
export function useSeriesChapterProgress(
  seriesId: string | undefined,
  medias?: Media[],
) {
  const chapterCount = medias?.length ?? 0;
  const enabled = Boolean(seriesId && chapterCount > 0);
  const continueReadingLimit = Math.min(
    Math.max(chapterCount * 2, MIN_CONTINUE_LIMIT),
    MAX_PROGRESS_LIMIT,
  );
  const historyLimit = Math.min(
    Math.max(chapterCount, MIN_HISTORY_LIMIT),
    MAX_PROGRESS_LIMIT,
  );

  const { data: continueReadingItems } = useContinueReading({
    limit: continueReadingLimit,
    onlyInProgress: true,
  }, {
    enabled,
  });
  const { data: historyData } = useProgressHistory({
    limit: historyLimit,
  }, {
    enabled,
  });

  return useMemo(() => {
    const progressMap = new Map<string, ChapterProgress>();

    if (!medias?.length || !seriesId) {
      return { progressMap, continueItem: null as SeriesContinueItem | null };
    }

    const chapterIds = new Set(medias.map((media) => media.id));

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

    const continueCandidates = (continueReadingItems ?? [])
      .filter((item) => item.seriesId === seriesId && !item.finished)
      .sort(
        (left, right) =>
          new Date(right.lastReadAt).getTime() -
          new Date(left.lastReadAt).getTime(),
      );

    const current = continueCandidates[0];
    const continueItem: SeriesContinueItem | null = current
      ? {
          mediaId: current.mediaId,
          mediaTitle: current.mediaTitle,
          mediaNumber: current.mediaNumber,
          page: current.page,
        }
      : null;

    return { progressMap, continueItem };
  }, [seriesId, medias, continueReadingItems, historyData]);
}
