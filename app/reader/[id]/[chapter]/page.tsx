"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  BookmarkPlus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import {
  useChapterInfo,
  useSeriesById,
  useMediaProgress,
} from "@/hooks/useApi";
import { useProgressSync } from "@/hooks/useProgressSync";
import { useFavorites } from "@/hooks/useFavoritesApi";
import { AuthImage } from "@/components/AuthImage";

export default function ReaderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.id as string;
  const chapterId = params.chapter as string;
  const urlPage = Number(searchParams.get("page")) || 0;

  // Buscar informações do capítulo e da série da API
  const { data: chapterData, isLoading, error } = useChapterInfo(chapterId);
  const { data: seriesData } = useSeriesById(seriesId);
  const { data: savedProgress } = useMediaProgress(chapterId);
  const {
    isFavorite,
    toggleFavorite,
    isUpdating: isFavUpdating,
  } = useFavorites(seriesId);

  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(urlPage || 1);
  const [readingMode, setReadingMode] = useState<"vertical" | "horizontal">(
    "vertical",
  );
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const restoredForChapter = useRef<string | null>(null);

  // Resetar estado ao trocar de capítulo (derivação síncrona — padrão React)
  if (activeChapterId !== chapterId) {
    setActiveChapterId(chapterId);
    setCurrentPage(1);
  }

  const totalPages = chapterData?.pageCount || 1;

  // Sincronização de progresso otimizada (debounce + flush no unmount)
  useProgressSync(chapterId, currentPage, totalPages);

  // Encontrar capítulos anterior e próximo
  const chapters = seriesData?.medias || [];
  const currentChapterIndex = chapters.findIndex((ch) => ch.id === chapterId);
  const prevChapter =
    currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;

  // Restaurar posição de leitura: prioridade URL > progresso salvo
  useEffect(() => {
    if (restoredForChapter.current === chapterId) return;

    // Prioridade 1: página da URL (navegação de "continuar lendo")
    if (urlPage > 1) {
      restoredForChapter.current = chapterId;
      requestAnimationFrame(() => {
        const target = document.getElementById(`page-${urlPage}`);
        if (target) target.scrollIntoView({ behavior: "instant" });
      });
      return;
    }

    // Prioridade 2: progresso salvo da API
    if (savedProgress) {
      restoredForChapter.current = chapterId;
      if (!savedProgress.finished && savedProgress.page > 1) {
        requestAnimationFrame(() => {
          const target = document.getElementById(`page-${savedProgress.page}`);
          if (target) target.scrollIntoView({ behavior: "instant" });
        });
      }
    }
  }, [savedProgress, chapterId, urlPage]);

  // Auto esconder controles
  useEffect(() => {
    if (showControls) {
      timeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showControls]);

  // Detectar scroll para atualizar página atual
  useEffect(() => {
    const container = containerRef.current;
    if (!container || readingMode !== "vertical") return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = window.innerHeight;
      const page = Math.floor(scrollTop / windowHeight) + 1;
      setCurrentPage(Math.min(page, totalPages));
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [readingMode, totalPages]);

  // Estado de loading
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Estado de erro
  if (error || !chapterData) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-6">
            Erro ao carregar capítulo
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all mx-auto shadow-lg shadow-primary/20 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span>Voltar</span>
          </motion.button>
        </div>
      </div>
    );
  }

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Dividir tela em 3 áreas: esquerda, centro, direita
    if (x < width * 0.25) {
      // Esquerda - página anterior
      if (currentPage > 1) {
        const prevPage = document.getElementById(`page-${currentPage - 1}`);
        prevPage?.scrollIntoView({ behavior: "smooth" });
      }
    } else if (x > width * 0.75) {
      // Direita - próxima página
      if (currentPage < totalPages) {
        const nextPage = document.getElementById(`page-${currentPage + 1}`);
        nextPage?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Centro - toggle controles
      setShowControls(!showControls);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = document.getElementById(`page-${currentPage + 1}`);
      nextPage?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      const prevPage = document.getElementById(`page-${currentPage - 1}`);
      prevPage?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black select-none">
      {/* Controles superiores */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-50 bg-linear-to-b from-black/95 via-black/70 to-transparent backdrop-blur-md"
          >
            <div className="flex items-center justify-between p-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/serie/${seriesId}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 active:bg-white/20 backdrop-blur-sm transition-all group"
              >
                <ArrowLeft className="w-5 h-5 text-white group-hover:-translate-x-0.5 transition-transform duration-200" />
                <span className="text-sm font-semibold text-white">Voltar</span>
              </motion.button>

              <div className="flex-1 mx-4 min-w-0">
                <h1 className="text-white font-semibold text-sm truncate">
                  {chapterData.title || `Capítulo ${currentPage}`}
                </h1>
                <p className="text-white/60 text-xs truncate">
                  Página {currentPage} de {totalPages}
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <Settings className="w-6 h-6 text-white" />
              </motion.button>
            </div>

            {/* Barra de progresso melhorada */}
            <div className="px-4 pb-4">
              <div className="relative">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(currentPage / totalPages) * 100}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {/* Indicador de páginas */}
                <div className="flex justify-between mt-2">
                  <span className="text-white/40 text-xs">1</span>
                  <span className="text-white/60 text-xs font-medium">
                    {currentPage}
                  </span>
                  <span className="text-white/40 text-xs">{totalPages}</span>
                </div>
              </div>

              {/* Navegação entre capítulos no header */}
              {(prevChapter || nextChapter) && (
                <div className="flex gap-2 mt-4">
                  {prevChapter && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        router.push(`/reader/${seriesId}/${prevChapter.id}`)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-colors group"
                    >
                      <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
                      <span className="text-white text-xs font-medium truncate">
                        {prevChapter.title || `Cap. ${prevChapter.number}`}
                      </span>
                    </motion.button>
                  )}
                  {nextChapter && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        router.push(`/reader/${seriesId}/${nextChapter.id}`)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/80 hover:bg-primary backdrop-blur-sm rounded-lg transition-colors group"
                    >
                      <span className="text-white text-xs font-medium truncate">
                        {nextChapter.title || `Cap. ${nextChapter.number}`}
                      </span>
                      <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botões laterais de navegação (desktop/tablet) */}
      <AnimatePresence>
        {showControls && (
          <>
            {currentPage > 1 && (
              <motion.button
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={goToPrevPage}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full transition-colors hidden md:block"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </motion.button>
            )}

            {currentPage < totalPages && (
              <motion.button
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={goToNextPage}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full transition-colors hidden md:block"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </motion.button>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Área de leitura */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        onClick={handleTap}
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
          (pageNumber) => (
            <div
              key={pageNumber}
              id={`page-${pageNumber}`}
              className="relative w-full h-screen snap-start flex items-center justify-center bg-black"
            >
              <AuthImage
                chapterId={chapterId}
                pageNumber={pageNumber}
                alt={`Página ${pageNumber}`}
                className="max-w-full max-h-full object-contain"
                loading={pageNumber <= 3 ? "eager" : "lazy"}
              />

              {/* Indicador de página (sutil) */}
              {!showControls && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                  <span className="text-white/60 text-xs font-medium">
                    {pageNumber} / {totalPages}
                  </span>
                </div>
              )}
            </div>
          ),
        )}

        {/* Navegação entre capítulos */}
        <div className="h-screen snap-start flex flex-col items-center justify-center gap-6 px-8 bg-linear-to-b from-black via-black/95 to-background">
          <div className="text-center mb-4">
            <p className="text-white text-lg font-semibold mb-2">
              Fim do Capítulo
            </p>
            <p className="text-white/60 text-sm">
              {chapterData.title || "Você chegou ao final"}
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            {/* Botão Próximo Capítulo */}
            {nextChapter && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  router.push(`/reader/${seriesId}/${nextChapter.id}`)
                }
                className="flex items-center justify-between gap-3 px-6 py-5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 group"
              >
                <div className="flex-1 text-left">
                  <p className="text-xs text-white/70 mb-1">Próximo</p>
                  <p className="text-sm font-bold truncate">
                    {nextChapter.title || `Capítulo ${nextChapter.number}`}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            )}

            {/* Botão Capítulo Anterior */}
            {prevChapter && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  router.push(`/reader/${seriesId}/${prevChapter.id}`)
                }
                className="flex items-center justify-between gap-3 px-6 py-5 bg-surface/50 hover:bg-surface/70 backdrop-blur-md text-white font-semibold rounded-xl transition-all border border-surface group"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                <div className="flex-1 text-right">
                  <p className="text-xs text-white/70 mb-1">Anterior</p>
                  <p className="text-sm font-bold truncate">
                    {prevChapter.title || `Capítulo ${prevChapter.number}`}
                  </p>
                </div>
              </motion.button>
            )}

            {/* Separador */}
            {(nextChapter || prevChapter) && (
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-black px-3 text-xs text-white/40">
                    ou
                  </span>
                </div>
              </div>
            )}

            {/* Botão Ver Todos os Capítulos */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/serie/${seriesId}`)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-surface/30 hover:bg-surface/50 text-white font-semibold rounded-xl transition-all border border-surface group"
            >
              <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Ver Todos os Capítulos
            </motion.button>

            {/* Botão Voltar aos Detalhes */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(`/serie/${seriesId}`)}
              className="flex items-center justify-center gap-2 px-6 py-3 text-white/60 hover:text-white font-medium transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Voltar aos Detalhes
            </motion.button>
          </div>
        </div>
      </div>

      {/* Painel de configurações */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40"
              onClick={() => setShowSettings(false)}
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl p-6 max-w-lg mx-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-textMain">
                  Configurações
                </h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-full hover:bg-background transition-colors"
                >
                  <X className="w-6 h-6 text-textMain" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-textMain block mb-3">
                    Modo de Leitura
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setReadingMode("vertical")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        readingMode === "vertical"
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-background text-textDim hover:text-textMain hover:bg-background/80"
                      }`}
                    >
                      Vertical
                    </button>
                    <button
                      onClick={() => setReadingMode("horizontal")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        readingMode === "horizontal"
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "bg-background text-textDim hover:text-textMain hover:bg-background/80"
                      }`}
                    >
                      Horizontal
                    </button>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleFavorite(seriesId)}
                  disabled={isFavUpdating}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-background hover:bg-background/80 text-textMain font-medium rounded-xl transition-colors border border-surface disabled:opacity-50"
                >
                  <BookmarkPlus className="w-5 h-5" />
                  {isFavorite(seriesId)
                    ? "Remover dos Favoritos"
                    : "Adicionar aos Favoritos"}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
