"use client";

import type { AdminSeriesItem } from "@/types/api";

function confidenceColor(label: "low" | "medium" | "high"): string {
  switch (label) {
    case "high":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
    case "medium":
      return "text-amber-300 bg-amber-500/10 border-amber-500/20";
    default:
      return "text-rose-300 bg-rose-500/10 border-rose-500/20";
  }
}

export function MetadataSummaryBadges({
  series,
  compact = false,
}: {
  series: AdminSeriesItem;
  compact?: boolean;
}) {
  const meta = series.metadata;
  if (!meta) return null;

  const badgeClass = compact
    ? "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px]"
    : "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";

  return (
    <div className="flex flex-wrap gap-1">
      {meta.workType && (
        <span
          className={`${badgeClass} bg-white/5 text-[var(--color-textDim)] border-white/10`}
        >
          {meta.workType}
        </span>
      )}

      <span
        className={`${badgeClass} border ${confidenceColor(meta.confidenceLabel)}`}
      >
        {Math.round(meta.confidence)}%
      </span>

      {meta.reviewRequired && (
        <span
          className={`${badgeClass} border bg-amber-500/10 text-amber-300 border-amber-500/20`}
        >
          Revisão
        </span>
      )}

      {!compact && meta.canonicalGenres.length > 0 && (
        <>
          {meta.canonicalGenres.slice(0, 3).map((g) => (
            <span
              key={g}
              className={`${badgeClass} bg-white/5 text-[var(--color-textDim)] border-white/10`}
            >
              {g}
            </span>
          ))}
          {meta.canonicalGenres.length > 3 && (
            <span
              className={`${badgeClass} bg-white/5 text-[var(--color-textDim)] border-white/10`}
            >
              +{meta.canonicalGenres.length - 3}
            </span>
          )}
        </>
      )}

      {!compact && meta.metadataSources.length > 0 && (
        <span
          className={`${badgeClass} bg-sky-500/10 text-sky-300 border-sky-500/20`}
        >
          {meta.metadataSources.length} fonte
          {meta.metadataSources.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
