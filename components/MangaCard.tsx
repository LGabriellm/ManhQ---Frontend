"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
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
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative group cursor-pointer",
          variant === "portrait" ? "w-full" : "flex gap-3",
          className,
        )}
      >
        {/* Cover Image */}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl bg-surface shadow-md group-hover:shadow-xl transition-shadow duration-300",
            variant === "portrait" ? "aspect-2/3" : "w-24 h-32 shrink-0",
          )}
        >
          <AuthCover
            coverUrl={coverUrl}
            alt={title}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badge "Novo" */}
          {isNew && (
            <div className="absolute top-2 left-2 bg-primary px-2.5 py-1 rounded-lg shadow-lg">
              <span className="text-xs font-bold text-white">NOVO</span>
            </div>
          )}

          {/* Rating */}
          {rating && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-white">{rating}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div
          className={cn(
            variant === "portrait"
              ? "mt-2"
              : "flex-1 flex flex-col justify-center",
          )}
        >
          <h3
            className={cn(
              "font-semibold text-textMain line-clamp-2 group-hover:text-primary transition-colors duration-200",
              variant === "portrait" ? "text-sm" : "text-base",
            )}
          >
            {title}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}
