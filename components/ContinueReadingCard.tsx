"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { AuthCover } from "./AuthCover";

interface ContinueReadingCardProps {
  seriesId: string;
  mediaId: string;
  title: string;
  coverUrl: string;
  chapterTitle?: string;
  currentPage: number;
  totalPages: number;
}

export function ContinueReadingCard({
  mediaId,
  title,
  coverUrl,
  chapterTitle,
  currentPage,
  seriesId,
  totalPages,
}: ContinueReadingCardProps) {
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
  const readLink =
    currentPage > 1
      ? `/reader/${seriesId}/${mediaId}?page=${currentPage}`
      : `/reader/${seriesId}/${mediaId}`;

  return (
    <Link href={readLink} className="block">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative flex gap-3.5 p-3 bg-surface/70 backdrop-blur-sm rounded-2xl overflow-hidden group border border-white/5 hover:border-white/10 transition-all duration-300"
      >
        {/* Indicador de progresso lateral */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/5">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full bg-primary rounded-full"
          />
        </div>

        {/* Capa */}
        <div className="relative w-14 h-20 shrink-0 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/5">
          <AuthCover coverUrl={coverUrl} alt={title} className="object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Play className="w-5 h-5 text-white fill-white drop-shadow-lg" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
          <h3 className="text-sm font-semibold text-textMain line-clamp-1 group-hover:text-white transition-colors">
            {title}
          </h3>
          {chapterTitle && (
            <p className="text-[11px] text-textDim mt-0.5 line-clamp-1" title={chapterTitle}>
              {chapterTitle}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {/* Barra de progresso */}
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              />
            </div>
            <span className="text-[10px] text-textDim tabular-nums shrink-0">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Botão play */}
        <div className="flex items-center">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors ring-1 ring-primary/20">
            <Play className="w-3.5 h-3.5 text-primary fill-primary" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
