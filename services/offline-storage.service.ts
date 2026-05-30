import type {
  OfflineChapter,
  OfflinePage,
  QueuedProgress,
  DownloadJob,
  DownloadedSeries,
} from "@/types/offline";

const DB_NAME = "manhq-offline";
const DB_VERSION = 2;

const STORE_CHAPTERS = "chapters";
const STORE_PAGES = "pages";
const STORE_PROGRESS = "progressQueue";
const STORE_JOBS = "downloadQueue";
const STORE_COVERS = "covers";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        const chaptersStore = db.createObjectStore(STORE_CHAPTERS, {
          keyPath: "compositeKey",
        });
        chaptersStore.createIndex("bySeries", "seriesId", { unique: false });
        chaptersStore.createIndex("byStatus", "downloadStatus", { unique: false });
        chaptersStore.createIndex("byCreatedAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        const pagesStore = db.createObjectStore(STORE_PAGES, {
          keyPath: "compositeKey",
        });
        pagesStore.createIndex("byChapter", "chapterId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        const progressStore = db.createObjectStore(STORE_PROGRESS, {
          keyPath: "id",
          autoIncrement: true,
        });
        progressStore.createIndex("byChapter", "chapterId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_JOBS)) {
        const jobsStore = db.createObjectStore(STORE_JOBS, { keyPath: "id" });
        jobsStore.createIndex("byStatus", "status", { unique: false });
        jobsStore.createIndex("byPriority", "priority", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_COVERS)) {
        db.createObjectStore(STORE_COVERS, { keyPath: "seriesId" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB blocked — close other tabs"));
    };
  });

  return dbPromise;
}

function getDB(): Promise<IDBDatabase> {
  return openDB();
}

// ─── Chapters ──────────────────────────────────────────────────────────

function makeChapterCompositeKey(seriesId: string, chapterId: string): string {
  return `${seriesId}:${chapterId}`;
}

