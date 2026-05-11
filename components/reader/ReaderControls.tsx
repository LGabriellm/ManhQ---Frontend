"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReaderSettings } from "@/hooks/useReaderSettings";
import type { FitMode, ReaderSettings, ReadingDirection } from "@/hooks/useReaderSettings";
import { cn } from "@/lib/utils";

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconArrowDown() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconZoomIn() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconZoomOut() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReaderControlsProps {
  currentPage?: number;
  totalPages?: number;
  className?: string;
}

// ─── Direction labels ──────────────────────────────────────────────────────────

const DIRECTION_OPTIONS: {
  value: ReadingDirection;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "ltr", label: "Esquerda para Direita", icon: IconArrowRight },
  { value: "rtl", label: "Direita para Esquerda", icon: IconArrowLeft },
  { value: "vertical", label: "Rolagem Vertical", icon: IconArrowDown },
];

const FIT_OPTIONS: { value: FitMode; label: string }[] = [
  { value: "width", label: "Ajustar largura" },
  { value: "height", label: "Ajustar altura" },
  { value: "original", label: "Original" },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReaderControls({
  currentPage,
  totalPages,
  className,
}: ReaderControlsProps) {
  const { settings, updateSetting } = useReaderSettings();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Show controls and reset the auto-hide timer
  const showControls = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleZoomIn = () => {
    const next = Math.min(200, settings.zoom + 10);
    updateSetting("zoom", next);
    showControls();
  };

  const handleZoomOut = () => {
    const next = Math.max(100, settings.zoom - 10);
    updateSetting("zoom", next);
    showControls();
  };

  const handleDirectionChange = (dir: ReadingDirection) => {
    updateSetting("direction", dir);
    showControls();
  };

  const handleFitModeChange = (mode: FitMode) => {
    updateSetting("fitMode", mode);
    showControls();
  };

  return (
    <>
      {/* Controls overlay */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none",
          className,
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div
          className="mx-auto max-w-2xl rounded-t-2xl px-4 pb-4 pt-3"
          style={{
            backgroundColor: "rgba(30, 30, 30, 0.90)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* ── Page indicator ──────────────────────────────────── */}
          {currentPage !== undefined && totalPages !== undefined && totalPages > 0 && (
            <div className="mb-3 text-center">
              <span className="text-xs font-medium text-[var(--color-textMain)]/80">
                Página {currentPage.toLocaleString("pt-BR")} de {totalPages.toLocaleString("pt-BR")}
              </span>
            </div>
          )}

          {/* ── Direction toggle ────────────────────────────────── */}
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-textDim)]/60">
              Direção de leitura
            </p>
            <div className="flex gap-1.5">
              {DIRECTION_OPTIONS.map((opt) => {
                const isActive = settings.direction === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleDirectionChange(opt.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                      isActive
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "bg-white/5 text-[var(--color-textDim)] hover:bg-white/10",
                    )}
                    title={opt.label}
                  >
                    <opt.icon />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Zoom controls ───────────────────────────────────── */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-textDim)]/60">
                Zoom
              </p>
              <span className="text-xs tabular-nums font-semibold text-[var(--color-textMain)]">
                {settings.zoom}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={settings.zoom <= 100}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--color-textDim)] transition-colors hover:bg-white/10 disabled:opacity-30"
                aria-label="Diminuir zoom"
              >
                <IconZoomOut />
              </button>
              <input
                type="range"
                min={100}
                max={200}
                step={10}
                value={settings.zoom}
                onChange={(e) => updateSetting("zoom", Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-primary)]"
                style={{
                  accentColor: "var(--color-primary)",
                }}
                aria-label="Nível de zoom"
              />
              <button
                onClick={handleZoomIn}
                disabled={settings.zoom >= 200}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--color-textDim)] transition-colors hover:bg-white/10 disabled:opacity-30"
                aria-label="Aumentar zoom"
              >
                <IconZoomIn />
              </button>
            </div>
          </div>

          {/* ── Brightness ──────────────────────────────────────── */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <IconSun />
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-textDim)]/60">
                  Brilho
                </p>
              </div>
              <span className="text-xs tabular-nums font-semibold text-[var(--color-textMain)]">
                {settings.brightness}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              step={1}
              value={settings.brightness}
              onChange={(e) => updateSetting("brightness", Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-primary)]"
              style={{
                accentColor: "var(--color-primary)",
              }}
              aria-label="Nível de brilho"
            />
          </div>

          {/* ── Fit mode ────────────────────────────────────────── */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--color-textDim)]/60">
              Ajuste de página
            </p>
            <div className="flex gap-1.5">
              {FIT_OPTIONS.map((opt) => {
                const isActive = settings.fitMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleFitModeChange(opt.value)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all",
                      isActive
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "bg-white/5 text-[var(--color-textDim)] hover:bg-white/10",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Invisible trigger zone at bottom ───────────────────── */}
      {/* On mobile: shown on tap (handled by parent reader). */}
      {/* On desktop: mouse move near bottom shows the bar. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 h-16"
        onMouseEnter={showControls}
        onTouchStart={showControls}
      />

      {/* ── Expose show / hide via imperative handle-like pattern ── */}
      {/* Components wrapping ReaderControls can call showControls via a ref */}
    </>
  );
}

// ─── Hook for parent integration ───────────────────────────────────────────────

/**
 * Returns the brightness CSS filter value to apply to the reader container.
 * 100% brightness = no filter. Values below/above adjust accordingly.
 */
export function useReaderBrightness(brightness: number): React.CSSProperties {
  return {
    filter: `brightness(${brightness}%)`,
    WebkitFilter: `brightness(${brightness}%)`,
  };
}
