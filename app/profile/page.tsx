"use client";

import {
  BookOpen,
  Flame,
  Trophy,
  Library,
  Clock,
  FileText,
  TrendingUp,
  LogOut,
  ChevronRight,
  Shield,
  Zap,
  BarChart3,
  Star,
  CalendarDays,
  Target,
  Settings,
  WifiOff,
  Info,
  Heart,
  CreditCard,
} from "lucide-react";
import { BadgeList, UserBadge } from "@/components/community/UserBadge";
import { useMyBadges } from "@/hooks/useApi";
import { motion, type Easing } from "framer-motion";
import {
  formatSubscriptionDate,
  getRenewalHref,
  getSubscriptionStateMeta,
  isExternalHref,
} from "@/lib/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useApi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCover } from "@/components/AuthCover";
import { UserAvatar } from "@/components/community/UserAvatar";
import { SubscriptionAlertBanner } from "@/components/subscription/SubscriptionAlertBanner";
import { SubscriptionStateBadge } from "@/components/subscription/SubscriptionStateBadge";
import type { TopSeriesStats } from "@/types/api";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ─── CountUp animation ──────────────────────────────────────────────────────
function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display.toLocaleString("pt-BR")}</>;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <>
      <div className="px-4 pt-6 pb-4 safe-header space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-surface animate-pulse" />
          <div className="h-6 w-36 rounded-xl bg-surface animate-pulse" />
          <div className="h-4 w-52 rounded bg-surface animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-16 rounded-xl bg-surface animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-surface rounded-2xl p-4 animate-pulse h-28" />
        ))}
      </div>
      <div className="px-4 mt-5 space-y-4">
        <div className="h-40 bg-surface rounded-2xl animate-pulse" />
        <div className="h-48 bg-surface rounded-2xl animate-pulse" />
        <div className="h-32 bg-surface rounded-2xl animate-pulse" />
      </div>
    </>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 px-1">
      <Icon className="w-4 h-4 text-textDim" />
      <h2 className="text-sm font-semibold text-textDim uppercase tracking-wider">
        {title}
      </h2>
      {badge && (
        <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Weekly chart ────────────────────────────────────────────────────────────
function WeeklyChart({
  data,
  mostProductiveDay,
}: {
  data: { day: string; pages: number; time: number }[];
  mostProductiveDay: string;
}) {
  const maxPages = Math.max(...data.map((d) => d.pages), 1);
  const totalPages = data.reduce((acc, d) => acc + d.pages, 0);
  const totalTimeSeconds = data.reduce((acc, d) => acc + d.time, 0);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0 && m === 0) return "0m";
    if (h === 0) return `${m}m`;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  };

  return (
    <div className="bg-surface/60 backdrop-blur-sm rounded-2xl border border-white/4 overflow-hidden">
      {/* Header Info */}
      <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] text-textDim/50 font-semibold uppercase tracking-wider mb-0.5">Total nos 7 dias</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-textMain">{totalPages}</span>
            <span className="text-xs text-textDim/60 font-medium">págs</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-textDim/50 font-semibold uppercase tracking-wider mb-0.5">Tempo Total</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-textMain">{formatTime(totalTimeSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pt-6 pb-5 flex items-end gap-2 h-44">
        {data.map((d, i) => {
          const fillPct = Math.max((d.pages / maxPages) * 100, d.pages > 0 ? 6 : 0);
          const isTop = d.day === mostProductiveDay && d.pages > 0;
          const isToday = i === data.length - 1; 

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              {/* Value Tooltip/Floating */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: d.pages > 0 ? 1 : 0, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={cn(
                  "text-[10px] font-bold tabular-nums transition-opacity duration-300",
                  isTop ? "text-[var(--color-primary)] drop-shadow-md" : "text-textDim/50",
                  isToday && d.pages === 0 && "text-textDim/30"
                )}
              >
                {d.pages}
              </motion.div>

              {/* Bar */}
              <div className="relative w-full flex-1 flex items-end">
                {/* Track background */}
                <div className="absolute inset-0 bg-white/[0.02] rounded-md pointer-events-none" />
                
                {/* Fill */}
                <motion.div
                  className={cn(
                    "w-full rounded-md transition-colors duration-300 relative overflow-hidden",
                    isTop 
                      ? "bg-gradient-to-t from-[var(--color-primary)] to-red-400" 
                      : isToday 
                        ? "bg-white/20" 
                        : "bg-white/10 group-hover:bg-white/15"
                  )}
                  style={isTop ? { boxShadow: "0 0 16px rgba(229,9,20,0.3)" } : undefined}
                  initial={{ height: 0 }}
                  animate={{ height: `${fillPct}%` }}
                  transition={{
                    delay: 0.1 + i * 0.04,
                    duration: 0.7,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {isTop && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-overlay" />
                  )}
                </motion.div>
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-medium tracking-wide mt-1.5 uppercase",
                  isToday 
                    ? "text-white font-bold bg-white/10 px-1.5 py-0.5 rounded" 
                    : isTop 
                      ? "text-[var(--color-primary)] font-bold" 
                      : "text-textDim/40"
                )}
              >
                {isToday ? "Hoje" : d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streak card ─────────────────────────────────────────────────────────────
function StreakCard({
  currentStreak,
  longestStreak,
  totalActiveDays,
  isActiveToday,
}: {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  isActiveToday: boolean;
}) {
  const today = new Date();
  const dayAbbrs = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const last7Labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return dayAbbrs[d.getDay()] ?? "?";
  });

  const isRead = (index: number) => {
    const daysAgo = 6 - index;
    return isActiveToday
      ? daysAgo < currentStreak
      : daysAgo >= 1 && daysAgo <= currentStreak;
  };

  return (
    <div className="bg-surface/60 backdrop-blur-sm rounded-2xl border border-white/4 p-5">
      {/* Header: flame + number */}
      <div className="flex items-center gap-4 mb-6">
        <motion.img
          src="/fogo-vetor.svg"
          alt=""
          aria-hidden
          className="w-14 h-14 object-contain shrink-0"
          animate={{ scale: [1, 1.04, 0.97, 1.02, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="flex-1">
          <p className="text-4xl font-black text-textMain tabular-nums leading-none">
            <CountUp value={currentStreak} />
          </p>
          <p className="text-sm text-textDim mt-0.5">dias seguidos</p>
        </div>
        {isActiveToday ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Hoje ✓
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-semibold shrink-0">
            <Zap className="w-3 h-3" />
            Leia hoje!
          </span>
        )}
      </div>

      {/* 7-day circles */}
      <div className="flex items-center gap-1.5">
        {last7Labels.map((label, i) => {
          const read = isRead(i);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center",
                  read
                    ? "bg-[var(--color-primary)] shadow-[0_0_14px_rgba(229,9,20,0.35)]"
                    : "bg-white/5 border border-white/8",
                )}
              >
                {read && (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </motion.div>
              <span className={cn(
                "text-[10px] font-semibold",
                read ? "text-[var(--color-primary)]" : "text-textDim/35",
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.05]">
        <div className="text-center">
          <p className="text-xl font-bold text-textMain tabular-nums">
            <CountUp value={longestStreak} />
          </p>
          <p className="text-[10px] text-textDim mt-0.5">Recorde pessoal</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-textMain tabular-nums">
            <CountUp value={totalActiveDays} />
          </p>
          <p className="text-[10px] text-textDim mt-0.5">Dias ativos no total</p>
        </div>
      </div>
    </div>
  );
}

// ─── Top series card ─────────────────────────────────────────────────────────
const RANK_STYLES: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-400 to-yellow-500 text-black",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-black",
  3: "bg-gradient-to-br from-amber-700 to-amber-600 text-white",
};

function TopSeriesCard({
  series,
  rank,
}: {
  series: TopSeriesStats;
  rank: number;
}) {
  const rankClass = RANK_STYLES[rank] ?? "bg-black/60 text-white backdrop-blur-sm";

  return (
    <Link href={`/serie/${series.id}`} className="shrink-0 w-36">
      <motion.div
        whileTap={{ scale: 0.94 }}
        className="bg-surface/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/4 hover:border-white/10 transition-all duration-200"
      >
        <div className="relative h-48 overflow-hidden">
          {series.coverUrl ? (
            <AuthCover
              coverUrl={series.coverUrl}
              alt={series.title}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-surface flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-textDim/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div
            className={cn(
              "absolute top-2 left-2 text-[10px] font-bold w-6 h-6 rounded-lg flex items-center justify-center shadow-md",
              rankClass,
            )}
          >
            #{rank}
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-400"
              style={{ width: `${series.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="p-2.5">
          <p className="text-xs font-semibold text-textMain line-clamp-1">
            {series.title}
          </p>
          <p className="text-[10px] text-textDim mt-0.5 tabular-nums">
            {series.chaptersRead}/{series.totalChapters} caps
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Genre color — monochromatic red scale ────────────────────────────────────
const GENRE_OPACITIES = [1, 0.75, 0.55, 0.42, 0.32, 0.24, 0.18, 0.14];

function getGenreColor(_tag: string, index: number): string {
  const alpha = GENRE_OPACITIES[index] ?? GENRE_OPACITIES[GENRE_OPACITIES.length - 1]!;
  const r = Math.round(229 * alpha + 30 * (1 - alpha));
  const g = Math.round(9 * alpha + 30 * (1 - alpha));
  const b = Math.round(20 * alpha + 30 * (1 - alpha));
  return `rgb(${r},${g},${b})`;
}

// ─── Settings link row ────────────────────────────────────────────────────────
function SettingsRow({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  onClick,
  isRed,
}: {
  href?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  isRed?: boolean;
}) {
  const inner = (
    <motion.div
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-4 p-4 bg-surface/60 backdrop-blur-sm rounded-2xl border transition-all duration-200",
        isRed
          ? "border-white/4 hover:border-red-500/15 hover:bg-red-500/5"
          : "border-white/4 hover:border-white/10",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-white/5 shrink-0",
          iconBg,
        )}
      >
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-sm",
            isRed ? "text-red-400" : "text-textMain",
          )}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] text-textDim mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {badge && (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full tabular-nums shrink-0">
          {badge}
        </span>
      )}
      <ChevronRight
        className={cn("w-4 h-4 shrink-0", isRed ? "text-red-400/30" : "text-textDim/30")}
      />
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return (
    <button onClick={onClick} className="w-full text-left">
      {inner}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { accessGranted, logout, subscription, user } = useAuth();
  const {
    data: stats,
    isLoading,
    error,
    refetch: refetchUserStats,
  } = useUserStats();
  const { data: badges } = useMyBadges();
  const router = useRouter();
  const [_showAllMilestones, _setShowAllMilestones] = useState(false);
  const subscriptionMeta = getSubscriptionStateMeta(subscription);
  const renewalHref = getRenewalHref(subscription);
  const renewalHrefIsExternal = isExternalHref(renewalHref);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const reading = stats?.reading;
  const streaks = stats?.streaks;
  const time = stats?.time;
  const genres = stats?.genres;
  const milestones = stats?.milestones;
  const library = stats?.library;

  // Reader level calculation (unchanged logic)
  const chaptersRead = reading?.chaptersRead ?? 0;
  const readerLevel =
    chaptersRead >= 500
      ? { title: "Lenda", color: "text-yellow-400", bg: "bg-yellow-400/10", glow: "shadow-yellow-400/20" }
      : chaptersRead >= 200
        ? { title: "Mestre", color: "text-purple-400", bg: "bg-purple-400/10", glow: "shadow-purple-400/20" }
        : chaptersRead >= 100
          ? { title: "Veterano", color: "text-blue-400", bg: "bg-blue-400/10", glow: "shadow-blue-400/20" }
          : chaptersRead >= 50
            ? { title: "Experiente", color: "text-emerald-400", bg: "bg-emerald-400/10", glow: "shadow-emerald-400/20" }
            : chaptersRead >= 10
              ? { title: "Iniciante", color: "text-textDim", bg: "bg-surface", glow: "" }
              : { title: "Novato", color: "text-textDim", bg: "bg-surface", glow: "" };

  const statCards = [
    {
      icon: BookOpen,
      value: reading?.chaptersRead ?? 0,
      label: "Capítulos lidos",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-t-[var(--color-primary)]",
    },
    {
      icon: FileText,
      value: reading?.totalPagesRead ?? 0,
      label: "Páginas lidas",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-t-blue-500",
    },
    {
      icon: Library,
      value: reading?.seriesStarted ?? 0,
      label: "Séries iniciadas",
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-t-purple-500",
    },
    {
      icon: Trophy,
      value: reading?.seriesCompleted ?? 0,
      label: "Séries completas",
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-t-amber-400",
    },
    {
      icon: Clock,
      value: null as null,
      rawValue: time?.totalTimeFormatted ?? "0min",
      label: "Tempo de leitura",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-t-emerald-500",
    },
    {
      icon: TrendingUp,
      value: time?.avgPagesPerDay ?? 0,
      label: "Páginas/dia",
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      border: "border-t-orange-400",
    },
  ];

  const founderBadge = badges?.find((b) => b.type === "FOUNDER");
  const otherBadges = badges?.filter((b) => b.type !== "FOUNDER") ?? [];

  return (
    <main className="min-h-screen pb-28">

      {/* ===== HERO HEADER ===== */}
      <div
        className="relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at top, rgba(229,9,20,0.12) 0%, transparent 60%)" }}
      >
        <div className="relative px-5 pt-14 pb-6 safe-header">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <div className="relative mb-4">
              <UserAvatar
                userId={user?.id}
                name={user?.name || undefined}
                className="h-20 w-20 rounded-full"
              />
              {user?.role === "ADMIN" && (
                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                  <Shield className="w-3 h-3" />
                  ADMIN
                </div>
              )}
              {/* Active today pulse */}
              {streaks?.isActiveToday && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background shadow-sm shadow-emerald-500/40"
                >
                  <Zap className="w-2.5 h-2.5 text-white" />
                </motion.div>
              )}
            </div>

            {/* Name */}
            <h1 className="text-2xl font-bold text-textMain mb-0.5">
              {user?.name || "Usuário"}
            </h1>
            <p className="text-sm text-textDim">{user?.email}</p>

            {/* Level + member since */}
            <div className="flex items-center gap-2 mt-2.5">
              {!isLoading && (
                <span
                  className={cn(
                    "text-[11px] px-3 py-1 font-bold rounded-full border border-white/8 shadow-sm",
                    readerLevel.bg,
                    readerLevel.color,
                    readerLevel.glow && `shadow-[0_0_12px_0_var(--tw-shadow-color)] ${readerLevel.glow}`,
                  )}
                >
                  {readerLevel.title}
                </span>
              )}
              {time?.memberSinceDays !== undefined && (
                <span className="text-[11px] text-textDim/60 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {time.memberSinceDays} dias na plataforma
                </span>
              )}
            </div>

            {/* Badges */}
            {badges && badges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
                className="mt-3 flex flex-col items-center gap-2"
              >
                {founderBadge && (
                  <UserBadge badge={founderBadge} size="lg" />
                )}
                <BadgeList
                  badges={otherBadges}
                  size="sm"
                  className="justify-center"
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Subscription alert banner (unchanged) */}
      <div className="px-4">
        <SubscriptionAlertBanner subscription={subscription} />
      </div>

      {/* ===== ACCESS GATE ===== */}
      {!accessGranted ? (
        <div className="px-4 space-y-4">
          <div className="surface-panel rounded-[28px] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Assinatura</p>
                <h2 className="mt-2 text-xl font-semibold text-textMain">
                  {subscriptionMeta.title}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-textDim">
                  {subscriptionMeta.description}
                </p>
              </div>
              <SubscriptionStateBadge state={subscription?.state} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-textDim/70">
                  Próximo marco
                </p>
                <p className="mt-2 text-sm font-semibold text-textMain">
                  {subscription?.status === "CANCELLATION_REQUESTED"
                    ? "Acesso termina em"
                    : "Renovar até"}
                </p>
                <p className="mt-1 text-sm text-textDim">
                  {formatSubscriptionDate(
                    subscription?.cancellationEffectiveAt ||
                      subscription?.currentPeriodEnd,
                  )}
                </p>
              </div>

              <div className="surface-panel-muted rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-textDim/70">
                  O que ainda funciona
                </p>
                <p className="mt-2 text-sm font-semibold text-textMain">
                  Conta e segurança
                </p>
                <p className="mt-1 text-sm text-textDim">
                  Você ainda pode atualizar perfil, senha, sessões e acompanhar
                  o status da assinatura normalmente.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/subscription"
                className="ui-btn-primary px-5 py-3 text-sm font-semibold"
              >
                <CreditCard className="h-4 w-4" />
                Gerenciar assinatura
              </Link>
              {subscription?.actions.canRenew ? (
                <a
                  href={renewalHref}
                  target={renewalHrefIsExternal ? "_blank" : undefined}
                  rel={renewalHrefIsExternal ? "noreferrer" : undefined}
                  className="ui-btn-secondary px-5 py-3 text-sm font-semibold"
                >
                  Renovar acesso
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <ProfileSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <WifiOff className="w-12 h-12 text-textDim mb-4" />
          <p className="text-textMain font-semibold mb-2">
            Erro ao carregar estatísticas
          </p>
          <p className="text-textDim text-sm mb-4">
            Verifique sua conexão e tente novamente
          </p>
          <button
            onClick={() => { void refetchUserStats(); }}
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* ===== STATS GRID ===== */}
          <div className="px-4 mt-1">
            <SectionHeader icon={BarChart3} title="Estatísticas" />
            <div className="grid grid-cols-2 gap-2.5">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" as Easing }}
                  className={cn(
                    "bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4 border-t-2 hover:border-t-2 transition-all duration-200",
                    stat.border,
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center mb-3 ring-1 ring-white/5",
                      stat.bg,
                    )}
                  >
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <p className="text-2xl font-bold text-textMain tabular-nums tracking-tight">
                    {stat.rawValue !== undefined
                      ? stat.rawValue
                      : <CountUp value={stat.value ?? 0} />}
                  </p>
                  <p className="text-[11px] text-textDim mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ===== STREAK SECTION ===== */}
          {streaks && (streaks.currentStreak > 0 || streaks.longestStreak > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="px-4 mt-5"
            >
              <SectionHeader icon={Flame} title="Sequência de Leitura" />
              <StreakCard
                currentStreak={streaks.currentStreak}
                longestStreak={streaks.longestStreak}
                totalActiveDays={streaks.totalActiveDays}
                isActiveToday={streaks.isActiveToday}
              />
            </motion.div>
          )}

          {/* ===== WEEKLY ACTIVITY ===== */}
          {time?.pagesPerDayOfWeek && time.pagesPerDayOfWeek.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="px-4 mt-5"
            >
              <SectionHeader icon={BarChart3} title="Atividade Semanal" />
              <WeeklyChart
                data={time.pagesPerDayOfWeek}
                mostProductiveDay={time.mostProductiveDay}
              />
            </motion.div>
          )}

          {/* ===== TOP GENRES ===== */}
          {genres && genres.topGenres.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="px-4 mt-5"
            >
              <SectionHeader
                icon={Star}
                title="Gêneros Favoritos"
                badge={`${genres.totalGenresExplored}`}
              />
              <div className="bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4">
                {/* Favorite genre highlight */}
                <div className="bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/20 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-textDim/70 uppercase tracking-wider">Gênero favorito</p>
                    <p className="font-bold text-textMain text-base leading-tight">
                      {genres.favoriteGenre}
                    </p>
                  </div>
                </div>

                {/* Genre bars */}
                <div className="space-y-3">
                  {genres.topGenres.map((genre, i) => {
                    const color = getGenreColor(genre.tag, i);
                    return (
                      <div key={genre.tag}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-textMain font-medium">{genre.tag}</span>
                            <span className="text-textDim/60 tabular-nums text-[10px]">
                              {genre.count} caps
                            </span>
                          </div>
                          <span className="font-bold tabular-nums" style={{ color }}>
                            {genre.percent}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}20` }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${genre.percent}%` }}
                            transition={{ delay: 0.5 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== TOP SERIES ===== */}
          {stats?.topSeries && stats.topSeries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-5"
            >
              <div className="px-4">
                <SectionHeader icon={Trophy} title="Séries Mais Lidas" />
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
                {stats.topSeries.map((series, i) => (
                  <TopSeriesCard key={series.id} series={series} rank={i + 1} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== ACHIEVEMENTS TEASER ===== */}
          {milestones && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="px-4 mt-5"
            >
              <SectionHeader icon={Target} title="Conquistas" />
              <div className="bg-gradient-to-br from-amber-400/5 to-transparent rounded-2xl p-5 border border-amber-400/20">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center mb-3 ring-1 ring-amber-400/20">
                    <Trophy className="w-7 h-7 text-amber-400" />
                  </div>
                  <p className="text-3xl font-bold text-textMain tabular-nums">
                    <CountUp value={milestones.achieved} />
                    <span className="text-lg text-textDim font-normal">
                      /{milestones.total}
                    </span>
                  </p>
                  <p className="text-sm text-textDim mt-1">conquistas desbloqueadas</p>
                </div>

                {/* Overall progress bar */}
                <div className="mb-4">
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((milestones.achieved / Math.max(milestones.total, 1)) * 100)}%` }}
                      transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Next milestone */}
                {milestones.next && (
                  <div className="bg-background/40 rounded-xl p-3 mb-4 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-textDim/70 uppercase tracking-wider">Próxima</p>
                        <p className="text-sm font-semibold text-textMain truncate">
                          {milestones.next.title}
                        </p>
                        <div className="mt-1.5 h-1.5 bg-background rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${milestones.next.percent}%` }}
                            transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        <p className="text-[10px] text-textDim/60 mt-0.5 tabular-nums">
                          {milestones.next.current.toLocaleString("pt-BR")} / {milestones.next.target.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">
                        {milestones.next.percent}%
                      </span>
                    </div>
                  </div>
                )}

                <Link href="/achievements">
                  <motion.div
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm font-semibold hover:bg-amber-400/15 transition-colors"
                  >
                    Ver todas as conquistas
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ===== LIBRARY OVERVIEW ===== */}
          {library && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="px-4 mt-5"
            >
              <SectionHeader icon={Library} title="Biblioteca" />
              <div className="bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4">
                <div className="flex items-center gap-5">
                  {/* Donut ring */}
                  <div className="shrink-0">
                    <div
                      className="h-20 w-20 rounded-full relative"
                      style={{
                        background: `conic-gradient(var(--color-primary) ${library.libraryExploredPercent}%, #1e1e1e 0)`,
                      }}
                    >
                      <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-[#0f0f0f]">
                        <span className="text-sm font-bold text-textMain tabular-nums">
                          {library.libraryExploredPercent}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] text-textDim/60 text-center mt-1.5">do catálogo</p>
                  </div>

                  {/* Stats */}
                  <div className="flex-1 grid grid-cols-1 gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Heart className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-textDim">Favoritos</p>
                      </div>
                      <p className="text-sm font-bold text-textMain tabular-nums">{library.favorites}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-textDim">Lendo</p>
                      </div>
                      <p className="text-sm font-bold text-textMain tabular-nums">{library.reading}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Library className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-textDim">Total séries</p>
                      </div>
                      <p className="text-sm font-bold text-textMain tabular-nums">{library.totalSeriesInLibrary}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ===== SETTINGS / LINKS ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="px-4 mt-6"
      >
        <SectionHeader icon={Settings} title="Configurações" />

        <div className="space-y-2">
          {user?.role === "ADMIN" && (
            <SettingsRow
              href="/dashboard"
              icon={Shield}
              iconBg="bg-yellow-500/10"
              iconColor="text-yellow-400"
              title="Painel Administrativo"
              subtitle="Gerenciar séries, mídias e usuários"
            />
          )}

          <SettingsRow
            href="/profile/edit"
            icon={Settings}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            title="Editar perfil"
            subtitle="Gerenciar conta, sessões e segurança"
          />

          <SettingsRow
            href="/subscription"
            icon={CreditCard}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-400"
            title="Assinatura"
            subtitle="Gerenciar plano e pagamentos"
          />

          {/* App info (non-navigable) */}
          <div className="flex items-center gap-4 p-4 bg-surface/60 backdrop-blur-sm rounded-2xl border border-white/4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/10 overflow-hidden shrink-0">
              <img
                src="/logo-192.png"
                alt="ManHQ"
                width={24}
                height={24}
                className="rounded-md object-contain"
                draggable={false}
              />
            </div>
            <div className="flex-1">
              <p className="font-medium text-textMain text-sm">ManhQ Reader</p>
              <p className="text-[11px] text-textDim">Versão 1.0.0</p>
            </div>
            <Info className="w-4 h-4 text-textDim/30" />
          </div>

          {/* Logout */}
          <SettingsRow
            icon={LogOut}
            iconBg="bg-red-500/8"
            iconColor="text-red-400"
            title="Sair da conta"
            subtitle="Desconectar deste dispositivo"
            onClick={() => { void handleLogout(); }}
            isRed
          />
        </div>
      </motion.div>

      <div className="mt-8 mb-4 text-center">
        <p className="text-xs text-textDim/40">
          Feito com amor para leitores de manhwa
        </p>
      </div>
    </main>
  );
}
