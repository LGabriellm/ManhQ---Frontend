"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import * as offlineStorage from "@/services/offline-storage.service";

interface AuthCoverProps {
  coverUrl: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  /** Tamanho compacto — spinner menor e texto de erro reduzido */
  compact?: boolean;
  useOffline?: boolean;
  seriesId?: string;
}

function normalizeProxyPath(pathOrUrl: string): string {
  let normalized = pathOrUrl.trim();
  
  // Se já for uma URL absoluta (como do CDN Bunny), NÃO passe pelo proxy local!
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  
  if (normalized.startsWith("/api/")) {
    return normalized.slice(4);
  }
  if (!normalized.startsWith("/")) {
    return `/${normalized}`;
  }
  return normalized;
}

export function AuthCover({
  coverUrl,
  alt,
  className,
  loading = "lazy",
  compact = false,
  useOffline = false,
  seriesId,
}: AuthCoverProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(loading === "eager");
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
        rootMargin: "400px",
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, shouldLoad]);

  // Carregar a imagem quando shouldLoad for true
  useEffect(() => {
    if (!shouldLoad || !coverUrl) return;

    let isMounted = true;
    let blobUrl: string | null = null;

    const loadImage = async () => {
      try {
        setError(false);

        if (useOffline && seriesId) {
          const blob = await offlineStorage.getCover(seriesId);
          if (blob) {
            blobUrl = URL.createObjectURL(blob);
            if (isMounted) {
              setImageSrc(blobUrl);
            }
            return;
          }
        }

        if (isMounted) {
          setImageSrc(`/api${normalizeProxyPath(coverUrl)}`);
        }
      } catch (err) {
        console.error("Erro ao carregar capa:", err);
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
  }, [shouldLoad, coverUrl, useOffline, seriesId]);

  if (!coverUrl) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-surface/50 ${className || ""}`}
      >
        {!compact && (
          <span className="text-textSecondary text-sm">Sem capa</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className || ""}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
          <Loader2
            className={`animate-spin text-primary ${compact ? "w-4 h-4" : "w-8 h-8"}`}
          />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
          {!compact && (
            <span className="text-textSecondary text-sm">Erro ao carregar</span>
          )}
        </div>
      )}

      {imageSrc && (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className={`object-cover ${className || ""}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
        />
      )}

      {!imageSrc && !isLoading && !error && (
        <div className="absolute inset-0 bg-surface/50" />
      )}
    </div>
  );
}
