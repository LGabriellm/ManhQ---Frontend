"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

interface AuthCoverProps {
  coverUrl: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  /** Tamanho compacto — spinner menor e texto de erro reduzido */
  compact?: boolean;
}

export function AuthCover({
  coverUrl,
  alt,
  className,
  loading = "lazy",
  compact = false,
}: AuthCoverProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        setIsLoading(true);
        setError(false);
        const response = await api.get(coverUrl, {
          responseType: "blob",
        });
        blobUrl = URL.createObjectURL(response.data);
        if (isMounted) {
          setImageSrc(blobUrl);
          setIsLoading(false);
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
  }, [shouldLoad, coverUrl]);

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
        <img
          src={imageSrc}
          alt={alt}
          className={className || ""}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {!imageSrc && !isLoading && !error && (
        <div className="absolute inset-0 bg-surface/50" />
      )}
    </div>
  );
}
