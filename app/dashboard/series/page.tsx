"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  useAdminSeries,
  useUpdateSeries,
  useDeleteSeries,
  useMetadataSearch,
  useEnrichSeries,
  useEnrichAll,
  useAdminMedias,
  useMediaPages,
  useDeletePages,
  useReorderPages,
  useAddPages,
  useReplacePage,
  useSplitMedia,
  useBulkDeleteMedias,
  useUpdateMedia,
  useDeleteMedia,
  useUploadToSeries,
  useSeriesDetails,
  useSetSeriesCoverFromChapter,
  useSetSeriesCoverFromUpload,
} from "@/hooks/useAdmin";
import { AuthCover } from "@/components/AuthCover";
import type {
  AdminSeriesItem,
  AdminMediaItem,
  AdminMediaListParams,
  UpdateSeriesRequest,
  UpdateMediaRequest,
  MetadataResult,
} from "@/types/api";
import toast from "react-hot-toast";
import {
  Search,
  Edit3,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  BookOpen,
  AlertTriangle,
  Filter,
  Wand2,
  FileText,
  Eye,
  Plus,
  Check,
  AlertCircle,
  GripVertical,
  Replace,
  Scissors,
  ArrowLeft,
  ChevronDown,
  Upload,
  FolderUp,
} from "lucide-react";

