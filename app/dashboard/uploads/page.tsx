"use client";

import Link from "next/link";
import { useDeferredValue, useRef, useState } from "react";
import { useSeriesSearch } from "@/hooks/useApi";
import { useMySubmissions } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleDriveImportPanel } from "@/components/upload/GoogleDriveImportPanel";
import { UploadItemCard } from "@/components/upload/UploadItemCard";
import { UploadSessionList } from "@/components/upload/UploadSessionList";
import {
  useBulkUpdateUploadDraft,
  useCancelUploadDraft,
  useConfirmUploadDraft,
  useRetryUploadItem,
  useStageLocalUpload,
  useStageLocalUploadWithSeriesTitle,
  useUpdateUploadDraftItem,
  useUploadDraft,
  useUploadSession,
  useUploadSessions,
  useUploadToExistingSeries,
} from "@/hooks/useUploadWorkflow";
import {
  SESSION_STATUS_META,
  TONE_STYLES,
  countItemsFailed,
  countItemsNeedingManualChoice,
  formatDateTime,
  getSessionProgress,
  getSourceLabel,
  isReviewPhase,
} from "@/lib/upload-workflow";
import type {
  UploadDraft,
  UploadSessionSummary,
} from "@/types/upload-workflow";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderUp,
  Loader2,
  Search,
  Upload,
} from "lucide-react";

const ACCEPTED_EXTENSIONS = [".cbz", ".cbr", ".pdf", ".epub", ".zip"];
const EMPTY_SESSIONS: UploadSessionSummary[] = [];

type LocalEntryMode = "review" | "existing" | "new";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
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

function LocalUploadEntryPanel({
  onOpenSession,
}: {
  onOpenSession: (sessionId: string) => void;
}) {
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
      const message =
        (error as { message?: string })?.message ||
        "Falha ao iniciar o fluxo de upload local";
      toast.error(message);
    }
  };

  const isSubmitting =
    stageMutation.isPending ||
    stageWithTitleMutation.isPending ||
    directExistingMutation.isPending;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Upload local
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
            Manual-first por padrão
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-textDim)]">
            O backend pode sugerir destinos, mas o frontend só confirma a série
            quando você escolhe explicitamente entre série existente, nova série
            ou ignorar o item.
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

      <div className="mt-5 rounded-[28px] border border-dashed border-white/12 bg-black/10 p-6">
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

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                Arquivos preparados
              </p>
              <p className="mt-1 text-sm text-[var(--color-textMain)]">
                {files.length} arquivo(s) · {formatBytes(totalSize)}
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
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2"
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
                    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  className="text-xs text-[var(--color-textDim)] transition-colors hover:text-rose-300"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
            Destino manual
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
              ? "Sessão em stage: o backend analisa primeiro e você confirma o destino de cada item depois."
              : mode === "existing"
                ? "Destino já confirmado manualmente. O backend ainda analisa os arquivos, mas pode auto-submeter depois dessa escolha explícita."
                : "O título final já fica pré-preenchido no plano, mas a sessão continua revisável antes da confirmação."}
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

