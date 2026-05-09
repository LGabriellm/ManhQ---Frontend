"use client";

import { useState, useEffect, useCallback } from "react";

export type DownloadQuality = "low" | "medium" | "high";

const KEY_QUALITY = "manhq:downloadQuality";
const KEY_MAX_STORAGE = "manhq:maxStorageMB";

const DEFAULT_QUALITY: DownloadQuality = "medium";
const DEFAULT_MAX_STORAGE_MB = 2048;

function readQuality(): DownloadQuality {
  if (typeof window === "undefined") return DEFAULT_QUALITY;
  try {
    const raw = localStorage.getItem(KEY_QUALITY);
    if (raw === "low" || raw === "high") return raw;
    return DEFAULT_QUALITY;
  } catch {
    return DEFAULT_QUALITY;
  }
}

function readMaxStorageMB(): number {
  if (typeof window === "undefined") return DEFAULT_MAX_STORAGE_MB;
  try {
    const raw = localStorage.getItem(KEY_MAX_STORAGE);
    if (raw === "unlimited") return Infinity;
    const val = raw ? parseInt(raw, 10) : DEFAULT_MAX_STORAGE_MB;
    if (!Number.isFinite(val) || val < 100) return DEFAULT_MAX_STORAGE_MB;
    return val;
  } catch {
    return DEFAULT_MAX_STORAGE_MB;
  }
}

export function useDownloadSettings() {
  const [quality, setQualityState] = useState<DownloadQuality>(readQuality);
  const [maxStorageMB, setMaxStorageMBState] = useState<number>(readMaxStorageMB);

  useEffect(() => {
    setQualityState(readQuality());
    setMaxStorageMBState(readMaxStorageMB());
  }, []);

  const setQuality = useCallback((q: DownloadQuality) => {
    try {
      localStorage.setItem(KEY_QUALITY, q);
    } catch {
      // noop
    }
    setQualityState(q);
  }, []);

  const setMaxStorageMB = useCallback((mb: number) => {
    try {
      if (!Number.isFinite(mb) || mb <= 0) {
        localStorage.setItem(KEY_MAX_STORAGE, "unlimited");
      } else {
        localStorage.setItem(KEY_MAX_STORAGE, String(Math.round(mb)));
      }
    } catch {
      // noop
    }
    setMaxStorageMBState(Number.isFinite(mb) && mb > 0 ? mb : Infinity);
  }, []);

  return {
    quality,
    setQuality,
    maxStorageMB: Number.isFinite(maxStorageMB) ? maxStorageMB : Infinity,
    setMaxStorageMB,
  };
}
