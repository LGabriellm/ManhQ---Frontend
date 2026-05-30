"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { HeatmapDay } from "@/types/api";
import { cn } from "@/lib/utils";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PT_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const PT_MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

const CELL_SIZE = 13;
const CELL_GAP = 3;
const LABEL_WIDTH = 32;

function getColor(level: number): string {
  if (level === 0) return "#1e1e1e";
  if (level === 1) return "#3a1f1f";
  if (level === 2) return "#7a1f1f";
  if (level === 3) return "#c41f1f";
  return "#e50914"; // 4
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface CellData {
  date: string;
  pagesRead: number;
  timeSpent: number;
  chaptersCompleted: number;
  level: number;
}

function formatTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}h ${m % 60}m`;
  }
  return `${m}m`;
}

// ─── Popover ───────────────────────────────────────────────────────────────────

function DayPopover({
  cell,
  position,
  onClose,
}: {
  cell: CellData;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const dateFormatted = new Date(cell.date + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div
      ref={ref}
      className="fixed z-50 w-64 rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl"
      style={{
        left: Math.min(position.x, typeof window !== "undefined" ? window.innerWidth - 280 : 0),
        top: Math.min(position.y - 10, typeof window !== "undefined" ? window.innerHeight - 200 : 0),
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--color-textMain)]">
          {dateFormatted}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-0.5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
          aria-label="Fechar"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-xs text-[var(--color-textDim)]">Páginas Lidas</span>
          <span className="text-sm font-bold text-[var(--color-textMain)]">{cell.pagesRead}</span>
        </div>
        <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-xs text-[var(--color-textDim)]">Capítulos Completos</span>
          <span className="text-sm font-bold text-[var(--color-textMain)]">{cell.chaptersCompleted}</span>
        </div>
        <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
          <span className="text-xs text-[var(--color-textDim)]">Tempo de Leitura</span>
          <span className="text-sm font-bold text-[var(--color-textMain)]">{formatTime(cell.timeSpent)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({
  cell,
  position,
}: {
  cell: CellData;
  position: { x: number; y: number };
}) {
  if (cell.level === 0) return null;

  const dateFormatted = new Date(cell.date + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { day: "numeric", month: "short" },
  );

  return (
    <div
      className="pointer-events-none fixed z-40 rounded-lg bg-[#1a1a1a] border border-white/10 px-2.5 py-1.5 shadow-lg"
      style={{
        left: position.x,
        top: position.y - 40,
      }}
    >
      <p className="whitespace-nowrap text-[11px] text-[var(--color-textMain)]">
        <span className="font-semibold">{cell.pagesRead}</span>{" "}
        {cell.pagesRead === 1 ? "página" : "páginas"} em {dateFormatted}
      </p>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export interface ReadingHeatmapProps {
  data: HeatmapDay[];
  months?: number;
  className?: string;
}

export function ReadingHeatmap({ data, months = 6, className }: ReadingHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    cell: CellData;
    x: number;
    y: number;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    cell: CellData;
    x: number;
    y: number;
  } | null>(null);

  // Build a lookup map from date string -> HeatmapDay
  const dataMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    for (const entry of data) {
      map.set(entry.date, entry);
    }
    return map;
  }, [data]);

  // Build the grid of weeks × days
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from `months` ago
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - months);

    // Build a continuous array of day cells
    const dayCells: CellData[] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const key = dateKey(current);
      const entry = dataMap.get(key);
      dayCells.push({
        date: key,
        pagesRead: entry?.pagesRead ?? 0,
        timeSpent: entry?.timeSpent ?? 0,
        chaptersCompleted: entry?.chaptersCompleted ?? 0,
        level: entry?.level ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    // Pad to start on Sunday
    const startDayOfWeek = startDate.getDay(); // 0=Sun
    if (startDayOfWeek > 0) {
      const padding: CellData[] = [];
      for (let i = 0; i < startDayOfWeek; i++) {
        const padDate = new Date(startDate);
        padDate.setDate(padDate.getDate() - (startDayOfWeek - i));
        padding.push({
          date: dateKey(padDate),
          pagesRead: 0,
          timeSpent: 0,
          chaptersCompleted: 0,
          level: 0,
        });
      }
      dayCells.unshift(...padding);
    }

    // Group into weeks (7 days each)
    const weeksArray: CellData[][] = [];
    for (let i = 0; i < dayCells.length; i += 7) {
      weeksArray.push(dayCells.slice(i, i + 7));
    }

    // Compute month labels
    const labels: { col: number; label: string }[] = [];
    for (let col = 0; col < weeksArray.length; col++) {
      const week = weeksArray[col];
      if (!week || week.length === 0) continue;
      // Find the first non-padding cell's month
      const firstReal = week.find((cell) => cell.level !== undefined || cell.date !== "");
      if (!firstReal) continue;
      const d = new Date(firstReal.date + "T12:00:00");
      const monthIndex = d.getMonth();
      const label = PT_MONTHS[monthIndex];

      const prev = labels[labels.length - 1];
      if (!prev || prev.label !== label) {
        labels.push({ col, label });
      }
    }

    return { weeks: weeksArray, monthLabels: labels };
  }, [dataMap, months]);

  const handleMouseEnter = useCallback(
    (cell: CellData, event: React.MouseEvent) => {
      setHoveredCell({
        cell,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleClick = useCallback(
    (cell: CellData, event: React.MouseEvent) => {
      setSelectedCell({
        cell,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const totalWidth = LABEL_WIDTH + weeks.length * (CELL_SIZE + CELL_GAP);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (weeks.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <p className="text-sm text-[var(--color-textDim)]">
          Nenhuma atividade de leitura no período.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div style={{ minWidth: Math.max(totalWidth, 600), width: "100%" }}>
        {/* Month labels */}
        <div className="flex" style={{ paddingLeft: LABEL_WIDTH }}>
          {monthLabels.map(({ col, label }) => (
            <div
              key={`${col}-${label}`}
              className="text-[10px] font-medium text-[var(--color-textDim)]/70"
              style={{
                position: "relative",
                left: col * (CELL_SIZE + CELL_GAP),
                width: CELL_SIZE,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Day labels */}
          <div
            className="flex shrink-0 flex-col justify-between"
            style={{ width: LABEL_WIDTH, paddingTop: CELL_GAP, gap: CELL_GAP }}
          >
            {PT_DAYS_SHORT.map((day, i) => (
              <div
                key={day}
                className="flex items-center"
                style={{ height: CELL_SIZE }}
              >
                <span className="text-[9px] text-[var(--color-textDim)]/50">
                  {/* Show every other day to avoid crowding */}
                  {i % 2 === 1 ? day : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Weeks columns */}
          <div className="flex" style={{ gap: CELL_GAP }}>
            {weeks.map((week, colIndex) => (
              <div
                key={colIndex}
                className="flex flex-col"
                style={{ gap: CELL_GAP }}
              >
                {week.map((cell, rowIndex) => {
                  const isFuture = new Date(cell.date + "T12:00:00") > new Date();
                  if (isFuture) {
                    return (
                      <div
                        key={rowIndex}
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                      />
                    );
                  }

                  return (
                    <button
                      key={rowIndex}
                      className="rounded-sm transition-all hover:ring-1 hover:ring-white/30"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: getColor(cell.level),
                        outline: "none",
                      }}
                      onMouseEnter={(e) => handleMouseEnter(cell, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={(e) => handleClick(cell, e)}
                      title={`${cell.date}: ${cell.pagesRead} páginas`}
                      aria-label={`${cell.date}: ${cell.pagesRead} páginas`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1.5">
          <span className="text-[10px] text-[var(--color-textDim)]/50 mr-1">
            Menos
          </span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="rounded-sm"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: getColor(level),
              }}
            />
          ))}
          <span className="text-[10px] text-[var(--color-textDim)]/50 ml-1">
            Mais
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && !selectedCell && (
        <Tooltip cell={hoveredCell.cell} position={{ x: hoveredCell.x, y: hoveredCell.y }} />
      )}

      {/* Popover */}
      {selectedCell && (
        <DayPopover
          cell={selectedCell.cell}
          position={{ x: selectedCell.x, y: selectedCell.y }}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
