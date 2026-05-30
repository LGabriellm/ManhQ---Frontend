"use client";

import React from "react";
import { motion } from "framer-motion";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { getPublicCoverUrl } from "@/lib/coverUrl";
import { SectionHeader } from "./Shared";
import { ContinueSkeleton } from "./Skeletons";

interface ContinueReadingSectionProps {
  items: any[];
  loading: boolean;
}

function ContinueReadingSection({ items, loading }: ContinueReadingSectionProps) {
  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <SectionHeader title="Continuar Lendo" />
      {loading ? (
        <div className="space-y-2.5 px-4">
          <ContinueSkeleton />
          <ContinueSkeleton />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
          {items.map((item) => (
            <div key={item.progressId ?? item.mediaId} className="shrink-0 w-72">
              <ContinueReadingCard
                seriesId={item.seriesId}
                mediaId={item.mediaId}
                title={item.seriesTitle}
                coverUrl={getPublicCoverUrl(item.seriesId, item.coverUrl)}
                chapterTitle={item.mediaTitle}
                currentPage={item.page}
                totalPages={item.pageCount}
                percent={item.percent}
              />
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

export default React.memo(ContinueReadingSection);
