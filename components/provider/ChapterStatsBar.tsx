"use client";

import type { ProviderTitle } from "@/types/api";

interface ChapterStatsBarProps {
  title: ProviderTitle;
  compact?: boolean;
}

export function ChapterStatsBar({ title: t, compact }: ChapterStatsBarProps) {
  const total = t.chaptersAvailable || t._count?.chapters || 0;
  const imported = t.chaptersImported;
  const failed = t.chapterStats?.failed ?? 0;
  const pending = t.chapterStats?.pending ?? 0;
  const downloading = t.chapterStats?.downloading ?? 0;

  if (compact) {
    return (
      <span>
        {imported}/{total} cap.
        {failed > 0 && (
          <span className="text-red-400 ml-1">({failed} falhos)</span>
        )}
      </span>
    );
  }

  const pct = total > 0 ? Math.round((imported / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[var(--color-textDim)]">
        <span>
          {imported}/{total}
        </span>
        <span className="text-[10px]">({pct}%)</span>
      </div>
      {total > 0 && (
        <div className="h-1 w-20 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {(failed > 0 || downloading > 0 || pending > 0) && (
        <div className="flex items-center gap-2 text-[10px]">
          {failed > 0 && <span className="text-red-400">{failed} falhos</span>}
          {downloading > 0 && (
            <span className="text-yellow-400">{downloading} baixando</span>
          )}
          {pending > 0 && (
            <span className="text-slate-400">{pending} pendentes</span>
          )}
        </div>
      )}
    </div>
  );
}
