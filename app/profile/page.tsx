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
  CheckCircle2,
  Lock,
  Settings,
  WifiOff,
  Info,
  Heart,
} from "lucide-react";
import { motion, type Easing } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useApi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCover } from "@/components/AuthCover";
import { UserAvatar } from "@/components/community/UserAvatar";
import type { Milestone, TopSeriesStats } from "@/types/api";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as Easing },
  }),
};

// ─── Skeleton para carregamento ─────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <>
      {/* Avatar */}
      <div className="flex flex-col items-center pt-14 pb-6">
        <div className="w-24 h-24 rounded-full bg-surface/50 animate-pulse mb-4" />
        <div className="h-6 w-32 rounded-lg bg-surface/50 animate-pulse mb-2" />
        <div className="h-4 w-48 rounded bg-surface/50 animate-pulse" />
      </div>
      {/* Stats grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-surface/50 rounded-2xl p-4 animate-pulse h-28"
          />
        ))}
      </div>
      {/* Sections */}
      <div className="px-4 mt-5 space-y-4">
        <div className="h-48 bg-surface/50 rounded-2xl animate-pulse" />
        <div className="h-32 bg-surface/50 rounded-2xl animate-pulse" />
      </div>
    </>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { data: stats, isLoading, error } = useUserStats();
  const router = useRouter();
  const [showAllMilestones, setShowAllMilestones] = useState(false);

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

  const statCards = [
    {
      icon: BookOpen,
      value: reading?.chaptersRead ?? 0,
      label: "Capítulos lidos",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: FileText,
      value: reading?.totalPagesRead ?? 0,
      label: "Páginas lidas",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      icon: Library,
      value: reading?.seriesStarted ?? 0,
      label: "Séries iniciadas",
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      icon: Trophy,
      value: reading?.seriesCompleted ?? 0,
      label: "Séries completas",
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      icon: Clock,
      value: time?.totalTimeFormatted ?? "0min",
      label: "Tempo de leitura",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      icon: TrendingUp,
      value: time?.avgPagesPerDay ?? 0,
      label: "Páginas/dia",
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ];

  // Calcular nível do leitor baseado nos capítulos lidos
  const chaptersRead = reading?.chaptersRead ?? 0;
  const readerLevel =
    chaptersRead >= 500
      ? { title: "Lenda", color: "text-yellow-400", bg: "bg-yellow-400/10" }
      : chaptersRead >= 200
        ? { title: "Mestre", color: "text-purple-400", bg: "bg-purple-400/10" }
        : chaptersRead >= 100
          ? {
              title: "Veterano",
              color: "text-blue-400",
              bg: "bg-blue-400/10",
            }
          : chaptersRead >= 50
            ? {
                title: "Experiente",
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
              }
            : chaptersRead >= 10
              ? {
                  title: "Iniciante",
                  color: "text-textDim",
                  bg: "bg-surface",
                }
              : {
                  title: "Novato",
                  color: "text-textDim",
                  bg: "bg-surface",
                };

  return (
    <main className="min-h-screen pb-28">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-primary/12 via-primary/4 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-125 h-75 bg-primary/6 rounded-full blur-[120px]" />

        <div className="relative px-5 pt-14 pb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar */}
            <div className="relative mb-4">
              <UserAvatar
                userId={user?.id}
                name={user?.name || undefined}
                className="h-24 w-24 rounded-full"
              />
              {user?.role === "ADMIN" && (
                <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Shield className="w-3 h-3" />
                  ADMIN
                </div>
              )}
              {/* Active today indicator */}
              {streaks?.isActiveToday && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold text-textMain mb-0.5">
              {user?.name || "Usuário"}
            </h1>
            <p className="text-sm text-textDim">{user?.email}</p>

            {/* Reader Level Badge + Member Since */}
            <div className="flex items-center gap-2 mt-2.5">
              {!isLoading && (
                <span
                  className={`text-[11px] px-2.5 py-0.5 ${readerLevel.bg} ${readerLevel.color} font-semibold rounded-full border border-white/5`}
                >
                  {readerLevel.title}
                </span>
              )}
              {time?.memberSinceDays !== undefined && (
                <span className="text-[11px] text-textDim/60 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Membro há {time.memberSinceDays} dias
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {isLoading ? (
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
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-sm"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* ===== Quick Stats Grid ===== */}
          <div className="px-4 mt-1">
            <SectionHeader icon={BarChart3} title="Estatísticas" />
            <div className="grid grid-cols-2 gap-2.5">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4 hover:border-white/8 transition-all duration-200"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3 ring-1 ring-white/5`}
                  >
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-textMain tabular-nums tracking-tight">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString("pt-BR")
                      : stat.value}
                  </p>
                  <p className="text-[11px] text-textDim mt-0.5">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ===== Streak Section ===== */}
          {streaks &&
            (streaks.currentStreak > 0 || streaks.longestStreak > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="px-4 mt-5"
              >
                <div className="bg-linear-to-r from-orange-500/8 via-red-500/8 to-yellow-500/8 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center ring-1 ring-orange-500/15">
                      <Flame className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-textMain text-sm">
                        Sequência de Leitura
                      </p>
                      <p className="text-[11px] text-textDim">
                        {streaks.isActiveToday
                          ? "Você já leu hoje! Continue assim"
                          : "Leia hoje para manter a sequência!"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background/30 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-bold text-orange-400 tabular-nums">
                        {streaks.currentStreak}
                      </p>
                      <p className="text-[10px] text-textDim mt-0.5">
                        Dias seguidos
                      </p>
                    </div>
                    <div className="bg-background/30 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-bold text-yellow-400 tabular-nums">
                        {streaks.longestStreak}
                      </p>
                      <p className="text-[10px] text-textDim mt-0.5">Recorde</p>
                    </div>
                    <div className="bg-background/30 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-bold text-emerald-400 tabular-nums">
                        {streaks.totalActiveDays}
                      </p>
                      <p className="text-[10px] text-textDim mt-0.5">
                        Dias ativos
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {/* ===== Weekly Activity ===== */}
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

          {/* ===== Top Genres ===== */}
          {genres && genres.topGenres.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="px-4 mt-5"
            >
              <SectionHeader icon={Star} title="Gêneros Favoritos" />
              <div className="bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4">
                {/* Favorite genre highlight */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary fill-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-textDim">Gênero favorito</p>
                    <p className="font-bold text-textMain text-lg">
                      {genres.favoriteGenre}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-textDim">Explorados</p>
                    <p className="font-bold text-textMain">
                      {genres.totalGenresExplored}
                    </p>
                  </div>
                </div>

                {/* Genre bars */}
                <div className="space-y-2.5">
                  {genres.topGenres.map((genre) => (
                    <div key={genre.tag}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-textMain font-medium">
                          {genre.tag}
                        </span>
                        <span className="text-textDim tabular-nums">
                          {genre.count} · {genre.percent}%
                        </span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${genre.percent}%` }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                          className="h-full bg-primary/80 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== Top Series ===== */}
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

          {/* ===== Milestones / Achievements ===== */}
          {milestones && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="px-4 mt-5"
            >
              <SectionHeader
                icon={Target}
                title="Conquistas"
                badge={`${milestones.achieved}/${milestones.total}`}
              />

              {/* Next milestone */}
              {milestones.next && (
                <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/15 mb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-textDim">Próxima conquista</p>
                      <p className="font-semibold text-textMain">
                        {milestones.next.title}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {milestones.next.percent}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-background rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${milestones.next.percent}%` }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <p className="text-[11px] text-textDim mt-1.5 tabular-nums">
                    {milestones.next.current.toLocaleString("pt-BR")} /{" "}
                    {milestones.next.target.toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              {/* Achievement grid */}
              <div className="grid grid-cols-3 gap-2">
                {(showAllMilestones
                  ? milestones.all
                  : milestones.all.slice(0, 9)
                ).map((m) => (
                  <MilestoneCard key={m.id} milestone={m} />
                ))}
              </div>
              {milestones.all.length > 9 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAllMilestones(!showAllMilestones)}
                  className="w-full mt-3 py-2 text-xs text-textDim hover:text-primary font-medium transition-colors"
                >
                  {showAllMilestones
                    ? "Mostrar menos"
                    : `+${milestones.all.length - 9} conquistas`}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ===== Library Overview ===== */}
          {library && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="px-4 mt-5"
            >
              <SectionHeader icon={Library} title="Biblioteca" />
              <div className="bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-textDim">Catálogo explorado</p>
                      <p className="text-xs font-bold text-purple-400 tabular-nums">
                        {library.libraryExploredPercent}%
                      </p>
                    </div>
                    <div className="h-2.5 bg-background rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${library.libraryExploredPercent}%`,
                        }}
                        transition={{ delay: 0.65, duration: 0.8 }}
                        className="h-full bg-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-background/30 rounded-xl py-2.5">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Heart className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-lg font-bold text-textMain">
                      {library.favorites}
                    </p>
                    <p className="text-[11px] text-textDim">Favoritos</p>
                  </div>
                  <div className="text-center bg-background/30 rounded-xl py-2.5">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <BookOpen className="w-3 h-3 text-emerald-400" />
                    </div>
                    <p className="text-lg font-bold text-textMain">
                      {library.reading}
                    </p>
                    <p className="text-[11px] text-textDim">Lendo</p>
                  </div>
                  <div className="text-center bg-background/30 rounded-xl py-2.5">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Library className="w-3 h-3 text-purple-400" />
                    </div>
                    <p className="text-lg font-bold text-textMain">
                      {library.totalSeriesInLibrary}
                    </p>
                    <p className="text-[11px] text-textDim">Total séries</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ===== Account & Settings Section ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="px-4 mt-6"
      >
        <SectionHeader icon={Settings} title="Configurações" />

        <div className="space-y-2">
          {/* Dashboard (admin only) */}
          {user?.role === "ADMIN" && (
            <Link href="/dashboard">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-4 bg-surface/60 backdrop-blur-sm rounded-2xl border border-yellow-500/10 hover:border-yellow-500/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center ring-1 ring-yellow-400/10">
                  <Shield className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-textMain text-sm">
                    Painel Administrativo
                  </p>
                  <p className="text-[11px] text-textDim">
                    Gerenciar séries, mídias e usuários
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-textDim/40" />
              </motion.div>
            </Link>
          )}

          <Link href="/profile/edit">
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 bg-surface/60 backdrop-blur-sm rounded-2xl border border-white/4 hover:border-primary/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-textMain text-sm">
                  Editar perfil
                </p>
                <p className="text-[11px] text-textDim">
                  Gerenciar conta, sessões e segurança
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-textDim/40" />
            </motion.div>
          </Link>

          {/* App info */}
          <div className="flex items-center gap-4 p-4 bg-surface/60 backdrop-blur-sm rounded-2xl border border-white/4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/10">
              <span className="text-lg font-bold text-primary">M</span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-textMain text-sm">ManhQ Reader</p>
              <p className="text-[11px] text-textDim">Versão 1.0.0</p>
            </div>
            <Info className="w-4 h-4 text-textDim/30" />
          </div>

          {/* Logout */}
          <motion.button
            onClick={handleLogout}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-4 p-4 bg-surface/60 backdrop-blur-sm hover:bg-red-500/5 rounded-2xl transition-all border border-white/4 hover:border-red-500/15"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/8 ring-1 ring-red-400/10">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-red-400 text-sm">Sair da conta</p>
              <p className="text-[11px] text-textDim">
                Desconectar deste dispositivo
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400/30" />
          </motion.button>
        </div>
      </motion.div>

      <div className="mt-8 mb-4 text-center">
        <p className="text-xs text-textDim/40">
          Feito com ❤️ para leitores de manhwa
        </p>
      </div>
    </main>
  );
}

// ===== Sub-components =====

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

function WeeklyChart({
  data,
  mostProductiveDay,
}: {
  data: { day: string; pages: number; time: number }[];
  mostProductiveDay: string;
}) {
  const maxPages = Math.max(...data.map((d) => d.pages), 1);

  return (
    <div className="bg-surface/60 backdrop-blur-sm rounded-2xl p-4 border border-white/4">
      <div className="flex items-end gap-2 h-28 mb-2">
        {data.map((d) => {
          const height = Math.max((d.pages / maxPages) * 100, 4);
          const isTop = d.day === mostProductiveDay;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center">
              <span className="text-[10px] text-textDim/70 mb-1 tabular-nums">
                {d.pages > 0 ? d.pages : ""}
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className={`w-full rounded-lg ${
                  isTop
                    ? "bg-primary shadow-sm shadow-primary/20"
                    : "bg-primary/25"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {data.map((d) => (
          <div key={d.day} className="flex-1 text-center">
            <span className="text-[10px] text-textDim">
              {d.day.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-textDim mt-3 text-center">
        Dia mais produtivo:{" "}
        <span className="text-primary font-medium">{mostProductiveDay}</span>
      </p>
    </div>
  );
}

function TopSeriesCard({
  series,
  rank,
}: {
  series: TopSeriesStats;
  rank: number;
}) {
  return (
    <Link href={`/serie/${series.id}`} className="shrink-0 w-36">
      <motion.div
        whileTap={{ scale: 0.96 }}
        className="bg-surface/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/4 hover:border-white/8 transition-all"
      >
        <div className="relative h-44 overflow-hidden">
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
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          {/* Rank badge */}
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center">
            #{rank}
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-primary"
              style={{ width: `${series.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="p-2.5">
          <p className="text-xs font-semibold text-textMain line-clamp-1">
            {series.title}
          </p>
          <p className="text-[10px] text-textDim mt-0.5 tabular-nums">
            {series.chaptersRead}/{series.totalChapters} caps ·{" "}
            {series.pagesRead} pgs
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const achieved = milestone.achieved;

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className={`rounded-xl p-2.5 text-center border transition-colors ${
        achieved
          ? "bg-primary/5 border-primary/20"
          : "bg-surface border-white/4"
      }`}
    >
      <div className="flex justify-center mb-1.5">
        {achieved ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <Lock className="w-5 h-5 text-textDim/30" />
        )}
      </div>
      <p
        className={`text-[10px] leading-tight font-medium line-clamp-2 ${
          achieved ? "text-textMain" : "text-textDim/60"
        }`}
      >
        {milestone.title}
      </p>
      {!achieved && (
        <div className="mt-1.5">
          <div className="h-1 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/40 rounded-full"
              style={{ width: `${milestone.percent}%` }}
            />
          </div>
          <p className="text-[9px] text-textDim/50 mt-0.5 tabular-nums">
            {milestone.percent}%
          </p>
        </div>
      )}
    </motion.div>
  );
}
