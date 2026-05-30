"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { CardSkeleton } from "./Skeletons";

export interface SectionHeaderProps {
  title: string;
  badge?: ReactNode;
  link?: string;
  description?: string;
  variant?: "standard" | "hq";
}

export function SectionHeader({
  title,
  badge,
  link,
  description,
  variant = "standard",
}: SectionHeaderProps) {
  return (
    <div className="mb-4 px-4">
      <div className="flex items-center gap-3">
        {variant === "standard" ? (
          <div className="w-1 h-6 rounded-full shrink-0 bg-[var(--color-primary)]" />
        ) : (
          <div className="border-l-2 border-white/20 pl-3 flex items-center">
            {/* hq variant: no red bar, uses subtle left border */}
          </div>
        )}
        <h2 className="text-base font-black text-textMain uppercase tracking-wide leading-none">
          {title}
        </h2>
        {badge}
        {link ? (
          <Link
            href={link}
            className="ml-auto text-[11px] font-semibold text-[var(--color-primary)] flex items-center gap-1 shrink-0"
          >
            Ver mais <ChevronRight className="w-3 h-3" />
          </Link>
        ) : null}
      </div>
      {description ? (
        <p className="mt-2 max-w-2xl text-xs leading-5 text-textDim">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function SectionRow({
  items,
  loading,
  renderCard,
}: {
  items: Array<{
    id: string;
    title: string;
    coverUrl?: string | null;
    rating?: number | null;
  }>;
  loading: boolean;
  renderCard: (item: any) => ReactNode;
}) {
  if (loading) {
    return (
      <HorizontalScroll>
        {[1, 2, 3, 4, 5].map((index) => (
          <CardSkeleton key={index} />
        ))}
      </HorizontalScroll>
    );
  }
  return (
    <HorizontalScroll>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          className="w-32 shrink-0 snap-start"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3, ease: "easeOut", delay: i * 0.04 }}
        >
          {renderCard(item)}
        </motion.div>
      ))}
    </HorizontalScroll>
  );
}