export async function saveChapterMeta(meta: OfflineChapter): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readwrite");
    const store = tx.objectStore(STORE_CHAPTERS);
    store.put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChapterMeta(
  seriesId: string,
  chapterId: string,
): Promise<OfflineChapter | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readonly");
    const store = tx.objectStore(STORE_CHAPTERS);
    const request = store.get(makeChapterCompositeKey(seriesId, chapterId));
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllChaptersBySeries(
  seriesId: string,
): Promise<OfflineChapter[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readonly");
    const index = tx.objectStore(STORE_CHAPTERS).index("bySeries");
    const request = index.getAll(seriesId);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDownloadedChapters(): Promise<OfflineChapter[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readonly");
    const index = tx.objectStore(STORE_CHAPTERS).index("byStatus");
    const request = index.getAll("complete");
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function getChaptersByStatus(
  status: string,
): Promise<OfflineChapter[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readonly");
    const index = tx.objectStore(STORE_CHAPTERS).index("byStatus");
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function updateChapterStatus(
  seriesId: string,
  chapterId: string,
  status: OfflineChapter["downloadStatus"],
  error?: string,
): Promise<void> {
  const db = await getDB();
  const meta = await getChapterMeta(seriesId, chapterId);
  if (!meta) return;

  meta.downloadStatus = status;
  if (error) meta.errorMessage = error;
  if (status === "complete") meta.completedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readwrite");
    tx.objectStore(STORE_CHAPTERS).put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function incrementDownloadedPages(
  seriesId: string,
  chapterId: string,
  sizeBytes: number,
): Promise<void> {
  const db = await getDB();
  const meta = await getChapterMeta(seriesId, chapterId);
  if (!meta) return;

  meta.downloadedPages += 1;
  meta.totalSizeBytes += sizeBytes;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHAPTERS, "readwrite");
    tx.objectStore(STORE_CHAPTERS).put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteChapter(
  seriesId: string,
  chapterId: string,
): Promise<void> {
  const db = await getDB();
  const chapterTx = db.transaction(STORE_CHAPTERS, "readwrite");
  chapterTx.objectStore(STORE_CHAPTERS).delete(
    makeChapterCompositeKey(seriesId, chapterId),
  );

  const pageTx = db.transaction(STORE_PAGES, "readwrite");
  const pageIndex = pageTx.objectStore(STORE_PAGES).index("byChapter");
  const pageRequest = pageIndex.getAllKeys(chapterId);
  pageRequest.onsuccess = () => {
    for (const key of pageRequest.result) {
      pageTx.objectStore(STORE_PAGES).delete(key);
    }
  };

  return new Promise((resolve, reject) => {
    chapterTx.oncomplete = () => resolve();
    chapterTx.onerror = () => reject(chapterTx.error);
  });
}

export async function deleteSeries(seriesId: string): Promise<void> {
  const chapters = await getAllChaptersBySeries(seriesId);
  for (const ch of chapters) {
    await deleteChapter(ch.seriesId, ch.chapterId);
  }
}

export async function getAllDownloadedSeries(): Promise<DownloadedSeries[]> {
  const chapters = await getAllDownloadedChapters();
  const map = new Map<
    string,
    { seriesTitle: string; coverUrl: string | null; count: number }
  >();

  for (const ch of chapters) {
    const existing = map.get(ch.seriesId);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(ch.seriesId, {
        seriesTitle: ch.seriesTitle,
        coverUrl: ch.coverUrl,
        count: 1,
      });
    }
  }

  return Array.from(map.entries()).map(([seriesId, info]) => ({
    seriesId,
    seriesTitle: info.seriesTitle,
    coverUrl: info.coverUrl,
    chapterCount: info.count,
  }));
}

// ─── Pages ─────────────────────────────────────────────────────────────

function makePageCompositeKey(chapterId: string, pageNumber: number): string {
  return `${chapterId}:${pageNumber}`;
}

export async function savePage(
  chapterId: string,
  pageNumber: number,
  blob: Blob,
): Promise<void> {
  const db = await getDB();
  const page: OfflinePage = {
    compositeKey: makePageCompositeKey(chapterId, pageNumber),
    chapterId,
    pageNumber,
    blob,
    mimeType: blob.type || "image/jpeg",
    sizeBytes: blob.size,
    downloadedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAGES, "readwrite");
    tx.objectStore(STORE_PAGES).put(page);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPage(
  chapterId: string,
  pageNumber: number,
): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAGES, "readonly");
    const request = tx
      .objectStore(STORE_PAGES)
      .get(makePageCompositeKey(chapterId, pageNumber));
    request.onsuccess = () => resolve(request.result?.blob ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getPageUrl(
  chapterId: string,
  pageNumber: number,
): Promise<string | null> {
  const blob = await getPage(chapterId, pageNumber);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function pageExists(
  chapterId: string,
  pageNumber: number,
): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAGES, "readonly");
    const request = tx
      .objectStore(STORE_PAGES)
      .getKey(makePageCompositeKey(chapterId, pageNumber));
    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePagesForChapter(chapterId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAGES, "readwrite");
    const index = tx.objectStore(STORE_PAGES).index("byChapter");
    const request = index.getAllKeys(chapterId);
    request.onsuccess = () => {
      for (const key of request.result) {
        tx.objectStore(STORE_PAGES).delete(key);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Progress Queue ────────────────────────────────────────────────────

export async function queueProgress(
  entry: Omit<QueuedProgress, "id" | "attempts">,
): Promise<void> {
  const db = await getDB();
  const record: QueuedProgress = { ...entry, attempts: 0 };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readwrite");
    tx.objectStore(STORE_PROGRESS).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingProgress(): Promise<QueuedProgress[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readonly");
    const request = tx.objectStore(STORE_PROGRESS).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function markProgressSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readwrite");
    for (const id of ids) {
      tx.objectStore(STORE_PROGRESS).delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function incrementProgressAttempt(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readwrite");
    const store = tx.objectStore(STORE_PROGRESS);
    for (const id of ids) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const entry = getReq.result as QueuedProgress | undefined;
        if (entry) {
          entry.attempts += 1;
          entry.lastAttemptAt = Date.now();
          store.put(entry);
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProgressQueueSize(): Promise<number> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, "readonly");
    const request = tx.objectStore(STORE_PROGRESS).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Download Jobs ─────────────────────────────────────────────────────

export async function saveJob(job: DownloadJob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readwrite");
    tx.objectStore(STORE_JOBS).put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getJob(id: string): Promise<DownloadJob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readonly");
    const request = tx.objectStore(STORE_JOBS).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getJobsByStatus(
  status: string,
): Promise<DownloadJob[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readonly");
    const index = tx.objectStore(STORE_JOBS).index("byStatus");
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllJobs(): Promise<DownloadJob[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readonly");
    const request = tx.objectStore(STORE_JOBS).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function updateJob(
  id: string,
  patch: Partial<DownloadJob>,
): Promise<void> {
  const db = await getDB();
  const job = await getJob(id);
  if (!job) return;
  const updated = { ...job, ...patch };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readwrite");
    tx.objectStore(STORE_JOBS).put(updated);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteJob(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readwrite");
    tx.objectStore(STORE_JOBS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteJobsByStatus(status: string): Promise<number> {
  const db = await getDB();
  const jobs = await getJobsByStatus(status);
  if (jobs.length === 0) return 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JOBS, "readwrite");
    for (const job of jobs) {
      tx.objectStore(STORE_JOBS).delete(job.id);
    }
    tx.oncomplete = () => resolve(jobs.length);
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Covers ─────────────────────────────────────────────────────────────

export async function saveCover(seriesId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COVERS, "readwrite");
    tx.objectStore(STORE_COVERS).put({ seriesId, blob, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCover(seriesId: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COVERS, "readonly");
    const request = tx.objectStore(STORE_COVERS).get(seriesId);
    request.onsuccess = () => resolve(request.result?.blob ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function coverExists(seriesId: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COVERS, "readonly");
    const request = tx.objectStore(STORE_COVERS).getKey(seriesId);
    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSeriesCovers(seriesId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COVERS, "readwrite");
    tx.objectStore(STORE_COVERS).delete(seriesId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Storage Quota ─────────────────────────────────────────────────────

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  let actualUsage = 0;
  try {
    const db = await getDB();
    const allChapters = await new Promise<OfflineChapter[]>((resolve, reject) => {
      const tx = db.transaction(STORE_CHAPTERS, "readonly");
      const request = tx.objectStore(STORE_CHAPTERS).getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
    actualUsage = allChapters.reduce((acc, ch) => acc + (ch.totalSizeBytes || 0), 0);
  } catch (err) {
    console.error("Failed to calculate actual indexeddb usage", err);
  }

  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota ?? 0;
      // Many browsers (esp Safari) report 0 or inaccurate estimate.usage, so we enforce our manually tracked size
      const usage = actualUsage > 0 ? actualUsage : (estimate.usage ?? 0);
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    } catch (e) {
      console.error("navigator.storage.estimate failed", e);
    }
  }
  
  // Fallback if estimate API is completely unavailable
  return { usage: actualUsage, quota: 0, percentUsed: 0 };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ("storage" in navigator && "persist" in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}
