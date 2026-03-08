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
        className="relative flex gap-3 p-3 bg-surface rounded-2xl overflow-hidden group"
      >
        {/* Capa */}
        <div className="relative w-16 h-22 shrink-0 rounded-xl overflow-hidden shadow-md">
          <AuthCover coverUrl={coverUrl} alt={title} className="object-cover" />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
          <h3 className="text-sm font-semibold text-textMain line-clamp-1">
            {title}
          </h3>
          {chapterTitle && (
            <p className="text-xs text-textDim mt-0.5 line-clamp-1">
              {chapterTitle}
            </p>
          )}
          <p className="text-xs text-textDim mt-1">
            Página {currentPage} de {totalPages}
          </p>

          {/* Barra de progresso */}
          <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>

        {/* Botão play */}
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Play className="w-4 h-4 text-primary fill-primary" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
