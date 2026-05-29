"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Download,
  Trash2,
  BookOpen,
  Grid3X3,
  List,
  HardDrive,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { AuthCover } from "@/components/AuthCover";
import { cn } from "@/lib/utils";
import { useDownloadSettings } from "@/hooks/useDownloadSettings";
import type { DownloadQuality } from "@/hooks/useDownloadSettings";
import * as offlineStorage from "@/services/offline-storage.service";
import type { OfflineChapter, DownloadedSeries } from "@/types/offline";

type Tab = "series" | "chapters";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function OfflinePage() {
  const [tab, setTab] = useState<Tab>("series");
  const [series, setSeries] = useState<DownloadedSeries[]>([]);
  const [chapters, setChapters] = useState<OfflineChapter[]>([]);
  const [storageEstimate, setStorageEstimate] = useState({
    usage: 0,
    quota: 0,
    percentUsed: 0,
  });
  const [loading, setLoading] = useState(true);

  const { quality, setQuality, maxStorageMB, setMaxStorageMB } =
    useDownloadSettings();

  const QUALITY_OPTIONS: { value: DownloadQuality; label: string }[] = [
    { value: "low", label: "Baixa (800px)" },
    { value: "medium", label: "Média (1200px)" },
    { value: "high", label: "Alta (original)" },
  ];

  const STORAGE_OPTIONS = [
    { value: 500, label: "500 MB" },
    { value: 1024, label: "1 GB" },
    { value: 2048, label: "2 GB" },
    { value: 5120, label: "5 GB" },
    { value: 0, label: "Sem limite" },
  ];

  const load = useCallback(async () => {
    try {
      const [s, c, estimate] = await Promise.all([
        offlineStorage.getAllDownloadedSeries(),
        offlineStorage.getAllDownloadedChapters(),
        offlineStorage.getStorageEstimate(),
      ]);
      setSeries(s);
      setChapters(c);
      setStorageEstimate(estimate);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteChapter = async (sId: string, cId: string) => {
    await offlineStorage.deleteChapter(sId, cId);
    load();
  };

  const handleDeleteSeries = async (sId: string) => {
    if (!confirm("Excluir todos os capítulos baixados desta série?")) return;
    await offlineStorage.deleteSeries(sId);
    load();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = series.length === 0 && chapters.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24 pt-safe">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold text-white">Leitura Offline</h1>
      </div>

      {/* Settings */}
      <div className="mx-4 mt-4 rounded-xl bg-surface p-4">
        <div className="flex items-center gap-3">
          {/* Quality selector */}
          <div className="flex-1">
            <label className="mb-1 block text-xs text-white/40">
              Qualidade
            </label>
            <select
              value={quality}
              onChange={(e) =>
                setQuality(e.target.value as DownloadQuality)
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            >
              {QUALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max storage */}
          <div className="flex-1">
            <label className="mb-1 block text-xs text-white/40">
              Limite
            </label>
            <select
              value={
                Number.isFinite(maxStorageMB) ? maxStorageMB : 0
              }
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMaxStorageMB(val > 0 ? val : Infinity);
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            >
              {STORAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Storage bar */}
      {(() => {
        const limitBytes = Number.isFinite(maxStorageMB)
          ? maxStorageMB * 1024 * 1024
          : storageEstimate.quota;
        const usageBytes = storageEstimate.usage;
        const pctUsed =
          limitBytes > 0
            ? Math.min((usageBytes / limitBytes) * 100, 100)
            : 0;

        return (
          <div className="mx-4 mt-4 rounded-xl bg-surface p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/60">
                <HardDrive className="inline h-4 w-4" /> Armazenamento
              </span>
              <span className="text-white/80">
                {formatSize(usageBytes)}
                {limitBytes > 0 && ` / ${formatSize(limitBytes)}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  pctUsed > 90
                    ? "bg-red-500"
                    : pctUsed > 70
                      ? "bg-yellow-500"
                      : "bg-primary",
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pctUsed}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            {pctUsed > 90 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Armazenamento quase cheio
              </p>
            )}
          </div>
        );
      })()}

      {/* Empty state */}
      {isEmpty && (
        <div className="mt-20 flex flex-col items-center gap-4 px-8 text-center">
          <Download className="h-12 w-12 text-white/20" />
          <h2 className="text-lg font-semibold text-white/60">
            Nenhum conteúdo offline
          </h2>
          <p className="text-sm text-white/30">
            Baixe capítulos para ler sem conexão. Use o botão de download nas
            páginas de série.
          </p>
          <Link
            href="/home"
            className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            Explorar séries
          </Link>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Tabs */}
          <div className="mx-4 mt-6 flex rounded-xl bg-surface p-1">
            <button
              onClick={() => setTab("series")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
                tab === "series"
                  ? "bg-background text-white shadow-sm"
                  : "text-white/40",
              )}
            >
              <Grid3X3 className="h-4 w-4" />
              Séries
            </button>
            <button
              onClick={() => setTab("chapters")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
                tab === "chapters"
                  ? "bg-background text-white shadow-sm"
                  : "text-white/40",
              )}
            >
              <List className="h-4 w-4" />
              Capítulos
            </button>
          </div>

          {/* Series tab */}
          {tab === "series" && (
            <div className="mt-4 px-4">
              {series.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">
                  Nenhuma série baixada
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {series.map((s) => (
                    <motion.div
                      key={s.seriesId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative"
                    >
                      <Link href={`/serie/${s.seriesId}`}>
                        <AuthCover
                          coverUrl={s.coverUrl ?? ""}
                          alt={s.seriesTitle}
                          className="aspect-[3/4] w-full rounded-xl"
                          useOffline={true}
                          seriesId={s.seriesId}
                        />
                        <p className="mt-2 truncate text-xs font-medium text-white/80">
                          {s.seriesTitle}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {s.chapterCount} capítulo{s.chapterCount > 1 ? "s" : ""}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleDeleteSeries(s.seriesId)}
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Excluir série"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chapters tab */}
          {tab === "chapters" && (
            <div className="mt-4 px-4">
              {chapters.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">
                  Nenhum capítulo baixado
                </p>
              ) : (
                <div className="space-y-2">
                  {chapters
                    .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
                    .map((ch) => (
                      <motion.div
                        key={ch.compositeKey}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 rounded-xl bg-surface p-3"
                      >
                        <Link
                          href={`/reader/${ch.seriesId}/${ch.chapterId}`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {ch.chapterTitle || `Capítulo ${ch.chapterNumber}`}
                            </p>
                            <p className="truncate text-xs text-white/40">
                              {ch.seriesTitle} · {ch.pageCount} páginas ·{" "}
                              {formatSize(ch.totalSizeBytes)}
                            </p>
                          </div>
                        </Link>
                        <button
                          onClick={() =>
                            handleDeleteChapter(ch.seriesId, ch.chapterId)
                          }
                          className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
                          aria-label="Excluir capítulo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.div>
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
