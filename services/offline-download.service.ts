import api from "./api";
import type { DownloadJob } from "@/types/offline";
import * as offlineStorage from "./offline-storage.service";
import toast from "react-hot-toast";

const MAX_CONCURRENT_PAGES = 2;
const MAX_CONCURRENT_CHAPTERS = 1;
const PAGE_RETRY_LIMIT = 3;
const BATCH_DELAY_MS = 500;
const RATE_LIMIT_BACKOFF_MS = 2000;
const MAX_CONSECUTIVE_429 = 3;

const QUALITY_ESTIMATE_BYTES: Record<string, number> = {
  low: 150_000,
  medium: 300_000,
  high: 500_000,
};

type Listener = () => void;

interface ActiveDownload {
  abort: AbortController;
  paused: boolean;
}

const activeDownloads = new Map<string, ActiveDownload>();
const listeners = new Set<Listener>();
let processing = false;

// Speed tracking — bytes downloaded in recent window
const speedSamples: Array<{ time: number; bytes: number }> = [];
const SPEED_WINDOW_MS = 5000;

function recordBytes(bytes: number) {
  const now = Date.now();
  speedSamples.push({ time: now, bytes });
  while (speedSamples.length > 0 && now - speedSamples[0].time > SPEED_WINDOW_MS) {
    speedSamples.shift();
  }
}

export function getDownloadSpeed(): number {
  if (speedSamples.length < 2) return 0;
  const first = speedSamples[0];
  const last = speedSamples[speedSamples.length - 1];
  const elapsed = (last.time - first.time) / 1000;
  const totalBytes = speedSamples.reduce((sum, s) => sum + s.bytes, 0);
  return elapsed > 0 ? totalBytes / elapsed : 0;
}

function getQuality(): string {
  if (typeof window === "undefined") return "medium";
  try {
    const raw = localStorage.getItem("manhq:downloadQuality");
    return raw === "low" || raw === "high" ? raw : "medium";
  } catch {
    return "medium";
  }
}

function getMaxStorageBytes(): number {
  if (typeof window === "undefined") return 2 * 1024 * 1024 * 1024;
  try {
    const raw = localStorage.getItem("manhq:maxStorageMB");
    const mb = raw ? parseInt(raw, 10) : 2048;
    if (!Number.isFinite(mb) || mb <= 0) return Infinity;
    return mb * 1024 * 1024;
  } catch {
    return 2 * 1024 * 1024 * 1024;
  }
}

