import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readerService } from "@/services/reader.service";
import { progressService } from "@/services/progress.service";
import { statsService } from "@/services/stats.service";

/**
 * Hook para sincronizar progresso de leitura com o backend.
 *
 * Responsabilidades:
 * 1. Salvar progresso de página (POST /read/:id/progress) com debounce de 1s
 * 2. Salvar progresso periodicamente a cada 15s (inatividade / leitura longa)
 * 3. Marcar capítulo como lido (POST /progress/:mediaId/mark-read) na última página
 * 4. Enviar estatísticas de leitura (POST /stats/record) com deltas acumulados a cada 30s
 * 5. Salvar dados pendentes ao sair (unmount, tab hide, page unload)
 * 6. Invalidar queries de progresso ao sair do reader
 *
 * Regras de stats (backend):
 * - /stats/record é aditivo: envia deltas, nunca totais cumulativos
 * - Requer pages > 0 e timeSpent > 0 — flush só quando ambos são positivos
 * - chapterCompleted: true enviado uma única vez por capítulo/sessão
 */
export function useProgressSync(
  chapterId: string,
  currentPage: number,
  totalPages: number,
) {
  const queryClient = useQueryClient();

  // --- Progress refs ---
  const lastSentPage = useRef(0);
  const pendingPage = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSending = useRef(false);
  const chapterIdRef = useRef(chapterId);

  // --- Stats tracking refs (delta accumulation) ---
  const uniquePagesVisited = useRef(new Set<number>());
  const lastStatsFlush = useRef(Date.now());
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chapterCompletedSent = useRef(false);

  // --- Periodic progress save ---
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const invalidateProgressQueries = useCallback(
    (chapter: string) => {
      queryClient.removeQueries({ queryKey: ["progress", chapter] });
      queryClient.invalidateQueries({
        queryKey: ["progress", "continue-reading"],
      });
      queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
      queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
    [queryClient],
  );

  // Envia progresso ao backend via axios
  const sendProgress = async (page: number, chapter: string) => {
    if (isSending.current || page === lastSentPage.current || page < 1) return;

    isSending.current = true;
    try {
      await readerService.updateProgress(chapter, { page });
      lastSentPage.current = page;
    } catch {
      // Será tentado novamente na próxima mudança
    } finally {
      isSending.current = false;
    }
  };

  // Envia progresso via sendBeacon (para unmount / visibilitychange)
  const flushProgressKeepalive = (chapter: string) => {
    const page = pendingPage.current;
    if (page < 1 || page === lastSentPage.current) return;

    readerService.updateProgressKeepalive(chapter, { page }).catch(() => {});
    lastSentPage.current = page;
  };

  // Marca capítulo como lido explicitamente (POST /progress/:mediaId/mark-read)
  const markChapterRead = async (chapter: string) => {
    if (chapterCompletedSent.current) return;
    try {
      await progressService.markAsRead(chapter);
    } catch {
      // Será contabilizado pelo auto-finish do backend em ≥90%
    }
  };

  // Flush de stats com acumulação de deltas
  // Backend requer pages > 0 e timeSpent > 0
  const flushStats = async (forceChapterCompleted = false) => {
    const now = Date.now();
    const elapsedSec = Math.round((now - lastStatsFlush.current) / 1000);
    const pages = uniquePagesVisited.current.size;

    if (pages <= 0 || elapsedSec <= 0) return;

    const chapterCompleted =
      forceChapterCompleted && !chapterCompletedSent.current;

    lastStatsFlush.current = now;
    uniquePagesVisited.current = new Set<number>();

    if (chapterCompleted) {
      chapterCompletedSent.current = true;
    }

    try {
      await statsService.record({
        pages,
        timeSpent: elapsedSec,
        ...(chapterCompleted ? { chapterCompleted: true } : {}),
      });
    } catch {
      // Não é crítico
    }
  };

  // Flush de stats via sendBeacon (para unmount / visibilitychange)
  const flushStatsKeepalive = (forceChapterCompleted = false) => {
    const elapsedSec = Math.round((Date.now() - lastStatsFlush.current) / 1000);
    const pages = uniquePagesVisited.current.size;

    if (pages <= 0 || elapsedSec <= 0) return;

    const chapterCompleted =
      forceChapterCompleted && !chapterCompletedSent.current;

    lastStatsFlush.current = Date.now();
    uniquePagesVisited.current = new Set<number>();

    if (chapterCompleted) {
      chapterCompletedSent.current = true;
    }

    statsService
      .recordKeepalive({
        pages,
        timeSpent: elapsedSec,
        ...(chapterCompleted ? { chapterCompleted: true } : {}),
      })
      .catch(() => {});
  };

  // Troca de capítulo: flush do capítulo anterior e reset de estado
  useEffect(() => {
    if (chapterIdRef.current === chapterId) return;

    const previousChapterId = chapterIdRef.current;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    flushProgressKeepalive(previousChapterId);
    flushStatsKeepalive();
    invalidateProgressQueries(previousChapterId);

    chapterIdRef.current = chapterId;
    lastSentPage.current = 0;
    pendingPage.current = 0;
    uniquePagesVisited.current = new Set<number>();
    lastStatsFlush.current = Date.now();
    chapterCompletedSent.current = false;
  }, [chapterId, invalidateProgressQueries]);

  // Efeito principal: reage a mudanças de página
  useEffect(() => {
    if (currentPage < 1) return;

    pendingPage.current = currentPage;
    uniquePagesVisited.current.add(currentPage);

    if (currentPage === lastSentPage.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Na última página: envio imediato + mark-read explícito + stats com completion
    if (currentPage >= totalPages && totalPages > 1) {
      sendProgress(currentPage, chapterId);
      markChapterRead(chapterId);
      flushStats(true);
    } else {
      // Debounce de 1s para páginas intermediárias
      debounceTimer.current = setTimeout(() => {
        sendProgress(pendingPage.current, chapterId);
      }, 1000);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [currentPage, chapterId, totalPages]);

  // Timer periódico para enviar stats a cada 30s
  useEffect(() => {
    statsTimer.current = setInterval(() => {
      flushStats();
    }, 30_000);

    return () => {
      if (statsTimer.current) {
        clearInterval(statsTimer.current);
        statsTimer.current = null;
      }
    };
  }, [chapterId]);

  // Timer periódico para salvar progresso a cada 15s (inatividade / leitura longa)
  useEffect(() => {
    progressTimer.current = setInterval(() => {
      const page = pendingPage.current;
      if (page > 0 && page !== lastSentPage.current) {
        sendProgress(page, chapterIdRef.current);
      }
    }, 15_000);

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    };
  }, [chapterId]);

  // Salvar ao esconder a tab (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const chapter = chapterIdRef.current;
        flushProgressKeepalive(chapter);
        flushStatsKeepalive();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Flush + invalidação no unmount do reader
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (statsTimer.current) {
        clearInterval(statsTimer.current);
        statsTimer.current = null;
      }
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }

      const chapter = chapterIdRef.current;
      flushProgressKeepalive(chapter);
      flushStatsKeepalive();
      invalidateProgressQueries(chapter);
    };
  }, [invalidateProgressQueries]);
}
