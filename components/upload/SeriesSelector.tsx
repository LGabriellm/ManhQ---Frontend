"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * SeriesSelector — Search & select an existing series, or create new.
 * Used inside ItemEditor for series assignment.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import { Search, Plus, BookOpen, X } from "lucide-react";
import { useSeriesSearch } from "@/hooks/useUpload";
import type { ItemDecision } from "@/types/upload";
import { UPLOAD_LIMITS } from "@/types/upload";

interface SeriesSelectorProps {
  decision: string | null;
  targetSeriesId: string | null;
  newSeriesTitle: string | null;
  matchedSeriesTitle?: string;
  onChange: (patch: {
    decision: ItemDecision;
    targetSeriesId?: string;
    newSeriesTitle?: string;
  }) => void;
  disabled?: boolean;
}

export function SeriesSelector({
  decision,
  targetSeriesId,
  newSeriesTitle,
  matchedSeriesTitle,
  onChange,
  disabled,
}: SeriesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"existing" | "new" | "skip">(
    decision === "NEW_SERIES"
      ? "new"
      : decision === "SKIP"
        ? "skip"
        : "existing",
  );
  const [newTitle, setNewTitle] = useState(newSeriesTitle || "");

  const { data: searchResults, isLoading: isSearching } =
    useSeriesSearch(searchQuery);

  const handleSelectExisting = useCallback(
    (id: string) => {
      onChange({ decision: "EXISTING_SERIES", targetSeriesId: id });
      setSearchQuery("");
    },
    [onChange],
  );

  const handleNewSeries = useCallback(() => {
    setMode("new");
    onChange({ decision: "NEW_SERIES", newSeriesTitle: newTitle });
  }, [onChange, newTitle]);

  const handleSkip = useCallback(() => {
    setMode("skip");
    onChange({ decision: "SKIP" });
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMode("existing")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "existing"
              ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
              : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <BookOpen className="mr-1 inline h-3 w-3" />
          Série existente
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleNewSeries}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "new"
              ? "bg-emerald-500/20 text-emerald-300"
              : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <Plus className="mr-1 inline h-3 w-3" />
          Nova série
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleSkip}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "skip"
              ? "bg-slate-500/20 text-slate-300"
              : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <X className="mr-1 inline h-3 w-3" />
          Ignorar
        </button>
      </div>

      {/* Existing series search */}
      {mode === "existing" && (
        <div className="space-y-2">
          {targetSeriesId && matchedSeriesTitle && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span className="flex-1 truncate text-sm text-emerald-300">
                {matchedSeriesTitle}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange({
                    decision: "EXISTING_SERIES",
                    targetSeriesId: undefined,
                  });
                }}
                className="text-emerald-400 hover:text-emerald-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={disabled}
              placeholder="Buscar série..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none"
            />
          </div>

          {isSearching && (
            <p className="text-xs text-[var(--color-textDim)]">Buscando...</p>
          )}

          {searchResults && searchResults.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-white/5">
              {searchResults.map((series) => (
                <li key={series.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectExisting(series.id)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                      targetSeriesId === series.id
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-textMain)]"
                    }`}
                  >
                    {series.title}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchResults &&
            searchResults.length === 0 &&
            searchQuery.length >= 2 && (
              <p className="text-xs text-[var(--color-textDim)]">
                Nenhuma série encontrada.
              </p>
            )}
        </div>
      )}

      {/* New series title */}
      {mode === "new" && (
        <input
          type="text"
          value={newTitle}
          disabled={disabled}
          maxLength={UPLOAD_LIMITS.NEW_SERIES_TITLE_MAX_LENGTH}
          onChange={(e) => {
            setNewTitle(e.target.value);
            onChange({
              decision: "NEW_SERIES",
              newSeriesTitle: e.target.value,
            });
          }}
          placeholder="Título da nova série"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-emerald-500/50 focus:outline-none"
        />
      )}

      {/* Skip confirmation */}
      {mode === "skip" && (
        <p className="text-xs text-slate-400">
          Este arquivo será ignorado na confirmação.
        </p>
      )}
    </div>
  );
}