function notifyListeners() {
  for (const fn of listeners) {
    fn();
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── Online/Offline ────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("online", onNetworkRestored);
  window.addEventListener("offline", onNetworkLost);
}

function onNetworkLost() {
  for (const [, active] of activeDownloads) {
    active.paused = true;
  }
  notifyListeners();
}

async function onNetworkRestored() {
  for (const [, active] of activeDownloads) {
    active.paused = false;
  }
  notifyListeners();
  await resumeStalledJobs();
}

async function resumeStalledJobs() {
  const jobs = await offlineStorage.getJobsByStatus("downloading");
  for (const job of jobs) {
    await offlineStorage.updateJob(job.id, { status: "queued" });
  }
  startProcessing();
}

// ─── Storage Enforcement ────────────────────────────────────────────────

async function checkStorageLimit(
  pageCount: number,
  quality: string,
): Promise<boolean> {
  const maxBytes = getMaxStorageBytes();
  if (!Number.isFinite(maxBytes)) return true;

  const estimate = await offlineStorage.getStorageEstimate();
  const estimatedSize = pageCount * (QUALITY_ESTIMATE_BYTES[quality] ?? 300_000);
  const remaining = maxBytes - estimate.usage;

  if (estimatedSize > remaining) {
    const estMB = (estimatedSize / (1024 * 1024)).toFixed(1);
    const remMB = (remaining / (1024 * 1024)).toFixed(1);
    toast.error(
      `Sem espaço suficiente. Download: ~${estMB} MB, disponível: ${remMB} MB. Aumente o limite em Ajustes > Offline.`,
      { duration: 5000 },
    );
    return false;
  }
  return true;
}

// ─── Queue Management ──────────────────────────────────────────────────

export async function enqueueChapter(
  seriesId: string,
  chapterId: string,
  chapterNumber: number,
  chapterTitle: string,
  seriesTitle: string,
  pageCount: number,
  priority?: number,
  coverUrl?: string | null,
  notify?: boolean,
): Promise<string> {
  const id = crypto.randomUUID();

  const existingJobs = await offlineStorage.getAllJobs();
  const duplicate = existingJobs.find(
    (j) =>
      j.chapterId === chapterId &&
      (j.status === "queued" || j.status === "downloading"),
  );
  if (duplicate) return duplicate.id;

  const alreadyComplete = await offlineStorage.getChapterMeta(seriesId, chapterId);
  if (alreadyComplete?.downloadStatus === "complete") return "";

  const quality = getQuality();
  const hasSpace = await checkStorageLimit(pageCount, quality);
  if (!hasSpace) return "";

  const job: DownloadJob = {
    id,
    seriesId,
    chapterId,
    chapterNumber,
    chapterTitle,
    seriesTitle,
    coverUrl: coverUrl ?? null,
    totalPages: pageCount,
    completedPages: 0,
    failedPages: [],
    status: "queued",
    priority: priority ?? 0,
    createdAt: Date.now(),
  };

  await offlineStorage.saveJob(job);
  if (notify !== false) notifyListeners();
  startProcessing();
  return id;
}

export async function enqueueSeries(
  seriesId: string,
  chapters: {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    pageCount: number;
  }[],
  seriesTitle: string,
  coverUrl?: string | null,
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const id = await enqueueChapter(
      seriesId,
      ch.chapterId,
      ch.chapterNumber,
      ch.chapterTitle,
      seriesTitle,
      ch.pageCount,
      i,
      coverUrl,
      false,
    );
    if (id) ids.push(id);
  }
  notifyListeners();
  return ids;
}

// ─── Controls ──────────────────────────────────────────────────────────

export function pauseJob(jobId: string) {
  const active = activeDownloads.get(jobId);
  if (active) {
    active.paused = true;
    active.abort.abort();
    activeDownloads.delete(jobId);
  }
  offlineStorage.updateJob(jobId, { status: "paused" }).then(notifyListeners);
}

export function resumeJob(jobId: string) {
  offlineStorage.updateJob(jobId, { status: "queued" }).then(() => {
    notifyListeners();
    startProcessing();
  });
}

export async function cancelJob(jobId: string) {
  const active = activeDownloads.get(jobId);
  if (active) {
    active.abort.abort();
    activeDownloads.delete(jobId);
  }

  const job = await offlineStorage.getJob(jobId);
  if (job) {
    await offlineStorage.deleteChapter(job.seriesId, job.chapterId);
    await offlineStorage.deleteJob(jobId);
  }
  notifyListeners();
}

export async function clearErrors(): Promise<number> {
  const errorJobs = await offlineStorage.getJobsByStatus("error");
  for (const job of errorJobs) {
    await offlineStorage.deleteChapter(job.seriesId, job.chapterId);
  }
  const count = await offlineStorage.deleteJobsByStatus("error");
  if (count > 0) notifyListeners();
  return count;
}

export function pauseAll() {
  for (const [jobId, active] of activeDownloads) {
    active.paused = true;
    active.abort.abort();
    activeDownloads.delete(jobId);
    offlineStorage.updateJob(jobId, { status: "paused" });
  }
  notifyListeners();
}

export function resumeAll() {
  offlineStorage.getAllJobs().then((jobs) => {
    for (const job of jobs) {
      if (job.status === "paused") {
        offlineStorage.updateJob(job.id, { status: "queued" });
      }
    }
    notifyListeners();
    startProcessing();
  });
}

export function getActiveCount(): number {
  return activeDownloads.size;
}

export async function isChapterDownloaded(
  seriesId: string,
  chapterId: string,
): Promise<boolean> {
  const meta = await offlineStorage.getChapterMeta(seriesId, chapterId);
  return meta?.downloadStatus === "complete";
}

