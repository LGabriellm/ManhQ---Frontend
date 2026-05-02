"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAchievements } from "@/hooks/useApi";
import {
  CheckCircle2,
  BookOpen,
  Flame,
  Trophy,
  MessageCircle,
  Zap,
  Archive,
  Heart,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type {
  AchievementProgress,
  AchievementRarity,
  AchievementCategory,
} from "@/types/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<AchievementCategory | "all", string> = {
  all: "Todos",
  reader: "Leitor",
  streak: "Sequência",
  collection: "Coleção",
  community: "Comunidade",
  supporter: "Apoiador",
};

const CATEGORY_ICONS: Record<AchievementCategory, React.ElementType> = {
  reader: BookOpen,
  streak: Flame,
  collection: Archive,
  community: MessageCircle,
  supporter: Heart,
};

const RARITY_STYLES: Record<
  AchievementRarity,
  { locked: string; unlocked: string; glow: string; label: string; labelColor: string }
> = {
  common: {
    locked: "border-white/10",
    unlocked: "border-white/25",
    glow: "shadow-white/10",
    label: "Comum",
    labelColor: "text-white/50",
  },
  rare: {
    locked: "border-blue-500/30",
    unlocked: "border-blue-500/60",
    glow: "shadow-blue-500/20",
    label: "Raro",
    labelColor: "text-blue-400",
  },
  epic: {
    locked: "border-purple-500/30",
    unlocked: "border-purple-500/60",
    glow: "shadow-purple-500/20",
    label: "Épico",
    labelColor: "text-purple-400",
  },
  legendary: {
    locked: "border-amber-400/40",
    unlocked: "border-amber-400/80",
    glow: "shadow-amber-400/30",
    label: "Lendário",
    labelColor: "text-amber-400",
  },
};

