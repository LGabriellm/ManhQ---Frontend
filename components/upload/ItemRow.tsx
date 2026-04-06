"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * ItemRow — A single upload item in the draft review table.
 * Compact row with inline editing, expand for full sections.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  File,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type {
  UploadItem,
  ItemDecision,
  UpdateItemRequest,
} from "@/types/upload";
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_TONE,
  CONFIDENCE_LABELS,
  CONFIDENCE_TONE,
  SERIES_STATUS_OPTIONS,
  UPLOAD_LIMITS,
} from "@/types/upload";
import { StatusBadge } from "@/components/upload/StatusBadge";
import { SeriesSelector } from "@/components/upload/SeriesSelector";

interface ItemRowProps {
  item: UploadItem;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onUpdate: (itemId: string, patch: UpdateItemRequest) => void;
  onRetry?: (itemId: string) => void;
  onCancel?: (itemId: string) => void;
  isUpdating?: boolean;
  disabled?: boolean;
  retryError?: string;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parse a chapter display string into chapterNumber + chapterDisplay.
 * Supports: "13" → 13, "13b" → 13.002, "13.2" → 13.2, "013b" → 13.002
 * Letter suffix encoding: a=.001, b=.002, …, z=.026
 */
function parseChapterInput(input: string): {
  chapterNumber: number;
  chapterDisplay: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+(?:\.\d+)?)([a-z])?$/i);
  if (!match) return null;

  const base = parseFloat(match[1]);
  if (isNaN(base)) return null;

  const suffix = match[2]?.toLowerCase();
  const suffixValue = suffix ? (suffix.charCodeAt(0) - 96) * 0.001 : 0;
  const chapterNumber = base + suffixValue;

  return { chapterNumber, chapterDisplay: trimmed };
}

