"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuthCover } from "@/components/AuthCover";
import { getPublicCoverUrl } from "@/lib/coverUrl";
import type { Series } from "@/types/api";

function FeaturedSection({ featured }: { featured: Series }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Link href={`/serie/${featured.id}`} className="block">
        <div className="relative h-72 w-full overflow-hidden">
          {/* Cover image */}
          <div className="absolute inset-0">
            <AuthCover
              coverUrl={getPublicCoverUrl(featured.id, featured.coverUrl)}
              alt={featured.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>

          {/* Gradient: top fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />
          {/* Gradient: bottom strong fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          {/* Gradient: left tint */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />

          {/* Top-right badge */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white bg-[var(--color-primary)] px-2.5 py-1 rounded-full">
              ● Em Destaque
            </span>
          </div>

          {/* Bottom-left content */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
            <h2 className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg">
              {featured.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-3">
              {featured.rating != null && featured.rating > 0 ? (
                <span className="text-[12px] font-semibold text-white/60 flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  {featured.rating.toFixed(1)}
                </span>
              ) : null}
              {featured.genres && featured.genres.length > 0 ? (
                <span className="text-[11px] text-white/40 font-medium">
                  {featured.genres.slice(0, 2).join(" · ")}
                </span>
              ) : null}
            </div>

            {/* CTA buttons */}
            <div className="mt-3.5 flex items-center gap-2.5">
              <span className="bg-white text-black font-black text-sm px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors">
                Começar a ler
              </span>
              <span className="border border-white/30 text-white font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-white/5 transition-colors">
                + Biblioteca
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default React.memo(FeaturedSection);
