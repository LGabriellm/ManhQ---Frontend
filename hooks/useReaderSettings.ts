"use client";

import { useCallback, useEffect, useState } from "react";

export type ReadingDirection = "ltr" | "rtl" | "vertical";
export type FitMode = "width" | "height" | "original";

export interface ReaderSettings {
  direction: ReadingDirection;
  zoom: number;
  brightness: number;
  fitMode: FitMode;
}

const STORAGE_KEY = "manhq_reader_settings";

const DEFAULTS: ReaderSettings = {
  direction: "ltr",
  zoom: 100,
  brightness: 100,
  fitMode: "width",
};

function loadSettings(): ReaderSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      direction:
        parsed.direction === "ltr" ||
        parsed.direction === "rtl" ||
        parsed.direction === "vertical"
          ? parsed.direction
          : DEFAULTS.direction,
      zoom:
        typeof parsed.zoom === "number" &&
        Number.isFinite(parsed.zoom) &&
        parsed.zoom >= 100 &&
        parsed.zoom <= 200
          ? Math.round(parsed.zoom)
          : DEFAULTS.zoom,
      brightness:
        typeof parsed.brightness === "number" &&
        Number.isFinite(parsed.brightness) &&
        parsed.brightness >= 50 &&
        parsed.brightness <= 150
          ? Math.round(parsed.brightness)
          : DEFAULTS.brightness,
      fitMode:
        parsed.fitMode === "width" ||
        parsed.fitMode === "height" ||
        parsed.fitMode === "original"
          ? parsed.fitMode
          : DEFAULTS.fitMode,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function persistSettings(settings: ReaderSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULTS);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSetting = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        persistSettings(next);
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULTS });
    persistSettings(DEFAULTS);
  }, []);

  return { settings, updateSetting, resetSettings } as const;
}
