"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * Uploads & Importações — Main Dashboard Page
 *
 * Two-panel layout:
 *   Left: New upload form (series mode → source → files)
 *   Right: Active drafts list
 *
 * The user must choose a series mode BEFORE uploading:
 *   - Nova série:      first chapter creates the series, rest follows it
 *   - Série existente: all chapters go into a selected series
 *   - Auto-detectar:   backend decides per-item (advanced)
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Cloud,
  HardDrive,
  Inbox,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import {
  useDrafts,
  useStageLocal,
  useStageLocalForSeries,
  useStageLocalForExistingSeries,
  useSeriesSearch,
} from "@/hooks/useUpload";
import { FileDropZone } from "@/components/upload/FileDropZone";
import { GoogleDriveImport } from "@/components/upload/GoogleDriveImport";
import { DraftCard } from "@/components/upload/DraftCard";

type UploadMode = "local" | "gdrive";
type SeriesMode = "new" | "existing" | "auto";

export default function UploadsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<UploadMode>("local");
  const [seriesMode, setSeriesMode] = useState<SeriesMode>("new");

  // New series
  const [seriesTitle, setSeriesTitle] = useState("");

  // Existing series
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState("");
  const [seriesSearchQuery, setSeriesSearchQuery] = useState("");
  const { data: seriesResults, isLoading: isSearchingSeries } =
    useSeriesSearch(seriesSearchQuery);

  const draftsQuery = useDrafts();
  const stageLocal = useStageLocal();
  const stageForSeries = useStageLocalForSeries();
  const stageForExisting = useStageLocalForExistingSeries();

  const isUploading =
    stageLocal.isPending ||
    stageForSeries.isPending ||
    stageForExisting.isPending;

  const stageError =
    stageLocal.error || stageForSeries.error || stageForExisting.error;

  // Validation: can the user proceed to upload?
  const canUpload =
    seriesMode === "auto" ||
    (seriesMode === "new" && seriesTitle.trim().length > 0) ||
    (seriesMode === "existing" && selectedSeriesId !== null);

  const handleLocalFiles = useCallback(
    async (files: File[]) => {
      try {
        let result;
        if (seriesMode === "new" && seriesTitle.trim()) {
          result = await stageForSeries.mutateAsync({
            files,
            seriesTitle: seriesTitle.trim(),
          });
        } else if (seriesMode === "existing" && selectedSeriesId) {
          result = await stageForExisting.mutateAsync({
            seriesId: selectedSeriesId,
            files,
          });
        } else {
          result = await stageLocal.mutateAsync({ files });
        }
        router.push(`/dashboard/uploads/${result.draftId}`);
      } catch {
        // error shown via mutation state
      }
    },
    [
      seriesMode,
      seriesTitle,
      selectedSeriesId,
      stageForSeries,
      stageForExisting,
      stageLocal,
      router,
    ],
  );

  const handleGDriveDraft = useCallback(
    (draftId: string) => {
      router.push(`/dashboard/uploads/${draftId}`);
    },
    [router],
  );

  const handleSelectSeries = useCallback((id: string, title: string) => {
    setSelectedSeriesId(id);
    setSelectedSeriesTitle(title);
    setSeriesSearchQuery("");
  }, []);

  const handleSeriesModeChange = useCallback((newMode: SeriesMode) => {
    setSeriesMode(newMode);
    // Reset associated state when switching
    setSeriesTitle("");
    setSelectedSeriesId(null);
    setSelectedSeriesTitle("");
    setSeriesSearchQuery("");
  }, []);

  const drafts = draftsQuery.data?.drafts ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
          Uploads & Importações
        </h1>
        <p className="mt-1 text-sm text-[var(--color-textDim)]">
          Escolha o tipo de série, depois envie os arquivos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Left Panel: New Upload ───────────────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-4">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-textMain)]">
              Novo Upload
            </h2>

            {/* ── Step 1: Series Mode ─────────────────────────────── */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-[var(--color-textDim)]">
                1. Para qual série?
              </p>
              <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => handleSeriesModeChange("new")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    seriesMode === "new"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova série
                </button>
                <button
                  type="button"
                  onClick={() => handleSeriesModeChange("existing")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    seriesMode === "existing"
                      ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                      : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Série existente
                </button>
                <button
                  type="button"
                  onClick={() => handleSeriesModeChange("auto")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                    seriesMode === "auto"
                      ? "bg-sky-500/15 text-sky-300"
                      : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto
                </button>
              </div>
            </div>

            {/* ── Series Config per mode ──────────────────────────── */}
            {seriesMode === "new" && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Título da nova série
                </label>
                <input
                  type="text"
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  placeholder="Ex: One Piece, Naruto..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-emerald-500/50 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[var(--color-textDim)]">
                  O primeiro capítulo cria a série. Os demais são adicionados
                  automaticamente.
                </p>
              </div>
            )}

            {seriesMode === "existing" && (
              <div className="mb-4 space-y-2">
                {selectedSeriesId ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <span className="flex-1 truncate text-sm text-emerald-300">
                      {selectedSeriesTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSeriesId(null);
                        setSelectedSeriesTitle("");
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-200"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                      <input
                        type="text"
                        value={seriesSearchQuery}
                        onChange={(e) => setSeriesSearchQuery(e.target.value)}
                        placeholder="Buscar série existente..."
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-[var(--color-textMain)] placeholder:text-[var(--color-textDim)] focus:border-[var(--color-primary)]/50 focus:outline-none"
                      />
                    </div>
                    {isSearchingSeries && (
                      <p className="text-xs text-[var(--color-textDim)]">
                        Buscando...
                      </p>
                    )}
                    {seriesResults && seriesResults.length > 0 && (
                      <ul className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-white/5">
                        {seriesResults.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectSeries(s.id, s.title)}
                              className="w-full px-3 py-2 text-left text-sm text-[var(--color-textMain)] transition-colors hover:bg-white/5"
                            >
                              {s.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {seriesResults &&
                      seriesResults.length === 0 &&
                      seriesSearchQuery.length >= 2 && (
                        <p className="text-xs text-[var(--color-textDim)]">
                          Nenhuma série encontrada.
                        </p>
                      )}
                  </>
                )}
                <p className="text-[11px] text-[var(--color-textDim)]">
                  Todos os capítulos serão adicionados à série selecionada.
                </p>
              </div>
            )}

            {seriesMode === "auto" && (
              <div className="mb-4 rounded-lg border border-sky-500/10 bg-sky-500/5 px-3 py-2">
                <p className="text-xs text-sky-300">
                  O sistema analisará cada arquivo e tentará detectar a série
                  automaticamente. Recomendado apenas para uploads variados.
                </p>
              </div>
            )}

            {/* ── Step 2: Upload Source ────────────────────────────── */}
            <p className="mb-2 text-xs font-medium text-[var(--color-textDim)]">
              2. Origem dos arquivos
            </p>
            <div className="mb-4 flex gap-1 rounded-lg bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setMode("local")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "local"
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                }`}
              >
                <HardDrive className="h-4 w-4" />
                Local
              </button>
              <button
                type="button"
                onClick={() => setMode("gdrive")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "gdrive"
                    ? "bg-sky-500/15 text-sky-300"
                    : "text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
                }`}
              >
                <Cloud className="h-4 w-4" />
                Google Drive
              </button>
            </div>

            {/* ── Step 3: Files ────────────────────────────────────── */}
            {!canUpload && (
              <div className="mb-3 rounded-lg border border-amber-500/10 bg-amber-500/5 px-3 py-2">
                <p className="text-xs text-amber-300">
                  {seriesMode === "new"
                    ? "Preencha o título da nova série para continuar."
                    : "Selecione a série de destino para continuar."}
                </p>
              </div>
            )}

            {mode === "local" && (
              <div className="space-y-3">
                <FileDropZone
                  onFilesSelected={handleLocalFiles}
                  isUploading={isUploading}
                  disabled={!canUpload}
                />
                {stageError && (
                  <p className="text-xs text-rose-300">
                    Erro ao enviar: {stageError.message || "Tente novamente."}
                  </p>
                )}
              </div>
            )}

            {mode === "gdrive" && (
              <GoogleDriveImport
                onDraftCreated={handleGDriveDraft}
                seriesMode={seriesMode}
                seriesTitle={
                  seriesMode === "new" ? seriesTitle : selectedSeriesTitle
                }
                existingSeriesId={
                  seriesMode === "existing" ? selectedSeriesId : null
                }
                disabled={!canUpload}
              />
            )}
          </div>

          {/* Contextual tip */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
            <p className="text-xs leading-relaxed text-[var(--color-textDim)]">
              <strong className="text-[var(--color-textMain)]">Dica:</strong>{" "}
              {mode === "gdrive"
                ? "Importe até 1.000 arquivos de uma vez pelo Google Drive. O backend lida com filas e lotes automaticamente — sem necessidade de dividir."
                : seriesMode === "new"
                  ? "Ao criar uma nova série, todos os capítulos enviados serão automaticamente associados a ela."
                  : seriesMode === "existing"
                    ? "Ao selecionar uma série existente, todos os capítulos enviados serão adicionados diretamente a ela."
                    : "No modo automático, o sistema tentará detectar a série de cada arquivo. Você poderá ajustar na revisão do draft."}
            </p>
          </div>
        </div>

        {/* ── Right Panel: Active Drafts ──────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-textMain)]">
              Drafts Ativos
            </h2>
            {draftsQuery.isRefetching && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-textDim)]" />
            )}
          </div>

          {draftsQuery.isLoading && (
            <div className="flex items-center justify-center rounded-xl border border-white/5 bg-[var(--color-surface)] py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-textDim)]" />
            </div>
          )}

          {draftsQuery.isError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
              <p className="text-sm text-rose-300">
                Não foi possível carregar os drafts.
              </p>
              <button
                type="button"
                onClick={() => draftsQuery.refetch()}
                className="mt-2 text-xs text-[var(--color-primary)] hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!draftsQuery.isLoading && drafts.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[var(--color-surface)] py-12 text-center">
              <Inbox className="h-10 w-10 text-[var(--color-textDim)]" />
              <div>
                <p className="text-sm text-[var(--color-textMain)]">
                  Nenhum draft ativo
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  Envie arquivos para criar um novo draft de upload.
                </p>
              </div>
            </div>
          )}

          {drafts.length > 0 && (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
