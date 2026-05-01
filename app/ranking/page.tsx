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
  1: { emoji: "🥇", ring: "ring-yellow-400/30",  text: "text-yellow-400",  bg: "bg-yellow-500/12",  border: "border-yellow-500/25" },
  2: { emoji: "🥈", ring: "ring-slate-300/30",   text: "text-slate-300",   bg: "bg-slate-300/8",    border: "border-slate-300/20"  },
  3: { emoji: "🥉", ring: "ring-orange-400/30",  text: "text-orange-400",  bg: "bg-orange-400/8",   border: "border-orange-400/20" },
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

const PODIUM_ORDER = [1, 0, 2]; // silver | gold | bronze visual order
const PODIUM_HEIGHTS = ["h-14", "h-20", "h-10"]; // silver | gold | bronze block height
const PODIUM_AVATAR = ["h-10 w-10", "h-12 w-12", "h-9 w-9"];

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
    <div className="px-4 pb-2 pt-3">
      <div className="flex items-end justify-center gap-1.5">
        {PODIUM_ORDER.map((srcIdx, displayIdx) => {
          const user = top3[srcIdx];
          if (!user) return <div key={displayIdx} className="flex-1" />;

          const pos = user.rank; // 1, 2, or 3
          const medal = MEDAL[pos] ?? MEDAL[3];
          const isShowcase = user.isShowcase === true;
          const isMe = user.userId === myUserId;

          return (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: displayIdx * 0.08, duration: 0.35 }}
              className="flex flex-1 flex-col items-center gap-1"
            >
              {pos === 1 && (
                <Crown className="mb-0.5 h-4 w-4 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              )}

              {/* Avatar */}
              <div className="relative">
                {isShowcase ? (
                  <ShowcaseAvatar
                    name={user.name}
                    color={user.showcaseColor}
                  />
                ) : (
                  <UserAvatar
                    userId={user.userId}
                    name={user.name || undefined}
                    className={cn("rounded-full", PODIUM_AVATAR[displayIdx])}
                  />
                )}
                {isMe && (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                )}
              </div>

              {/* Medal emoji */}
              <span className="text-base leading-none">{medal.emoji}</span>

              {/* Name + badge */}
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
                <p className="tabular-nums text-[10px] text-textDim/60">
                  {metric.formatValue(user.value)}{" "}
                  <span className="text-textDim/40">{metric.unit}</span>
                </p>
              </div>

              {/* Block */}
              <div
                className={cn(
                  "w-full rounded-t-xl border-x border-t",
                  PODIUM_HEIGHTS[displayIdx],
                  medal.bg,
                  medal.border,
                  "flex items-start justify-center pt-1.5",
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
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
        isShowcase
          ? "border-white/4 bg-surface/20 opacity-65"
          : isMe
            ? "border-primary/30 bg-primary/5"
            : "border-white/5 bg-surface/40 hover:border-white/8",
      )}
    >
      {/* Rank number */}
      <span className="w-7 shrink-0 text-center text-sm font-bold tabular-nums text-textDim/50">
        {user.rank}
      </span>

      {/* Avatar */}
      {isShowcase ? (
        <ShowcaseAvatar name={user.name} color={user.showcaseColor} />
      ) : (
        <UserAvatar
          userId={user.userId}
          name={user.name || undefined}
          className="h-9 w-9 shrink-0 rounded-full"
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
                {user.username ? "· " : ""}{level.label}
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
            isShowcase ? "text-textDim/45" : isMe ? "text-primary" : "text-textMain",
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
      <div className="mx-4 h-[72px] animate-pulse rounded-2xl bg-surface/40" />
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
      className="mx-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <Medal className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-semibold text-textDim">Sua posição</p>
          {level && (
            <span className={cn("text-[10px] font-medium", level.color)}>
              · {level.label}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-textMain">
          #{rank.toLocaleString("pt-BR")}{" "}
          <span className="text-xs font-normal text-textDim">
            de {totalUsers.toLocaleString("pt-BR")} leitores
          </span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-base font-bold tabular-nums text-primary">
          {metric.formatValue(value)}
        </p>
        <p className="text-[10px] text-textDim/55">Top {topPercent}%</p>
      </div>
    </motion.div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3 px-4">
      {/* Podium skeleton */}
      <div className="flex items-end justify-center gap-2 pb-2 pt-3">
        {[14, 20, 10].map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface/60" />
            <div className="h-2 w-12 animate-pulse rounded bg-surface/60" />
            <div
              className="w-full animate-pulse rounded-t-xl bg-surface/40"
              style={{ height: h * 4 }}
            />
          </div>
        ))}
      </div>
      {/* List skeleton */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-2xl bg-surface/40"
          style={{ opacity: 1 - i * 0.08 }}
        />
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
  const listUsers = allUsers.slice(3); // rank 4 onwards
  const hasShowcase = allUsers.some((u) => u.isShowcase);
  const realUserCount = allUsers.filter((u) => !u.isShowcase).length;

  return (
    <main className="min-h-screen pb-28">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl safe-header">
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-[15px] font-bold leading-tight text-textMain">
                Ranking de Leitores
              </h1>
              {realUserCount > 0 && (
                <p className="text-[10px] text-textDim/50">
                  {realUserCount} {realUserCount === 1 ? "leitor" : "leitores"}{" "}
                  ativos
                </p>
              )}
            </div>
          </div>

          {/* Metric selector — compact pills on right */}
          <div className="flex items-center gap-1">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const isActive = m.key === activeMetric;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMetric(m.key)}
                  aria-label={m.label}
                  className={cn(
                    "rounded-xl p-2 transition-colors",
                    isActive
                      ? "bg-surface text-textMain shadow-sm"
                      : "text-textDim/50 hover:text-textDim",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? m.color : "text-current",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* ── My position card ───────────────────────────────────────────── */}
        {isAuthenticated && <MyRankCard metric={metric} />}

        {/* ── Metric label ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5">
          <metric.icon className={cn("h-4 w-4", metric.color)} />
          <span className="text-sm font-semibold text-textMain">
            {metric.label}
          </span>
          <span className="text-xs text-textDim/40">· atualizado a cada 2 min</span>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
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
              <WifiOff className="mx-auto mb-3 h-8 w-8 text-textDim/30" />
              <p className="text-sm font-semibold text-textMain">
                Erro ao carregar ranking
              </p>
              <p className="mt-1 text-xs text-textDim/60">
                Verifique sua conexão e tente novamente.
              </p>
              <button
                onClick={() => void refetch()}
                className="mt-4 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white"
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
              <Trophy className="mx-auto mb-3 h-10 w-10 text-textDim/20" />
              <p className="text-sm font-semibold text-textMain">
                Nenhum leitor ainda
              </p>
              <p className="mt-1 text-xs text-textDim/50">
                Seja o primeiro a aparecer no ranking!
              </p>
              <Link
                href="/home"
                className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white"
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
              className="space-y-3"
            >
              {/* Podium — top 3 */}
              {podiumUsers.length > 0 && (
                <Podium
                  users={podiumUsers}
                  metric={metric}
                  myUserId={myUserId}
                />
              )}

              {/* List — rank 4+ */}
              {listUsers.length > 0 && (
                <div className="space-y-2 px-4">
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
                <p className="px-4 pb-1 text-center text-[10px] text-textDim/30">
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
