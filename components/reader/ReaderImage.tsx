"use client";

import { memo, useState, useCallback } from "react";
import { Loader2, ImageOff, RefreshCcw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface ReaderImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Whether to eager-load this image (skips lazy loading) */
  eager?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export const ReaderImage = memo(function ReaderImage({
  src,
  alt,
  className,
  eager = false,
}: ReaderImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error",
  );
  const [retryKey, setRetryKey] = useState(0);

  const handleLoad = useCallback(() => {
    setStatus("loaded");
  }, []);

  const handleError = useCallback(() => {
    setStatus("error");
  }, []);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setRetryKey((k) => k + 1);
  }, []);

  // Loading skeleton
  if (status === "loading" && src) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e50914]" />
        {/* Hidden img for preloading */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={retryKey}
          src={src}
          alt={alt}
          className="hidden"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // Loaded state
  if (status === "loaded" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={retryKey}
        src={src}
        alt={alt}
        className={className}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onError={handleError}
      />
    );
  }

  // Error state (or no src)
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
        <ImageOff className="h-6 w-6 text-[#a3a3a3]" />
      </div>
      <p className="text-sm text-[#a3a3a3]">Erro ao carregar imagem</p>
      {src && (
        <button
          type="button"
          onClick={handleRetry}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 active:scale-95"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
      )}
    </div>
  );
});
