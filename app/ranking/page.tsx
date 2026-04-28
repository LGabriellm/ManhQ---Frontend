"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, BookOpen, FileText, Clock, Flame, Crown, WifiOff, Medal } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/community/UserAvatar";
import { useRanking, useMyRank } from "@/hooks/useRanking";
import { useAuth } from "@/contexts/AuthContext";
import type { RankMetric, RankedUser } from "@/types/api";
import { cn } from "@/lib/utils";

// ─── Metric config ───────────────────────────────────────────────────────────

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

// ─── Reader level helper ──────────────────────────────────────────────────────

function readerLevel(chaptersRead: number, metric: RankMetric) {
  if (metric !== "chapters") return null;
  if (chaptersRead >= 500) return { label: "Lenda", color: "text-yellow-400" };
  if (chaptersRead >= 200) return { label: "Mestre", color: "text-purple-400" };
  if (chaptersRead >= 100) return { label: "Veterano", color: "text-blue-400" };
  if (chaptersRead >= 50)  return { label: "Experiente", color: "text-emerald-400" };
  if (chaptersRead >= 10)  return { label: "Iniciante", color: "text-textDim" };
  return null;
}

// ─── Medal colours for top 3 ─────────────────────────────────────────────────

const MEDAL: Record<number, { icon: string; ring: string; text: string; glow: string }> = {
  1: { icon: "🥇", ring: "ring-yellow-400/40", text: "text-yellow-400", glow: "shadow-yellow-500/10" },
  2: { icon: "🥈", ring: "ring-slate-300/40",  text: "text-slate-300",  glow: "shadow-slate-400/10" },
  3: { icon: "🥉", ring: "ring-orange-400/40", text: "text-orange-400", glow: "shadow-orange-500/10" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FounderChip({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/20">
      <Crown className="h-2.5 w-2.5" />
      {number === 0 ? "#000" : `#${String(number).padStart(3, "0")}`}
    </span>
  );
}

/** Letter-chip avatar for showcase personas — no API call, no real userId */
function ShowcaseAvatar({ name, color }: { name: string | null; color?: string }) {
  const letter = (name ?? "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white/90 border border-white/10"
      style={{ backgroundColor: color ? `${color}33` : "#ffffff22", borderColor: color ? `${color}44` : undefined }}
    >
      <span style={{ color: color ?? "#a3a3a3" }}>{letter}</span>
    </div>
  );
}

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
  const medal = !user.isShowcase ? MEDAL[user.rank] : undefined;
  const level = readerLevel(user.value, metric.key);
  const isShowcase = user.isShowcase === true;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3 border transition-colors",
        isShowcase
          ? "border-white/4 bg-surface/25 opacity-70"
          : isMe
          ? "border-primary/30 bg-primary/5"
          : medal
          ? `ring-1 ${medal.ring} border-white/6 bg-surface/60 ${medal.glow} shadow-md`
          : "border-white/5 bg-surface/40 hover:border-white/8",
      )}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 text-center">
        {medal ? (
          <span className="text-lg leading-none">{medal.icon}</span>
        ) : (
          <span className="text-sm font-bold tabular-nums text-textDim/60">
            {user.rank}
          </span>
        )}
      </div>

      {/* Avatar — real UserAvatar for real users, letter-chip for showcase */}
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
                ? "text-textDim/70"
                : isMe
                ? "text-primary"
                : medal
                ? medal.text
                : "text-textMain",
            )}
          >
            {user.name || user.username || "Leitor"}
          </p>
          {isMe && !isShowcase && (
            <span className="text-[10px] font-bold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full">
              Você
            </span>
          )}
          {user.founderNumber !== null && !isShowcase && (
            <FounderChip number={user.founderNumber} />
          )}
          {isShowcase && (
            <span className="text-[9px] font-medium text-textDim/40 border border-white/6 px-1.5 py-0.5 rounded-full">
              Persona
            </span>
          )}
        </div>
        {!isShowcase && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {user.username && (
              <p className="text-[11px] text-textDim/60 truncate">
                @{user.username}
              </p>
            )}
            {level && (
              <span className={cn("text-[10px] font-medium", level.color)}>
                · {level.label}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-base font-bold tabular-nums",
            isShowcase
              ? "text-textDim/50"
              : isMe
              ? "text-primary"
              : medal
              ? medal.text
              : "text-textMain",
          )}
        >
          {metric.formatValue(user.value)}
        </p>
        <p className="text-[10px] text-textDim/50">{metric.unit}</p>
      </div>
    </motion.div>
  );
}

