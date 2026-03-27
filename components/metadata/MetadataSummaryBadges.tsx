"use client";

import type { AdminSeriesItem } from "@/types/api";

interface MetadataSummaryBadgesProps {
  series: Pick<AdminSeriesItem, "workType" | "metadata">;
  compact?: boolean;
}

export function MetadataSummaryBadges({
  series,
  compact = false,
}: MetadataSummaryBadgesProps) {
  const badges: Array<{
    label: string;
    className: string;
  }> = [];

  if (series.workType || series.metadata?.workType) {
    badges.push({
      label: (series.metadata?.workType || series.workType || "other").replaceAll(
        "_",
        " ",
      ),
      className:
        "border-sky-500/20 bg-sky-500/10 text-sky-200",
    });
  }

  if (series.metadata?.confidenceLabel) {
    const confidenceMap = {
      high: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
      medium: "border-amber-500/20 bg-amber-500/10 text-amber-200",
      low: "border-rose-500/20 bg-rose-500/10 text-rose-200",
    } as const;

    badges.push({
      label: `confiança ${series.metadata.confidenceLabel}`,
      className: confidenceMap[series.metadata.confidenceLabel],
    });
  }

  if (series.metadata?.reviewRequired) {
    badges.push({
      label: "revisão pendente",
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-200",
    });
  } else if (series.metadata) {
    badges.push({
      label: "revisado",
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    });
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-2" : "mt-3"}`}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${badge.className}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
