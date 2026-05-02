"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  BookOpen,
  FileText,
  Clock,
  Flame,
  Crown,
  WifiOff,
  Medal,
} from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/community/UserAvatar";
import { useRanking, useMyRank } from "@/hooks/useRanking";
import { useAuth } from "@/contexts/AuthContext";
import type { RankMetric, RankedUser } from "@/types/api";
import { cn } from "@/lib/utils";

// ─── Metric config ────────────────────────────────────────────────────────────

interface MetricConfig {
  key: RankMetric;
  label: string;
  icon: React.ElementType;
  color: string;
  formatValue: (v: number) => string;
  unit: string;
}

const METRICS: MetricConfig[] = [
  {
    key: "chapters",
    label: "Capítulos",
    icon: BookOpen,
    color: "text-primary",
    formatValue: (v) => v.toLocaleString("pt-BR"),
    unit: "caps",
  },
  {
    key: "pages",
    label: "Páginas",
    icon: FileText,
    color: "text-blue-400",
    formatValue: (v) => v.toLocaleString("pt-BR"),
    unit: "pgs",
  },
  {
    key: "time",
    label: "Tempo",
    icon: Clock,
    color: "text-emerald-400",
    formatValue: (v) => {
      const h = Math.floor(v / 3600);
      const m = Math.floor((v % 3600) / 60);
      if (h === 0) return `${m}m`;
      return `${h}h${m > 0 ? ` ${m}m` : ""}`;
    },
    unit: "lendo",
  },
  {
    key: "activity",
    label: "Atividade",
    icon: Flame,
    color: "text-orange-400",
    formatValue: (v) => v.toLocaleString("pt-BR"),
    unit: "dias",
  },
];

// ─── Reader level ─────────────────────────────────────────────────────────────

function readerLevel(value: number, metric: RankMetric) {
  if (metric !== "chapters") return null;
  if (value >= 500) return { label: "Lenda", color: "text-yellow-400" };
  if (value >= 200) return { label: "Mestre", color: "text-purple-400" };
  if (value >= 100) return { label: "Veterano", color: "text-blue-400" };
  if (value >= 50)  return { label: "Experiente", color: "text-emerald-400" };
  if (value >= 10)  return { label: "Iniciante", color: "text-textDim" };
  return null;
}

// ─── Medal colours ────────────────────────────────────────────────────────────