// ─── My rank card ─────────────────────────────────────────────────────────────

function MyRankCard({ metric }: { metric: MetricConfig }) {
  const { data, isLoading } = useMyRank(metric.key);

  if (isLoading) {
    return (
      <div className="mx-4 h-16 animate-pulse rounded-2xl bg-surface/40" />
    );
  }

  if (!data?.position) return null;

  const { rank, value, totalUsers } = data.position;
  const topPercent = totalUsers > 0 ? Math.round((rank / totalUsers) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <Medal className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-textDim">Sua posição</p>
        <p className="text-sm font-bold text-textMain">
          #{rank.toLocaleString("pt-BR")}{" "}
          <span className="text-xs font-normal text-textDim">
            de {totalUsers.toLocaleString("pt-BR")} leitores
          </span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-base font-bold text-primary tabular-nums">
          {metric.formatValue(value)}
        </p>
        <p className="text-[10px] text-textDim/60">Top {topPercent}%</p>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const [activeMetric, setActiveMetric] = useState<RankMetric>("chapters");
  const { isAuthenticated } = useAuth();

  const metric = METRICS.find((m) => m.key === activeMetric)!;
  const { data, isLoading, error, refetch } = useRanking(activeMetric, 50, 0);

  // We detect the current user's userId from AuthContext to highlight their row
  const { user } = useAuth();
  const myUserId = user?.id;

  return (
    <main className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/4 bg-background/85 backdrop-blur-2xl safe-header">
        <div className="flex h-14 items-center gap-3 px-5">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-[17px] font-bold text-textMain">
            Ranking de Leitores
          </h1>
        </div>
      </div>

      <div className="space-y-5 pt-5">
        {/* Metric tab selector */}
        <div className="px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide rounded-2xl bg-surface/40 p-1">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const isActive = m.key === activeMetric;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMetric(m.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                    isActive
                      ? "bg-background text-textMain shadow-sm"
                      : "text-textDim hover:text-textMain",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isActive ? m.color : "text-textDim/60",
                    )}
                  />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* My position card (authenticated only) */}
        {isAuthenticated && <MyRankCard metric={metric} />}

        {/* Leaderboard */}
        <div className="px-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-surface/40"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-white/8 bg-surface/60 p-5 text-center">
              <WifiOff className="mx-auto mb-3 h-8 w-8 text-textDim/40" />
              <p className="text-sm font-semibold text-textMain">
                Erro ao carregar ranking
              </p>
              <button
                onClick={() => void refetch()}
                className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
              >
                Tentar novamente
              </button>
            </div>
          ) : !data?.users.length ? (
            <div className="rounded-2xl border border-dashed border-white/8 bg-surface/40 px-4 py-12 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-textDim/20" />
              <p className="text-sm font-semibold text-textMain">
                Nenhum leitor ainda
              </p>
              <p className="mt-1 text-xs text-textDim">
                Comece a ler para aparecer no ranking!
              </p>
              <Link
                href="/home"
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
              >
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.users.map((user, i) => (
                <RankRow
                  key={user.userId}
                  user={user}
                  metric={metric}
                  isMe={user.userId === myUserId}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        {data?.users && data.users.length > 0 && (
          <p className="px-4 pb-2 text-center text-[11px] text-textDim/40">
            Top {data.users.length} leitores · atualizado a cada 2 min
          </p>
        )}
      </div>
    </main>
  );
}