export default function UploadsPage() {
  const { isAdmin, isEditor } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [bulkSeriesId, setBulkSeriesId] = useState("");
  const [bulkSeriesTitle, setBulkSeriesTitle] = useState("");
  const [bulkSeriesQuery, setBulkSeriesQuery] = useState("");
  const [bulkNewSeriesTitle, setBulkNewSeriesTitle] = useState("");
  const deferredBulkSeriesQuery = useDeferredValue(bulkSeriesQuery.trim());

  const sessionsQuery = useUploadSessions({ page: 1, limit: 12 });
  const sessions = sessionsQuery.data?.sessions ?? EMPTY_SESSIONS;
  const resolvedActiveSessionId = activeSessionId ?? sessions[0]?.id ?? null;
  const activeSummary =
    sessions.find((session) => session.id === resolvedActiveSessionId) || null;
  const activeSessionQuery = useUploadSession(
    resolvedActiveSessionId || "",
    Boolean(resolvedActiveSessionId),
  );
  const activeSession = activeSessionQuery.data?.session || null;
  const activeSource =
    activeSession?.source || activeSummary?.source || null;
  const activeStatus =
    activeSession?.status || activeSummary?.status || null;
  const shouldLoadDraft = Boolean(
    resolvedActiveSessionId &&
      activeSource &&
      activeStatus &&
      isReviewPhase(activeStatus),
  );
  const activeDraftQuery = useUploadDraft(
    activeSource || "LOCAL",
    resolvedActiveSessionId || "",
    shouldLoadDraft,
  );
  const activeDraft = (activeDraftQuery.data as { draft?: UploadDraft } | undefined)?.draft || null;

  const updateDraftItemMutation = useUpdateUploadDraftItem();
  const bulkUpdateDraftMutation = useBulkUpdateUploadDraft();
  const confirmDraftMutation = useConfirmUploadDraft();
  const cancelDraftMutation = useCancelUploadDraft();
  const retryItemMutation = useRetryUploadItem();
  const submissionsQuery = useMySubmissions({ page: 1, limit: 5 });

  const bulkSeriesSearch = useSeriesSearch(deferredBulkSeriesQuery, 1, 6);

  const activeItems = activeSession?.items || activeDraft?.items || [];
  const reviewPendingCount = countItemsNeedingManualChoice(activeItems);
  const failedItemsCount = countItemsFailed(activeItems);
  const isReviewWorkspace = Boolean(activeDraft && activeSource && activeSessionId);
  const sessionStatusMeta = activeStatus ? SESSION_STATUS_META[activeStatus] : null;
  const progress =
    activeSession && activeSession.items.length > 0 ? getSessionProgress(activeSession) : 0;

  const patchItem = async (
    itemId: string,
    data: Parameters<typeof updateDraftItemMutation.mutateAsync>[0]["data"],
  ) => {
    if (!activeSource || !resolvedActiveSessionId) {
      return;
    }

    try {
      await updateDraftItemMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        itemId,
        data,
      });
      toast.success("Plano do item atualizado.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao atualizar o item da sessão.";
      toast.error(message);
    }
  };

  const retryItem = async (itemId: string) => {
    try {
      await retryItemMutation.mutateAsync(itemId);
      toast.success("Item reenfileirado para nova tentativa.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao reenfileirar o item.";
      toast.error(message);
    }
  };

  const applyBulkExistingSeries = async () => {
    if (!activeSource || !resolvedActiveSessionId || !bulkSeriesId) {
      toast.error("Escolha uma série para aplicar em lote.");
      return;
    }

    try {
      await bulkUpdateDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        data: {
          targetSeriesId: bulkSeriesId,
        },
      });
      toast.success("Série existente aplicada a todos os itens do draft.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao aplicar a série em lote.";
      toast.error(message);
    }
  };

  const applyBulkNewSeries = async () => {
    if (!activeSource || !resolvedActiveSessionId || !bulkNewSeriesTitle.trim()) {
      toast.error("Defina o novo título para aplicar em lote.");
      return;
    }

    try {
      await bulkUpdateDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        data: {
          seriesTitle: bulkNewSeriesTitle.trim(),
        },
      });
      toast.success("Novo título aplicado ao draft.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao aplicar o título em lote.";
      toast.error(message);
    }
  };

  const skipPendingItems = async () => {
    if (!activeSource || !resolvedActiveSessionId) {
      return;
    }

    const pendingItems = activeItems
      .filter((item) => item.plan.selectionConfirmed !== true)
      .map((item) => ({
        itemId: item.id,
        selected: false,
      }));

    if (pendingItems.length === 0) {
      toast.error("Não há itens pendentes para ignorar.");
      return;
    }

    try {
      await bulkUpdateDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        data: {
          items: pendingItems,
        },
      });
      toast.success("Itens pendentes marcados como ignorados.");
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao ignorar itens pendentes.";
      toast.error(message);
    }
  };

  const confirmDraft = async () => {
    if (!activeSource || !resolvedActiveSessionId) {
      return;
    }

    try {
      const result = await confirmDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
        idempotencyKey: createIdempotencyKey(),
      });
      toast.success(
        `${result.totals.accepted} aceitos · ${result.totals.rejected} rejeitados · ${result.totals.skipped} ignorados`,
      );
      setActiveSessionId(result.session.id);
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao confirmar a sessão.";
      toast.error(message);
    }
  };

  const cancelDraft = async () => {
    if (!activeSource || !resolvedActiveSessionId) {
      return;
    }

    try {
      await cancelDraftMutation.mutateAsync({
        source: activeSource,
        draftId: resolvedActiveSessionId,
      });
      toast.success("Sessão cancelada.");
      setActiveSessionId(null);
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao cancelar a sessão.";
      toast.error(message);
    }
  };

  const roleSummary = isEditor && !isAdmin
    ? "Você pode criar sessões, revisar sugestões e acompanhar aprovações pendentes."
    : "Sessões de upload, revisão manual, importações do Drive e estado de processamento em um único workspace.";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Upload system remodelado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-textMain)]">
            Uploads & Importações
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-textDim)]">
            {roleSummary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Fila de aprovações
            </Link>
          )}
          <Link
            href="/dashboard/submissions"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07]"
          >
            <Clock className="h-4 w-4" />
            Minhas submissões
          </Link>
        </div>
      </div>

      <div className="grid gap-8">
        <LocalUploadEntryPanel onOpenSession={setActiveSessionId} />
        <GoogleDriveImportPanel onOpenSession={setActiveSessionId} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Workspace da sessão
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-textMain)]">
                  {activeSummary?.inputName || "Selecione uma sessão"}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-textDim)]">
                  {activeSummary
                    ? `${getSourceLabel(activeSummary.source)} · criada em ${formatDateTime(
                        activeSummary.createdAt,
                      )}`
                    : "Escolha uma sessão na coluna ao lado para revisar itens, confirmar destinos ou acompanhar processamento."}
                </p>
              </div>

              {sessionStatusMeta && (
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${TONE_STYLES[sessionStatusMeta.tone]}`}
                >
                  {sessionStatusMeta.label}
                </span>
              )}
            </div>

            {!activeSummary ? (
              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-[var(--color-textDim)]">
                Nenhuma sessão ativa. Use os painéis acima para começar um upload
                local ou uma importação do Google Drive.
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                      Itens
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                      {activeSummary.counts.total}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                      Revisão pendente
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                      {reviewPendingCount}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                      Em aprovação
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                      {activeSummary.counts.approvalPending}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-textDim)]/70">
                      Falhas
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--color-textMain)]">
                      {failedItemsCount}
                    </p>
                  </div>
                </div>

                {activeSession && (
                  <div className="mt-5 rounded-3xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Progresso da sessão
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          {progress}% concluído
                        </p>
                      </div>
                      {activeSession.lastError?.message && (
                        <p className="text-xs text-rose-200">
                          {activeSession.lastError.message}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {activeDraft && (
                  <div className="mt-5 rounded-3xl border border-white/8 bg-black/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Análise do draft
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          {activeDraft.processing.analyzedCount}/
                          {activeDraft.processing.totalReceived} analisados
                        </p>
                      </div>
                      <p className="text-xs text-[var(--color-textDim)]">
                        Estado: {activeDraft.processing.state}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{
                          width: `${
                            activeDraft.processing.totalReceived > 0
                              ? (activeDraft.processing.analyzedCount /
                                  activeDraft.processing.totalReceived) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    {activeDraft.processing.error && (
                      <p className="mt-3 text-xs text-rose-200">
                        {activeDraft.processing.error}
                      </p>
                    )}
                  </div>
                )}

                {isReviewWorkspace && (
                  <div className="mt-6 rounded-[32px] border border-white/8 bg-black/10 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
                          Ações em lote
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-textDim)]">
                          Use as mesmas escolhas manuais em vários itens quando o
                          destino já estiver claro.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void skipPendingItems()}
                          disabled={bulkUpdateDraftMutation.isPending}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[var(--color-textMain)]"
                        >
                          Ignorar pendentes
                        </button>
                        <button
                          type="button"
                          onClick={() => void cancelDraft()}
                          disabled={cancelDraftMutation.isPending}
                          className="rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
                        >
                          Cancelar sessão
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Aplicar série existente
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                            <input
                              type="text"
                              value={bulkSeriesQuery}
                              onChange={(event) => setBulkSeriesQuery(event.target.value)}
                              className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                              placeholder="Busque a série..."
                            />
                          </div>
                          <div className="grid gap-2">
                            {bulkSeriesSearch.data?.items.map((series) => (
                              <button
                                key={series.id}
                                type="button"
                                onClick={() => {
                                  setBulkSeriesId(series.id);
                                  setBulkSeriesTitle(series.title);
                                  setBulkSeriesQuery(series.title);
                                }}
                                className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                                  bulkSeriesId === series.id
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-[var(--color-textMain)]"
                                    : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)]"
                                }`}
                              >
                                <p className="text-sm font-medium">{series.title}</p>
                                <p className="mt-1 text-xs opacity-80">{series.id}</p>
                              </button>
                            ))}
                          </div>
                          {bulkSeriesTitle && (
                            <p className="text-xs text-emerald-200">
                              Selecionada: {bulkSeriesTitle}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => void applyBulkExistingSeries()}
                            disabled={bulkUpdateDraftMutation.isPending || !bulkSeriesId}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            Aplicar série existente
                          </button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-sm font-medium text-[var(--color-textMain)]">
                          Aplicar novo título
                        </p>
                        <div className="mt-3 space-y-3">
                          <input
                            type="text"
                            value={bulkNewSeriesTitle}
                            onChange={(event) => setBulkNewSeriesTitle(event.target.value)}
                            className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                            placeholder="Título canônico da nova série"
                          />
                          <button
                            type="button"
                            onClick={() => void applyBulkNewSeries()}
                            disabled={
                              bulkUpdateDraftMutation.isPending ||
                              !bulkNewSeriesTitle.trim()
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                          >
                            Aplicar novo título
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-textMain)]">
                            Confirmar sessão
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-textDim)]">
                            Só confirme quando todo item não ignorado tiver
                            destino manual validado.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void confirmDraft()}
                          disabled={
                            confirmDraftMutation.isPending ||
                            reviewPendingCount > 0 ||
                            activeStatus === "ANALYZING"
                          }
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
                        >
                          {confirmDraftMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Confirmar e enviar
                        </button>
                      </div>

                      {reviewPendingCount > 0 && (
                        <p className="mt-3 text-xs text-amber-200">
                          Ainda existem {reviewPendingCount} item(ns) sem decisão
                          manual confirmada.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeStatus === "APPROVAL_PENDING" && (
                  <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {isAdmin ? (
                      <span>
                        Há itens aguardando aprovação administrativa.{" "}
                        <Link
                          href="/dashboard/approvals"
                          className="font-semibold underline"
                        >
                          Abrir fila de aprovações
                        </Link>
                        .
                      </span>
                    ) : (
                      "Seu envio foi aceito, mas ainda depende de aprovação administrativa antes do processamento."
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {activeSummary && (
            <div className="space-y-4">
              {activeSessionQuery.isLoading && (
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 text-sm text-[var(--color-textDim)]">
                  Carregando detalhes da sessão...
                </div>
              )}
              {activeItems.map((item) => (
                <UploadItemCard
                  key={item.id}
                  item={item}
                  disabled={!isReviewWorkspace}
                  onPatch={patchItem}
                  onRetry={retryItem}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Sessões recentes
                </p>
                <p className="mt-1 text-sm text-[var(--color-textDim)]">
                  Sessões persistidas são a fonte de verdade do fluxo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => sessionsQuery.refetch()}
                className="text-xs text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
              >
                Atualizar
              </button>
            </div>
            <UploadSessionList
              sessions={sessions}
              activeSessionId={resolvedActiveSessionId}
              onSelect={setActiveSessionId}
            />
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Minhas submissões
            </p>
            <div className="mt-4 space-y-3">
              {submissionsQuery.data?.submissions?.map((submission) => (
                <div
                  key={`${submission.approvalId}-${submission.id}`}
                  className="rounded-2xl border border-white/8 bg-black/10 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-textMain)]">
                        {submission.originalName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-textDim)]">
                        {formatDateTime(submission.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        submission.approval.status === "APPROVED"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : submission.approval.status === "REJECTED"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {submission.approval.status}
                    </span>
                  </div>
                  {submission.approval.reason && (
                    <p className="mt-2 text-xs text-rose-200">
                      {submission.approval.reason}
                    </p>
                  )}
                </div>
              ))}
              {!submissionsQuery.data?.submissions?.length && (
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-[var(--color-textDim)]">
                  Nenhuma submissão recente.
                </div>
              )}
            </div>
            <Link
              href="/dashboard/submissions"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
            >
              Abrir histórico completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Regras do fluxo
            </p>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-textDim)]">
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                Sugestão forte não é decisão final. O bloqueio real é{" "}
                <code className="text-[var(--color-textMain)]">
                  plan.selectionConfirmed
                </code>
                .
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                O backend nunca auto-cria série canônica a partir de inferência.
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
                Google Drive usa preview e análise metadata-first antes de baixar
                o arquivo final.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
