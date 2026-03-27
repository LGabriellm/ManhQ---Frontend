"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  useMetadataProviders,
  useMetadataSearch,
  useRefreshSeriesMetadata,
  useReviewSeriesMetadata,
  useSeriesMetadata,
} from "@/hooks/useMetadataReview";
import {
  buildMetadataReviewDraft,
  joinAliases,
  metadataConfidenceClass,
  parseAliases,
} from "@/lib/metadata-review";
import type {
  AudienceCode,
  CanonicalGenre,
  MetadataSource,
  ReviewSeriesMetadataRequest,
  ThemeCode,
  WorkType,
} from "@/types/metadata-review";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

function FieldCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/10 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-textDim)]/70">
        {label}
      </p>
      <p className="mt-2 text-sm text-[var(--color-textMain)]">{value || "—"}</p>
    </div>
  );
}

function ToggleGrid<TCode extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<{ code: TCode; label: string; description?: string }>;
  selected: TCode[];
  onToggle: (code: TCode) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/8 bg-black/10 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textDim)]/75">
        {title}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.code);

          return (
            <button
              key={option.code}
              type="button"
              onClick={() => onToggle(option.code)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? "border-[var(--color-primary)]/35 bg-[var(--color-primary)]/10 text-[var(--color-textMain)]"
                  : "border-white/8 bg-white/[0.03] text-[var(--color-textDim)] hover:border-white/15 hover:text-[var(--color-textMain)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function SeriesMetadataReviewPage() {
  const params = useParams<{ id: string }>();
  const seriesId = params.id;
  const { data, isLoading, refetch, isRefetching } = useSeriesMetadata(seriesId);
  const { data: providersData } = useMetadataProviders();
  const refreshMutation = useRefreshSeriesMetadata();
  const reviewMutation = useReviewSeriesMetadata();

  const catalog = providersData?.catalog || data?.catalog || null;
  const metadata = data?.metadata || null;
  const suggestion = metadata?.suggestion || null;
  const baseDraft = useMemo(
    () => (metadata ? buildMetadataReviewDraft(metadata) : null),
    [metadata],
  );

  const [draftOverride, setDraftOverride] =
    useState<ReviewSeriesMetadataRequest | null>(null);
  const [aliasesOverride, setAliasesOverride] = useState<string | null>(null);
  const [searchOverride, setSearchOverride] = useState<string | null>(null);
  const [workTypeHintOverride, setWorkTypeHintOverride] = useState<WorkType | null>(
    null,
  );
  const draft = draftOverride ?? baseDraft;
  const aliasesInput =
    aliasesOverride ?? (draft ? joinAliases(draft.titleAliases || []) : "");
  const searchQuery = searchOverride ?? metadata?.current.title ?? "";
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const workTypeHint = workTypeHintOverride ?? draft?.workType;
  const searchResults = useMetadataSearch({
    q: deferredSearchQuery,
    workTypeHint,
  });

  const updateDraft = (
    updater: (current: ReviewSeriesMetadataRequest) => ReviewSeriesMetadataRequest,
  ) => {
    setDraftOverride((current) => {
      const nextBase = current ?? baseDraft;
      if (!nextBase) {
        return current;
      }

      return updater(nextBase);
    });
  };

  const toggleValue = <
    TCode extends CanonicalGenre | ThemeCode | AudienceCode,
  >(
    field: "canonicalGenres" | "themes" | "audience",
    value: TCode,
  ) => {
    updateDraft((current) => {
      const currentValues = current[field] as TCode[];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((entry) => entry !== value)
        : [...currentValues, value];

      return {
        ...current,
        [field]: nextValues,
      };
    });
  };

  const resetLocalDraft = () => {
    setDraftOverride(null);
    setAliasesOverride(null);
    setSearchOverride(null);
    setWorkTypeHintOverride(null);
  };

  const saveReview = async () => {
    if (!draft) {
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        seriesId,
        data: {
          ...draft,
          titleAliases: parseAliases(aliasesInput),
        },
      });
      toast.success("Metadados revisados e salvos");
      await refetch();
      resetLocalDraft();
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao salvar a revisão de metadados";
      toast.error(message);
    }
  };

  const refreshSuggestions = async (payload?: {
    externalId?: string | number;
    source?: MetadataSource;
    searchTitle?: string;
  }) => {
    try {
      await refreshMutation.mutateAsync({
        seriesId,
        data: {
          searchTitle: payload?.searchTitle || metadata?.current.title,
          workTypeHint: draft?.workType,
          externalId: payload?.externalId,
          source: payload?.source,
        },
      });
      toast.success("Sugestões atualizadas");
      await refetch();
      resetLocalDraft();
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        "Falha ao atualizar as sugestões";
      toast.error(message);
    }
  };

  const headerStatus = useMemo(() => {
    if (!suggestion) {
      return {
        label: "Sem sugestão carregada",
        className: "border-white/10 bg-white/[0.04] text-[var(--color-textDim)]",
      };
    }

    if (suggestion.reviewRequired) {
      return {
        label: "Revisão pendente",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-200",
      };
    }

    return {
      label: "Revisado",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    };
  }, [suggestion]);

  if (isLoading || !draft || !metadata || !catalog) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/series"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-textDim)] transition-colors hover:text-[var(--color-textMain)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para séries
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-[var(--color-textMain)]">
            {metadata.current.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${headerStatus.className}`}
            >
              {headerStatus.label}
            </span>
            {suggestion && (
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${metadataConfidenceClass(
                  suggestion.metadataConfidenceLabel,
                )}`}
              >
                confiança {suggestion.metadataConfidenceLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-white/[0.07] disabled:opacity-50"
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar tela
          </button>
          <button
            type="button"
            onClick={() => void refreshSuggestions({ searchTitle: searchQuery })}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Renovar sugestões
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Estado salvo
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FieldCard label="Título" value={metadata.current.title} />
            <FieldCard label="Tipo de obra" value={metadata.current.workType} />
            <FieldCard label="Autor" value={metadata.current.author} />
            <FieldCard label="Artista" value={metadata.current.artist} />
            <FieldCard label="Status" value={metadata.current.status} />
            <FieldCard
              label="Tags atuais"
              value={metadata.current.tags.length ? metadata.current.tags.join(", ") : "—"}
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
            Sugestão atual
          </p>
          {suggestion ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FieldCard label="Título sugerido" value={suggestion.title} />
              <FieldCard label="Tipo sugerido" value={suggestion.workType} />
              <FieldCard label="Fonte principal" value={suggestion.primarySource} />
              <FieldCard
                label="Último enriquecimento"
                value={suggestion.lastEnrichedAt}
              />
              <FieldCard label="Autor sugerido" value={suggestion.author} />
              <FieldCard label="Artista sugerido" value={suggestion.artist} />
              <FieldCard label="Status sugerido" value={suggestion.status} />
              <FieldCard
                label="Última revisão"
                value={suggestion.lastReviewedAt}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-[var(--color-textDim)]">
              Ainda não existe um perfil de sugestão para esta série. Busque ou
              refresque sugestões antes de revisar.
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Busca e enriquecimento
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-textMain)]">
                  Escolha a melhor fonte antes de salvar
                </h2>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Buscar por título
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-textDim)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchOverride(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Work type hint
                </span>
                <select
                  value={workTypeHint || ""}
                  onChange={(event) =>
                    setWorkTypeHintOverride(
                      (event.target.value || null) as WorkType | null,
                    )
                  }
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                >
                  <option value="">Sem hint</option>
                  {catalog.workTypes.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              {searchResults.isFetching && (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-[var(--color-textDim)]">
                  Buscando candidatos...
                </div>
              )}

              {searchResults.data?.results.map((result) => (
                <div
                  key={`${result.source}-${result.externalId}`}
                  className="rounded-3xl border border-white/8 bg-black/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-textMain)]">
                        {result.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-textDim)]">
                        {result.source} · score {Math.round(result.matchConfidence)}
                      </p>
                      {result.description && (
                        <p className="mt-2 line-clamp-3 text-sm text-[var(--color-textDim)]">
                          {result.description.replace(/<[^>]+>/g, "")}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void refreshSuggestions({
                          source: result.source,
                          externalId: result.externalId,
                        })
                      }
                      disabled={refreshMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-2 text-sm font-medium text-[var(--color-textMain)] transition-colors hover:bg-[var(--color-primary)]/15 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                      Usar esta fonte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Revisão canônica
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-textMain)]">
                  Confirme manualmente o que vai para a série
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void saveReview()}
                disabled={reviewMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:opacity-50"
              >
                {reviewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Salvar revisão
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Work type
                </span>
                <select
                  value={draft.workType}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      workType: event.target.value as WorkType,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                >
                  {catalog.workTypes.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Status
                </span>
                <input
                  type="text"
                  value={draft.status || ""}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Autor
                </span>
                <input
                  type="text"
                  value={draft.author || ""}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      author: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                  Artista
                </span>
                <input
                  type="text"
                  value={draft.artist || ""}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      artist: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                Aliases de título
              </span>
              <textarea
                value={aliasesInput}
                onChange={(event) => setAliasesOverride(event.target.value)}
                rows={4}
                className="w-full rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
                placeholder="Um alias por linha"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs text-[var(--color-textDim)]">
                Descrição canônica
              </span>
              <textarea
                value={draft.description || ""}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={6}
                className="w-full rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-textMain)] outline-none transition-colors focus:border-[var(--color-primary)]/35"
              />
            </label>

            <div className="mt-4 grid gap-4">
              <ToggleGrid
                title="Gêneros canônicos"
                options={catalog.canonicalGenres}
                selected={draft.canonicalGenres}
                onToggle={(value) => toggleValue("canonicalGenres", value)}
              />
              <ToggleGrid
                title="Temas"
                options={catalog.themes}
                selected={draft.themes}
                onToggle={(value) => toggleValue("themes", value)}
              />
              <ToggleGrid
                title="Audiência"
                options={catalog.audience}
                selected={draft.audience}
                onToggle={(value) => toggleValue("audience", value)}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
              Provedores
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {providersData?.providers.map((provider) => (
                <span
                  key={provider.name}
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${
                    provider.available
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/[0.04] text-[var(--color-textDim)]"
                  }`}
                >
                  {provider.displayName}
                </span>
              ))}
            </div>
          </section>

          {suggestion && (
            <>
              <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Razões de confiança
                </p>
                <div className="mt-4 space-y-2">
                  {suggestion.confidenceReasons.map((reason) => (
                    <div
                      key={reason}
                      className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-sm text-[var(--color-textMain)]"
                    >
                      {reason}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Proveniência
                </p>
                <div className="mt-4 space-y-3">
                  {suggestion.metadataSources.map((sourceRecord, index) => (
                    <div
                      key={`${sourceRecord.source}-${index}`}
                      className="rounded-2xl border border-white/8 bg-black/10 p-3"
                    >
                      <p className="text-sm font-medium text-[var(--color-textMain)]">
                        {sourceRecord.source}
                      </p>
                      {sourceRecord.matchedTitle && (
                        <p className="mt-1 text-xs text-[var(--color-textDim)]">
                          {sourceRecord.matchedTitle}
                        </p>
                      )}
                      {sourceRecord.sourceUrl && (
                        <a
                          href={sourceRecord.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-primary)]"
                        >
                          Abrir fonte
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Tags de origem
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestion.sourceTags.map((tag, index) => (
                    <span
                      key={`${tag.label || tag.rawValue || index}-${index}`}
                      className="inline-flex rounded-full border border-white/8 bg-black/10 px-3 py-1.5 text-xs text-[var(--color-textDim)]"
                    >
                      {String(tag.label || tag.rawValue || tag.mappedLabel || "tag")}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-textDim)]/75">
                  Candidatos do provedor
                </p>
                <div className="mt-4 space-y-3">
                  {suggestion.providerCandidates.map((candidate) => (
                    <div
                      key={`${candidate.source}-${candidate.externalId}`}
                      className="rounded-2xl border border-white/8 bg-black/10 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-textMain)]">
                            {candidate.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-textDim)]">
                            {candidate.source} · match{" "}
                            {Math.round(candidate.matchConfidence)}
                          </p>
                        </div>
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[var(--color-textDim)]">
                          {candidate.workTypeHint}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
