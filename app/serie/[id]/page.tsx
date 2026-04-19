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
  RefreshCcw,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useFavorites as useApiFavorites,
  useSeriesById,
  useToggleFavorite,
} from "@/hooks/useApi";
import { useSeriesChapterProgress } from "@/hooks/useSeriesChapterProgress";
import { AuthCover } from "@/components/AuthCover";
import { CommentSection } from "@/components/community/CommentSection";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicCoverUrl } from "@/lib/coverUrl";

export default function MangaDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.id as string;
  const { isAuthenticated } = useAuth();
  const { data: favorites = [] } = useApiFavorites({
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 3,
  });
  const toggleFavoriteMutation = useToggleFavorite();
  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.id)),
    [favorites],
  );

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.push("/home");
      return;
    }

    router.push(isAuthenticated ? "/home" : "/search");
  };

  const {
    data: series,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useSeriesById(seriesId);
  const chapters = useMemo(() => series?.medias ?? [], [series?.medias]);
  const { progressMap: chapterProgressMap, continueItem } =
    useSeriesChapterProgress(seriesId, chapters);
  const [showAllChapters, setShowAllChapters] = useState(false);

  const displayedChapters = showAllChapters ? chapters : chapters.slice(0, 10);
  const firstChapter = chapters[0] ?? null;
  const hasContinue =
    !!continueItem &&
    chapters.some((chapter) => chapter.id === continueItem.mediaId);

  const mainReadLink = hasContinue
    ? `/reader/${seriesId}/${continueItem.mediaId}?page=${continueItem.page}`
    : firstChapter
      ? `/reader/${seriesId}/${firstChapter.id}`
      : null;

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast("Faça login para salvar esta série nos favoritos.");
      router.push("/auth/login");
      return;
    }

    const wasFavorite = favoriteIds.has(seriesId);

    try {
      await toggleFavoriteMutation.mutateAsync(seriesId);
      toast.success(
        wasFavorite ? "Removido dos favoritos!" : "Adicionado aos favoritos!",
      );
    } catch {
      toast.error("Erro ao alterar favorito");
    }
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
            Série pública
          </p>
          <h1 className="mt-3 text-2xl font-bold text-textMain">
            Não foi possível carregar esta série
          </h1>
          <p className="mt-3 text-sm text-textDim">
            A página pode estar indisponível no momento. Você pode tentar
            carregar novamente sem perder o fluxo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void refetch()}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <RefreshCcw className="h-4 w-4" />
              Tentar de novo
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBack}
              className="flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 font-semibold text-primary transition-all hover:bg-surface/80"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 border-b border-surface bg-background/95 backdrop-blur-md shadow-sm safe-header">
        <div className="flex items-center justify-between p-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="group flex items-center gap-2 rounded-xl px-3 py-2 transition-all hover:bg-surface active:bg-surface/80"
          >
            <ArrowLeft className="h-5 w-5 text-textMain transition-colors duration-200 group-hover:-translate-x-0.5 group-hover:text-primary" />
            <span className="text-sm font-medium text-textMain transition-colors group-hover:text-primary">
              Voltar
            </span>
          </motion.button>

          <div className="flex items-center gap-2">
            {isFetching && (
              <Loader2 className="h-4 w-4 animate-spin text-textDim" />
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleFavorite}
              disabled={toggleFavoriteMutation.isPending}
              className="rounded-full p-2 transition-colors hover:bg-surface disabled:opacity-50"
            >
              <Heart
                className={`h-6 w-6 transition-all ${
                  favoriteIds.has(seriesId)
                    ? "scale-110 fill-primary text-primary"
                    : "text-textMain"
                }`}
              />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => void handleShare()}
              className="rounded-full p-2 transition-colors hover:bg-surface"
            >
              <Share2 className="h-6 w-6 text-textMain" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="mb-6 flex gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl shadow-lg"
          >
            <AuthCover
              coverUrl={getPublicCoverUrl(series.id, series.coverUrl)}
              alt={series.title}
              className="object-cover"
              loading="eager"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-1 flex-col justify-center"
          >
            <h1 className="mb-1 line-clamp-2 text-2xl font-bold text-textMain">
              {series.title}
            </h1>
            {series.alternativeTitle && (
              <p className="mb-3 line-clamp-1 text-sm text-textDim">
                {series.alternativeTitle}
              </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-3">
              {series.rating && (
                <div className="flex items-center gap-1 rounded-lg bg-surface px-2 py-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="text-sm font-semibold text-textMain">
                    {series.rating}
                  </span>
                </div>
              )}

              {series.status && (
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
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

            <div className="flex flex-wrap items-center gap-3 text-xs text-textDim">
              {series.author && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{series.author}</span>
                </div>
              )}
              {series.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{series.year}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {mainReadLink ? (
            <Link href={mainReadLink} className="block">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
              >
                <Play className="h-5 w-5 fill-white" />
                {hasContinue
                  ? `Continuar · ${continueItem?.mediaTitle || `Cap. ${continueItem?.mediaNumber}`}`
                  : "Começar a Ler"}
              </motion.div>
            </Link>
          ) : (
            <div className="rounded-xl border border-dashed border-surface bg-surface/20 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-textMain">
                Ainda não há capítulos publicados
              </p>
              <p className="mt-1 text-sm text-textDim">
                Assim que novos capítulos forem adicionados, a leitura aparecerá
                aqui.
              </p>
            </div>
          )}
        </motion.div>

        {series.genres && series.genres.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-6 flex flex-wrap gap-2"
          >
            {series.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-surface bg-surface/50 px-3 py-1.5 text-xs font-medium text-textDim transition-colors hover:border-primary/30"
              >
                {genre}
              </span>
            ))}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-6 grid grid-cols-3 gap-3"
        >
          <div className="rounded-xl border border-surface bg-surface/50 p-4 text-center backdrop-blur-sm">
            <BookMarked className="mx-auto mb-2 h-5 w-5 text-primary" />
            <p className="mb-1 text-2xl font-bold text-textMain">
              {chapters.length}
            </p>
            <p className="text-xs text-textDim">Capítulos</p>
          </div>

          {series.rating ? (
            <div className="rounded-xl border border-surface bg-surface/50 p-4 text-center backdrop-blur-sm">
              <Star className="mx-auto mb-2 h-5 w-5 fill-yellow-500 text-yellow-500" />
              <p className="mb-1 text-2xl font-bold text-textMain">
                {series.rating}
              </p>
              <p className="text-xs text-textDim">Avaliação</p>
            </div>
          ) : (
            <div className="rounded-xl border border-surface bg-surface/30 p-4 text-center">
              <Play className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="mb-1 text-2xl font-bold text-textMain">
                {hasContinue
                  ? continueItem?.mediaNumber
                  : (firstChapter?.number ?? "-")}
              </p>
              <p className="text-xs text-textDim">
                {hasContinue ? "Capítulo Atual" : "Primeiro Capítulo"}
              </p>
            </div>
          )}

          {series.year ? (
            <div className="rounded-xl border border-surface bg-surface/50 p-4 text-center backdrop-blur-sm">
              <Calendar className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="mb-1 text-2xl font-bold text-textMain">
                {series.year}
              </p>
              <p className="text-xs text-textDim">Ano</p>
            </div>
          ) : (
            <div className="rounded-xl border border-surface bg-surface/30 p-4 text-center">
              <BookOpen className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="mb-1 text-2xl font-bold text-textMain">
                {chapters.reduce(
                  (total, chapter) => total + (chapter.pageCount ?? 0),
                  0,
                )}
              </p>
              <p className="text-xs text-textDim">Páginas</p>
            </div>
          )}
        </motion.div>

        {series.description && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-6 rounded-xl border border-surface bg-surface/30 p-4 backdrop-blur-sm"
          >
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-textMain">
              <BookOpen className="h-5 w-5 text-primary" />
              Sinopse
            </h2>
            <p className="text-sm leading-relaxed text-textDim">
              {series.description}
            </p>
          </motion.div>
        )}

        {chapters.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-8"
          >
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-textMain">
              <BookMarked className="h-5 w-5 text-primary" />
              Capítulos
              <span className="text-sm font-normal text-textDim">
                ({chapters.length})
              </span>
            </h2>

            <div className="space-y-2">
              {displayedChapters.map((chapter, index) => {
                const progress = chapterProgressMap.get(chapter.id);
                const isRead = progress?.finished;
                const isCurrent = continueItem?.mediaId === chapter.id;
                const pageCount = chapter.pageCount ?? 0;
                const pageLabel =
                  progress && !progress.finished && pageCount > 0
                    ? `Página ${Math.min(progress.page, pageCount)} de ${pageCount}`
                    : pageCount > 0
                      ? `${pageCount} páginas`
                      : "Número de páginas indisponível";

                return (
                  <Link
                    key={chapter.id}
                    href={`/reader/${series.id}/${chapter.id}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      whileTap={{ scale: 0.98 }}
                      className={`group relative my-4 flex items-center overflow-hidden rounded-xl p-4 transition-all ${
                        isCurrent
                          ? "border-2 border-primary/40 bg-primary/8 shadow-[0_0_12px_rgba(229,9,20,0.08)]"
                          : isRead
                            ? "border border-emerald-500/25 bg-surface/30"
                            : "border border-surface bg-surface/50 hover:border-white/10 hover:bg-surface"
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-primary" />
                      )}

                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                          isRead
                            ? "bg-emerald-500/15"
                            : isCurrent
                              ? "bg-primary/15"
                              : "bg-white/5 group-hover:bg-white/10"
                        }`}
                      >
                        {isRead ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <span
                            className={`text-sm font-semibold ${
                              isCurrent ? "text-primary" : "text-textDim"
                            }`}
                          >
                            {chapter.number ?? index + 1}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium transition-colors ${
                            isRead
                              ? "text-textDim"
                              : isCurrent
                                ? "text-textMain"
                                : "text-textMain group-hover:text-white"
                          }`}
                        >
                          {chapter.title ||
                            `Capítulo ${chapter.number ?? index + 1}`}
                        </p>
                        <p className="mt-0.5 text-xs text-textDim">
                          {pageLabel}
                          {isRead && " · Lido"}
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                          Continuar
                        </span>
                      ) : isRead ? (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                      ) : (
                        <Play className="h-4 w-4 shrink-0 fill-current text-textDim transition-colors group-hover:text-white" />
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
                className="mt-4 w-full rounded-xl border border-surface bg-surface/30 py-4 text-sm font-semibold text-primary transition-all hover:bg-surface/50 hover:text-primary/80"
              >
                Ver todos os {chapters.length} capítulos
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="mb-8 rounded-2xl border border-dashed border-surface bg-surface/20 px-6 py-10 text-center">
            <p className="text-base font-semibold text-textMain">
              Nenhum capítulo disponível
            </p>
            <p className="mt-2 text-sm text-textDim">
              Os capítulos desta série ainda não foram publicados ou estão em
              processamento.
            </p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
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
