"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FolderUp, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { useStageLocalUpload, useStageLocalUploadWithSeriesTitle } from "@/hooks/useUploadWorkflow";
import type { UploadPipelineStep } from "@/hooks/useUploadCenterStore";
import { getUploadErrorMessage } from "@/lib/uploadErrors";

const ACCEPTED_EXTENSIONS = [".cbz", ".cbr", ".pdf", ".epub", ".zip"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filterAcceptedFiles(files: File[]) {
  const accepted = files.filter((file) =>
    ACCEPTED_EXTENSIONS.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    ),
  );
  const rejected = files.length - accepted.length;

  return { accepted, rejected };
}

function extractFolderName(files: File[]): string | undefined {
  const relativePath = files.find((file) => "webkitRelativePath" in file)
    ?.webkitRelativePath;
  if (!relativePath) {
    return undefined;
  }

  return relativePath.split("/").filter(Boolean)[0];
}

interface LocalUploadEntryPanelProps {
  onOpenSession: (sessionId: string) => void;
  onStepChange?: (step: UploadPipelineStep) => void;
}

export function LocalUploadEntryPanel({
  onOpenSession,
  onStepChange,
}: LocalUploadEntryPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesTitleTouched, setSeriesTitleTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const stageMutation = useStageLocalUpload();
  const stageWithTitleMutation = useStageLocalUploadWithSeriesTitle();

  const folderNameHint = useMemo(() => extractFolderName(files), [files]);
  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  useEffect(() => {
    if (!onStepChange) {
      return;
    }

    if (files.length === 0) {
      onStepChange("SELECT_CONTENT");
      return;
    }

    onStepChange("SERIES");
  }, [files.length, onStepChange]);

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
        const duplicate = next.some(
          (currentFile) =>
            currentFile.name === file.name && currentFile.size === file.size,
        );

        if (!duplicate) {
          next.push(file);
        }
      });

      return next;
    });

    if (!seriesTitleTouched && seriesTitle.trim().length === 0) {
      const suggestedFolder = extractFolderName([...files, ...accepted]);
      if (suggestedFolder) {
        setSeriesTitle(suggestedFolder);
      }
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Selecione ao menos um arquivo antes de continuar.");
      return;
    }

    onStepChange?.("INGEST");

    try {
      const folderName = extractFolderName(files);

      const response = seriesTitle.trim().length > 0
        ? await stageWithTitleMutation.mutateAsync({
            files,
            seriesTitle: seriesTitle.trim(),
            folderName,
          })
        : await stageMutation.mutateAsync({
            files,
            folderName,
          });

      toast.success(response.nextStep);
      onOpenSession(response.session.id || response.draftId);
      setFiles([]);
      setSeriesTitle("");
      setSeriesTitleTouched(false);
    } catch (error) {
      toast.error(
        getUploadErrorMessage(error, "Falha ao iniciar o stage local do upload."),
      );
    }
  };

  const isSubmitting =
    stageMutation.isPending || stageWithTitleMutation.isPending;

  return (
    <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Etapas 2 e 3 · Origem local
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            Selecione arquivos e confirme o nome da série
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-textDim)]">
            O envio local cria apenas um draft em revisão obrigatória. Nenhum
            processamento final é iniciado automaticamente.
          </p>
        </div>
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

            <div className="mt-4 max-h-60 space-y-2 scroll-region pr-1">
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
                          current.filter((_, fileIndex) => fileIndex !== index),
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
          <label htmlFor="local-series-title" className="block">
            <span className="mb-1 block text-xs text-[var(--color-textDim)]">
              3) Nome da série para revisão (editável)
            </span>
            <input
              id="local-series-title"
              type="text"
              value={seriesTitle}
              onChange={(event) => {
                setSeriesTitle(event.target.value);
                setSeriesTitleTouched(true);
              }}
              className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
              placeholder="Pré-preenchido pela pasta quando possível"
            />
          </label>

          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
            O botão abaixo executa apenas o stage para draft em revisão. A
            confirmação final permanece manual na etapa 6.
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
            4) Iniciar pré-processamento para draft
          </button>
        </div>
      </div>
    </section>
  );
}
