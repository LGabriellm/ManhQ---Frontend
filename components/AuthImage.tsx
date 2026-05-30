"use client";

import { useState, useEffect, useRef, useCallback, type SyntheticEvent } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { readerService } from "@/services/reader.service";
import * as offlineStorage from "@/services/offline-storage.service";

interface AuthImageProps {
  chapterId: string;
  pageNumber: number;
  alt: string;
  className?: string;
  containerClassName?: string;
  loading?: "eager" | "lazy";
  preloadMargin?: string;
  seriesId?: string;
  useOffline?: boolean;
  onImageLoad?: (metrics: {
    pageNumber: number;
    naturalWidth: number;
    naturalHeight: number;
    renderedWidth: number;
    renderedHeight: number;
  }) => void;
}

export function AuthImage({
  chapterId,
  pageNumber,
  alt,
  className,
  containerClassName = "flex h-full w-full items-center justify-center",
  loading = "lazy",
  preloadMargin = "800px",
  seriesId = "",
  useOffline = false,
  onImageLoad,
}: AuthImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(loading === "eager");
  const [isVisible, setIsVisible] = useState(loading === "eager");
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedDimensions, setRenderedDimensions] = useState<{ width: number; height: number } | null>(null);

  // IntersectionObserver para lazy loading
  useEffect(() => {
    if (loading === "eager" || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            setIsVisible(true);
          } else {
            // Unload image from memory if it goes too far off-screen
            setIsVisible(false);
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

        if (useOffline && seriesId) {
          const cached = await offlineStorage.getPageUrl(chapterId, pageNumber);
          if (cached) {
            if (isMounted) {
              setImageSrc(cached);
              setIsLoading(false);
            }
            return;
          }
        }

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
  }, [chapterId, pageNumber, shouldLoad, retryCount, useOffline, seriesId]);

  const handleRetry = useCallback(() => {
    setError(false);
    setImageSrc(null);
    setShouldLoad(true);
    setRetryCount((c) => c + 1);
  }, []);

  const handleImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      setRenderedDimensions({ width: img.clientWidth, height: img.clientHeight });
      onImageLoad?.({
        pageNumber,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: img.clientWidth,
        renderedHeight: img.clientHeight,
      });
    },
    [onImageLoad, pageNumber],
  );

  return (
    <div
      ref={containerRef}
      className={containerClassName}
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

      {!error && imageSrc && isVisible && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={alt}
          className={className}
          decoding="async"
          draggable={false}
          onLoad={handleImageLoad}
        />
      )}

      {/* Placeholder to maintain scroll position when image is unloaded */}
      {!error && imageSrc && !isVisible && renderedDimensions && (
        <div 
          style={{ width: renderedDimensions.width, height: renderedDimensions.height }} 
          className="bg-surface/20"
        />
      )}
    </div>
  );
}
