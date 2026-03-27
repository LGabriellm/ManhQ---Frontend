"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useSeriesSearch } from "@/hooks/useApi";
import {
  CONFIDENCE_META,
  ITEM_STATUS_META,
  TONE_STYLES,
  formatDateTime,
  formatNumber,
  formatUploadStage,
  getPrimaryStage,
  itemNeedsManualChoice,
} from "@/lib/upload-workflow";
import type {
  UpdateUploadDraftItemRequest,
  UploadDecision,
  UploadItem,
} from "@/types/upload-workflow";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getInitialSeriesSearchLabel(item: UploadItem): string {
  return (
    item.suggestion.matchedSeriesTitle ||
    item.plan.newSeriesTitle ||
    item.originalName
  );
}

function getInitialDecision(item: UploadItem): UploadDecision {
  if (item.plan.decision) {
    return item.plan.decision;
  }

  if (item.suggestion.matchedSeriesId) {
    return "EXISTING_SERIES";
  }

  return "NEW_SERIES";
}

interface UploadItemCardProps {
  item: UploadItem;
  disabled?: boolean;
  onPatch: (itemId: string, data: UpdateUploadDraftItemRequest) => Promise<void>;
  onRetry?: (itemId: string) => Promise<void>;
}

export function UploadItemCard({
  item,
  disabled = false,
  onPatch,
  onRetry,
}: UploadItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [decision, setDecision] = useState<UploadDecision>(getInitialDecision(item));
  const [targetSeriesId, setTargetSeriesId] = useState(
    item.plan.targetSeriesId || item.suggestion.matchedSeriesId || "",
  );
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState(
    item.suggestion.matchedSeriesTitle || "",
  );
  const [newSeriesTitle, setNewSeriesTitle] = useState(
    item.plan.newSeriesTitle || item.suggestion.matchedSeriesTitle || "",
  );
  const [chapterNumber, setChapterNumber] = useState<string>(
    item.plan.chapterNumber != null ? String(item.plan.chapterNumber) : "",
  );
  const [volume, setVolume] = useState<string>(
    item.plan.volume != null ? String(item.plan.volume) : "",
  );
  const [year, setYear] = useState<string>(
    item.plan.year != null ? String(item.plan.year) : "",
  );
  const [isOneShot, setIsOneShot] = useState(item.plan.isOneShot);
  const [tagsInput, setTagsInput] = useState(item.plan.tags.join(", "));
  const [description, setDescription] = useState(item.plan.description);
  const [status, setStatus] = useState(item.plan.status);
  const [author, setAuthor] = useState(item.plan.author);
  const [artist, setArtist] = useState(item.plan.artist);
  const [seriesQuery, setSeriesQuery] = useState(getInitialSeriesSearchLabel(item));
  const deferredSeriesQuery = useDeferredValue(seriesQuery.trim());
  const { data: seriesSearch } = useSeriesSearch(deferredSeriesQuery, 1, 8);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setDecision(getInitialDecision(item));
    setTargetSeriesId(item.plan.targetSeriesId || item.suggestion.matchedSeriesId || "");
    setSelectedSeriesTitle(item.suggestion.matchedSeriesTitle || "");
    setNewSeriesTitle(
      item.plan.newSeriesTitle || item.suggestion.matchedSeriesTitle || "",
    );
    setChapterNumber(
      item.plan.chapterNumber != null ? String(item.plan.chapterNumber) : "",
    );
    setVolume(item.plan.volume != null ? String(item.plan.volume) : "");
    setYear(item.plan.year != null ? String(item.plan.year) : "");
    setIsOneShot(item.plan.isOneShot);
    setTagsInput(item.plan.tags.join(", "));
    setDescription(item.plan.description);
    setStatus(item.plan.status);
    setAuthor(item.plan.author);
    setArtist(item.plan.artist);
    setSeriesQuery(getInitialSeriesSearchLabel(item));
  }, [item]);

  const canSave = useMemo(() => {
    if (decision === "EXISTING_SERIES") {
      return Boolean(targetSeriesId);
    }

    if (decision === "NEW_SERIES") {
      return Boolean(newSeriesTitle.trim());
    }

    return true;
  }, [decision, newSeriesTitle, targetSeriesId]);

  const primaryStage = getPrimaryStage(item.suggestion.stages);
  const statusMeta = ITEM_STATUS_META[item.status];
  const confidenceMeta = CONFIDENCE_META[item.suggestion.confidence];
  const needsManualChoice = itemNeedsManualChoice(item);

  const saveChanges = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave || disabled) {
      return;
    }

    setIsSaving(true);
    try {
      await onPatch(item.id, {
        decision,
        targetSeriesId: decision === "EXISTING_SERIES" ? targetSeriesId : undefined,
        newSeriesTitle:
          decision === "NEW_SERIES" ? newSeriesTitle.trim() : undefined,
        chapterNumber: chapterNumber ? Number(chapterNumber) : undefined,
        volume: volume ? Number(volume) : null,
        year: year ? Number(year) : null,
        isOneShot,
        tags: parseTags(tagsInput),
        description: description.trim() || undefined,
        status: status.trim() || undefined,
        author: author.trim() || undefined,
        artist: artist.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const retryItem = async () => {
    if (!onRetry || disabled) {
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry(item.id);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <article className="rounded-[28px] border border-white/8 bg-white/[0.035] p-5 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.65)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--color-textMain)]">
              {item.originalName}
            </h3>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[statusMeta.tone]}`}
            >
              {statusMeta.label}
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[confidenceMeta.tone]}`}
            >
              {confidenceMeta.label}
            </span>
            {needsManualChoice && (
              <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                Aguardando decisão manual
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-textDim)]">
            <span>Capítulos detectados: {formatNumber(item.pageCount)}</span>
            <span>Etapa: {formatUploadStage(item.currentStage)}</span>
            <span>
              Seleção: {item.plan.selectionConfirmed ? "confirmada" : "pendente"}
            </span>
            {item.plan.selectionSource && <span>Origem: {item.plan.selectionSource}</span>}
          </div>

          {item.suggestion.matchedSeriesTitle && (
            <p className="mt-3 text-sm text-[var(--color-textMain)]">
              Sugestão principal:{" "}
              <span className="font-medium">{item.suggestion.matchedSeriesTitle}</span>
              {item.suggestion.confidenceScore ? (
                <span className="text-[var(--color-textDim)]">
                  {" "}
                  · score {Math.round(item.suggestion.confidenceScore)}
                </span>
              ) : null}
            </p>
          )}

          {primaryStage?.detail && (
            <p className="mt-2 text-xs text-[var(--color-textDim)]">
              {primaryStage.detail}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRetry && item.status === "FAILED" && (
            <button
              type="button"
              onClick={() => void retryItem()}
              disabled={disabled || isRetrying}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.08] disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Tentar novamente
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.08]"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? "Fechar detalhes" : "Revisar item"}
          </button>
        </div>
      </div>

      {(item.suggestion.warnings.length > 0 || item.suggestion.conflicts.length > 0) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {item.suggestion.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Alertas
              </p>
              <ul className="space-y-1">
                {item.suggestion.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {item.suggestion.conflicts.length > 0 && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                Conflitos
              </p>
              <ul className="space-y-1">
                {item.suggestion.conflicts.map((conflict) => (
                  <li key={conflict}>{conflict}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <form className="space-y-4" onSubmit={(event) => void saveChanges(event)}>
            <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                    Destino
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-[var(--color-textMain)]">
                    Decisão manual obrigatória
                  </h4>
                </div>
                {item.plan.selectionConfirmed && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmado
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {(["EXISTING_SERIES", "NEW_SERIES", "SKIP"] as UploadDecision[]).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDecision(option)}
                      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                        decision === option
                          ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                          : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {option === "EXISTING_SERIES"
                          ? "Série existente"
                          : option === "NEW_SERIES"
                            ? "Nova série"
                            : "Ignorar item"}
                      </p>
                      <p className="mt-1 text-xs opacity-80">
                        {option === "EXISTING_SERIES"
                          ? "Vincula manualmente a uma série já existente."
                          : option === "NEW_SERIES"
                            ? "Confirma um novo título canônico."
                            : "Mantém o item fora do processamento."}
                      </p>
                    </button>
                  ),
                )}
              </div>

              {decision === "EXISTING_SERIES" && (
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
                        placeholder="Busque pelo título da série..."
                      />
                    </div>
                  </label>

                  <div className="grid gap-2">
                    {item.suggestion.matchedSeriesId &&
                      item.suggestion.matchedSeriesTitle && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetSeriesId(item.suggestion.matchedSeriesId || "");
                            setSelectedSeriesTitle(
                              item.suggestion.matchedSeriesTitle || "",
                            );
                            setSeriesQuery(item.suggestion.matchedSeriesTitle || "");
                          }}
                          className="flex items-center justify-between rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-textMain)]"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                            Confirmar sugestão: {item.suggestion.matchedSeriesTitle}
                          </span>
                          <span className="text-xs text-[var(--color-textDim)]">
                            score {Math.round(item.suggestion.confidenceScore)}
                          </span>
                        </button>
                      )}

                    {seriesSearch?.items?.map((series) => (
                      <button
                        key={series.id}
                        type="button"
                        onClick={() => {
                          setTargetSeriesId(series.id);
                          setSelectedSeriesTitle(series.title);
                          setSeriesQuery(series.title);
                        }}
                        className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                          targetSeriesId === series.id
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
                      Série selecionada: {selectedSeriesTitle}
                    </p>
                  )}
                </div>
              )}

              {decision === "NEW_SERIES" && (
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Título final da nova série
                  </span>
                  <input
                    type="text"
                    value={newSeriesTitle}
                    onChange={(event) => setNewSeriesTitle(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                    placeholder="Digite o título definitivo..."
                  />
                </label>
              )}
            </section>

            <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Capítulo e metadados
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Capítulo
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={chapterNumber}
                    onChange={(event) => setChapterNumber(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Volume
                  </span>
                  <input
                    type="number"
                    value={volume}
                    onChange={(event) => setVolume(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Ano
                  </span>
                  <input
                    type="number"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isOneShot}
                    onChange={(event) => setIsOneShot(event.target.checked)}
                    className="rounded border-white/15 bg-transparent"
                  />
                  <span className="text-sm text-[var(--color-textMain)]">
                    One-shot
                  </span>
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Autor
                  </span>
                  <input
                    type="text"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Artista
                  </span>
                  <input
                    type="text"
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Status da obra
                  </span>
                  <input
                    type="text"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Tags livres
                  </span>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                    placeholder="ação, fantasia, clássico"
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Descrição usada no plano
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                />
              </label>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="submit"
                disabled={disabled || isSaving || !canSave}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar decisão do item
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Evidência e etapas
              </p>

              <div className="mt-4 space-y-2">
                {item.suggestion.candidates.slice(0, 3).map((candidate) => (
                  <div
                    key={`${candidate.normalizedTitle}-${candidate.matchedSeriesId || "new"}`}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <p className="text-sm font-medium text-[var(--color-textMain)]">
                      {candidate.matchedSeriesTitle || candidate.normalizedTitle}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-textDim)]">
                      Evidência {Math.round(candidate.evidenceScore)} · score total{" "}
                      {Math.round(candidate.combinedScore)}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--color-textDim)]">
                      {candidate.evidenceSources.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {item.suggestion.evidence.slice(0, 5).map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2"
                  >
                    <p className="text-xs font-medium text-[var(--color-textMain)]">
                      {evidence.source}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-textDim)]">
                      {evidence.rawValue}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {item.suggestion.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-[var(--color-textMain)]">
                        {formatUploadStage(stage.stage)}
                      </p>
                      {stage.detail && (
                        <p className="mt-1 text-[11px] text-[var(--color-textDim)]">
                          {stage.detail}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--color-textDim)]">
                      {stage.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {(item.error?.message || item.completedAt || item.processedAt) && (
              <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                  Resultado
                </p>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="text-[var(--color-textDim)]">Processado em</dt>
                    <dd className="mt-1 text-[var(--color-textMain)]">
                      {formatDateTime(item.processedAt || item.completedAt)}
                    </dd>
                  </div>
                  {item.result.seriesTitle && (
                    <div>
                      <dt className="text-[var(--color-textDim)]">Série final</dt>
                      <dd className="mt-1 text-[var(--color-textMain)]">
                        {item.result.seriesTitle}
                      </dd>
                    </div>
                  )}
                  {item.error?.message && (
                    <div>
                      <dt className="text-[var(--color-textDim)]">Erro atual</dt>
                      <dd className="mt-1 text-rose-200">{item.error.message}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </aside>
        </div>
      )}
    </article>
  );
}
