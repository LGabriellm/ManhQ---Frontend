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
  const progress =
    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const readLink =
    currentPage > 1
      ? `/reader/${seriesId}/${mediaId}?page=${currentPage}`
      : `/reader/${seriesId}/${mediaId}`;

  return (
    <Link href={readLink} className="block">
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-surface)]/70 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all duration-200 group overflow-hidden relative"
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] overflow-hidden rounded-full">
          <motion.div
            initial={{ height: "0%" }}
            animate={{ height: "100%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary)]/30 rounded-full"
          />
        </div>

        {/* Cover thumbnail */}
        <div className="relative w-14 h-20 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/[0.08]">
          <AuthCover coverUrl={coverUrl} alt={title} className="object-cover" />
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Play className="w-5 h-5 text-white fill-white drop-shadow-lg" />
          </div>
        </div>

        {/* Middle info */}
        <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
          <h3 className="text-sm font-bold text-[var(--color-textMain)] line-clamp-1 group-hover:text-white transition-colors duration-200">
            {title}
          </h3>
          {chapterTitle && (
            <p
              className="text-[11px] text-[var(--color-textDim)] mt-0.5 line-clamp-1"
              title={chapterTitle}
            >
              {chapterTitle}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/[0.06]">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/60 rounded-full"
            />
          </div>
          <p className="text-[10px] text-[var(--color-textDim)]/60 mt-1 tabular-nums">
            {progress}%
          </p>
        </div>

        {/* Right play button */}
        <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--color-primary)]/[0.12] flex items-center justify-center border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20 transition-colors duration-200">
          <Play className="w-4 h-4 text-[var(--color-primary)] fill-[var(--color-primary)]" />
        </div>
      </motion.div>
    </Link>
  );
}