const REQUIREMENT_ICON_MAP: Record<string, React.ElementType> = {
  chapters_read: BookOpen,
  longest_streak: Flame,
  series_completed: Trophy,
  comments_posted: MessageCircle,
  subscription_active: Zap,
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/5 bg-[var(--color-surface)] p-4"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-lg bg-white/5" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Achievement Card ─────────────────────────────────────────────────────────

function AchievementCard({
  achievement,
  index,
}: {
  achievement: AchievementProgress;
  index: number;
}) {
  const rarity = RARITY_STYLES[achievement.rarity];
  const RequirementIcon = REQUIREMENT_ICON_MAP[achievement.requirement.type] ?? Trophy;
  const isNewlyAwarded = achievement.completed && achievement.newlyAwarded;
  const hasProgress =
    !achievement.completed && achievement.progress > 0;
  const progressPercent = Math.min(
    100,
    Math.round((achievement.progress / achievement.requirement.threshold) * 100),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.04 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all duration-200",
        achievement.completed
          ? cn(rarity.unlocked, "shadow-lg", rarity.glow)
          : rarity.locked,
        isNewlyAwarded && "animate-pulse",
        achievement.completed ? "bg-[#1a1a1a]" : "bg-[var(--color-surface)]",
      )}
    >
      {/* Newly awarded shimmer overlay */}
      {isNewlyAwarded && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/5 via-transparent to-amber-400/5" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon area */}
        <div
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border",
            achievement.completed
              ? cn(rarity.unlocked, "bg-white/5")
              : "border-white/8 bg-white/3",
          )}
        >
          {achievement.completed ? (
            React.createElement(RequirementIcon, {
              className: cn(
                "h-5 w-5",
                achievement.rarity === "legendary" && "text-amber-400",
                achievement.rarity === "epic" && "text-purple-400",
                achievement.rarity === "rare" && "text-blue-400",
                achievement.rarity === "common" && "text-white/60",
              ),
            })
          ) : (
            <span className="animate-pulse text-lg font-bold text-white/20">
              ?
            </span>
          )}

          {/* Completion checkmark */}
          {achievement.completed && (
            <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-surface)] ring-1 ring-[var(--color-surface)]">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-sm font-semibold leading-tight",
                achievement.completed
                  ? "text-[var(--color-textMain)]"
                  : "text-[var(--color-textDim)]",
              )}
            >
              {achievement.name}
            </h3>

            {/* Rarity badge */}
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                rarity.labelColor,
                "bg-white/5",
              )}
            >
              {rarity.label}
            </span>
          </div>

          <p
            className={cn(
              "mt-0.5 text-xs leading-relaxed",
              achievement.completed
                ? "text-[var(--color-textDim)]"
                : "text-[var(--color-textDim)]/60",
            )}
          >
            {achievement.description}
          </p>

          {/* Completed state */}
          {achievement.completed && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Conquistado
              </span>
              {isNewlyAwarded && (
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                  Novo!
                </span>
              )}
              {achievement.badgeType && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[var(--color-textDim)]">
                  Badge desbloqueado
                </span>
              )}
            </div>
          )}

          {/* Progress bar (locked with progress) */}
          {hasProgress && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--color-textDim)]/60 tabular-nums">
                  {achievement.progress.toLocaleString("pt-BR")} /{" "}
                  {achievement.requirement.threshold.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-textDim)]/60 tabular-nums">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.6, delay: index * 0.04 + 0.2 }}
                  className={cn(
                    "h-full rounded-full",
                    achievement.rarity === "legendary" && "bg-amber-400/60",
                    achievement.rarity === "epic" && "bg-purple-500/60",
                    achievement.rarity === "rare" && "bg-blue-500/60",
                    achievement.rarity === "common" && "bg-white/20",
                  )}
                />
              </div>
            </div>
          )}

          {/* No progress hint */}
          {!achievement.completed && !hasProgress && (
            <p className="mt-1.5 text-[10px] text-[var(--color-textDim)]/40">
              {achievement.requirement.threshold.toLocaleString("pt-BR")}{" "}
              necessário
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Category Tab ─────────────────────────────────────────────────────────────

function CategoryTab({
  category,
  active,
  count,
  completed,
  onClick,
}: {
  category: AchievementCategory | "all";
  active: boolean;
  count: number;
  completed: number;
  onClick: () => void;
}) {
  const Icon = category !== "all" ? CATEGORY_ICONS[category] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150",
        active
          ? "bg-[var(--color-primary)] text-white shadow-sm"
          : "bg-white/5 text-[var(--color-textDim)] hover:bg-white/8 hover:text-[var(--color-textMain)]",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {CATEGORY_LABELS[category]}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          active ? "bg-white/20 text-white" : "bg-white/8 text-[var(--color-textDim)]",
        )}
      >
        {completed}/{count}
      </span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const { data, isLoading } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<
    AchievementCategory | "all"
  >("all");

  const achievements = data?.achievements ?? [];
  const summary = data?.summary;

  const completionPercent =
    summary && summary.total > 0
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

  const categories: (AchievementCategory | "all")[] = [
    "all",
    "reader",
    "streak",
    "collection",
    "community",
    "supporter",
  ];

  function getCategoryCount(cat: AchievementCategory | "all") {
    if (cat === "all") return achievements.length;
    return achievements.filter((a) => a.category === cat).length;
  }

  function getCategoryCompleted(cat: AchievementCategory | "all") {
    if (cat === "all") return summary?.completed ?? 0;
    return achievements.filter(
      (a) => a.category === cat && a.completed,
    ).length;
  }

  const filtered =
    activeCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  // Sort: newly awarded first, then completed, then by progress desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.newlyAwarded && !b.newlyAwarded) return -1;
    if (!a.newlyAwarded && b.newlyAwarded) return 1;
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return b.progress - a.progress;
  });

  return (
    <main className="page-shell space-y-6">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-[var(--color-textDim)] transition-colors hover:bg-white/10 hover:text-[var(--color-textMain)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="section-kicker">Perfil</p>
            <h1 className="section-title">Conquistas</h1>
          </div>
        </div>

        {/* Overall progress */}
        <div className="surface-panel rounded-[26px] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tabular-nums text-[var(--color-textMain)]">
                {summary?.completed ?? 0}
                <span className="text-base font-normal text-[var(--color-textDim)]">
                  {" "}
                  / {summary?.total ?? 0}
                </span>
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-textDim)]">
                conquistas desbloqueadas
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-[var(--color-primary)]">
                {completionPercent}%
              </p>
              <p className="text-xs text-[var(--color-textDim)]">completo</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-amber-500"
            />
          </div>

          {summary && summary.newlyAwarded.length > 0 && (
            <p className="mt-3 text-xs text-amber-400">
              {summary.newlyAwarded.length} nova(s) conquista(s) desbloqueada(s)!
            </p>
          )}
        </div>
      </header>

      {/* Category tabs */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <CategoryTab
            key={cat}
            category={cat}
            active={activeCategory === cat}
            count={getCategoryCount(cat)}
            completed={getCategoryCompleted(cat)}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Achievement grid */}
      {isLoading ? (
        <AchievementSkeleton />
      ) : sorted.length === 0 ? (
        <div className="surface-panel rounded-[26px] p-8 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-[var(--color-textDim)]/30" />
          <p className="font-semibold text-[var(--color-textMain)]">
            Nenhuma conquista nesta categoria
          </p>
          <p className="mt-1 text-sm text-[var(--color-textDim)]">
            Continue lendo para desbloquear conquistas.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sorted.map((achievement, index) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                index={index}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </main>
  );
}
