"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DownloadJob } from "@/types/offline";
import * as offlineDownload from "@/services/offline-download.service";
import * as offlineStorage from "@/services/offline-storage.service";

export interface OfflineDownloadsState {
  jobs: DownloadJob[];
  activeJobs: DownloadJob[];
  pendingJobs: DownloadJob[];
  completedJobs: DownloadJob[];
  isDownloading: boolean;
  totalProgress: { pagesComplete: number; pagesTotal: number; percent: number };
  downloadChapter: (
    seriesId: string,
    chapterId: string,
    chapterNumber: number,
    chapterTitle: string,
    seriesTitle: string,
    pageCount: number,
    coverUrl?: string | null,
  ) => Promise<string>;
  downloadSeries: (
    seriesId: string,
    chapters: { chapterId: string; chapterNumber: number; chapterTitle: string; pageCount: number }[],
    seriesTitle: string,
    coverUrl?: string | null,
  ) => Promise<string[]>;
  pauseJob: (jobId: string) => void;
  resumeJob: (jobId: string) => void;
  cancelJob: (jobId: string) => Promise<void>;
  pauseAll: () => void;
  resumeAll: () => void;
  retryJob: (jobId: string) => Promise<void>;
  retryAllErrors: () => Promise<number>;
  clearErrors: () => Promise<number>;
  clearCompletedLogs: () => Promise<number>;
  clearLog: (jobId: string) => Promise<void>;
  isChapterDownloaded: (seriesId: string, chapterId: string) => boolean;
  isChapterDownloading: (seriesId: string, chapterId: string) => boolean;
}

export function useOfflineDownloads(): OfflineDownloadsState {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const downloadedMap = useRef<Map<string, boolean>>(new Map());
  const downloadingMap = useRef<Map<string, boolean>>(new Map());

  const refresh = useCallback(async () => {
    const all = await offlineStorage.getAllJobs();
    setJobs(all);

    const newDownloaded = new Map<string, boolean>();
    for (const job of all) {
      if (job.status === "complete") {
        newDownloaded.set(`${job.seriesId}:${job.chapterId}`, true);
      }
    }

    const completedMeta = await offlineStorage.getAllDownloadedChapters();
    for (const ch of completedMeta) {
      newDownloaded.set(`${ch.seriesId}:${ch.chapterId}`, true);
    }

    const newDownloading = new Map<string, boolean>();
    for (const job of all) {
      if (job.status === "queued" || job.status === "downloading") {
        newDownloading.set(`${job.seriesId}:${job.chapterId}`, true);
      }
    }

    downloadedMap.current = newDownloaded;
    downloadingMap.current = newDownloading;
  }, []);

  useEffect(() => {
    refresh();
    const unsub = offlineDownload.subscribe(() => {
      refresh();
    });
    return unsub;
  }, [refresh]);

  const activeJobs = jobs.filter((j) => j.status === "downloading");
  const pendingJobs = jobs.filter((j) => j.status === "queued" || j.status === "paused");
  const completedJobs = jobs.filter((j) => j.status === "complete");
  const isDownloading = activeJobs.length > 0;

  const totalProgress = (() => {
    const downloading = jobs.filter((j) => j.status === "downloading");
    let pagesComplete = 0;
    let pagesTotal = 0;
    for (const j of downloading) {
      pagesComplete += j.completedPages;
      pagesTotal += j.totalPages;
    }
    return {
      pagesComplete,
      pagesTotal,
      percent: pagesTotal > 0 ? (pagesComplete / pagesTotal) * 100 : 0,
    };
  })();

  const isChapterDownloaded = useCallback(
    (seriesId: string, chapterId: string) =>
      downloadedMap.current.has(`${seriesId}:${chapterId}`),
    [],
  );

  const isChapterDownloading = useCallback(
    (seriesId: string, chapterId: string) =>
      downloadingMap.current.has(`${seriesId}:${chapterId}`),
    [],
  );

  const downloadChapter = useCallback(
    async (
      seriesId: string,
      chapterId: string,
      chapterNumber: number,
      chapterTitle: string,
      seriesTitle: string,
      pageCount: number,
      coverUrl?: string | null,
    ) =>
      offlineDownload.enqueueChapter(
        seriesId,
        chapterId,
        chapterNumber,
        chapterTitle,
        seriesTitle,
        pageCount,
        undefined,
        coverUrl,
      ),
    [],
  );

  const downloadSeries = useCallback(
    async (
      seriesId: string,
      chapters: { chapterId: string; chapterNumber: number; chapterTitle: string; pageCount: number }[],
      seriesTitle: string,
      coverUrl?: string | null,
    ) => offlineDownload.enqueueSeries(seriesId, chapters, seriesTitle, coverUrl),
    [],
  );

  return {
    jobs,
    activeJobs,
    pendingJobs,
    completedJobs,
    isDownloading,
    totalProgress,
    downloadChapter,
    downloadSeries,
    pauseJob: offlineDownload.pauseJob,
    resumeJob: offlineDownload.resumeJob,
    cancelJob: offlineDownload.cancelJob,
    pauseAll: offlineDownload.pauseAll,
    resumeAll: offlineDownload.resumeAll,
    retryJob: offlineDownload.retryJob,
    retryAllErrors: offlineDownload.retryAllErrors,
    clearErrors: offlineDownload.clearErrors,
    clearCompletedLogs: offlineDownload.clearCompletedLogs,
    clearLog: offlineDownload.clearLog,
    isChapterDownloaded,
    isChapterDownloading,
  };
}
