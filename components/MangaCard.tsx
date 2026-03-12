"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, BookOpen } from "lucide-react";
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
  return (
    <Link href={`/serie/${id}`}>
      <motion.div
        whileTap={{ scale: 0.96 }}
        className={cn(
          "relative group cursor-pointer",
          variant === "portrait" ? "w-full" : "flex gap-3",
          className,
        )}
      >
        {/* Cover Image */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-surface ring-1 ring-white/5 shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:ring-white/10 transition-all duration-300",
            variant === "portrait" ? "aspect-2/3" : "w-24 h-32 shrink-0",
          )}
        >
          <AuthCover
            coverUrl={coverUrl}
            alt={title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Overlay gradiente sutil */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

          {/* Badge "Novo" */}
          {isNew && (
            <div className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm px-2 py-0.5 rounded-lg shadow-lg">
              <span className="text-[10px] font-bold text-white tracking-wide">
                NOVO
              </span>
            </div>
          )}

          {/* Rating */}
          {rating != null && rating > 0 && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 ring-1 ring-white/10">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-semibold text-white">
                {rating}
              </span>
            </div>
          )}

          {/* Bottom info overlay */}
          {variant === "portrait" && (
            <div className="absolute bottom-0 inset-x-0 p-2.5 pt-8">
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <BookOpen className="w-3 h-3 text-white/70" />
                <span className="text-[10px] text-white/70 font-medium">
                  Ver detalhes
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div
          className={cn(
            variant === "portrait"
              ? "mt-2 px-0.5"
              : "flex-1 flex flex-col justify-center",
          )}
        >
          <h3
            className={cn(
              "font-semibold text-textMain line-clamp-2 group-hover:text-white transition-colors duration-200",
              variant === "portrait"
                ? "text-[13px] leading-tight"
                : "text-base",
            )}
          >
            {title}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}
