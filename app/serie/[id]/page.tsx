"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Share2,
  BookOpen,
  Star,
  Loader2,
  Calendar,
  User,
  BookMarked,
  Play,
  Check,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useSeriesById } from "@/hooks/useApi";
import { useFavorites } from "@/hooks/useFavoritesApi";
import { useSeriesChapterProgress } from "@/hooks/useSeriesChapterProgress";
import { AuthCover } from "@/components/AuthCover";
import { CommentSection } from "@/components/community/CommentSection";

export default function MangaDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.id as string;

  const { data: series, isLoading, error } = useSeriesById(seriesId);
  const { isFavorite, toggleFavorite, isUpdating } = useFavorites(seriesId);
  const { progressMap: chapterProgressMap, continueItem } =
    useSeriesChapterProgress(seriesId, series?.medias);
  const [showAllChapters, setShowAllChapters] = useState(false);

  const handleToggleFavorite = async () => {
    await toggleFavorite(seriesId);
  };

  const handleShare = async () => {
    if (!series) return;
    const url = `${window.location.origin}/serie/${seriesId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: series.title,
          text: `Veja ${series.title} no ManHQ`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível compartilhar agora.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-textMain mb-6 text-lg font-semibold">
            Erro ao carregar série
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-6 py-3 bg-surface hover:bg-surface/80 rounded-xl transition-all mx-auto group"
          >
            <ArrowLeft className="w-5 h-5 text-primary group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="text-primary font-semibold">Voltar</span>
          </motion.button>
        </div>
      </div>
    );
  }

  const chapters = series.medias || [];

  const displayedChapters = showAllChapters ? chapters : chapters.slice(0, 10);

  // Determinar destino do botão principal
  const hasContinue = !!continueItem;

  const mainReadLink = hasContinue
    ? `/reader/${series.id}/${continueItem.mediaId}?page=${continueItem.page}`
    : chapters.length > 0
      ? `/reader/${series.id}/${chapters[0].id}`
      : null;

  return (
    <main className="min-h-screen pb-20 bg-background">
      {/* Header fixo */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-surface shadow-sm">
        <div className="flex items-center justify-between p-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface active:bg-surface/80 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 text-textMain group-hover:text-primary transition-colors group-hover:-translate-x-0.5 transform duration-200" />
            <span className="text-sm font-medium text-textMain group-hover:text-primary transition-colors">
              Voltar
            </span>
          </motion.button>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleFavorite}
              disabled={isUpdating}
              className="p-2 rounded-full hover:bg-surface transition-colors disabled:opacity-50"
            >
              <Heart
                className={`w-6 h-6 transition-all ${
                  isFavorite(seriesId)
                    ? "fill-primary text-primary scale-110"
                    : "text-textMain"
                }`}
              />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => void handleShare()}
              className="p-2 rounded-full hover:bg-surface transition-colors"
            >
              <Share2 className="w-6 h-6 text-textMain" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Capa e informações principais */}
        <div className="flex gap-4 mb-6">
          {/* Capa */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative w-28 h-40 shrink-0 rounded-xl overflow-hidden shadow-lg"
          >
            <AuthCover
              coverUrl={series.coverUrl!}
              alt={series.title}
              className="object-cover"
              loading="eager"
            />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col justify-center"
          >
            <h1 className="text-2xl font-bold text-textMain mb-1 line-clamp-2">
              {series.title}
            </h1>
            {series.alternativeTitle && (
              <p className="text-sm text-textDim mb-3 line-clamp-1">
                {series.alternativeTitle}
              </p>
            )}

            {/* Rating e Status */}
            <div className="flex items-center gap-3 mb-3">
              {series.rating && (
                <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-textMain">
                    {series.rating}
                  </span>
                </div>
              )}

              {series.status && (
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary font-medium rounded-lg">
                  {series.status === "ONGOING"
                    ? "Em Andamento"
                    : series.status === "COMPLETED"
                      ? "Completo"
                      : series.status === "HIATUS"
                        ? "Hiato"
                        : "Cancelado"}
                </span>
              )}
            </div>

            {/* Autor e Ano */}
            <div className="flex items-center gap-3 text-xs text-textDim">
              {series.author && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{series.author}</span>
                </div>
              )}
              {series.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{series.year}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Botão de ação principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {mainReadLink && (
            <Link href={mainReadLink}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
              >
                <Play className="w-5 h-5 fill-white" />
                {hasContinue
                  ? `Continuar · ${continueItem.mediaTitle || `Cap. ${continueItem.mediaNumber}`}`
                  : "Começar a Ler"}
              </motion.button>
            </Link>
          )}
        </motion.div>

        {/* Gêneros */}
        {series.genres && series.genres.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            {series.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs px-3 py-1.5 bg-surface/50 border border-surface rounded-full text-textDim font-medium hover:border-primary/30 transition-colors"
              >
                {genre}
              </span>
            ))}
          </motion.div>
        )}

        {/* Card de estatísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-surface/50 backdrop-blur-sm p-4 rounded-xl text-center border border-surface">
            <BookMarked className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-textMain mb-1">
              {chapters.length}
            </p>
            <p className="text-xs text-textDim">Capítulos</p>
          </div>

          {series.rating && (
            <div className="bg-surface/50 backdrop-blur-sm p-4 rounded-xl text-center border border-surface">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-textMain mb-1">
                {series.rating}
              </p>
              <p className="text-xs text-textDim">Avaliação</p>
            </div>
          )}

          {series.year && (
            <div className="bg-surface/50 backdrop-blur-sm p-4 rounded-xl text-center border border-surface">
              <Calendar className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-textMain mb-1">
                {series.year}
              </p>
              <p className="text-xs text-textDim">Ano</p>
            </div>
          )}
        </motion.div>

        {/* Sinopse */}
        {series.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 bg-surface/30 backdrop-blur-sm rounded-xl p-4 border border-surface"
          >
            <h2 className="text-lg font-bold text-textMain mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Sinopse
            </h2>
            <p className="text-sm text-textDim leading-relaxed">
              {series.description}
            </p>
          </motion.div>
        )}

        {/* Lista de capítulos */}
        {chapters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-primary" />
              Capítulos
              <span className="text-sm text-textDim font-normal">
                ({chapters.length})
              </span>
            </h2>

            <div className="space-y-2">
              {displayedChapters.map((chapter, index) => {
                const progress = chapterProgressMap.get(chapter.id);
                const isRead = progress?.finished;
                const isCurrent = continueItem?.mediaId === chapter.id;

                return (
                  <Link
                    key={chapter.id}
                    href={`/reader/${series.id}/${chapter.id}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-center my-4 p-4 rounded-xl transition-all group overflow-hidden ${
                        isCurrent
                          ? "bg-primary/8 border-2 border-primary/40 shadow-[0_0_12px_rgba(229,9,20,0.08)]"
                          : isRead
                            ? "bg-surface/30 border border-emerald-500/25"
                            : "bg-surface/50 border border-surface hover:bg-surface hover:border-white/10"
                      }`}
                    >
                      {/* Indicador lateral para capítulo atual */}
                      {isCurrent && (
                        <div className="absolute left-0 top-2 bottom-2 w-0.75 bg-primary rounded-full" />
                      )}

                      {/* Número / Check */}
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all ${
                          isRead
                            ? "bg-emerald-500/15"
                            : isCurrent
                              ? "bg-primary/15"
                              : "bg-white/5 group-hover:bg-white/10"
                        }`}
                      >
                        {isRead ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span
                            className={`font-semibold text-sm ${
                              isCurrent ? "text-primary" : "text-textDim"
                            }`}
                          >
                            {chapter.number}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate transition-colors ${
                            isRead
                              ? "text-textDim"
                              : isCurrent
                                ? "text-textMain"
                                : "text-textMain group-hover:text-white"
                          }`}
                        >
                          {chapter.title || `Capítulo ${chapter.number}`}
                        </p>
                        <p className="text-xs text-textDim mt-0.5">
                          {chapter.pageCount} páginas
                          {isRead && " · Lido"}
                        </p>
                      </div>

                      {/* Ação */}
                      {isCurrent ? (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full shrink-0">
                          Continuar
                        </span>
                      ) : isRead ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                      ) : (
                        <Play className="w-4 h-4 text-textDim group-hover:text-white transition-colors fill-current shrink-0" />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {!showAllChapters && chapters.length > 10 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAllChapters(true)}
                className="w-full mt-4 py-4 text-sm font-semibold text-primary hover:text-primary/80 bg-surface/30 hover:bg-surface/50 rounded-xl transition-all border border-surface"
              >
                Ver todos os {chapters.length} capítulos
              </motion.button>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-8"
        >
          <CommentSection
            scope={{ type: "series", id: seriesId }}
            title="Comentários da série"
          />
        </motion.div>
      </div>
    </main>
  );
}
