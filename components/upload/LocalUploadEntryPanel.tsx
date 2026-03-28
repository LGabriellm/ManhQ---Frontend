"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Search, ArrowRight, FolderUp, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useSeriesSearch } from "@/hooks/useApi";
import {
  useStageLocalUpload,
  useStageLocalUploadWithSeriesTitle,
  useUploadToExistingSeries,
} from "@/hooks/useUploadWorkflow";
import { getUploadErrorMessage } from "@/lib/uploadErrors";

const ACCEPTED_EXTENSIONS = [".cbz", ".cbr", ".pdf", ".epub", ".zip"];

type LocalEntryMode = "review" | "existing" | "new";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filterAcceptedFiles(files: File[]) {
  const accepted = files.filter((file) =>
    ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)),
  );
  const rejected = files.length - accepted.length;

  return { accepted, rejected };
}

function extractFolderName(files: File[]): string | undefined {
  const relativePath = files.find((file) => "webkitRelativePath" in file)?.webkitRelativePath;
  if (!relativePath) {
    return undefined;
  }

  return relativePath.split("/").filter(Boolean)[0];
}

interface LocalUploadEntryPanelProps {
  onOpenSession: (sessionId: string) => void;
}

export function LocalUploadEntryPanel({
  onOpenSession,
}: LocalUploadEntryPanelProps) {
  const [mode, setMode] = useState<LocalEntryMode>("review");
  const [files, setFiles] = useState<File[]>([]);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState("");
  const [seriesQuery, setSeriesQuery] = useState("");
  const deferredSeriesQuery = useDeferredValue(seriesQuery.trim());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const searchResults = useSeriesSearch(deferredSeriesQuery, 1, 8);
  const stageMutation = useStageLocalUpload();
  const stageWithTitleMutation = useStageLocalUploadWithSeriesTitle();
  const directExistingMutation = useUploadToExistingSeries();

  const addFiles = (incoming: File[]) => {
    const { accepted, rejected } = filterAcceptedFiles(incoming);

    if (accepted.length === 0) {
      toast.error("Nenhum arquivo compatível encontrado.");
      return;
    }

    if (rejected > 0) {
      toast.error(`${rejected} arquivo(s) ignorado(s) por formato não suportado.`);
    }

    setFiles((current) => {
      const next = [...current];
      accepted.forEach((file) => {
        const exists = next.some(
          (currentFile) =>
            currentFile.name === file.name && currentFile.size === file.size,
        );
        if (!exists) {
          next.push(file);
        }
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Selecione ao menos um arquivo antes de continuar.");
      return;
    }

    const folderName = extractFolderName(files);

    try {
      if (mode === "review") {
        const result = await stageMutation.mutateAsync({
          files,
          folderName,
        });
        toast.success(result.nextStep);
        onOpenSession(result.draftId);
        setFiles([]);
        return;
      }

      if (mode === "new") {
        if (!newSeriesTitle.trim()) {
          toast.error("Defina o título da nova série.");
          return;
        }

        const result = await stageWithTitleMutation.mutateAsync({
          files,
          seriesTitle: newSeriesTitle.trim(),
          folderName,
        });
        toast.success(result.nextStep);
        onOpenSession(result.draftId);
        setFiles([]);
        return;
      }

      if (!selectedSeriesId) {
        toast.error("Escolha a série de destino.");
        return;
      }

      const result = await directExistingMutation.mutateAsync({
        seriesId: selectedSeriesId,
        files,
      });
      toast.success(result.message);
      onOpenSession(result.sessionId);
      setFiles([]);
    } catch (error) {
      toast.error(
        getUploadErrorMessage(error, "Falha ao iniciar o fluxo de upload local."),
      );
    }
  };

  const isSubmitting =
    stageMutation.isPending ||
    stageWithTitleMutation.isPending ||
    directExistingMutation.isPending;
  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );
  const folderNameHint = useMemo(() => extractFolderName(files), [files]);

  return (
    <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Upload local
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            Staging, revisão e envio direto
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-textDim)]">
            O stage local cria um draft persistido e o workspace passa a seguir o
            estado oficial do backend. Você pode revisar primeiro, forçar um novo
            título ou enviar direto para uma série existente.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {([
          ["review", "Enviar e revisar sugestões"],
          ["existing", "Enviar direto para série existente"],
          ["new", "Enviar como nova série"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
              mode === value
                ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
            }`}
          >
            <p className="text-sm font-medium">{label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[28px] border border-dashed border-white/12 bg-black/10 p-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-3xl bg-[var(--color-primary)]/10 p-4 text-[var(--color-primary)]">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-textMain)]">
                Selecione arquivos ou uma pasta inteira
              </p>
              <p className="mt-1 text-xs text-[var(--color-textDim)]">
                Formatos aceitos: {ACCEPTED_EXTENSIONS.join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
              >
                <Upload className="h-4 w-4" />
                Selecionar arquivos
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
              >
                <FolderUp className="h-4 w-4" />
                Selecionar pasta
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(event) => {
              if (event.target.files) {
                addFiles(Array.from(event.target.files));
                event.target.value = "";
              }
            }}
            className="hidden"
          />
          <input
            ref={(element) => {
              folderInputRef.current = element;
              if (element) {
                element.setAttribute("webkitdirectory", "");
                element.setAttribute("directory", "");
              }
            }}
            type="file"
            multiple
            onChange={(event) => {
              if (event.target.files) {
                addFiles(Array.from(event.target.files));
                event.target.value = "";
              }
            }}
            className="hidden"
          />

          <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                  Arquivos preparados
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                  {files.length}
                </p>
                <p className="mt-1 text-xs text-[var(--color-textDim)]">
                  {formatBytes(totalSize)}
                  {folderNameHint ? ` · pasta ${folderNameHint}` : ""}
                </p>
              </div>
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs text-[var(--color-textDim)] transition-colors hover:text-rose-300"
                >
                  Limpar lista
                </button>
              )}
            </div>

            <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
              {files.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[var(--color-textDim)]">
                  Nenhum arquivo selecionado ainda.
                </div>
              ) : (
                files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--color-textMain)]">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-textDim)]">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="text-xs text-[var(--color-textDim)] transition-colors hover:text-rose-300"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-black/10 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
            Destino inicial
          </p>

          {mode === "existing" && (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Buscar série existente
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                  <input
                    type="text"
                    value={seriesQuery}
                    onChange={(event) => setSeriesQuery(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                    placeholder="Busque a série..."
                  />
                </div>
              </label>

              <div className="grid gap-2">
                {searchResults.data?.items.map((series) => (
                  <button
                    key={series.id}
                    type="button"
                    onClick={() => {
                      setSelectedSeriesId(series.id);
                      setSelectedSeriesTitle(series.title);
                      setSeriesQuery(series.title);
                    }}
                    className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                      selectedSeriesId === series.id
                        ? "border-emerald-500/25 bg-emerald-500/10 text-[var(--color-textMain)]"
                        : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
                    }`}
                  >
                    <p className="text-sm font-medium">{series.title}</p>
                    <p className="mt-1 text-xs opacity-80">{series.id}</p>
                  </button>
                ))}
              </div>

              {selectedSeriesTitle && (
                <p className="text-xs text-emerald-200">
                  Série escolhida: {selectedSeriesTitle}
                </p>
              )}
            </div>
          )}

          {mode === "new" && (
            <label className="mt-4 block">
              <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                Título final da nova série
              </span>
              <input
                type="text"
                value={newSeriesTitle}
                onChange={(event) => setNewSeriesTitle(event.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                placeholder="Ex.: My New Series"
              />
            </label>
          )}

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
            {mode === "review"
              ? "O stage cria um draft persistido. Depois disso, a próxima etapa é controlada por workflow.state e workflow.nextAction."
              : mode === "existing"
                ? "O destino já começa explícito, mas o backend ainda analisa o lote e pode exigir espera, aprovação ou reprocessamento."
                : "O novo título já entra como dica forte para o draft, mantendo a revisão manual disponível enquanto o workflow permitir."}
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || files.length === 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {mode === "review"
              ? "Criar sessão de revisão"
              : mode === "existing"
                ? "Enviar para série existente"
                : "Criar sessão com novo título"}
          </button>
        </div>
      </div>
    </section>
  );
}