export function ItemRow({
  item,
  selected,
  onSelect,
  onUpdate,
  onRetry,
  onCancel,
  isUpdating,
  disabled,
  retryError,
}: ItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasBlockers = item.blockers.length > 0;
  const isReviewable = item.status === "READY_FOR_REVIEW";
  const isFailed = item.status === "FAILED";
  const isTerminal = [
    "COMPLETED",
    "FAILED",
    "SKIPPED",
    "REJECTED",
    "CANCELED",
  ].includes(item.status);
  const canEdit = isReviewable && !disabled;

  const handleSeriesChange = useCallback(
    (patch: {
      decision: ItemDecision;
      targetSeriesId?: string;
      newSeriesTitle?: string;
    }) => {
      onUpdate(item.id, patch);
    },
    [item.id, onUpdate],
  );

  const handleChapterChange = useCallback(
    (field: string, value: number | boolean | null) => {
      onUpdate(item.id, { [field]: value } as UpdateItemRequest);
    },
    [item.id, onUpdate],
  );

  return (
    <div
      className={`rounded-lg border transition-colors ${
        hasBlockers && isReviewable
          ? "border-amber-500/20 bg-amber-500/[0.02]"
          : "border-white/5 bg-[var(--color-surface)]"
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        {isReviewable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(item.id, e.target.checked)}
            disabled={disabled || hasBlockers}
            aria-label={`Selecionar ${item.originalName}`}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
          />
        )}

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Recolher detalhes" : "Expandir detalhes"}
          aria-expanded={expanded}
          className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* File info */}
        <File className="h-4 w-4 flex-shrink-0 text-[var(--color-textDim)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[var(--color-textMain)]">
            {item.originalName}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--color-textDim)]">
            <span>{item.extension.toUpperCase()}</span>
            <span>·</span>
            <span>{formatFileSize(item.sizeBytes)}</span>
            {item.pageCount && (
              <>
                <span>·</span>
                <span>{item.pageCount} páginas</span>
              </>
            )}
          </div>
        </div>

        {/* Confidence badge */}
        {item.suggestion?.confidence && (
          <StatusBadge
            label={CONFIDENCE_LABELS[item.suggestion.confidence]}
            tone={CONFIDENCE_TONE[item.suggestion.confidence]}
          />
        )}

        {/* Detected chapter */}
        {(item.parsing?.chapterDisplay ||
          item.parsing?.chapterNumber !== null) && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-[var(--color-textMain)]">
            Cap. {item.parsing.chapterDisplay ?? item.parsing.chapterNumber}
          </span>
        )}

        {/* Status badge */}
        <StatusBadge
          label={ITEM_STATUS_LABELS[item.status]}
          tone={ITEM_STATUS_TONE[item.status]}
          pulse={item.status === "ANALYZING" || item.status === "PROCESSING"}
        />

        {/* Actions */}
        {isFailed && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            aria-label="Tentar novamente"
            className="rounded-md p-1.5 text-amber-300 hover:bg-amber-500/10"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        {!isTerminal && onCancel && (
          <button
            type="button"
            onClick={() => onCancel(item.id)}
            aria-label="Cancelar item"
            className="rounded-md p-1.5 text-rose-300 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        {isUpdating && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
        )}

        {/* Stuck warning */}
        {item.job?.isStuck && (
          <span
            className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-300"
            title="Sem heartbeat recente — considere retry"
          >
            Travado
          </span>
        )}
      </div>

      {/* Blockers */}
      {hasBlockers && (
        <div className="border-t border-amber-500/10 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {item.blockers.map((blocker, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs text-amber-300"
              >
                <AlertTriangle className="h-3 w-3" />
                {blocker.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Retry error banner (visible even when collapsed) */}
      {retryError && !expanded && (
        <div className="border-t border-amber-500/10 px-4 py-2">
          <span className="inline-flex items-center gap-1 text-xs text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            {retryError}
          </span>
        </div>
      )}

      {/* Expanded editing sections */}
      {expanded && (
        <div className="space-y-4 border-t border-white/5 px-4 py-4">
          {/* Series Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-textDim)]">
              Série
            </h4>
            <SeriesSelector
              decision={item.editableSections.series.decision}
              targetSeriesId={item.editableSections.series.targetSeriesId}
              newSeriesTitle={item.editableSections.series.newSeriesTitle}
              matchedSeriesTitle={item.suggestion?.matchedSeriesTitle}
              onChange={handleSeriesChange}
              disabled={!canEdit}
            />
          </div>

          {/* Chapter Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-textDim)]">
              Capítulo
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Nº Capítulo
                </label>
                <input
                  type="text"
                  value={
                    item.editableSections.chapter.chapterDisplay ??
                    item.editableSections.chapter.chapterNumber?.toString() ??
                    ""
                  }
                  onChange={(e) => {
                    const parsed = parseChapterInput(e.target.value);
                    if (parsed) {
                      onUpdate(item.id, {
                        chapterNumber: parsed.chapterNumber,
                        chapterDisplay: parsed.chapterDisplay,
                      });
                    } else if (e.target.value === "") {
                      onUpdate(item.id, {
                        chapterNumber: undefined,
                        chapterDisplay: undefined,
                      });
                    }
                  }}
                  placeholder="13, 13b, 13.2"
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)]/50 focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Volume
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={item.editableSections.chapter.volume ?? ""}
                  onChange={(e) =>
                    handleChapterChange(
                      "volume",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Ano
                </label>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={item.editableSections.chapter.year ?? ""}
                  onChange={(e) =>
                    handleChapterChange(
                      "year",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-[var(--color-textMain)]">
                  <input
                    type="checkbox"
                    checked={item.editableSections.chapter.isOneShot}
                    onChange={(e) =>
                      handleChapterChange("isOneShot", e.target.checked)
                    }
                    disabled={!canEdit}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-[var(--color-primary)]"
                  />
                  One-shot
                </label>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-textDim)]">
              Metadados
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Status
                </label>
                <select
                  value={item.editableSections.metadata.status || ""}
                  onChange={(e) =>
                    onUpdate(item.id, { status: e.target.value || undefined })
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  {SERIES_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Autor
                </label>
                <input
                  type="text"
                  value={item.editableSections.metadata.author}
                  onChange={(e) =>
                    onUpdate(item.id, { author: e.target.value })
                  }
                  disabled={!canEdit}
                  maxLength={UPLOAD_LIMITS.AUTHOR_MAX_LENGTH}
                  placeholder="Autor"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Artista
                </label>
                <input
                  type="text"
                  value={item.editableSections.metadata.artist}
                  onChange={(e) =>
                    onUpdate(item.id, { artist: e.target.value })
                  }
                  disabled={!canEdit}
                  maxLength={UPLOAD_LIMITS.ARTIST_MAX_LENGTH}
                  placeholder="Artista"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 flex items-center justify-between text-xs text-[var(--color-textDim)]">
                  <span>Descrição</span>
                  <span className="tabular-nums">
                    {item.editableSections.metadata.description.length}/{UPLOAD_LIMITS.DESCRIPTION_MAX_LENGTH}
                  </span>
                </label>
                <textarea
                  value={item.editableSections.metadata.description}
                  onChange={(e) =>
                    onUpdate(item.id, { description: e.target.value })
                  }
                  disabled={!canEdit}
                  maxLength={UPLOAD_LIMITS.DESCRIPTION_MAX_LENGTH}
                  placeholder="Descrição da série"
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 flex items-center justify-between text-xs text-[var(--color-textDim)]">
                  <span>Tags (separadas por vírgula)</span>
                  <span className="tabular-nums">
                    {item.editableSections.metadata.tags.length}/{UPLOAD_LIMITS.TAGS_MAX_COUNT}
                  </span>
                </label>
                <input
                  type="text"
                  value={item.editableSections.metadata.tags.join(", ")}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim().slice(0, UPLOAD_LIMITS.TAG_MAX_LENGTH))
                      .filter(Boolean)
                      .slice(0, UPLOAD_LIMITS.TAGS_MAX_COUNT);
                    onUpdate(item.id, { tags });
                  }}
                  disabled={!canEdit}
                  placeholder="ação, aventura, fantasia"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Result info (for completed items) */}
          {item.result.seriesId && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <p className="text-xs text-emerald-300">
                <Check className="mr-1 inline h-3 w-3" />
                Processado: {item.result.seriesTitle} — capítulo adicionado
              </p>
            </div>
          )}

          {/* Error info (for failed items) */}
          {item.error?.message && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <p className="text-xs text-rose-300">
                <X className="mr-1 inline h-3 w-3" />
                {item.error.message}
              </p>
            </div>
          )}

          {/* Retry error (MAX_RETRIES_EXCEEDED or NOT_RETRYABLE) */}
          {retryError && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-amber-300">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                {retryError}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
