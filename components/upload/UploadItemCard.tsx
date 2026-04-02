"use client";

import Link from "next/link";
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
  JOB_STATE_META,
  TONE_STYLES,
  formatDateTime,
  formatDurationMs,
  formatNumber,
  formatPercent,
  formatUploadStage,
  getPrimaryStage,
  itemNeedsManualChoice,
} from "@/lib/upload-workflow";
import type {
  UpdateUploadDraftItemRequest,
  UploadDecision,
  UploadItem,
  UploadSeriesCandidate,
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
  XCircle,
} from "lucide-react";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getInitialSeriesSearchLabel(item: UploadItem): string {
  return (
    item.plan.newSeriesTitle ||
    item.suggestion.matchedSeriesTitle ||
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

function getDestinationSummary(item: UploadItem): string {
  if (item.plan.decision === "EXISTING_SERIES") {
    return (
      item.suggestion.matchedSeriesTitle ||
      item.plan.targetSeriesId ||
      "Série existente"
    );
  }

  if (item.plan.decision === "NEW_SERIES") {
    return item.plan.newSeriesTitle || "Nova série";
  }

  if (item.plan.decision === "SKIP") {
    return "Ignorado";
  }

  return "Pendente";
}

function resolveCandidateTitle(candidate: UploadSeriesCandidate): string {
  return candidate.matchedSeriesTitle || candidate.normalizedTitle;
}

function normalizeToRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function hasPossibleSeriesMismatch(item: UploadItem): boolean {
  const ingestionRecord = normalizeToRecord(item.ingestion);
  const ingestionPlanMetadata = normalizeToRecord(ingestionRecord?.planMetadata);
  const planRecord = normalizeToRecord(item.plan);

  return (
    ingestionRecord?.possibleSeriesMismatch === true ||
    ingestionPlanMetadata?.possibleSeriesMismatch === true ||
    planRecord?.possibleSeriesMismatch === true
  );
}

function collectInconsistencyWarnings(item: UploadItem): string[] {
  const combinedMessages = [...item.suggestion.warnings, ...item.suggestion.conflicts]
    .filter((message) => !shouldSuppressSeriesConflictAlert(message));
  const normalized = combinedMessages.map((message) => message.toLowerCase());
  const alerts: string[] = [];
  const hasSeriesKeyword = normalized.some(
    (message) =>
      message.includes("série") ||
      message.includes("serie") ||
      message.includes("title") ||
      message.includes("nome"),
  );
  const mismatchFlag = hasPossibleSeriesMismatch(item);

  if (
    hasSeriesKeyword ||
    (mismatchFlag &&
      (item.parsing.confidence === "low" || item.parsing.requiresManualReview))
  ) {
    alerts.push("Possível inconsistência de nome ou série detectada.");
  }

  if (normalized.some((message) => message.includes("ano") || message.includes("year"))) {
    alerts.push("Possível divergência de ano detectada.");
  }

  if (
    normalized.some(
      (message) =>
        message.includes("fora do padrão") ||
        message.includes("outside") ||
        (message.includes("pasta") && message.includes("padr")) ||
        message.includes("folder"),
    )
  ) {
    alerts.push("Há arquivos possivelmente fora do padrão da pasta selecionada.");
  }

  return alerts;
}

function extractQuotedCandidates(message: string): string[] {
  const matches = message.match(/"([^"]+)"/g);
  if (!matches) {
    return [];
  }

  return matches
    .map((value) => value.replace(/"/g, "").trim())
    .filter(Boolean);
}

function isLikelyNoisySeriesLabel(label: string): boolean {
  const normalized = label.trim();
  if (normalized.length < 4) {
    return true;
  }

  const letters = Array.from(normalized).filter((char) =>
    /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(char),
  ).length;
  const digits = Array.from(normalized).filter((char) => /[0-9]/.test(char))
    .length;
  const tokenList = normalized.split(/\s+/).filter(Boolean);
  const tinyTokens = tokenList.filter((token) => token.length <= 2).length;
  const hasLongMixedToken = tokenList.some(
    (token) =>
      token.length >= 8 && /[A-Za-z]/.test(token) && /[0-9]/.test(token),
  );

  const lettersRatio = letters / Math.max(normalized.length, 1);
  const digitsRatio = digits / Math.max(normalized.length, 1);

  if (hasLongMixedToken) {
    return true;
  }

  if (digitsRatio > 0.2) {
    return true;
  }

  if (tokenList.length >= 5 && tinyTokens / tokenList.length > 0.45) {
    return true;
  }

  return lettersRatio < 0.45 && digits > 0;
}

function shouldSuppressSeriesConflictAlert(message: string): boolean {
  const normalized = message.toLowerCase();
  const isConflictMessage =
    normalized.includes("conflito entre candidatos de série") ||
    normalized.includes("conflito entre candidatos de serie") ||
    normalized.includes("conflict between series candidates");

  if (!isConflictMessage) {
    return false;
  }

  const candidates = extractQuotedCandidates(message);
  if (candidates.length < 2) {
    return false;
  }

  const noisyCandidates = candidates.filter(isLikelyNoisySeriesLabel).length;
  return noisyCandidates > 0 && noisyCandidates < candidates.length;
}

function isGenericManualReviewWarning(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("revisão humana obrigatória") ||
    normalized.includes("revisao humana obrigatoria") ||
    normalized.includes("review required before confirmation")
  );
}

function dedupeMessages(messages: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const message of messages) {
    const normalized = message.trim();
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

interface UploadItemCardProps {
  item: UploadItem;
  disabled?: boolean;
  disabledReason?: string | null;
  retryDisabled?: boolean;
  cancelDisabled?: boolean;
  onPatch: (itemId: string, data: UpdateUploadDraftItemRequest) => Promise<void>;
  onRetry?: (itemId: string) => Promise<void>;
  onCancel?: (itemId: string) => Promise<void>;
}

export function UploadItemCard({
  item,
  disabled = false,
  disabledReason = null,
  retryDisabled = false,
  cancelDisabled = false,
  onPatch,
  onRetry,
  onCancel,
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
    item.plan.chapterNumber != null
      ? String(item.plan.chapterNumber)
      : item.parsing.chapterNumber != null
        ? String(item.parsing.chapterNumber)
        : "",
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
  const [showAdvancedMetadata, setShowAdvancedMetadata] = useState(false);
  const deferredSeriesQuery = useDeferredValue(seriesQuery.trim());
  const { data: seriesSearch } = useSeriesSearch(deferredSeriesQuery, 1, 8);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    setDecision(getInitialDecision(item));
    setTargetSeriesId(item.plan.targetSeriesId || item.suggestion.matchedSeriesId || "");
    setSelectedSeriesTitle(item.suggestion.matchedSeriesTitle || "");
    setNewSeriesTitle(
      item.plan.newSeriesTitle || item.suggestion.matchedSeriesTitle || "",
    );
    setChapterNumber(
      item.plan.chapterNumber != null
        ? String(item.plan.chapterNumber)
        : item.parsing.chapterNumber != null
          ? String(item.parsing.chapterNumber)
          : "",
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
  const jobMeta = JOB_STATE_META[item.job.state];
  const confidenceMeta = CONFIDENCE_META[item.parsing.confidence ?? "unknown"];
  const needsManualChoice = itemNeedsManualChoice(item);
  const chapterNeedsReview =
    item.parsing.requiresManualReview || item.parsing.confidence === "low";
  const destinationSummary = getDestinationSummary(item);
  const chapterSummary =
    item.plan.chapterNumber != null
      ? `Cap. ${item.plan.chapterNumber}`
      : item.parsing.chapterNumber != null
        ? `Cap. ${item.parsing.chapterNumber}`
        : "Capítulo não definido";
  const queueJobId = item.job.queueJobId || item.result.queueJobId;
  const topCandidates = useMemo(
    () =>
      item.suggestion.candidates
        .filter((candidate) => candidate.matchedSeriesId)
        .slice(0, 4),
    [item.suggestion.candidates],
  );
  const parsingOptions = useMemo(
    () =>
      item.parsing.candidateOptions.filter(
        (candidate) => candidate.value != null,
      ),
    [item.parsing.candidateOptions],
  );
  const canCancel = Boolean(
    onCancel && item.job.canCancel && !item.job.isCancelRequested && !cancelDisabled,
  );
  const inconsistencyWarnings = useMemo(
    () => collectInconsistencyWarnings(item),
    [item],
  );
  const highlightedAlerts = useMemo(() => {
    const allMessages = [
      ...inconsistencyWarnings,
      ...item.suggestion.warnings,
      ...item.suggestion.conflicts,
    ];
    return dedupeMessages(
      allMessages.filter(
        (message) =>
          !isGenericManualReviewWarning(message) &&
          !shouldSuppressSeriesConflictAlert(message),
      ),
    );
  }, [inconsistencyWarnings, item.suggestion.conflicts, item.suggestion.warnings]);
  const hasCriticalAlerts = highlightedAlerts.length > 0 || Boolean(item.error?.message);

  const saveChanges = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave || disabled) {
      return;
    }

    const payload: UpdateUploadDraftItemRequest = {
      decision,
      targetSeriesId: decision === "EXISTING_SERIES" ? targetSeriesId : undefined,
      newSeriesTitle: decision === "NEW_SERIES" ? newSeriesTitle.trim() : undefined,
      chapterNumber: chapterNumber ? Number(chapterNumber) : undefined,
      volume: volume ? Number(volume) : null,
      year: year ? Number(year) : null,
      isOneShot,
    };

    if (tagsInput.trim()) {
      payload.tags = parseTags(tagsInput);
    }

    if (description.trim()) {
      payload.description = description.trim();
    }

    if (status.trim()) {
      payload.status = status.trim();
    }

    if (author.trim()) {
      payload.author = author.trim();
    }

    if (artist.trim()) {
      payload.artist = artist.trim();
    }

    setIsSaving(true);
    try {
      await onPatch(item.id, payload);
    } finally {
      setIsSaving(false);
    }
  };

  const retryItem = async () => {
    if (!onRetry || retryDisabled || item.job.isCancelRequested) {
      return;
    }

    setIsRetrying(true);
    try {
      await onRetry(item.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const cancelItem = async () => {
    if (!onCancel || !canCancel) {
      return;
    }

    setIsCancelling(true);
    try {
      await onCancel(item.id);
    } finally {
      setIsCancelling(false);
    }
  };

  const applyCandidate = (candidate: UploadSeriesCandidate) => {
    if (!candidate.matchedSeriesId) {
      return;
    }

    setDecision("EXISTING_SERIES");
    setTargetSeriesId(candidate.matchedSeriesId);
    setSelectedSeriesTitle(resolveCandidateTitle(candidate));
    setSeriesQuery(resolveCandidateTitle(candidate));
  };

  return (
    <article
      data-upload-item-id={item.id}
      className={`rounded-[28px] border p-5 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.65)] ${
        item.job.isStuck
          ? "border-rose-500/20 bg-rose-500/[0.06]"
          : item.job.isCancelRequested
            ? "border-amber-500/20 bg-amber-500/[0.06]"
            : "border-white/8 bg-white/[0.035]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--color-textMain)]">
              {item.originalName}
            </h3>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[jobMeta.tone]}`}
            >
              {jobMeta.label}
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[confidenceMeta.tone]}`}
            >
              {confidenceMeta.label}
            </span>
            {item.job.retrying ? (
              <span className="inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                Reprocessando
              </span>
            ) : item.job.isCancelRequested ? (
              <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                Cancelando...
              </span>
            ) : item.job.isStuck ? (
              <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
                Atenção operacional
              </span>
            ) : needsManualChoice ? (
              <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                Revisão pendente
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                Escolha registrada
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-textDim)]">
            <span>Capítulos detectados: {formatNumber(item.pageCount)}</span>
            <span>Etapa: {formatUploadStage(item.job.stage || item.currentStage)}</span>
            <span>
              Seleção: {item.plan.selectionConfirmed ? "confirmada" : "pendente"}
            </span>
            {item.plan.selectionSource && <span>Origem: {item.plan.selectionSource}</span>}
          </div>

          {primaryStage?.detail && (
            <p className="mt-2 text-xs text-[var(--color-textDim)]">
              {primaryStage.detail}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRetry && item.job.canRetry && !item.job.isCancelRequested && (
            <button
              type="button"
              onClick={() => void retryItem()}
              disabled={retryDisabled || isRetrying || !item.job.canRetry}
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

          {onCancel && (
            <button
              type="button"
              onClick={() => void cancelItem()}
              disabled={!canCancel || isCancelling}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/15 disabled:opacity-50"
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {item.job.isCancelRequested || isCancelling
                ? "Cancelando..."
                : "Cancelar item"}
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
            {expanded ? "Fechar detalhes" : "Abrir revisão"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Destino
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
            {destinationSummary}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Capítulo
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              chapterNeedsReview
                ? "text-amber-100"
                : "text-[var(--color-textMain)]"
            }`}
          >
            {chapterSummary}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-textDim)]/70">
            Revisão
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--color-textMain)]">
            {needsManualChoice
              ? "Pendente"
              : item.plan.selectionConfirmed
                ? "Concluída"
                : "Aguardando análise"}
          </p>
          {item.plan.decision !== "SKIP" && item.plan.destinationReady !== true ? (
            <p className="mt-1 text-[11px] text-amber-200">
              Defina série/destino antes de confirmar.
            </p>
          ) : null}
        </div>
      </div>

      {(item.job.isStuck || item.job.isCancelRequested || hasCriticalAlerts) && (
        <div
          className={`mt-4 rounded-2xl border p-3 text-xs ${
            item.error?.message || item.job.isStuck || item.suggestion.conflicts.length > 0
              ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
              : "border-amber-500/20 bg-amber-500/10 text-amber-100"
          }`}
        >
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {item.error?.message
              ? "Item com erro"
              : item.job.isStuck
                ? "Item sem heartbeat recente"
                : item.job.isCancelRequested
                  ? "Cancelamento em andamento"
                  : "Atenção na revisão"}
          </p>

          {item.job.isStuck ? (
            <p className="mt-2">
              Último heartbeat {formatDateTime(item.job.lastHeartbeatAt || item.job.lastActivityAt)} ·
              janela {formatDurationMs(item.job.staleAfterMs)}.
            </p>
          ) : null}

          {item.job.isCancelRequested ? (
            <p className="mt-2">
              {item.job.cancelReason || "O worker encerrará no próximo checkpoint seguro."}
            </p>
          ) : null}

          {item.error?.message ? (
            <p className="mt-2">{item.error.message}</p>
          ) : null}

          {!item.job.isStuck && !item.job.isCancelRequested && !item.error?.message ? (
            <ul className="mt-2 space-y-1">
              {highlightedAlerts.slice(0, 2).map((message) => (
                <li key={message}>{message}</li>
              ))}
              {highlightedAlerts.length > 2 ? (
                <li>+{highlightedAlerts.length - 2} alerta(s) adicionais.</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}

      {disabledReason && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-sm text-[var(--color-textDim)]">
          {disabledReason}
        </div>
      )}

      {expanded && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <form className="space-y-4" onSubmit={(event) => void saveChanges(event)}>
            <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                    Decisão manual
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-[var(--color-textMain)]">
                    Confirme ou substitua a sugestão
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
                      disabled={disabled}
                      className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                        decision === option
                          ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                          : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
                      } disabled:opacity-50`}
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
                          ? "Vincule manualmente a uma série já cadastrada."
                          : option === "NEW_SERIES"
                            ? "Confirme um novo título canônico."
                            : "Mantenha o item fora do processamento."}
                      </p>
                    </button>
                  ),
                )}
              </div>

              {topCandidates.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[var(--color-textDim)]">
                    Candidatos rápidos sugeridos
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topCandidates.map((candidate) => (
                      <button
                        key={`${candidate.normalizedTitle}-${candidate.matchedSeriesId}`}
                        type="button"
                        onClick={() => applyCandidate(candidate)}
                        disabled={disabled}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                        {resolveCandidateTitle(candidate)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                        disabled={disabled}
                        className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                        placeholder="Busque pelo título da série..."
                      />
                    </div>
                  </label>

                  {item.suggestion.matchedSeriesId &&
                    item.suggestion.matchedSeriesTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSeriesId(item.suggestion.matchedSeriesId || "");
                          setSelectedSeriesTitle(item.suggestion.matchedSeriesTitle || "");
                          setSeriesQuery(item.suggestion.matchedSeriesTitle || "");
                        }}
                        disabled={disabled}
                        className="flex items-center justify-between rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-textMain)] disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          Aplicar sugestão principal
                        </span>
                        <span className="text-xs text-[var(--color-textDim)]">
                          {item.suggestion.matchedSeriesTitle}
                        </span>
                      </button>
                    )}

                  <div className="list-panel max-h-52 scroll-region">
                    {seriesSearch?.items?.length ? (
                      seriesSearch.items.map((series) => (
                        <button
                          key={series.id}
                          type="button"
                          onClick={() => {
                            setTargetSeriesId(series.id);
                            setSelectedSeriesTitle(series.title);
                            setSeriesQuery(series.title);
                          }}
                          disabled={disabled}
                          className={`list-row ${
                            targetSeriesId === series.id ? "list-row-active" : ""
                          } disabled:opacity-50`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--color-textMain)]">
                              {series.title}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-textDim)]">
                              {series.id}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-xs text-[var(--color-textDim)]">
                        Nenhuma série encontrada para o termo pesquisado.
                      </p>
                    )}
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
                    disabled={disabled}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                    placeholder="Digite o título definitivo..."
                  />
                </label>
              )}
            </section>

            <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
                Ajustes finais
              </p>

              {parsingOptions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-[var(--color-textDim)]">
                    Candidatos de capítulo sugeridos pelo parser
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parsingOptions.map((candidate) => (
                      <button
                        key={`${candidate.raw}-${candidate.strategy || "candidate"}`}
                        type="button"
                        onClick={() => setChapterNumber(String(candidate.value))}
                        disabled={disabled}
                        className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                          chapterNumber === String(candidate.value)
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/[0.04] text-[var(--color-textMain)] hover:bg-white/[0.07]"
                        } disabled:opacity-50`}
                      >
                        {candidate.value}
                        {candidate.strategy ? ` · ${candidate.strategy}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Capítulo
                    {chapterNeedsReview ? " · revisão recomendada" : ""}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={chapterNumber}
                    onChange={(event) => setChapterNumber(event.target.value)}
                    disabled={disabled}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors disabled:opacity-50 ${
                      chapterNeedsReview
                        ? "border-amber-500/30 bg-amber-500/10 focus:border-amber-400/40"
                        : "border-white/8 bg-white/[0.03] focus:border-[var(--color-primary)]/35"
                    }`}
                  />
                  {(item.parsing.selectedCandidate || item.parsing.notes.length > 0) && (
                    <p className="mt-2 text-[11px] text-[var(--color-textDim)]">
                      {item.parsing.selectedCandidate
                        ? `Candidato escolhido: ${item.parsing.selectedCandidate.raw}`
                        : item.parsing.notes[0]}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                    Ano
                  </span>
                  <input
                    type="number"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    disabled={disabled}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                  />
                </label>
              </div>

              {item.parsing.notes.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-xs font-medium text-[var(--color-textMain)]">
                    Notas do parser
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-[var(--color-textDim)]">
                    {item.parsing.notes.slice(0, 4).map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowAdvancedMetadata((current) => !current)}
                className="mt-3 text-xs font-medium text-[var(--color-textDim)] underline-offset-2 hover:text-[var(--color-textMain)] hover:underline"
              >
                {showAdvancedMetadata ? "Ocultar campos avançados" : "Mostrar campos avançados (opcional)"}
              </button>

              {showAdvancedMetadata ? (
                <div className="mt-3 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                        Volume
                      </span>
                      <input
                        type="number"
                        value={volume}
                        onChange={(event) => setVolume(event.target.value)}
                        disabled={disabled}
                        className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                      />
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isOneShot}
                        onChange={(event) => setIsOneShot(event.target.checked)}
                        disabled={disabled}
                        className="rounded border-white/15 bg-transparent"
                      />
                      <span className="text-sm text-[var(--color-textMain)]">
                        One-shot
                      </span>
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                        Autor
                      </span>
                      <input
                        type="text"
                        value={author}
                        onChange={(event) => setAuthor(event.target.value)}
                        disabled={disabled}
                        className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
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
                        disabled={disabled}
                        className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                        Status da obra
                      </span>
                      <input
                        type="text"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        disabled={disabled}
                        className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
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
                        disabled={disabled}
                        className="w-full rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                        placeholder="ação, fantasia, clássico"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                      Descrição usada no plano
                    </span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={3}
                      disabled={disabled}
                      className="w-full rounded-[20px] border border-white/8 bg-black/20 px-4 py-3 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35 disabled:opacity-50"
                    />
                  </label>
                </div>
              ) : null}
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
                Salvar revisão do item
              </button>
            </div>
          </form>

          <aside className="space-y-3">
            <details
              open={hasCriticalAlerts}
              className="rounded-3xl border border-white/8 bg-black/10 p-4"
            >
              <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-textMain)]">
                Alertas e inconsistências ({highlightedAlerts.length + (item.error?.message ? 1 : 0)})
              </summary>
              <div className="mt-3 space-y-2 text-xs">
                {!highlightedAlerts.length && !item.error?.message ? (
                  <p className="text-[var(--color-textDim)]">
                    Sem alertas críticos para este item.
                  </p>
                ) : null}
                {highlightedAlerts.map((message) => (
                  <div
                    key={message}
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-100"
                  >
                    {message}
                  </div>
                ))}
                {item.error?.message ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-100">
                    {item.error.message}
                  </div>
                ) : null}
              </div>
            </details>

            <details className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-textMain)]">
                Parsing e evidências
              </summary>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="text-xs font-medium text-[var(--color-textMain)]">
                    Resultado do parsing
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-textDim)]">
                    Capítulo {item.parsing.chapterNumber ?? "—"} · confiança{" "}
                    {item.parsing.confidence || "não informada"}
                  </p>
                  {item.parsing.selectedCandidate ? (
                    <p className="mt-1 text-xs text-[var(--color-textDim)]">
                      Candidato: {item.parsing.selectedCandidate.raw}
                      {item.parsing.selectedCandidate.strategy
                        ? ` · ${item.parsing.selectedCandidate.strategy}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                {item.parsing.notes.length > 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-xs font-medium text-[var(--color-textMain)]">
                      Notas do parser
                    </p>
                    <ul className="mt-2 space-y-1 text-[11px] text-[var(--color-textDim)]">
                      {item.parsing.notes.slice(0, 5).map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {item.suggestion.candidates.length > 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-xs font-medium text-[var(--color-textMain)]">
                      Candidatos de série
                    </p>
                    <div className="mt-2 max-h-48 space-y-2 scroll-region pr-1">
                      {item.suggestion.candidates.slice(0, 6).map((candidate) => (
                        <div
                          key={`${candidate.normalizedTitle}-${candidate.matchedSeriesId || "new"}`}
                          className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2"
                        >
                          <p className="text-xs font-medium text-[var(--color-textMain)]">
                            {resolveCandidateTitle(candidate)}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--color-textDim)]">
                            Evidência {Math.round(candidate.evidenceScore)} · score total{" "}
                            {Math.round(candidate.combinedScore)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {item.suggestion.evidence.length > 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-xs font-medium text-[var(--color-textMain)]">
                      Evidências capturadas
                    </p>
                    <div className="mt-2 max-h-44 space-y-2 scroll-region pr-1">
                      {item.suggestion.evidence.slice(0, 6).map((evidence) => (
                        <div
                          key={evidence.id}
                          className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2"
                        >
                          <p className="text-xs font-medium text-[var(--color-textMain)]">
                            {evidence.source}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--color-textDim)]">
                            {evidence.rawValue}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            <details className="rounded-3xl border border-white/8 bg-black/10 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-textMain)]">
                Job e resultado
              </summary>
              <div className="mt-3 space-y-2 text-sm text-[var(--color-textDim)]">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  Runtime: <span className="text-[var(--color-textMain)]">{jobMeta.label}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  Etapa:{" "}
                  <span className="text-[var(--color-textMain)]">
                    {formatUploadStage(item.job.stage || item.currentStage)}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  Aprovação: <span className="text-[var(--color-textMain)]">{item.approval.status}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  Progresso:{" "}
                  <span className="text-[var(--color-textMain)]">
                    {formatPercent(item.job.lastProgressPercent)}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  Última atividade:{" "}
                  <span className="text-[var(--color-textMain)]">
                    {formatDateTime(item.job.lastActivityAt || item.processedAt || item.updatedAt)}
                  </span>
                </div>
                {item.result.seriesId ? (
                  <Link
                    href={`/serie/${item.result.seriesId}`}
                    className="block rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/15"
                  >
                    Abrir série resultante
                  </Link>
                ) : null}
                {queueJobId ? (
                  <Link
                    href={`/dashboard/jobs/${queueJobId}`}
                    className="block rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs transition-colors hover:bg-white/[0.06]"
                  >
                    Abrir job técnico: {queueJobId}
                  </Link>
                ) : null}
                {item.approval.reason ? (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {item.approval.reason}
                  </div>
                ) : null}
              </div>
            </details>
          </aside>
        </div>
      )}
    </article>
  );
}
