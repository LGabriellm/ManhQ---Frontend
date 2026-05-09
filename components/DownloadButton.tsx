"use client";

import { Download, Loader2, Check } from "lucide-react";
import { useOfflineDownloads } from "@/hooks/useOfflineDownloads";
import { cn } from "@/lib/utils";

interface DownloadButtonProps {
  seriesId: string;
  chapterId?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  seriesTitle: string;
  pageCount?: number;
  chapters?: {
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    pageCount: number;
  }[];
  variant?: "icon" | "button";
  className?: string;
}

export function DownloadButton({
  seriesId,
  chapterId,
  chapterNumber = 0,
  chapterTitle = "",
  seriesTitle,
  pageCount = 0,
  chapters,
  variant = "icon",
  className,
}: DownloadButtonProps) {
  const {
    downloadChapter,
    downloadSeries,
    isChapterDownloaded,
    isChapterDownloading,
    jobs,
  } = useOfflineDownloads();

  const targetChapterId = chapterId ?? "";
  const downloaded = chapterId
    ? isChapterDownloaded(seriesId, chapterId)
    : false;
  const downloading = chapterId
    ? isChapterDownloading(seriesId, chapterId)
    : false;

  // Find job to get percentage
  const job = chapterId
    ? jobs.find(
        (j) =>
          j.chapterId === chapterId &&
          (j.status === "downloading" || j.status === "queued" || j.status === "paused"),
      )
    : null;
  const percent = job
    ? Math.round((job.completedPages / job.totalPages) * 100)
    : 0;

  const handleDownload = async () => {
    if (chapterId && pageCount > 0) {
      await downloadChapter(
        seriesId,
        chapterId,
        chapterNumber,
        chapterTitle,
        seriesTitle,
        pageCount,
      );
    } else if (chapters && chapters.length > 0) {
      await downloadSeries(seriesId, chapters, seriesTitle);
    }
  };

  const iconClass = cn(
    "h-5 w-5 transition-colors",
    downloaded && "text-green-400",
    downloading && "text-primary animate-pulse",
    !downloaded && !downloading && "text-white/60 hover:text-white",
    className,
  );

  if (variant === "button") {
    return (
      <button
        onClick={handleDownload}
        disabled={downloaded || downloading}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all shrink-0",
          downloaded
            ? "bg-green-500/10 text-green-400 cursor-default"
            : downloading
              ? "bg-primary/10 text-primary"
              : "bg-white/10 text-white hover:bg-white/20",
          className,
        )}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {percent > 0 ? `${percent}%` : "..."}
          </>
        ) : downloaded ? (
          <>
            <Check className="h-4 w-4" />
            Baixado
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {chapters ? `Baixar série (${chapters.length})` : "Baixar capítulo"}
          </>
        )}
      </button>
    );
  }

  if (downloaded) {
    return <Check className={iconClass} />;
  }

  if (downloading) {
    return (
      <span className="flex items-center gap-1">
        <Loader2 className={cn(iconClass, "animate-spin")} />
        {percent > 0 && (
          <span className="text-[10px] font-medium text-primary">
            {percent}%
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      onClick={handleDownload}
      aria-label={
        chapters ? `Baixar ${chapters.length} capítulos` : "Baixar capítulo"
      }
      className="p-1"
    >
      <Download className={iconClass} />
    </button>
  );
}
