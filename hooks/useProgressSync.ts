import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readerService } from "@/services/reader.service";
import { statsService } from "@/services/stats.service";

/**
 * Hook otimizado para sincronizar progresso de leitura.
 *
 * - Salva via services (sem React Query mutation) para evitar re-renders
 * - Debounce de 1s para não disparar a cada pixel de scroll
 * - Deduplica: só envia se a página realmente mudou desde o último envio
 * - Flush imediato no unmount (troca de capítulo, saída do reader)
 * - Marca como lido automaticamente ao chegar na última página
 * - Invalida queries de progresso apenas no unmount (não durante a leitura)
 * - Registra estatísticas de leitura (páginas + tempo) a cada 30s e no unmount
 * - Fluxo de rede centralizado na camada de services
 */
export function useProgressSync(
  chapterId: string,
  currentPage: number,
  totalPages: number,
) {
  const queryClient = useQueryClient();

  // Refs para manter valores atualizados sem causar re-execução do effect
  const lastSentPage = useRef(0);
  const pendingPage = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSending = useRef(false);
  const chapterIdRef = useRef(chapterId);

  // Stats tracking refs
  const pagesReadInSession = useRef(0);
  const sessionStartTime = useRef(Date.now());
  const lastStatsFlush = useRef(Date.now());
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const highestPage = useRef(0);

  const invalidateProgressQueries = useCallback((chapter: string) => {
    queryClient.invalidateQueries({ queryKey: ["progress", chapter] });
    queryClient.invalidateQueries({
      queryKey: ["progress", "continue-reading"],
    });
    queryClient.invalidateQueries({ queryKey: ["progress", "history"] });
    queryClient.invalidateQueries({ queryKey: ["progress", "series-list"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  }, [queryClient]);

  // Função para enviar progresso ao backend
  const sendProgress = async (page: number, chapter: string) => {
    if (isSending.current || page === lastSentPage.current || page < 1) return;

    isSending.current = true;
    try {
      await readerService.updateProgress(chapter, { page });
      lastSentPage.current = page;
    } catch {
      // Silencia erros de rede — será tentado novamente na próxima mudança
    } finally {
      isSending.current = false;
    }
  };

  const flushProgressKeepalive = (chapter: string) => {
    const page = pendingPage.current;
    if (page < 1 || page === lastSentPage.current) {
      return;
    }

    readerService.updateProgressKeepalive(chapter, { page }).catch(() => {});
    lastSentPage.current = page;
  };

  // Flush de estatísticas de leitura
  const flushStats = async () => {
    const now = Date.now();
    const elapsedSec = Math.round((now - lastStatsFlush.current) / 1000);
    const pages = pagesReadInSession.current;

    if (pages === 0 && elapsedSec < 3) return; // Nada significativo para enviar

    lastStatsFlush.current = now;
    pagesReadInSession.current = 0;

    try {
      await statsService.record({
        pages,
        timeSpent: elapsedSec,
        chapterCompleted: false,
      });
    } catch {
      // Silencia — não é crítico
    }
  };

  const flushStatsKeepalive = () => {
    const elapsedSec = Math.round((Date.now() - lastStatsFlush.current) / 1000);
    const pages = pagesReadInSession.current;

    if (pages === 0 && elapsedSec < 3) {
      return;
    }

    lastStatsFlush.current = Date.now();
    pagesReadInSession.current = 0;

    statsService
      .recordKeepalive({
        pages,
        timeSpent: elapsedSec,
        chapterCompleted: false,
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (chapterIdRef.current === chapterId) {
      return;
    }

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
    pagesReadInSession.current = 0;
    highestPage.current = 0;
    sessionStartTime.current = Date.now();
    lastStatsFlush.current = Date.now();
  }, [chapterId, invalidateProgressQueries]);

  // Efeito principal: reage a mudanças de página
  // O backend auto-marca finished em ≥90%, então não precisamos chamar markAsRead separado
  useEffect(() => {
    if (currentPage < 1) return;

    pendingPage.current = currentPage;

    // Contar páginas lidas (só conta se avançou para uma página nova)
    if (currentPage > highestPage.current) {
      pagesReadInSession.current += currentPage - highestPage.current;
      highestPage.current = currentPage;
    }

    // Não envia se é a mesma página que já foi salva
    if (currentPage === lastSentPage.current) return;

    // Cancelar debounce anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Na última página, enviar imediatamente (sem debounce) para capturar a conclusão
    if (currentPage >= totalPages && totalPages > 1) {
      sendProgress(currentPage, chapterId);
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

  // Timer periódico para enviar stats a cada 30s durante leitura ativa
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

  // Flush + invalidação no unmount do reader ou troca de capítulo
  useEffect(() => {
    return () => {
      // Cancelar timers pendentes
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (statsTimer.current) {
        clearInterval(statsTimer.current);
        statsTimer.current = null;
      }

      const chapter = chapterIdRef.current;
      flushProgressKeepalive(chapter);
      flushStatsKeepalive();
      invalidateProgressQueries(chapter);
    };
  }, [invalidateProgressQueries]);
}
