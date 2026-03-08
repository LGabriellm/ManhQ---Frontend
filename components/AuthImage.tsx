"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { readerService } from "@/services/reader.service";

interface AuthImageProps {
  chapterId: string;
  pageNumber: number;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}

export function AuthImage({
  chapterId,
  pageNumber,
  alt,
  className,
  loading = "lazy",
}: AuthImageProps) {
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
        rootMargin: "400px", // Começar a carregar 400px antes de entrar na viewport
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, shouldLoad]);

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
      // Liberar o blob URL quando o componente desmontar
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [chapterId, pageNumber, shouldLoad]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      {error && (
        <div className="flex items-center justify-center w-full h-full bg-surface/20">
          <p className="text-white/50 text-sm">Erro ao carregar imagem</p>
        </div>
      )}

      {!error && (isLoading || !imageSrc) && (
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      )}

      {!error && imageSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt={alt} className={className} />
      )}
    </div>
  );
}
