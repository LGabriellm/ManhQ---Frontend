"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AuthCover } from "./AuthCover";

interface MangaCardProps {
  id: string;
  title: string;
  coverUrl: string;
  rating?: number;
  isNew?: boolean;
  variant?: "portrait" | "landscape";
  className?: string;
}

export function MangaCard({
  id,
  title,
  coverUrl,
  rating,
  isNew,
  variant = "portrait",
  className,
}: MangaCardProps) {
  if (variant === "landscape") {
    return (
      <Link href={`/serie/${id}`}>
        <motion.div
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "flex gap-3 cursor-pointer group",
            className,
          )}
        >
          <div className="w-24 h-32 shrink-0 relative overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-white/5 shadow-lg shadow-black/40">
            <AuthCover
              coverUrl={coverUrl}
              alt={title}
              className="object-cover transition-transform duration-400 group-hover:scale-105"
            />
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <h3 className="text-xs font-semibold text-[var(--color-textMain)] line-clamp-2 group-hover:text-white transition-colors duration-200">
              {title}
            </h3>
            {rating != null && rating > 0 && (
              <p className="text-[10px] text-[var(--color-textDim)] mt-1 tabular-nums">
                ★ {rating}
              </p>
            )}
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/serie/${id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative w-full cursor-pointer group aspect-[2/3] overflow-hidden rounded-xl",
          "ring-1 ring-white/5 hover:ring-white/[0.12] transition-[box-shadow,ring-color] duration-300",
          "shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-black/60",
          className,
        )}
      >
        {/* Cover image — scales on hover */}
        <motion.div
          className="absolute inset-0"
          whileHover={{ scale: 1.07 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <AuthCover
            coverUrl={coverUrl}
            alt={title}
            className="object-cover"
          />
        </motion.div>

        {/* Gradient overlay — bottom 60% */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent group-hover:from-black/95 transition-all duration-300" />

        {/* NOVO badge — top-left, flush to left edge */}
        {isNew && (
          <div className="absolute top-2 left-0 bg-[var(--color-primary)] px-2 py-0.5 rounded-r-md z-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-white">
              NOVO
            </span>
          </div>
        )}

        {/* Rating badge — top-right */}
        {rating != null && rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-white/10 z-10">
            <span className="text-[10px] text-yellow-400 leading-none">★</span>
            <span className="text-[10px] font-bold text-white leading-none tabular-nums">
              {rating}
            </span>
          </div>
        )}

        {/* Title — inside card, bottom-left */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 z-10">
          <h3 className="text-[13px] font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
            {title}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}
