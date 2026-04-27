"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { UserBadgeResponse } from "@/types/api";

// Badge size variants
export type BadgeSize = "sm" | "md" | "lg";

interface UserBadgeProps {
  badge: UserBadgeResponse;
  size?: BadgeSize;
  className?: string;
}

// Map icon identifiers to SVG paths / lucide-compatible shapes
function BadgeIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const base = cn("shrink-0", className);

  switch (icon) {
    case "crown":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M2 18l2-10 4 4 4-8 4 8 4-4 2 10H2z" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11zm0 16a4 4 0 01-4-4c0-2.5 2-4 4-7 2 3 4 4.5 4 7a4 4 0 01-4 4z" />
        </svg>
      );
    case "zap":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case "shield":
    case "shield-check":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      );
    case "book-open":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={base} aria-hidden>
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
      );
    case "check-circle":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={base} aria-hidden>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "message-circle":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={base} aria-hidden>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

const SIZE_CLASSES: Record<BadgeSize, { container: string; icon: string; text: string; pill: string }> = {
  sm: {
    container: "gap-1 px-1.5 py-0.5 rounded-md",
    icon: "h-2.5 w-2.5",
    text: "text-[10px] font-semibold",
    pill: "inline-flex items-center",
  },
  md: {
    container: "gap-1.5 px-2.5 py-1 rounded-lg",
    icon: "h-3.5 w-3.5",
    text: "text-xs font-semibold",
    pill: "inline-flex items-center",
  },
  lg: {
    container: "gap-2 px-3.5 py-1.5 rounded-xl",
    icon: "h-4 w-4",
    text: "text-sm font-bold",
    pill: "inline-flex items-center",
  },
};

function formatBadgeLabel(badge: UserBadgeResponse): string {
  if (badge.type === "FOUNDER" && badge.founderNumber != null) {
    return `Fundador #${String(badge.founderNumber).padStart(3, "0")}`;
  }
  return badge.name;
}

export function UserBadge({ badge, size = "md", className }: UserBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const sizes = SIZE_CLASSES[size];
  const label = formatBadgeLabel(badge);

  return (
    <div className="relative inline-block">
      <span
        className={cn(
          sizes.pill,
          sizes.container,
          "border border-white/10 font-medium text-white shadow-sm transition-opacity hover:opacity-90",
          className,
        )}
        style={{ backgroundColor: `${badge.color}22`, borderColor: `${badge.color}44`, color: badge.color }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="img"
        aria-label={`Badge: ${label}`}
      >
        <BadgeIcon icon={badge.icon} className={sizes.icon} />
        <span className={sizes.text}>{label}</span>
      </span>

      {showTooltip && size !== "sm" && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-48 -translate-x-1/2 rounded-xl border border-white/10 bg-surface px-3 py-2 shadow-xl"
          role="tooltip"
        >
          <p className="text-xs font-semibold text-textMain">{label}</p>
          <p className="mt-0.5 text-[10px] leading-4 text-textDim">
            {badge.description}
          </p>
        </div>
      )}
    </div>
  );
}

interface BadgeListProps {
  badges: UserBadgeResponse[];
  size?: BadgeSize;
  max?: number;
  className?: string;
}

// Priority order for badge display (highest priority first)
const BADGE_PRIORITY: Record<string, number> = {
  FOUNDER: 0,
  ADMIN_STAFF: 1,
  MODERATOR: 2,
  CREATOR: 3,
  VERIFIED_CREATOR: 4,
  LEGENDARY_READER: 5,
  STREAK_MASTER: 6,
  TOP_READER: 7,
  COLLECTOR: 8,
  PREMIUM_MEMBER: 9,
  COMMUNITY_CONTRIBUTOR: 10,
  EARLY_SUPPORTER: 11,
};

function sortBadgesByPriority(badges: UserBadgeResponse[]): UserBadgeResponse[] {
  return [...badges].sort((a, b) => {
    const pa = BADGE_PRIORITY[a.type] ?? 99;
    const pb = BADGE_PRIORITY[b.type] ?? 99;
    return pa - pb;
  });
}

/**
 * Returns the single most important badge for inline display (e.g., next to username in comments).
 */
export function getPrimaryBadge(badges: UserBadgeResponse[]): UserBadgeResponse | null {
  if (badges.length === 0) return null;
  return sortBadgesByPriority(badges)[0] ?? null;
}

/**
 * Renders a list of badges in priority order with optional max cap.
 */
export function BadgeList({ badges, size = "md", max, className }: BadgeListProps) {
  const sorted = sortBadgesByPriority(badges);
  const visible = max != null ? sorted.slice(0, max) : sorted;

  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((badge) => (
        <UserBadge key={badge.id} badge={badge} size={size} />
      ))}
    </div>
  );
}
