"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * ProgressBar — Simple progress bar with optional label.
 * ───────────────────────────────────────────────────────────────────────────── */

interface ProgressBarProps {
  percent: number;
  label?: string;
  className?: string;
}

export function ProgressBar({
  percent,
  label,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-textDim)]">
          <span>{label}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          role="progressbar"
          aria-valuenow={Math.round(clamped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ?? "Progresso"}
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
