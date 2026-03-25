import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import type { UploadDraftItem, UploadPlanPatch } from "@/types/api";

interface BulkEditModalProps {
  isOpen: boolean;
  items: UploadDraftItem[];
  onClose: () => void;
  onApply: (updates: Record<string, UploadPlanPatch>) => Promise<void>;
  isPending: boolean;
}

export function BulkEditModal({
  isOpen,
  items,
  onClose,
  onApply,
  isPending,
}: BulkEditModalProps) {
  const [decisionType, setDecisionType] = useState<
    "NEW_SERIES" | "EXISTING_SERIES" | ""
  >("");
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [targetSeriesId, setTargetSeriesId] = useState("");
  const [chapterOffsetDelta, setChapterOffsetDelta] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(items.map((_, i) => i)),
  );

  if (!isOpen) return null;

  const handleToggleItem = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(items.map((_, i) => i)));
    }
  };

  const handleApply = async () => {
    const updates: Record<string, UploadPlanPatch> = {};

    Array.from(selectedIndices).forEach((index) => {
      const item = items[index];
      if (!item) return;

      updates[item.id] = {};

      if (decisionType === "NEW_SERIES") {
        updates[item.id].decision = "NEW_SERIES";
        updates[item.id].newSeriesTitle =
          newSeriesTitle || item.parsed?.normalizedTitle;
      } else if (decisionType === "EXISTING_SERIES") {
        updates[item.id].decision = "EXISTING_SERIES";
        updates[item.id].targetSeriesId =
          targetSeriesId || item.suggestion?.matchedSeriesId;
      }

      if (chapterOffsetDelta !== 0) {
        const currentChapter =
          item.plan?.chapterNumber ?? item.parsed?.number ?? 0;
        updates[item.id].chapterNumber = currentChapter + chapterOffsetDelta;
      }
    });

    await onApply(updates);
    handleClose();
  };

  const handleClose = () => {
    setDecisionType("");
    setNewSeriesTitle("");
    setTargetSeriesId("");
    setChapterOffsetDelta(0);
    setSelectedIndices(new Set(items.map((_, i) => i)));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="w-full max-w-2xl bg-[var(--color-background)] border-t border-white/20 rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-[var(--color-background)]">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Edição em Lote ({selectedIndices.size}/{items.length})
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg hover:bg-white/5 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Selection Header */}
          <div className="sticky top-16 bg-[var(--color-background)] border-b border-white/10 p-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                selectedIndices.size > 0 &&
                selectedIndices.size === items.length
              }
              onChange={handleSelectAll}
              className="rounded border border-white/20 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm text-[var(--color-textDim)]">
              {selectedIndices.size === 0
                ? "Nenhum selecionado"
                : selectedIndices.size === items.length
                  ? "Todos selecionados"
                  : `${selectedIndices.size} selecionado(s)`}
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-2 p-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 cursor-pointer transition ${
                  selectedIndices.has(index)
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-white/10 hover:border-white/20"
                }`}
                onClick={() => handleToggleItem(index)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIndices.has(index)}
                    onChange={() => handleToggleItem(index)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border border-white/20 w-4 h-4 mt-1 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-textMain)] truncate">
                      {item.originalName}
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[var(--color-textDim)]">
                        Cap. {item.parsed?.number || "?"}
                      </span>
                      {item.suggestion?.matchedSeriesId && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200">
                          {item.suggestion.matchedSeriesTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Panel */}
        <div className="sticky bottom-0 bg-[var(--color-background)] border-t border-white/10 p-4 space-y-4">
          {/* Decision Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textMain)] mb-2">
              Aplicar para:
            </label>
            <div className="relative">
              <select
                value={decisionType}
                onChange={(e) =>
                  setDecisionType(
                    e.target.value as "NEW_SERIES" | "EXISTING_SERIES" | "",
                  )
                }
                className="w-full px-3 py-2 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-textMain)] appearance-none pr-9"
              >
                <option value="">Nenhuma decisão</option>
                <option value="NEW_SERIES">Nova Série</option>
                <option value="EXISTING_SERIES">Série Existente</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[var(--color-textDim)]" />
            </div>
          </div>

          {/* Conditional Fields */}
          {decisionType === "NEW_SERIES" && (
            <input
              type="text"
              placeholder="Título da nova série"
              value={newSeriesTitle}
              onChange={(e) => setNewSeriesTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-textMain)] placeholder-[var(--color-textDim)]"
            />
          )}

          {decisionType === "EXISTING_SERIES" && (
            <input
              type="text"
              placeholder="ID da série existente"
              value={targetSeriesId}
              onChange={(e) => setTargetSeriesId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-textMain)] placeholder-[var(--color-textDim)]"
            />
          )}

          {/* Chapter Offset */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textMain)] mb-2">
              Ajuste de Capítulo:
            </label>
            <input
              type="number"
              value={chapterOffsetDelta}
              onChange={(e) => setChapterOffsetDelta(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[var(--color-surface)] border border-white/10 rounded-lg text-[var(--color-textMain)]"
              placeholder="0"
            />
            <p className="text-xs text-[var(--color-textDim)] mt-1">
              Será adicionado/subtraído de todos os capítulos selecionados
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-[var(--color-textMain)] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleApply()}
              disabled={isPending || selectedIndices.size === 0}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-60 font-medium"
            >
              {isPending ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
