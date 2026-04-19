"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";

interface ProgressSliderProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ProgressSlider({
  currentPage,
  totalPages,
  onPageChange,
}: ProgressSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPage, setDragPage] = useState(currentPage);
  const trackRef = useRef<HTMLDivElement>(null);

  const pageFromPointer = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || totalPages < 1) return 1;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.max(1, Math.min(totalPages, Math.round(ratio * (totalPages - 1) + 1)));
    },
    [totalPages],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      const page = pageFromPointer(e.clientX);
      setDragPage(page);
    },
    [pageFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const page = pageFromPointer(e.clientX);
      setDragPage(page);
    },
    [isDragging, pageFromPointer],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      const page = pageFromPointer(e.clientX);
      onPageChange(page);
    },
    [isDragging, pageFromPointer, onPageChange],
  );

  const displayPage = isDragging ? dragPage : currentPage;
  const progress = totalPages > 1 ? ((displayPage - 1) / (totalPages - 1)) * 100 : 100;

  return (
    <div className="relative w-full">
      {/* Tooltip while dragging */}
      {isDragging && (
        <div
          className="absolute -top-9 rounded-lg bg-surface px-3 py-1.5 text-xs font-bold text-white shadow-lg"
          style={{
            left: `${progress}%`,
            transform: "translateX(-50%)",
          }}
        >
          {dragPage}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="relative flex h-10 cursor-pointer items-center touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className="absolute h-4 w-4 rounded-full border-2 border-primary bg-white shadow-md transition-[left] duration-100"
          style={{
            left: `calc(${progress}% - 8px)`,
          }}
        />
      </div>
    </div>
  );
}
