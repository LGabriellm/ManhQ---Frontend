"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Loader2, ScrollText, Columns, AlignVerticalSpaceAround } from "lucide-react";
import { getChapterMeta, getPageUrl } from "@/services/offline-storage.service";
import type { OfflineChapter } from "@/types/offline";

interface OfflineReaderProps {
  seriesId: string;
  chapterId: string;
  onClose: () => void;
}

export function OfflineReader({ seriesId, chapterId, onClose }: OfflineReaderProps) {
  const [meta, setMeta] = useState<OfflineChapter | null>(null);
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"vertical" | "webtoon">("vertical");

  useEffect(() => {
    let urls: string[] = [];
    async function load() {
      try {
        const chapterMeta = await getChapterMeta(seriesId, chapterId);
        if (!chapterMeta) {
          setLoading(false);
          return;
        }
        setMeta(chapterMeta);

        const fetchedUrls: string[] = [];
        for (let i = 1; i <= chapterMeta.pageCount; i++) {
          const url = await getPageUrl(chapterId, i);
          if (url) fetchedUrls.push(url);
        }
        urls = fetchedUrls;
        setPageUrls(urls);
      } catch (err) {
        console.error("OfflineReader Error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      // Cleanup object URLs to avoid memory leaks
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [seriesId, chapterId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white px-4 text-center">
        <p className="mb-4 text-lg">Capítulo não encontrado no armazenamento offline.</p>
        <button onClick={onClose} className="rounded-full bg-primary px-6 py-2 font-bold">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between bg-black/80 p-4 backdrop-blur-md absolute top-0 w-full z-10">
        <button onClick={onClose} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold truncate px-4">
          {meta.seriesTitle} - {meta.chapterTitle || `Cap. ${meta.chapterNumber}`}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setMode("vertical")} className={`p-2 rounded-lg ${mode === "vertical" ? "bg-primary/20 text-primary" : "text-white/60 hover:bg-white/10"}`}>
            <AlignVerticalSpaceAround className="h-5 w-5" />
          </button>
          <button onClick={() => setMode("webtoon")} className={`p-2 rounded-lg ${mode === "webtoon" ? "bg-primary/20 text-primary" : "text-white/60 hover:bg-white/10"}`}>
            <ScrollText className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${mode === "vertical" ? "snap-y snap-mandatory" : ""}`}>
        {pageUrls.map((url, i) => (
          <div key={url} className={`w-full flex items-center justify-center ${mode === "vertical" ? "h-screen snap-start" : "h-auto"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={url} 
              alt={`Página ${i + 1}`} 
              className={mode === "vertical" ? "max-h-full max-w-full object-contain" : "w-full max-w-[900px] h-auto object-contain"} 
            />
          </div>
        ))}
        {pageUrls.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-white/50">Nenhuma página baixada.</p>
          </div>
        )}
        <div className="h-32 w-full flex items-center justify-center text-white/40 text-sm snap-start shrink-0">
          Fim do capítulo
        </div>
      </div>
    </div>
  );
}
