"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * FileDropZone — Drag-and-drop upload entry point.
 * Supports clicking to select files or dropping.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

const ACCEPTED_EXTENSIONS = [".cbz", ".cbr", ".pdf", ".epub", ".zip"];
const MAX_FILES = 50;

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  disabled?: boolean;
  className?: string;
}

export function FileDropZone({
  onFilesSelected,
  isUploading,
  disabled,
  className = "",
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isBlocked = isUploading || disabled;

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || isBlocked) return;
      const files = Array.from(fileList)
        .filter((f) =>
          ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
        )
        .slice(0, MAX_FILES);
      if (files.length > 0) onFilesSelected(files);
    },
    [isBlocked, onFilesSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isBlocked) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isBlocked && inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors ${
        isDragging
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
      } ${isBlocked ? "pointer-events-none opacity-60" : ""} ${className}`}
    >
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        {isUploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
            <Upload className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-[var(--color-textMain)]">
            {isUploading
              ? "Enviando arquivos..."
              : "Arraste arquivos aqui ou clique para selecionar"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-textDim)]">
            CBZ, CBR, PDF, EPUB, ZIP — até {MAX_FILES} arquivos
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
