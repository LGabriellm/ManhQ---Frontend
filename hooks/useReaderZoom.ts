"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ZoomState {
  scale: number;
  x: number;
  y: number;
  /** CSS transition value for animated zoom changes */
  transition: string | undefined;
}

interface UseReaderZoomOptions {
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
  onZoomChange?: (isZoomed: boolean) => void;
}

const ZOOM_INITIAL: ZoomState = {
  scale: 1,
  x: 0,
  y: 0,
  transition: undefined,
};

export function useReaderZoom(options: UseReaderZoomOptions = {}) {
  const {
    minScale = 1,
    maxScale = 3,
    doubleTapScale = 2,
    onZoomChange,
  } = options;

  const [zoom, setZoom] = useState<ZoomState>(ZOOM_INITIAL);
  const isZoomed = zoom.scale > 1.05;

  // ── Refs for live values — handlers read these instead of closures ──
  // This prevents stale closures and avoids listener churn during gestures.
  const zoomRef = useRef(ZOOM_INITIAL);
  const isZoomedRef = useRef(false);
  const optionsRef = useRef({ minScale, maxScale, doubleTapScale });
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    isZoomedRef.current = isZoomed;
  }, [isZoomed]);
  useEffect(() => {
    optionsRef.current = { minScale, maxScale, doubleTapScale };
  }, [minScale, maxScale, doubleTapScale]);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  // Touch tracking refs
  const lastPinchDist = useRef<number | null>(null);
  const isPinching = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef<{
    x: number;
    y: number;
    zoomX: number;
    zoomY: number;
  } | null>(null);
  const lastTapTime = useRef(0);
  const lastTapPos = useRef<{ x: number; y: number } | null>(null);

  // Notify parent when zoom state transitions
  const prevZoomed = useRef(false);
  useEffect(() => {
    if (prevZoomed.current !== isZoomed) {
      prevZoomed.current = isZoomed;
      onZoomChangeRef.current?.(isZoomed);
    }
  }, [isZoomed]);

  const clampPan = useCallback(
    (x: number, y: number, scale: number, rect: DOMRect) => {
      if (scale <= 1) return { x: 0, y: 0 };
      const maxX = (rect.width * (scale - 1)) / (2 * scale);
      const maxY = (rect.height * (scale - 1)) / (2 * scale);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [],
  );

  const resetZoom = useCallback(() => {
    setZoom({
      scale: 1,
      x: 0,
      y: 0,
      transition: "transform 0.25s ease-out",
    });
  }, []);

  // ── Stable handlers — only access refs, never stale ──

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const delta = -e.deltaY * 0.01;
      const { minScale: min, maxScale: max } = optionsRef.current;

      setZoom((prev) => {
        const newScale = Math.max(min, Math.min(max, prev.scale + delta));
        if (newScale <= 1.05)
          return { scale: 1, x: 0, y: 0, transition: undefined };
        const clamped = clampPan(prev.x, prev.y, newScale, rect);
        return { scale: newScale, ...clamped, transition: undefined };
      });
    },
    [clampPan],
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      isPinching.current = true;
      isPanning.current = false;
      panStart.current = null;
    } else if (e.touches.length === 1 && isZoomedRef.current) {
      isPanning.current = true;
      const current = zoomRef.current;
      panStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        zoomX: current.x,
        zoomY: current.y,
      };
      e.preventDefault();
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const { minScale: min, maxScale: max } = optionsRef.current;

      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / lastPinchDist.current;
        lastPinchDist.current = dist;

        setZoom((prev) => {
          const newScale = Math.max(min, Math.min(max, prev.scale * ratio));
          if (newScale <= 1.05)
            return { scale: 1, x: 0, y: 0, transition: "none" };
          const clamped = clampPan(prev.x, prev.y, newScale, rect);
          return { scale: newScale, ...clamped, transition: "none" };
        });
      } else if (
        e.touches.length === 1 &&
        isPanning.current &&
        panStart.current
      ) {
        e.preventDefault();
        const currentScale = zoomRef.current.scale;
        const dx = (e.touches[0].clientX - panStart.current.x) / currentScale;
        const dy = (e.touches[0].clientY - panStart.current.y) / currentScale;

        setZoom((prev) => {
          const clamped = clampPan(
            panStart.current!.zoomX + dx,
            panStart.current!.zoomY + dy,
            prev.scale,
            rect,
          );
          return { ...prev, ...clamped, transition: "none" };
        });
      }
    },
    [clampPan],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      lastPinchDist.current = null;

      // Transition from pinch (2→1 finger): start panning if zoomed
      if (e.touches.length === 1 && isPinching.current && isZoomedRef.current) {
        isPinching.current = false;
        isPanning.current = true;
        const current = zoomRef.current;
        panStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          zoomX: current.x,
          zoomY: current.y,
        };
        return;
      }

      // All fingers lifted
      isPinching.current = false;
      isPanning.current = false;
      panStart.current = null;

      // Double-tap detection
      if (e.changedTouches.length === 1 && e.touches.length === 0) {
        const now = Date.now();
        const tap = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
        };

        if (
          now - lastTapTime.current < 300 &&
          lastTapPos.current &&
          Math.abs(tap.x - lastTapPos.current.x) < 30 &&
          Math.abs(tap.y - lastTapPos.current.y) < 30
        ) {
          e.preventDefault();
          const target = e.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const { doubleTapScale: dts } = optionsRef.current;

          if (isZoomedRef.current) {
            setZoom({
              scale: 1,
              x: 0,
              y: 0,
              transition: "transform 0.25s ease-out",
            });
          } else {
            const tapRelX = (tap.x - rect.left - rect.width / 2) / rect.width;
            const tapRelY = (tap.y - rect.top - rect.height / 2) / rect.height;
            const clamped = clampPan(
              (-tapRelX * rect.width * (dts - 1)) / dts,
              (-tapRelY * rect.height * (dts - 1)) / dts,
              dts,
              rect,
            );
            setZoom({
              scale: dts,
              ...clamped,
              transition: "transform 0.25s ease-out",
            });
          }

          lastTapTime.current = 0;
          lastTapPos.current = null;
        } else {
          lastTapTime.current = now;
          lastTapPos.current = tap;
        }
      }
    },
    [clampPan],
  );

  // Bind non-passive touch listeners to a ref element.
  // All handlers are stable (deps are only refs + clampPan which is stable),
  // so bindZoomRef never changes and listeners are attached exactly once per element.
  const bindZoomRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;

      const opts = { passive: false } as AddEventListenerOptions;
      el.addEventListener("wheel", handleWheel, opts);
      el.addEventListener("touchstart", handleTouchStart, opts);
      el.addEventListener("touchmove", handleTouchMove, opts);
      el.addEventListener("touchend", handleTouchEnd, opts);

      return () => {
        el.removeEventListener("wheel", handleWheel);
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        el.removeEventListener("touchend", handleTouchEnd);
      };
    },
    [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd],
  );

  const zoomStyle: React.CSSProperties = {
    transform:
      zoom.scale === 1
        ? undefined
        : `scale(${zoom.scale}) translate(${zoom.x}px, ${zoom.y}px)`,
    transformOrigin: "center center",
    transition: zoom.transition,
    willChange: isZoomed ? "transform" : undefined,
  };

  return {
    zoom,
    isZoomed,
    resetZoom,
    bindZoomRef,
    zoomStyle,
  };
}
