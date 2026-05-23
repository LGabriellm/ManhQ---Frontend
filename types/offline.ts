// Tipos do sistema offline — IndexedDB stores e download queue

export type DownloadStatus = "pending" | "downloading" | "paused" | "complete" | "error";
export type DownloadJobStatus = "queued" | "downloading" | "paused" | "complete" | "error";

export interface OfflineChapter {
  compositeKey: string; // `${seriesId}:${chapterId}`
  seriesId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  seriesTitle: string;
  coverUrl: string | null;
  pageCount: number;
  downloadedPages: number;
  downloadStatus: DownloadStatus;
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
  totalSizeBytes: number;
}

export interface OfflinePage {
  compositeKey: string; // `${chapterId}:${pageNumber}`
  chapterId: string;
  pageNumber: number;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  downloadedAt: number;
}

export interface QueuedProgress {
  id?: number;
  chapterId: string;
  page: number;
  progressPercent?: number;
  suppressStats?: boolean;
  finished: boolean;
  stats: {
    pages: number;
    timeSpent: number;
    chapterCompleted?: boolean;
  } | null;
  queuedAt: number;
  attempts: number;
  lastAttemptAt?: number;
}

export interface DownloadJob {
  id: string;
  seriesId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  seriesTitle: string;
  coverUrl?: string | null;
  totalPages: number;
  completedPages: number;
  failedPages: number[];
  status: DownloadJobStatus;
  priority: number;
  errorMessage?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface DownloadedSeries {
  seriesId: string;
  seriesTitle: string;
  coverUrl: string | null;
  chapterCount: number;
}