// ===== Helper =====
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===== Auth Thumbnail Component =====
function AuthThumbnail({
  mediaId,
  page,
  width = 200,
  alt,
  className,
}: {
  mediaId: string;
  page: number;
  width?: number;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setShouldLoad(true);
        });
      },
      { rootMargin: "300px" },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let mounted = true;
    let blobUrl: string | null = null;

    (async () => {
      try {
        const { default: api } = await import("@/services/api");
        const resp = await api.get(
          `/admin/medias/${mediaId}/pages/${page}/thumbnail?width=${width}`,
          { responseType: "blob" },
        );
        blobUrl = URL.createObjectURL(resp.data);
        if (mounted) {
          setSrc(blobUrl);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [shouldLoad, mediaId, page, width]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-white/5 ${className || ""}`}
    >
      {loading && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-textDim)]" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
      )}
      {src && (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      )}
    </div>
  );
}

// ===== Edit Series Modal =====
function EditSeriesModal({
  series,
  onClose,
}: {
  series: AdminSeriesItem;
  onClose: () => void;
}) {
  const parseTags = (raw?: string): string[] =>
    raw
      ? raw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  const [form, setForm] = useState({
    title: series.title,
    description: series.description || "",
    author: series.author || "",
    artist: series.artist || "",
    status: series.status || "",
    _tags: parseTags(series.tags),
  });
  const [tagInput, setTagInput] = useState("");
  const updateMutation = useUpdateSeries();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { _tags, ...rest } = form;
      const data: UpdateSeriesRequest = { ...rest, tags: _tags.join(", ") };
      await updateMutation.mutateAsync({ id: series.id, data });
      toast.success("Série atualizada com sucesso");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao atualizar série",
      );
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form._tags.includes(tag)) {
      setForm((f) => ({ ...f, _tags: [...f._tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, _tags: f._tags.filter((t) => t !== tag) }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Editar Série
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={form.title || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
              Descrição
            </label>
            <textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
                Autor
              </label>
              <input
                type="text"
                value={form.author || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, author: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
                Artista
              </label>
              <input
                type="text"
                value={form.artist || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, artist: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
              Status
            </label>
            <select
              value={form.status || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Selecionar...</option>
              <option value="RELEASING">Em lançamento</option>
              <option value="FINISHED">Finalizado</option>
              <option value="HIATUS">Hiato</option>
              <option value="NOT_YET_RELEASED">Não lançado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Adicionar tag..."
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form._tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Enrich Modal =====
function EnrichModal({
  series,
  onClose,
}: {
  series: AdminSeriesItem;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(series.title);
  const [debouncedQuery, setDebouncedQuery] = useState(series.title);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: results, isLoading } = useMetadataSearch(debouncedQuery);
  const enrichMutation = useEnrichSeries();

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(debounceRef.current!);
  }, [query]);

  const handleEnrich = async (result: MetadataResult) => {
    try {
      await enrichMutation.mutateAsync({
        seriesId: series.id,
        data: { externalId: result.externalId, source: result.source },
      });
      toast.success(`Metadados aplicados via ${result.source}`);
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao aplicar metadados",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Enriquecer: {series.title}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar metadados..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            </div>
          )}

          {results?.results.map((result: MetadataResult) => (
            <button
              key={`${result.source}-${result.externalId}`}
              onClick={() => handleEnrich(result)}
              disabled={enrichMutation.isPending}
              className="w-full flex items-start gap-3 p-3 rounded-lg bg-[var(--color-background)] hover:bg-white/5 border border-white/5 text-left transition-colors disabled:opacity-50"
            >
              {result.coverUrlMedium || result.coverUrlLarge ? (
                <img
                  src={result.coverUrlMedium || result.coverUrlLarge}
                  alt={result.title}
                  className="w-12 h-16 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-[var(--color-textDim)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-textMain)] line-clamp-1">
                    {result.title}
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-[var(--color-textDim)] uppercase flex-shrink-0">
                    {result.source}
                  </span>
                  {result.matchConfidence != null && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        result.matchConfidence >= 80
                          ? "bg-green-500/10 text-green-400"
                          : result.matchConfidence >= 50
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {result.matchConfidence}%
                    </span>
                  )}
                </div>
                {result.titlePortuguese &&
                  result.titlePortuguese !== result.title && (
                    <p className="text-xs text-[var(--color-primary)] mt-0.5 line-clamp-1">
                      {result.titlePortuguese}
                    </p>
                  )}
                {result.author && (
                  <p className="text-xs text-[var(--color-textDim)] mt-0.5">
                    {result.author}
                  </p>
                )}
                {result.description && (
                  <p className="text-xs text-[var(--color-textDim)] mt-1 line-clamp-2">
                    {result.description.replace(/<[^>]*>/g, "")}
                  </p>
                )}
                {result.genres && result.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {result.genres.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-textDim)]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}

          {results && results.results.length === 0 && !isLoading && (
            <p className="text-center text-[var(--color-textDim)] py-8 text-sm">
              Nenhum resultado encontrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Change Cover Modal =====
function ChangeCoverModal({
  seriesId,
  seriesTitle,
  onClose,
  onSuccess,
}: {
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, setState] = useState<
    "SELECT_SOURCE" | "CHAPTER_PICKER" | "UPLOAD_PICKER"
  >("SELECT_SOURCE");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: seriesDetails, isLoading: isLoadingSeries } = useSeriesDetails(
    seriesId,
    true,
  );
  const setFromChapterMutation = useSetSeriesCoverFromChapter();
  const setFromUploadMutation = useSetSeriesCoverFromUpload();

  const isSubmitting =
    setFromChapterMutation.isPending || setFromUploadMutation.isPending;

  const medias = seriesDetails?.medias || [];

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const mapErrorMessage = (err: unknown) => {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 400)
      return "Dados inválidos. Verifique os campos e tente novamente.";
    if (status === 404) return "Série/capítulo não encontrado";
    if (status === 500)
      return "Erro interno ao atualizar capa. Tente novamente.";
    return (err as { message?: string })?.message || "Erro ao atualizar capa";
  };

  const handleSubmitChapter = async () => {
    if (!selectedMediaId) {
      toast.error("Selecione um capítulo");
      return;
    }

    try {
      await setFromChapterMutation.mutateAsync({
        seriesId,
        mediaId: selectedMediaId,
      });
      toast.success("Capa atualizada pelo capítulo selecionado");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(mapErrorMessage(err));
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const acceptedExts = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!acceptedExts.includes(extension)) {
      toast.error("Formato inválido. Use: jpg, jpeg, png, webp, gif ou bmp");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(file);
    setUploadFile(file);
    setPreviewUrl(nextPreview);
  };

  const handleSubmitUpload = async () => {
    if (!uploadFile) {
      toast.error("Selecione uma imagem antes de confirmar");
      return;
    }

    try {
      await setFromUploadMutation.mutateAsync({
        seriesId,
        cover: uploadFile,
      });
      toast.success("Capa atualizada via upload");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(mapErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
              Alterar capa
            </h2>
            <p className="text-xs text-[var(--color-textDim)] mt-0.5">
              {seriesTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {state === "SELECT_SOURCE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setState("CHAPTER_PICKER")}
                className="text-left rounded-xl border border-white/10 bg-[var(--color-background)] p-4 hover:border-[var(--color-primary)]/40 transition-colors"
              >
                <p className="text-sm font-medium text-[var(--color-textMain)]">
                  Escolher capa de um capítulo
                </p>
                <p className="text-xs text-[var(--color-textDim)] mt-1">
                  Usa a primeira página do capítulo selecionado
                </p>
              </button>

              <button
                onClick={() => setState("UPLOAD_PICKER")}
                className="text-left rounded-xl border border-white/10 bg-[var(--color-background)] p-4 hover:border-[var(--color-primary)]/40 transition-colors"
              >
                <p className="text-sm font-medium text-[var(--color-textMain)]">
                  Enviar imagem do computador
                </p>
                <p className="text-xs text-[var(--color-textDim)] mt-1">
                  Upload de uma única imagem personalizada
                </p>
              </button>
            </div>
          )}

          {state === "CHAPTER_PICKER" && (
            <div className="space-y-3">
              <button
                onClick={() => setState("SELECT_SOURCE")}
                className="text-xs text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
              >
                ← Voltar
              </button>

              <p className="text-xs rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 px-3 py-2">
                A capa será a primeira página do capítulo selecionado.
              </p>

              {isLoadingSeries ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                </div>
              ) : medias.length === 0 ? (
                <p className="text-sm text-[var(--color-textDim)]">
                  Nenhum capítulo encontrado para esta série.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {medias.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => setSelectedMediaId(media.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                        selectedMediaId === media.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <p className="text-sm text-[var(--color-textMain)]">
                        Cap. {media.number} · {media.title}
                      </p>
                      <p className="text-[10px] text-[var(--color-textDim)] mt-0.5 font-mono">
                        {media.id}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {state === "UPLOAD_PICKER" && (
            <div className="space-y-3">
              <button
                onClick={() => setState("SELECT_SOURCE")}
                className="text-xs text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
              >
                ← Voltar
              </button>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="w-full text-sm text-[var(--color-textDim)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-primary)]/20 file:px-3 file:py-1.5 file:text-[var(--color-primary)] file:cursor-pointer"
              />

              {previewUrl && (
                <div className="rounded-lg border border-white/10 bg-[var(--color-background)] p-2">
                  <p className="text-xs text-[var(--color-textDim)] mb-2">
                    Preview
                  </p>
                  <img
                    src={previewUrl}
                    alt="Preview da nova capa"
                    className="w-40 h-56 rounded-md object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm"
          >
            Cancelar
          </button>

          {state === "CHAPTER_PICKER" && (
            <button
              onClick={() => void handleSubmitChapter()}
              disabled={isSubmitting || !selectedMediaId}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Atualizando capa..." : "Confirmar"}
            </button>
          )}

          {state === "UPLOAD_PICKER" && (
            <button
              onClick={() => void handleSubmitUpload()}
              disabled={isSubmitting || !uploadFile}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Atualizando capa..." : "Confirmar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Delete Series Confirm =====
function DeleteSeriesConfirm({
  series,
  onClose,
}: {
  series: AdminSeriesItem;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteSeries();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: series.id });
      toast.success("Série removida");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao remover série",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-2">
            Excluir Série
          </h2>
          <p className="text-sm text-[var(--color-textDim)] mb-6">
            Tem certeza que deseja excluir <strong>{series.title}</strong>? Esta
            ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Edit Media Modal =====
function EditMediaModal({
  media,
  onClose,
}: {
  media: AdminMediaItem;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UpdateMediaRequest>({
    title: media.title,
    number: media.number,
    volume: media.volume ?? undefined,
    year: media.year ?? undefined,
  });
  const updateMutation = useUpdateMedia();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({ mediaId: media.id, data: form });
      toast.success("Mídia atualizada");
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao atualizar",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Editar Mídia
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
              Título
            </label>
            <input
              type="text"
              value={form.title || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
                Número
              </label>
              <input
                type="number"
                step="0.1"
                value={form.number ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    number: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
                Volume
              </label>
              <input
                type="number"
                value={form.volume ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    volume: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-textDim)] mb-1.5">
                Ano
              </label>
              <input
                type="number"
                value={form.year ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    year: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Page Editor Modal =====
function PageEditorModal({
  mediaId,
  mediaTitle,
  onClose,
}: {
  mediaId: string;
  mediaTitle: string;
  onClose: () => void;
}) {
  const { data: pagesData, isLoading, refetch } = useMediaPages(mediaId);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const deletePagesMutation = useDeletePages();
  const reorderPagesMutation = useReorderPages();
  const addPagesMutation = useAddPages();
  const replacePageMutation = useReplacePage();
  const splitMutation = useSplitMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<number | null>(null);
  const [splitTarget, setSplitTarget] = useState<number | null>(null);
  const [splitTitle, setSplitTitle] = useState("");
  const [splitNumber, setSplitNumber] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const pages = pagesData?.pages || [];
  const totalPages = pagesData?.totalPages || 0;

  const togglePage = (index: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPages.size === pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(pages.map((p) => p.index)));
    }
  };

  const handleDeletePages = async () => {
    if (selectedPages.size === 0) return;
    if (selectedPages.size === totalPages) {
      toast.error("Não é possível remover todas as páginas");
      return;
    }
    try {
      const result = await deletePagesMutation.mutateAsync({
        mediaId,
        pages: Array.from(selectedPages),
      });
      toast.success(result.message);
      setSelectedPages(new Set());
      refetch();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao deletar páginas",
      );
    }
  };

  const handleAddPages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const result = await addPagesMutation.mutateAsync({
        mediaId,
        files: Array.from(files),
      });
      toast.success(result.message);
      refetch();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao adicionar páginas",
      );
    }
  };

  const handleReplacePage = async (file: File) => {
    if (replaceTarget === null) return;
    try {
      const result = await replacePageMutation.mutateAsync({
        mediaId,
        page: replaceTarget,
        file,
      });
      toast.success(result.message);
      setReplaceTarget(null);
      refetch();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao substituir página",
      );
    }
  };

  const handleSplit = async () => {
    if (splitTarget === null) return;
    try {
      const result = await splitMutation.mutateAsync({
        mediaId,
        data: {
          splitAfterPage: splitTarget,
          newTitle: splitTitle || undefined,
          newNumber: splitNumber ? parseFloat(splitNumber) : undefined,
        },
      });
      toast.success(result.message);
      setSplitTarget(null);
      setSplitTitle("");
      setSplitNumber("");
      refetch();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Erro ao dividir");
    }
  };

  const handleDragStart = (index: number) => setDragFrom(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = async (toIndex: number) => {
    if (dragFrom === null || dragFrom === toIndex) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }

    const currentOrder = pages.map((p) => p.index);
    const fromIdx = currentOrder.indexOf(dragFrom);
    const toIdx = currentOrder.indexOf(toIndex);
    if (fromIdx === -1 || toIdx === -1) return;

    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);

    setDragFrom(null);
    setDragOver(null);

    try {
      const result = await reorderPagesMutation.mutateAsync({
        mediaId,
        order: newOrder,
      });
      toast.success(result.message);
      refetch();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao reordenar",
      );
    }
  };

  const anyPending =
    deletePagesMutation.isPending ||
    reorderPagesMutation.isPending ||
    addPagesMutation.isPending ||
    replacePageMutation.isPending ||
    splitMutation.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
              {mediaTitle}
            </h2>
            <p className="text-xs text-[var(--color-textDim)] mt-0.5">
              {totalPages} páginas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-white/5 bg-[var(--color-background)] shrink-0">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            {selectedPages.size === pages.length
              ? "Desmarcar"
              : "Selecionar"}{" "}
            tudo
          </button>

          <button
            onClick={handleDeletePages}
            disabled={selectedPages.size === 0 || anyPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Deletar ({selectedPages.size})
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={anyPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAddPages(e.target.files)}
          />

          {anyPending && (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)] ml-auto" />
          )}
        </div>

        {/* Split panel */}
        {splitTarget !== null && (
          <div className="px-5 py-3 border-b border-white/5 bg-yellow-500/5 shrink-0">
            <p className="text-sm text-[var(--color-textMain)] mb-2">
              <Scissors className="inline h-4 w-4 mr-1.5 text-yellow-500" />
              Dividir após a página <strong>{splitTarget}</strong>: páginas 1–
              {splitTarget} ficam no original, {splitTarget + 1}–{totalPages}{" "}
              viram novo capítulo.
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[var(--color-textDim)] mb-1">
                  Título do novo (opcional)
                </label>
                <input
                  type="text"
                  value={splitTitle}
                  onChange={(e) => setSplitTitle(e.target.value)}
                  placeholder="Auto-gerado"
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs text-[var(--color-textDim)] mb-1">
                  Número
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={splitNumber}
                  onChange={(e) => setSplitNumber(e.target.value)}
                  placeholder="Auto"
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-background)] border border-white/10 text-[var(--color-textMain)] text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <button
                onClick={handleSplit}
                disabled={splitMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-yellow-500 text-black text-xs font-medium hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-1.5"
              >
                {splitMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Scissors className="h-3.5 w-3.5" />
                )}
                Dividir
              </button>
              <button
                onClick={() => setSplitTarget(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-[var(--color-textDim)] text-xs hover:text-[var(--color-textMain)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Pages Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {pages.map((pg) => {
                const isSelected = selectedPages.has(pg.index);
                const isDragTarget =
                  dragOver === pg.index && dragFrom !== pg.index;
                return (
                  <div
                    key={pg.index}
                    draggable
                    onDragStart={() => handleDragStart(pg.index)}
                    onDragOver={(e) => handleDragOver(e, pg.index)}
                    onDragEnd={() => {
                      setDragFrom(null);
                      setDragOver(null);
                    }}
                    onDrop={() => handleDrop(pg.index)}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                      isSelected
                        ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30"
                        : isDragTarget
                          ? "border-blue-500"
                          : "border-transparent hover:border-white/20"
                    }`}
                  >
                    <div
                      onClick={() => togglePage(pg.index)}
                      className="aspect-[2/3]"
                    >
                      <AuthThumbnail
                        mediaId={mediaId}
                        page={pg.index}
                        width={200}
                        alt={`Página ${pg.index}`}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium">
                      {pg.index}
                    </div>

                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplaceTarget(pg.index);
                            setTimeout(
                              () => replaceInputRef.current?.click(),
                              50,
                            );
                          }}
                          title="Substituir"
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                        >
                          <Replace className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSplitTarget(pg.index);
                          }}
                          title="Dividir aqui"
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                        >
                          <Scissors className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 pointer-events-none">
                      <GripVertical className="h-6 w-6 text-white" />
                    </div>

                    <div className="px-1.5 py-1 bg-[var(--color-background)]">
                      <p className="text-[9px] text-[var(--color-textDim)] truncate">
                        {pg.width}×{pg.height}
                      </p>
                      <p className="text-[9px] text-[var(--color-textDim)]">
                        {formatSize(pg.size)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hidden replace input */}
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReplacePage(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// ===== Bulk Delete Media Confirm =====
function BulkDeleteMediaConfirm({
  count,
  onConfirm,
  onClose,
  isPending,
}: {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-textMain)] mb-2">
            Deletar Mídias
          </h2>
          <p className="text-sm text-[var(--color-textDim)] mb-6">
            Tem certeza que deseja excluir <strong>{count}</strong> mídia(s)? Os
            arquivos também serão removidos do disco.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Upload To Series Modal =====
function UploadToSeriesModal({
  seriesId,
  seriesTitle,
  onClose,
}: {
  seriesId: string;
  seriesTitle: string;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadToSeries();

  const ACCEPTED_EXT = [".cbz", ".cbr", ".zip", ".pdf", ".epub"];
  const isAccepted = (name: string) =>
    ACCEPTED_EXT.some((ext) => name.toLowerCase().endsWith(ext));

  const addFiles = (newFiles: File[]) => {
    const valid = newFiles.filter((f) => isAccepted(f.name));
    if (valid.length === 0) {
      toast.error("Nenhum arquivo compatível (.cbz, .cbr, .zip, .pdf, .epub)");
      return;
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) {
      addFiles(Array.from(e.dataTransfer.files));
      return;
    }

    const allFiles: File[] = [];
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });
        if (isAccepted(file.name)) allFiles.push(file);
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const entries = await new Promise<FileSystemEntry[]>(
          (resolve, reject) => reader.readEntries(resolve, reject),
        );
        for (const child of entries) await processEntry(child);
      }
    };

    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length > 0) {
      for (const entry of entries) await processEntry(entry);
      addFiles(allFiles);
    } else {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const result = await uploadMutation.mutateAsync({
        seriesId,
        files,
      });
      if (Array.isArray(result)) {
        const accepted = result.filter(
          (r: Record<string, unknown>) => "jobId" in r,
        ).length;
        const rejected = result.filter(
          (r: Record<string, unknown>) => "error" in r,
        ).length;
        toast.success(
          `${accepted} capítulo(s) enviado(s) para "${seriesTitle}"${
            rejected > 0 ? ` · ${rejected} rejeitado(s)` : ""
          }`,
        );
      } else {
        toast.success(
          (result as { message?: string }).message ||
            `Upload para "${seriesTitle}" iniciado`,
        );
      }
      onClose();
    } catch {
      toast.error("Erro ao enviar capítulos");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative ui-modal w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
              Upload de Capítulos
            </h2>
            <p className="text-xs text-[var(--color-textDim)] mt-0.5 truncate">
              Enviar para: {seriesTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]"
                : "border-white/10 hover:border-white/20 bg-[var(--color-background)]"
            } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".cbz,.cbr,.zip,.pdf,.epub"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(Array.from(e.target.files));
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            {/* Folder input with webkitdirectory */}
            <input
              ref={(el) => {
                (
                  folderInputRef as React.MutableRefObject<HTMLInputElement | null>
                ).current = el;
                if (el) {
                  el.setAttribute("webkitdirectory", "");
                  el.setAttribute("directory", "");
                }
              }}
              type="file"
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <p className="text-sm text-[var(--color-textMain)] font-medium">
                Arraste arquivos ou pastas aqui
              </p>
              <p className="text-xs text-[var(--color-textDim)]">
                .cbz, .cbr, .zip, .pdf, .epub
              </p>
            </div>
          </div>

          {/* Folder select button */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-[var(--color-textDim)] hover:text-[var(--color-textMain)] hover:border-white/20 transition-colors"
          >
            <FolderUp className="h-3.5 w-3.5" />
            Selecionar pasta
          </button>

          {/* File list */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-textDim)]">
                  {files.length} arquivo(s) · {fmtSize(totalSize)}
                </span>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-[var(--color-textDim)] hover:text-red-400"
                >
                  Limpar
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-background)] text-xs"
                  >
                    <FileText className="h-3.5 w-3.5 text-[var(--color-textDim)] shrink-0" />
                    <span className="flex-1 truncate text-[var(--color-textMain)]">
                      {f.name}
                    </span>
                    <span className="text-[var(--color-textDim)] shrink-0">
                      {fmtSize(f.size)}
                    </span>
                    <button
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="p-0.5 rounded hover:bg-white/5 text-[var(--color-textDim)] hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Enviar {files.length} capítulo(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Series Detail View — Media List + Actions =====
function SeriesDetailView({
  series,
  onBack,
}: {
  series: AdminSeriesItem;
  onBack: () => void;
}) {
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaSort, setMediaSort] =
    useState<AdminMediaListParams["sort"]>("number");
  const [mediaOrder, setMediaOrder] = useState<"asc" | "desc">("asc");
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(
    new Set(),
  );
  const [editMedia, setEditMedia] = useState<AdminMediaItem | null>(null);
  const [pageEditorMedia, setPageEditorMedia] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editSeriesModal, setEditSeriesModal] = useState(false);
  const [enrichSeriesModal, setEnrichSeriesModal] = useState(false);
  const [deleteSeriesModal, setDeleteSeriesModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [changeCoverModal, setChangeCoverModal] = useState(false);
  const [currentCoverUrl, setCurrentCoverUrl] = useState(
    series.coverUrl || series.hasCover ? `/series/${series.id}/cover` : "",
  );

  const bulkDeleteMutation = useBulkDeleteMedias();
  const deleteMediaMutation = useDeleteMedia();

  const params: AdminMediaListParams = {
    page: mediaPage,
    limit: 50,
    seriesId: series.id,
    sort: mediaSort,
    order: mediaOrder,
  };

  const { data: mediasData, isLoading: mediasLoading } = useAdminMedias(params);
  const medias = mediasData?.medias || [];
  const mediaPagination = mediasData?.pagination;

  const toggleMediaSelect = (id: string) => {
    setSelectedMediaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMediaIds.size === medias.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(medias.map((m) => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDeleteMutation.mutateAsync({
        mediaIds: Array.from(selectedMediaIds),
        deleteFiles: true,
      });
      toast.success(result.message);
      setSelectedMediaIds(new Set());
      setDeleteConfirm(false);
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Erro ao deletar");
    }
  };

  const handleDeleteSingleMedia = async (media: AdminMediaItem) => {
    try {
      await deleteMediaMutation.mutateAsync(media.id);
      toast.success(`"${media.title}" removida`);
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao deletar mídia",
      );
    }
  };

  const toggleMediaSort = (field: AdminMediaListParams["sort"]) => {
    if (mediaSort === field) {
      setMediaOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setMediaSort(field);
      setMediaOrder("asc");
    }
    setMediaPage(1);
  };

  const SortIndicator = ({ field }: { field: AdminMediaListParams["sort"] }) =>
    mediaSort === field ? (
      <ChevronDown
        className={`h-3 w-3 inline ml-0.5 transition-transform ${mediaOrder === "asc" ? "rotate-180" : ""}`}
      />
    ) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back + Series Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às séries
        </button>

        <div className="flex flex-col sm:flex-row gap-5 bg-[var(--color-surface)] rounded-xl border border-white/5 p-5">
          {/* Cover */}
          <div className="flex-shrink-0">
            {currentCoverUrl ? (
              <AuthCover
                coverUrl={currentCoverUrl}
                alt={series.title}
                className="w-28 h-40 rounded-lg object-cover"
              />
            ) : (
              <div className="w-28 h-40 rounded-lg bg-white/5 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-[var(--color-textDim)]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--color-textMain)] mb-1">
              {series.title}
            </h1>
            {series.author && (
              <p className="text-sm text-[var(--color-textDim)]">
                {series.author}
                {series.artist && series.artist !== series.author && (
                  <> / {series.artist}</>
                )}
              </p>
            )}
            {series.description && (
              <p className="text-xs text-[var(--color-textDim)] mt-2 line-clamp-3">
                {series.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {series.status && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-white/5 text-[var(--color-textDim)]">
                  {series.status}
                </span>
              )}
              <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-white/5 text-[var(--color-textDim)]">
                {series.chaptersCount} capítulos
              </span>
              {!series.description && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                  <AlertTriangle className="h-3 w-3" />
                  Sem metadados
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setEditSeriesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar Info
              </button>
              <button
                onClick={() => setChangeCoverModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Alterar capa
              </button>
              <button
                onClick={() => setEnrichSeriesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Enriquecer
              </button>
              <button
                onClick={() => setUploadModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Capítulos
              </button>
              <button
                onClick={() => setDeleteSeriesModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir Série
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Medias Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--color-textMain)]">
            Mídias / Capítulos
          </h2>
          <p className="text-xs text-[var(--color-textDim)]">
            {mediaPagination ? `${mediaPagination.total} mídias` : ""}
          </p>
        </div>

        {/* Bulk Actions */}
        {selectedMediaIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-white/5 mb-3">
            <span className="text-sm text-[var(--color-textMain)] font-medium">
              {selectedMediaIds.size} selecionada(s)
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Deletar
            </button>
          </div>
        )}

        {/* Medias Table */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
          {mediasLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedMediaIds.size > 0 &&
                          selectedMediaIds.size === medias.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-white/20 bg-transparent text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                    </th>
                    <th
                      className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium cursor-pointer hover:text-[var(--color-textMain)]"
                      onClick={() => toggleMediaSort("number")}
                    >
                      # <SortIndicator field="number" />
                    </th>
                    <th
                      className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium cursor-pointer hover:text-[var(--color-textMain)]"
                      onClick={() => toggleMediaSort("title")}
                    >
                      Título <SortIndicator field="title" />
                    </th>
                    <th className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium hidden sm:table-cell">
                      Formato
                    </th>
                    <th
                      className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium hidden md:table-cell cursor-pointer hover:text-[var(--color-textMain)]"
                      onClick={() => toggleMediaSort("pageCount")}
                    >
                      Páginas <SortIndicator field="pageCount" />
                    </th>
                    <th
                      className="text-left px-4 py-3 text-[var(--color-textDim)] font-medium hidden lg:table-cell cursor-pointer hover:text-[var(--color-textMain)]"
                      onClick={() => toggleMediaSort("size")}
                    >
                      Tamanho <SortIndicator field="size" />
                    </th>
                    <th className="text-right px-4 py-3 text-[var(--color-textDim)] font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {medias.map((m) => (
                    <tr
                      key={m.id}
                      className={`hover:bg-white/[0.02] transition-colors ${m.fileExists === false && m.pageCount === 0 ? "bg-red-500/[0.03]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedMediaIds.has(m.id)}
                          onChange={() => toggleMediaSelect(m.id)}
                          className="rounded border-white/20 bg-transparent text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-textDim)] font-mono text-xs">
                        {m.number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[var(--color-textDim)] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[var(--color-textMain)] font-medium truncate max-w-[250px]">
                              {m.title}
                            </p>
                            {m.fileExists === false && m.pageCount === 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-400 mt-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                Arquivo não encontrado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-white/5 text-[var(--color-textDim)] uppercase">
                          {m.extension}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-textDim)] hidden md:table-cell">
                        {m.pageCount}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-textDim)] hidden lg:table-cell">
                        {formatSize(m.size)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              setPageEditorMedia({
                                id: m.id,
                                title: m.title,
                              })
                            }
                            title="Gerenciar Páginas"
                            className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditMedia(m)}
                            title="Editar"
                            className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-[var(--color-textMain)] transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingleMedia(m)}
                            title="Excluir"
                            className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {medias.length === 0 && !mediasLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-[var(--color-textDim)]"
                      >
                        Nenhuma mídia encontrada para esta série
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {mediaPagination && mediaPagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-[var(--color-textDim)]">
                Página {mediaPagination.page} de {mediaPagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMediaPage((p) => Math.max(1, p - 1))}
                  disabled={mediaPagination.page <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    setMediaPage((p) =>
                      Math.min(mediaPagination.totalPages, p + 1),
                    )
                  }
                  disabled={mediaPagination.page >= mediaPagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editSeriesModal && (
        <EditSeriesModal
          series={series}
          onClose={() => setEditSeriesModal(false)}
        />
      )}
      {enrichSeriesModal && (
        <EnrichModal
          series={series}
          onClose={() => setEnrichSeriesModal(false)}
        />
      )}
      {deleteSeriesModal && (
        <DeleteSeriesConfirm
          series={series}
          onClose={() => {
            setDeleteSeriesModal(false);
            onBack();
          }}
        />
      )}
      {editMedia && (
        <EditMediaModal media={editMedia} onClose={() => setEditMedia(null)} />
      )}
      {pageEditorMedia && (
        <PageEditorModal
          mediaId={pageEditorMedia.id}
          mediaTitle={pageEditorMedia.title}
          onClose={() => setPageEditorMedia(null)}
        />
      )}
      {deleteConfirm && (
        <BulkDeleteMediaConfirm
          count={selectedMediaIds.size}
          onConfirm={handleBulkDelete}
          onClose={() => setDeleteConfirm(false)}
          isPending={bulkDeleteMutation.isPending}
        />
      )}
      {uploadModal && (
        <UploadToSeriesModal
          seriesId={series.id}
          seriesTitle={series.title}
          onClose={() => setUploadModal(false)}
        />
      )}
      {changeCoverModal && (
        <ChangeCoverModal
          seriesId={series.id}
          seriesTitle={series.title}
          onClose={() => setChangeCoverModal(false)}
          onSuccess={() => {
            setCurrentCoverUrl(`/series/${series.id}/cover?t=${Date.now()}`);
          }}
        />
      )}
    </div>
  );
}

// ===== Main Page =====
export default function SeriesManagementPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [missingMeta, setMissingMeta] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedSeries, setSelectedSeries] = useState<AdminSeriesItem | null>(
    null,
  );

  const enrichAllMutation = useEnrichAll();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current!);
  }, [search]);

  const { data, isLoading } = useAdminSeries({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    missingMeta: missingMeta || undefined,
  });

  const handleEnrichAll = async () => {
    try {
      const result = await enrichAllMutation.mutateAsync();
      toast.success(`Enriquecimento iniciado para ${result.total} séries`);
    } catch {
      toast.error("Erro ao iniciar enriquecimento");
    }
  };

  const series = data?.series || [];
  const pagination = data?.pagination;

  // If a series is selected, show the detail view
  if (selectedSeries) {
    return (
      <SeriesDetailView
        series={selectedSeries}
        onBack={() => setSelectedSeries(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-textMain)]">
            Gerenciar Séries
          </h1>
          <p className="text-[var(--color-textDim)] text-sm mt-1">
            {pagination
              ? `${pagination.total} séries no total`
              : "Carregando..."}
          </p>
        </div>
        <button
          onClick={handleEnrichAll}
          disabled={enrichAllMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
        >
          {enrichAllMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Enriquecer Tudo
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-textDim)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar séries..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-textMain)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <button
          onClick={() => {
            setMissingMeta((v) => !v);
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            missingMeta
              ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]"
              : "bg-[var(--color-surface)] border-white/10 text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          }`}
        >
          <Filter className="h-4 w-4" />
          Sem Metadados
        </button>
      </div>

      {/* Series List */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {series.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSeries(s)}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
              >
                {/* Cover */}
                {s.coverUrl ? (
                  <AuthCover
                    coverUrl={s.coverUrl}
                    alt={s.title}
                    className="w-10 h-14 rounded-md object-cover flex-shrink-0"
                    compact
                  />
                ) : (
                  <div className="w-10 h-14 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-[var(--color-textDim)]" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--color-textMain)] font-medium truncate">
                    {s.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {s.author && (
                      <p className="text-xs text-[var(--color-textDim)] truncate">
                        {s.author}
                      </p>
                    )}
                    <span className="text-xs text-[var(--color-textDim)]">
                      {s.chaptersCount} caps
                    </span>
                    {s.status && (
                      <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-white/5 text-[var(--color-textDim)]">
                        {s.status}
                      </span>
                    )}
                    {!s.description && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-yellow-500">
                        <AlertTriangle className="h-3 w-3" />
                        Sem metadados
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 text-[var(--color-textDim)] flex-shrink-0" />
              </button>
            ))}
            {series.length === 0 && (
              <div className="px-4 py-12 text-center text-[var(--color-textDim)]">
                Nenhuma série encontrada
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-[var(--color-textDim)]">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-textDim)] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