// ─── Processing Loop ───────────────────────────────────────────────────

let processingTimer: ReturnType<typeof setTimeout> | null = null;

function startProcessing() {
  if (processing) return;
  processing = true;
  scheduleNextTick();
}

function scheduleNextTick() {
  if (processingTimer) clearTimeout(processingTimer);
  processingTimer = setTimeout(processNextBatch, 100);
}

async function processNextBatch() {
  try {
    const activeCount = activeDownloads.size;
    if (activeCount >= MAX_CONCURRENT_CHAPTERS) {
      processingTimer = setTimeout(processNextBatch, 500);
      return;
    }

    const jobs = await offlineStorage.getJobsByStatus("queued");
    if (jobs.length === 0) {
      processing = false;
      return;
    }

    jobs.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
    const job = jobs[0];

    if (activeDownloads.has(job.id)) {
      scheduleNextTick();
      return;
    }

    downloadJob(job).finally(() => {
      scheduleNextTick();
    });
  } catch {
    scheduleNextTick();
  }
}

// ─── Parallel Page Download Pool ───────────────────────────────────────

async function downloadJob(job: DownloadJob) {
  const abort = new AbortController();
  activeDownloads.set(job.id, { abort, paused: false });

  // Track downloaded pages as a Set (not max page number) to avoid
  // race conditions when parallel pages complete out of order.
  const downloadedPages = new Set<number>();
  const failedPageSet = new Set<number>(job.failedPages);
  let stopped = false;
  let consecutive429s = 0;

  try {
    await offlineStorage.updateJob(job.id, {
      status: "downloading",
      startedAt: Date.now(),
    });
    notifyListeners();

    const quality = getQuality();
    const response = await api.get<{ pageCount: number }>(
      `/read/${job.chapterId}/info`,
      { signal: abort.signal },
    );
    const pageCount = response.data.pageCount ?? job.totalPages;

    // Download cover if available and not already cached
    let localCoverUrl: string | null = null;
    if (job.coverUrl) {
      try {
        const coverExists = await offlineStorage.coverExists(job.seriesId);
        if (!coverExists) {
          const coverResponse = await api.get(job.coverUrl, {
            responseType: "blob",
            signal: abort.signal,
          });
          await offlineStorage.saveCover(job.seriesId, coverResponse.data as Blob);
        }
        const coverBlob = await offlineStorage.getCover(job.seriesId);
        if (coverBlob) {
          localCoverUrl = URL.createObjectURL(coverBlob);
        }
      } catch {
        // Cover download is best-effort; don't fail the chapter
      }
    }

    await offlineStorage.saveChapterMeta({
      compositeKey: `${job.seriesId}:${job.chapterId}`,
      seriesId: job.seriesId,
      chapterId: job.chapterId,
      chapterNumber: job.chapterNumber,
      chapterTitle: job.chapterTitle,
      seriesTitle: job.seriesTitle,
      coverUrl: localCoverUrl,
      pageCount,
      downloadedPages: 0,
      downloadStatus: "downloading",
      createdAt: Date.now(),
      totalSizeBytes: 0,
    });

    // Build pending page list (pages that haven't been downloaded yet)
    const pendingPages: number[] = [];
    for (let p = 1; p <= pageCount; p++) {
      if (!failedPageSet.has(p)) {
        pendingPages.push(p);
      }
    }

    // Concurrent pool: maintain up to MAX_CONCURRENT_PAGES in flight
    const inflight = new Map<number, Promise<void>>();

    const downloadSinglePage = async (page: number): Promise<void> => {
      const active = activeDownloads.get(job.id);
      if (!active || active.paused) throw new Error("PAUSED");

      for (let attempt = 0; attempt < PAGE_RETRY_LIMIT; attempt++) {
        if (attempt > 0) {
          await sleep(Math.min(1000 * Math.pow(2, attempt), 8000));
        }

        const active = activeDownloads.get(job.id);
        if (!active || active.paused) throw new Error("PAUSED");

        try {
          const blobResponse = await api.get(
            `/read/${job.chapterId}/page/${page}`,
            {
              responseType: "blob",
              signal: active.abort.signal,
              params: { quality },
            },
          );

          await offlineStorage.savePage(job.chapterId, page, blobResponse.data);
          await offlineStorage.incrementDownloadedPages(
            job.seriesId,
            job.chapterId,
            blobResponse.data.size,
          );
          recordBytes(blobResponse.data.size);

          // Reset 429 counter on successful download
          consecutive429s = 0;

          // Space out requests to stay under backend rate limit
          await sleep(BATCH_DELAY_MS);

          downloadedPages.add(page);
          failedPageSet.delete(page);

          await offlineStorage.updateJob(job.id, {
            completedPages: downloadedPages.size,
            failedPages: [...failedPageSet],
          });
          notifyListeners();
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") throw err;
          if (err instanceof Error && err.message === "PAUSED") throw err;

          // Quota exceeded — surface it immediately
          if (
            err &&
            typeof err === "object" &&
            "name" in err &&
            (err as { name: string }).name === "QuotaExceededError"
          ) {
            throw err;
          }

          // Rate limited (429) — back off and reset 429 counter on other errors
          if (err && typeof err === "object" && "response" in err) {
            const axiosErr = err as { response?: { status?: number } };
            if (axiosErr.response?.status === 429) {
              consecutive429s++;
              if (consecutive429s >= MAX_CONSECUTIVE_429) {
                stopped = true;
                await offlineStorage.updateJob(job.id, {
                  status: "error",
                  errorMessage: "Servidor sobrecarregado. Tente novamente mais tarde.",
                });
                activeDownloads.delete(job.id);
                notifyListeners();
                throw new Error("RATE_LIMITED");
              }
              await sleep(RATE_LIMIT_BACKOFF_MS);
              continue;
            }

            // 401 — session expired, abort entire job
            if (axiosErr.response?.status === 401) {
              stopped = true;
              await offlineStorage.updateJob(job.id, {
                status: "error",
                errorMessage: "Sessão expirada. Faça login novamente.",
              });
              activeDownloads.delete(job.id);
              notifyListeners();
              throw new Error("AUTH_EXPIRED");
            }
          }

          // Non-429 error resets the 429 counter
          consecutive429s = 0;
        }
      }

      // All retries exhausted — track as failed
      failedPageSet.add(page);
      await offlineStorage.updateJob(job.id, {
        completedPages: downloadedPages.size,
        failedPages: [...failedPageSet],
      });
      notifyListeners();
    };

    let nextPageIdx = 0;

    const fillPool = () => {
      while (inflight.size < MAX_CONCURRENT_PAGES && nextPageIdx < pendingPages.length && !stopped) {
        const page = pendingPages[nextPageIdx++];
        const promise = downloadSinglePage(page)
          .then(() => {
            inflight.delete(page);
            fillPool();
          })
          .catch((err) => {
            inflight.delete(page);
            if (
              err instanceof Error &&
              (err.name === "AbortError" ||
                err.message === "PAUSED" ||
                err.message === "AUTH_EXPIRED")
            ) {
              return;
            }
            if (
              err &&
              typeof err === "object" &&
              "name" in err &&
              (err as { name: string }).name === "QuotaExceededError"
            ) {
              stopped = true;
              return;
            }
            // Other errors: keep filling to process remaining pages
            fillPool();
          });
        inflight.set(page, promise);
      }
    };

    fillPool();
    await Promise.allSettled(inflight.values());

    // Check if paused or aborted
    const active = activeDownloads.get(job.id);
    if (!active || active.paused) {
      await offlineStorage.updateJob(job.id, { status: "paused" });
      activeDownloads.delete(job.id);
      notifyListeners();
      return;
    }

    if (stopped) {
      // Already handled in catch above
      return;
    }

    const completedCount = downloadedPages.size;
    const failedArr = [...failedPageSet];

    // Quota exceeded during download — pause
    if (failedArr.length > 0 && completedCount > 0) {
      // Check if the recent failures look like QuotaExceeded
      await offlineStorage.updateJob(job.id, {
        status: completedCount >= pageCount * 0.8 ? "error" : "paused",
        completedAt: Date.now(),
        errorMessage:
          failedArr.length > 5
            ? "Armazenamento cheio. Libere espaço ou aumente o limite."
            : `${failedArr.length} página(s) falharam`,
        completedPages: completedCount,
        failedPages: failedArr,
      });

      if (failedArr.length > 5) {
        await offlineStorage.updateChapterStatus(
          job.seriesId,
          job.chapterId,
          "error",
          "Armazenamento cheio",
        );
        toast.error(
          "Armazenamento cheio. Aumente o limite em Ajustes > Offline.",
          { duration: 5000 },
        );
      } else if (completedCount >= pageCount * 0.8) {
        // 80%+ success — still usable
        await offlineStorage.updateChapterStatus(
          job.seriesId,
          job.chapterId,
          "complete",
        );
        const chTitle = job.chapterTitle || `Capítulo ${job.chapterNumber}`;
        toast.success(
          `${chTitle} baixado (${failedArr.length} página(s) falharam)`,
          { duration: 4000 },
        );
      } else {
        await offlineStorage.updateChapterStatus(
          job.seriesId,
          job.chapterId,
          "error",
          `${failedArr.length} páginas falharam`,
        );
        toast.error(
          `${job.chapterTitle || `Capítulo ${job.chapterNumber}`}: ${failedArr.length} páginas falharam`,
        );
      }

      activeDownloads.delete(job.id);
      notifyListeners();
      return;
    }

    // All failed, none succeeded
    if (failedArr.length > 0 && completedCount === 0) {
      await offlineStorage.updateJob(job.id, {
        status: "error",
        completedAt: Date.now(),
        errorMessage: "Nenhuma página pôde ser baixada.",
        completedPages: 0,
        failedPages: failedArr,
      });
      await offlineStorage.updateChapterStatus(
        job.seriesId,
        job.chapterId,
        "error",
        "Nenhuma página baixada",
      );
      toast.error(
        `${job.chapterTitle || `Capítulo ${job.chapterNumber}`}: falha completa`,
      );
      activeDownloads.delete(job.id);
      notifyListeners();
      return;
    }

    // All pages completed successfully
    await offlineStorage.updateJob(job.id, {
      status: "complete",
      completedAt: Date.now(),
      completedPages: pageCount,
      failedPages: [],
    });
    await offlineStorage.updateChapterStatus(job.seriesId, job.chapterId, "complete");

    const chTitle = job.chapterTitle || `Capítulo ${job.chapterNumber}`;
    toast.success(`${chTitle} baixado`, { duration: 3000 });
    activeDownloads.delete(job.id);
    notifyListeners();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    if (err instanceof Error && err.message === "AUTH_EXPIRED") return;

    if (err && typeof err === "object" && "name" in err) {
      const domErr = err as { name: string };
      if (domErr.name === "QuotaExceededError") {
        await offlineStorage.updateJob(job.id, {
          status: "paused",
          errorMessage:
            "Armazenamento cheio. Libere espaço ou aumente o limite.",
        });
        toast.error(
          "Armazenamento cheio. Aumente o limite em Ajustes > Offline.",
          { duration: 5000 },
        );
        activeDownloads.delete(job.id);
        notifyListeners();
        return;
      }
    }

    await offlineStorage.updateJob(job.id, {
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
      completedAt: Date.now(),
    });
    toast.error(
      `Falha ao baixar ${job.chapterTitle || `Capítulo ${job.chapterNumber}`}`,
    );
  } finally {
    activeDownloads.delete(job.id);
    notifyListeners();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-queue interrupted jobs on page load
if (typeof window !== "undefined") {
  offlineStorage.getJobsByStatus("downloading").then((jobs) => {
    for (const job of jobs) {
      offlineStorage.updateJob(job.id, { status: "queued" });
    }
    if (jobs.length > 0) startProcessing();
  });
}
