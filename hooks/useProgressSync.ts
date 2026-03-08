import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readerService } from "@/services/reader.service";
import { progressService } from "@/services/progress.service";
import { statsService } from "@/services/stats.service";

/**
 * Hook otimizado para sincronizar progresso de leitura.
 *
 * - Salva via API direta (sem React Query mutation) para evitar re-renders
 * - Debounce de 1s para não disparar a cada pixel de scroll
 * - Deduplica: só envia se a página realmente mudou desde o último envio
 * - Flush imediato no unmount (troca de capítulo, saída do reader)
 * - Marca como lido automaticamente ao chegar na última página
 * - Invalida queries de progresso apenas no unmount (não durante a leitura)
 * - Registra estatísticas de leitura (páginas + tempo) a cada 30s e no unmount
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
  const markedComplete = useRef<string | null>(null);
  const chapterIdRef = useRef(chapterId);

  // Stats tracking refs
  const pagesReadInSession = useRef(0);
  const sessionStartTime = useRef(Date.now());
  const lastStatsFlush = useRef(Date.now());
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const highestPage = useRef(0);

  // Resetar quando trocar de capítulo
  if (chapterIdRef.current !== chapterId) {
    // Flush stats do capítulo anterior antes de resetar
    const elapsedSec = Math.round((Date.now() - lastStatsFlush.current) / 1000);
    if (pagesReadInSession.current > 0 || elapsedSec > 2) {
      const wasCompleted = markedComplete.current === chapterIdRef.current;
      statsService
        .record({
          pages: pagesReadInSession.current,
          timeSpent: elapsedSec,
          chapterCompleted: wasCompleted,
        })
        .catch(() => {});
    }

    chapterIdRef.current = chapterId;
    lastSentPage.current = 0;
    pendingPage.current = 0;
    markedComplete.current = null;
    pagesReadInSession.current = 0;
    highestPage.current = 0;
    sessionStartTime.current = Date.now();
    lastStatsFlush.current = Date.now();
  }

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

  // Marca como lido (100%)
  const markComplete = async (chapter: string) => {
    if (markedComplete.current === chapter) return;
    markedComplete.current = chapter;
    try {
      await progressService.markAsRead(chapter);
    } catch {
      markedComplete.current = null;
    }
  };

  // Efeito principal: reage a mudanças de página
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

    // Debounce de 1s
    debounceTimer.current = setTimeout(() => {
      sendProgress(pendingPage.current, chapterId);
    }, 1000);

    // Marcar como lido ao chegar na última página (sem debounce)
    if (currentPage >= totalPages && totalPages > 1) {
      markComplete(chapterId);
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

      // Envio imediato da página pendente se não foi salva ainda
      const page = pendingPage.current;
      const chapter = chapterIdRef.current;
      if (page > 0 && page !== lastSentPage.current) {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (token) {
          // fetch keepalive garante envio mesmo durante navegação
          fetch(`${baseUrl}/read/${chapter}/progress`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ page }),
            keepalive: true,
          }).catch(() => {});
        }
      }

      // Flush final de stats com keepalive
      const elapsedSec = Math.round(
        (Date.now() - lastStatsFlush.current) / 1000,
      );
      const pages = pagesReadInSession.current;
      const wasCompleted = markedComplete.current === chapterIdRef.current;

      if (pages > 0 || elapsedSec > 2) {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (token) {
          fetch(`${baseUrl}/stats/record`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              pages,
              timeSpent: elapsedSec,
              chapterCompleted: wasCompleted,
            }),
            keepalive: true,
          }).catch(() => {});
        }
      }

      // Invalidar queries para que os dados estejam frescos ao voltar
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    };
  }, [chapterId, queryClient]);
}
