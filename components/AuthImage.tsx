"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { readerService } from "@/services/reader.service";

interface AuthImageProps {
  chapterId: string;
  pageNumber: number;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  preloadMargin?: string;
}

export function AuthImage({
  chapterId,
  pageNumber,
  alt,
  className,
  loading = "lazy",
  preloadMargin = "800px",
}: AuthImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(loading === "eager");
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver para lazy loading
  useEffect(() => {
    if (loading === "eager" || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
          }
        });
      },
      {
        rootMargin: preloadMargin,
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, shouldLoad, preloadMargin]);

  // Carregar a imagem quando shouldLoad for true
  useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;
    let blobUrl: string | null = null;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(false);
        blobUrl = await readerService.getPageBlob(chapterId, pageNumber);
        if (isMounted) {
          setImageSrc(blobUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Erro ao carregar imagem:", err);
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [chapterId, pageNumber, shouldLoad, retryCount]);

  const handleRetry = useCallback(() => {
    setError(false);
    setImageSrc(null);
    setShouldLoad(true);
    setRetryCount((c) => c + 1);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      {error && (
        <div className="flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-white/50">Erro ao carregar imagem</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {!error && (isLoading || !imageSrc) && (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}

      {!error && imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={alt} className={className} draggable={false} />
      )}
    </div>
  );
}
