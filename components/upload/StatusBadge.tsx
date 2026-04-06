"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * StatusBadge — Tone-colored badge for workflow/item states.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { ToneColor } from "@/types/upload";
import { TONE_CLASSES } from "@/types/upload";

interface StatusBadgeProps {
  label: string;
  tone: ToneColor;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({
  label,
  tone,
  pulse,
  className = "",
}: StatusBadgeProps) {
  const styles = TONE_CLASSES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${styles.dot} ${pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