const MEDAL: Record<number, { emoji: string; ring: string; text: string; bg: string; border: string }> = {
  1: { emoji: "🥇", ring: "ring-yellow-400/50",  text: "text-yellow-400",  bg: "bg-yellow-500/12",  border: "border-yellow-500/25" },
  2: { emoji: "🥈", ring: "ring-slate-300/40",   text: "text-slate-300",   bg: "bg-slate-300/8",    border: "border-slate-300/20"  },
  3: { emoji: "🥉", ring: "ring-orange-400/40",  text: "text-orange-400",  bg: "bg-orange-400/8",   border: "border-orange-400/20" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FounderChip({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
      <Crown className="h-2.5 w-2.5" />
      {number === 0 ? "#000" : `#${String(number).padStart(3, "0")}`}
    </span>
  );
}

function ShowcaseAvatar({ name, color }: { name: string | null; color?: string }) {
  const letter = (name ?? "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm font-bold text-white/90"
      style={{
        backgroundColor: color ? `${color}22` : "#ffffff11",
        borderColor: color ? `${color}33` : undefined,
      }}
    >
      <span style={{ color: color ?? "#a3a3a3" }}>{letter}</span>
    </div>
  );
}

// ─── Podium (top 3) ───────────────────────────────────────────────────────────

// Visual order: 2nd (left) | 1st (center) | 3rd (right)
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHTS = ["h-14", "h-20", "h-10"];
const PODIUM_AVATAR_SIZE = ["h-11 w-11", "h-14 w-14", "h-10 w-10"];
const PODIUM_DELAY = [0.1, 0.2, 0.3];

function Podium({
  users,
  metric,
  myUserId,
}: {
  users: RankedUser[];
  metric: MetricConfig;
  myUserId?: string;
}) {
  const top3 = users.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="px-4 pb-3 pt-4">
      <div className="flex items-end justify-center gap-2">
        {PODIUM_ORDER.map((srcIdx, displayIdx) => {
          const user = top3[srcIdx];
          if (!user) return <div key={displayIdx} className="flex-1" />;

          const pos = user.rank;
          const medal = MEDAL[pos] ?? MEDAL[3];
          const isShowcase = user.isShowcase === true;
          const isMe = user.userId === myUserId;

          return (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: PODIUM_DELAY[displayIdx],
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              {/* Crown above #1 */}
              {pos === 1 && (
                <Crown className="mb-0.5 h-4 w-4 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.9)]" />
              )}
              {pos !== 1 && <div className="mb-0.5 h-4" />}

              {/* Avatar */}
              <div className="relative">
                {isShowcase ? (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full border text-sm font-bold text-white/90",
                      PODIUM_AVATAR_SIZE[displayIdx],
                    )}
                    style={{
                      backgroundColor: user.showcaseColor
                        ? `${user.showcaseColor}22`
                        : "#ffffff11",
                      borderColor: user.showcaseColor
                        ? `${user.showcaseColor}33`
                        : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <span style={{ color: user.showcaseColor ?? "#a3a3a3" }}>
                      {(user.name ?? "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                ) : (
                  <UserAvatar
                    userId={user.userId}
                    name={user.name || undefined}
                    className={cn(
                      "rounded-full ring-2",
                      PODIUM_AVATAR_SIZE[displayIdx],
                      medal.ring,
                    )}
                  />
                )}
                {isMe && (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                )}
              </div>

              {/* Name + value */}
              <div className="flex w-full flex-col items-center gap-0.5 px-1">
                <p
                  className={cn(
                    "max-w-full truncate text-center text-[11px] font-bold leading-tight",
                    isMe ? "text-primary" : medal.text,
                  )}
                >
                  {user.name || user.username || "Leitor"}
                </p>
                {user.founderNumber !== null && !isShowcase && (
                  <FounderChip number={user.founderNumber} />
                )}
                <p className="tabular-nums text-[10px] text-primary font-bold">
                  {metric.formatValue(user.value)}
                  <span className="text-textDim/40 font-normal ml-0.5">
                    {metric.unit}
                  </span>
                </p>
              </div>

              {/* Podium block */}
              <div
                className={cn(
                  "w-full rounded-t-xl border-x border-t flex items-start justify-center pt-2",
                  PODIUM_HEIGHTS[displayIdx],
                  medal.bg,
                  medal.border,
                )}
              >
                <span className={cn("text-xs font-black", medal.text)}>
                  #{pos}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Rank row (rank 4+) ───────────────────────────────────────────────────────

function RankRow({
  user,
  metric,
  isMe,
  index,
}: {
  user: RankedUser;
  metric: MetricConfig;
  isMe: boolean;
  index: number;
}) {
  const level = readerLevel(user.value, metric.key);
  const isShowcase = user.isShowcase === true;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] transition-colors",
        isShowcase
          ? "opacity-60"
          : isMe
            ? "bg-[var(--color-primary)]/5 border-l-2 border-l-[var(--color-primary)]"
            : "hover:bg-white/[0.02]",
      )}
    >
      {/* Rank number */}
      <span className="w-8 shrink-0 text-right text-sm font-black tabular-nums text-textDim/40">
        {user.rank}
      </span>

      {/* Avatar */}
      {isShowcase ? (
        <ShowcaseAvatar name={user.name} color={user.showcaseColor} />
      ) : (
        <UserAvatar
          userId={user.userId}
          name={user.name || undefined}
          className="h-8 w-8 shrink-0 rounded-full"
        />
      )}

      {/* Name + badges */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              isShowcase
                ? "text-textDim/65"
                : isMe
                  ? "text-primary"
                  : "text-textMain",
            )}
          >
            {user.name || user.username || "Leitor"}
          </p>
          {isMe && !isShowcase && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary/80">
              Você
            </span>
          )}
          {user.founderNumber !== null && !isShowcase && (
            <FounderChip number={user.founderNumber} />
          )}
        </div>
        {!isShowcase && (
          <div className="mt-0.5 flex items-center gap-1.5">
            {user.username && (
              <p className="truncate text-[11px] text-textDim/55">
                @{user.username}
              </p>
            )}
            {level && (
              <span className={cn("text-[10px] font-medium", level.color)}>
                {user.username ? "· " : ""}
                {level.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-sm font-bold tabular-nums",
            isShowcase
              ? "text-textDim/45"
              : isMe
                ? "text-primary"
                : "text-textMain",
          )}
        >
          {metric.formatValue(user.value)}
        </p>
        <p className="text-[10px] text-textDim/45">{metric.unit}</p>
      </div>
    </motion.div>
  );
}

// ─── My rank card ─────────────────────────────────────────────────────────────

function MyRankCard({ metric }: { metric: MetricConfig }) {
  const { data, isLoading } = useMyRank(metric.key);

  if (isLoading) {
    return (
      <div className="mx-4 h-[84px] animate-pulse rounded-2xl bg-surface/40" />
    );
  }

  if (!data?.position) return null;

  const { rank, value, totalUsers } = data.position;
  const topPercent =
    totalUsers > 0 ? Math.round((rank / totalUsers) * 100) : 100;
  const level = readerLevel(value, metric.key);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-4 flex items-center gap-4 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-4 py-4"
    >
      {/* Rank number */}
      <div className="shrink-0">
        <p className="text-4xl font-black text-[var(--color-primary)] tabular-nums leading-none">
          <span className="text-xl font-black text-[var(--color-primary)]/60">#</span>
          {rank.toLocaleString("pt-BR")}
        </p>
        <p className="text-[10px] text-textDim/50 mt-0.5 font-medium">
          de {totalUsers.toLocaleString("pt-BR")}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-white/8 shrink-0" />

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-semibold text-textDim">Sua posição</p>
          {level && (
            <span className={cn("text-[10px] font-semibold", level.color)}>
              · {level.label}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-textMain mt-0.5 tabular-nums">
          {metric.formatValue(value)}{" "}
          <span className="text-xs font-normal text-textDim/60">
            {metric.unit}
          </span>
        </p>
      </div>

      {/* Percentile pill */}
      <div className="shrink-0">
        <div className="flex items-center justify-center rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/20 px-2.5 py-1.5">
          <p className="text-xs font-black text-[var(--color-primary)] tabular-nums">
            Top {topPercent}%
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* My rank card skeleton */}
      <div className="mx-4 h-[84px] animate-pulse rounded-2xl bg-surface/40" />

      {/* Metric bar skeleton */}
      <div className="mx-3 h-11 animate-pulse rounded-2xl bg-surface/40" />

      {/* Podium skeleton */}
      <div className="flex items-end justify-center gap-2 px-4 pb-2 pt-1">
        {[44, 56, 40].map((size, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="animate-pulse rounded-full bg-surface/60"
              style={{ width: size, height: size }}
            />
            <div className="h-2 w-12 animate-pulse rounded bg-surface/50" />
            <div
              className="w-full animate-pulse rounded-t-xl bg-surface/40"
              style={{ height: [56, 80, 40][i] }}
            />
          </div>
        ))}
      </div>

      {/* List row skeletons */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className="w-8 h-4 animate-pulse rounded bg-surface/40" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface/50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface/50" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface/40" />
          </div>
          <div className="h-3 w-10 animate-pulse rounded bg-surface/40" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const [activeMetric, setActiveMetric] = useState<RankMetric>("chapters");
  const { isAuthenticated, user } = useAuth();

  const metric = METRICS.find((m) => m.key === activeMetric)!;
  const { data, isLoading, error, refetch } = useRanking(activeMetric, 50, 0);

  const myUserId = user?.id;
  const allUsers = data?.users ?? [];
  const podiumUsers = allUsers.slice(0, 3);
  const listUsers = allUsers.slice(3);
  const hasShowcase = allUsers.some((u) => u.isShowcase);
  const realUserCount = allUsers.filter((u) => !u.isShowcase).length;

  return (
    <main className="min-h-screen pb-28">
      {/* Sticky header with metric selector */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-white/[0.04] safe-header">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h1 className="text-[14px] font-black text-textMain tracking-tight">
              Ranking
            </h1>
            {realUserCount > 0 && (
              <span className="text-[10px] text-textDim/40 font-medium">
                · {realUserCount}{" "}
                {realUserCount === 1 ? "leitor" : "leitores"}
              </span>
            )}
          </div>
          <p className="text-[10px] text-textDim/35 font-medium">
            atualizado a cada 2 min
          </p>
        </div>

        {/* Metric selector */}
        <div className="flex gap-1 p-3 pt-2">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const isActive = m.key === activeMetric;
            return (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200",
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-textDim/50 hover:text-textDim",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold leading-none">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 pt-4">
        {/* My rank card */}
        {isAuthenticated && <MyRankCard metric={metric} />}

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingSkeleton />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-4 rounded-2xl border border-white/8 bg-surface/60 p-6 text-center"
            >
              <WifiOff className="mx-auto mb-3 h-8 w-8 text-textDim/20" />
              <p className="text-base font-bold text-textMain">
                Erro ao carregar ranking
              </p>
              <p className="mt-1 text-sm text-textDim/60">
                Verifique sua conexão e tente novamente.
              </p>
              <button
                onClick={() => void refetch()}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                Tentar novamente
              </button>
            </motion.div>
          ) : allUsers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-4 rounded-2xl border border-dashed border-white/8 bg-surface/30 px-4 py-14 text-center"
            >
              <Trophy className="mx-auto mb-3 h-12 w-12 text-textDim/20" />
              <p className="text-base font-bold text-textMain">
                Nenhum leitor ainda
              </p>
              <p className="mt-1 text-sm text-textDim/50">
                Seja o primeiro a aparecer no ranking!
              </p>
              <Link
                href="/home"
                className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                Explorar catálogo
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key={activeMetric}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Podium — top 3 */}
              {podiumUsers.length > 0 && (
                <Podium
                  users={podiumUsers}
                  metric={metric}
                  myUserId={myUserId}
                />
              )}

              {/* Divider */}
              {podiumUsers.length > 0 && listUsers.length > 0 && (
                <div className="mx-4 mb-1 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.04]" />
                  <span className="text-[10px] text-textDim/30 font-semibold uppercase tracking-wider">
                    Classificação
                  </span>
                  <div className="h-px flex-1 bg-white/[0.04]" />
                </div>
              )}

              {/* List — rank 4+ */}
              {listUsers.length > 0 && (
                <div>
                  {listUsers.map((u, i) => (
                    <RankRow
                      key={u.userId}
                      user={u}
                      metric={metric}
                      isMe={u.userId === myUserId}
                      index={i}
                    />
                  ))}
                </div>
              )}

              {/* Showcase notice */}
              {hasShowcase && (
                <p className="px-4 py-3 text-center text-[10px] text-textDim/25">
                  Algumas entradas são personas para preencher o ranking enquanto
                  a comunidade cresce.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
