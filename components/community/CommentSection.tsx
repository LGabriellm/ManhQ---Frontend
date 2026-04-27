"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  MessageSquareText,
  Pencil,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreateMediaComment,
  useCreateSeriesComment,
  useDeleteComment,
  useInfiniteMediaComments,
  useInfiniteSeriesComments,
  useUpdateComment,
  useVoteComment,
} from "@/hooks/useCommunity";
import { SpoilerBlock } from "@/components/community/SpoilerBlock";
import { UserAvatar } from "@/components/community/UserAvatar";
import { UserBadge, getPrimaryBadge } from "@/components/community/UserBadge";
import { useMyBadges } from "@/hooks/useApi";
import type { CommentItem, CommentType } from "@/types/api";

const COMMENT_TYPES: Array<{ value: CommentType; label: string }> = [
  { value: "DISCUSSION", label: "Discussão" },
  { value: "THEORY", label: "Teoria" },
  { value: "SPOILER_WARNING", label: "Spoiler" },
  { value: "CORRECTION", label: "Correção" },
  { value: "TRANSLATION", label: "Tradução" },
  { value: "ARTWORK", label: "Arte" },
];

function timeAgo(dateString: string) {
  const value = new Date(dateString).getTime();
  const diff = Math.max(0, Date.now() - value);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function CommentCard({
  item,
  canManage,
  currentUserId,
  currentUserBadges,
  onDelete,
  onEdit,
  onVote,
}: {
  item: CommentItem;
  canManage: boolean;
  currentUserId?: string;
  currentUserBadges?: ReturnType<typeof getPrimaryBadge>;
  onDelete: (commentId: string) => Promise<void>;
  onEdit: (
    commentId: string,
    data: { title?: string; content?: string; hasSpoilers?: boolean },
  ) => Promise<void>;
  onVote: (commentId: string, value: -1 | 1) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title || "");
  const [draftContent, setDraftContent] = useState(item.content);
  const [draftSpoilers, setDraftSpoilers] = useState(item.hasSpoilers);

  // Show badge only for the current user's own comments (avoids N+1)
  const authorIsCurrentUser = currentUserId && (item.user?.id || item.userId) === currentUserId;
  const primaryBadge = authorIsCurrentUser ? currentUserBadges : null;

  const submitEdit = async () => {
    if (draftContent.trim().length < 3) {
      toast.error("O comentário precisa ter ao menos 3 caracteres.");
      return;
    }
    await onEdit(item.id, {
      title: draftTitle.trim() || undefined,
      content: draftContent.trim(),
      hasSpoilers: draftSpoilers,
    });
    setEditing(false);
  };

  return (
    <article className="rounded-3xl border border-white/6 bg-surface/45 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            userId={item.user?.id || item.userId}
            name={item.user?.name}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="truncate text-sm font-semibold text-textMain">
                {item.user?.name || "Leitor"}
              </p>
              {primaryBadge && (
                <UserBadge badge={primaryBadge} size="sm" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-textDim">
              <span>
                {COMMENT_TYPES.find((entry) => entry.value === item.type)
                  ?.label || "Discussão"}
              </span>
              <span>•</span>
              <span>{timeAgo(item.createdAt)}</span>
            </div>
          </div>
        </div>
        {canManage ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="rounded-xl p-2 text-textDim transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Editar comentário"
            >
              {editing ? (
                <X className="h-4 w-4" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void onDelete(item.id)}
              className="rounded-xl p-2 text-textDim transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Excluir comentário"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Título opcional"
            className="w-full rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm text-textMain outline-none placeholder:text-textDim"
          />
          <textarea
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            className="min-h-24 w-full rounded-3xl border border-white/8 bg-background px-4 py-3 text-sm text-textMain outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-textDim">
              <input
                type="checkbox"
                checked={draftSpoilers}
                onChange={(event) => setDraftSpoilers(event.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-background"
              />
              Marcar como spoiler
            </label>
            <button
              type="button"
              onClick={() => void submitEdit()}
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Salvar edição
            </button>
          </div>
        </div>
      ) : (
        <>
          {item.title ? (
            <h4 className="mb-2 text-sm font-semibold text-textMain">
              {item.title}
            </h4>
          ) : null}

          {item.hasSpoilers ? (
            <SpoilerBlock
              content={item.content}
              className="text-sm leading-6 text-textMain"
            />
          ) : (
            <p className="text-sm leading-6 text-textDim">{item.content}</p>
          )}
        </>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-textDim">
        <button
          type="button"
          onClick={() => void onVote(item.id, 1)}
          className="flex items-center gap-1 rounded-full border border-white/6 px-3 py-1.5 transition-colors hover:border-emerald-400/30 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {item.helpful}
        </button>
        <button
          type="button"
          onClick={() => void onVote(item.id, -1)}
          className="flex items-center gap-1 rounded-full border border-white/6 px-3 py-1.5 transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {item.unhelpful}
        </button>
      </div>
    </article>
  );
}

export function CommentSection({
  scope,
  title,
}: {
  scope: { type: "series"; id: string } | { type: "media"; id: string };
  title: string;
}) {
  const { user } = useAuth();
  const { data: myBadges } = useMyBadges();
  const primaryBadge = myBadges ? getPrimaryBadge(myBadges) : null;
  const [content, setContent] = useState("");
  const [commentTitle, setCommentTitle] = useState("");
  const [commentType, setCommentType] = useState<CommentType>("DISCUSSION");
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "helpful" | "controversial">(
    "recent",
  );

  const seriesComments = useInfiniteSeriesComments(
    scope.type === "series" ? scope.id : undefined,
    { sortBy, limit: 20 },
  );
  const mediaComments = useInfiniteMediaComments(
    scope.type === "media" ? scope.id : undefined,
    { sortBy, limit: 20 },
  );
  const createSeriesComment = useCreateSeriesComment(
    scope.type === "series" ? scope.id : "",
  );
  const createMediaComment = useCreateMediaComment(
    scope.type === "media" ? scope.id : "",
  );
  const voteComment = useVoteComment();
  const deleteComment = useDeleteComment();
  const updateComment = useUpdateComment();

  const comments = useMemo(
    () =>
      scope.type === "series"
        ? (seriesComments.data?.pages.flatMap((page) => page.comments) ?? [])
        : (mediaComments.data?.pages.flatMap((page) => page.comments) ?? []),
    [mediaComments.data?.pages, scope.type, seriesComments.data?.pages],
  );

  const isLoading =
    scope.type === "series"
      ? seriesComments.isLoading
      : mediaComments.isLoading;
  const hasNextPage =
    scope.type === "series"
      ? seriesComments.hasNextPage
      : mediaComments.hasNextPage;
  const isFetchingNextPage =
    scope.type === "series"
      ? seriesComments.isFetchingNextPage
      : mediaComments.isFetchingNextPage;

  const loadMore = async () => {
    if (scope.type === "series") {
      await seriesComments.fetchNextPage();
      return;
    }
    await mediaComments.fetchNextPage();
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 3) {
      toast.error("Escreva pelo menos 3 caracteres.");
      return;
    }

    const payload = {
      title: commentTitle.trim() || undefined,
      content: trimmed,
      type: commentType,
      hasSpoilers,
    };

    try {
      if (scope.type === "series") {
        await createSeriesComment.mutateAsync(payload);
      } else {
        await createMediaComment.mutateAsync(payload);
      }
      toast.success("Comentário publicado.");
      setContent("");
      setCommentTitle("");
      setHasSpoilers(false);
      setCommentType("DISCUSSION");
    } catch {
      toast.error("Não foi possível publicar o comentário.");
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
      toast.success("Comentário removido.");
    } catch {
      toast.error("Erro ao remover comentário.");
    }
  };

  const handleEdit = async (
    commentId: string,
    data: { title?: string; content?: string; hasSpoilers?: boolean },
  ) => {
    try {
      await updateComment.mutateAsync({ commentId, data });
      toast.success("Comentário atualizado.");
    } catch {
      toast.error("Erro ao atualizar comentário.");
    }
  };

  const handleVote = async (commentId: string, value: -1 | 1) => {
    try {
      await voteComment.mutateAsync({ commentId, data: { value } });
    } catch {
      toast.error("Não foi possível registrar seu voto.");
    }
  };

  return (
    <section className="rounded-4xl border border-white/6 bg-surface/25 p-4 backdrop-blur-sm md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-textMain">
            <MessageSquareText className="h-5 w-5 text-primary" />
            {title}
          </h3>
          <p className="mt-1 text-sm text-textDim">
            Converse com a comunidade sem sair da leitura.
          </p>
        </div>
        <select
          value={sortBy}
          onChange={(event) =>
            setSortBy(
              event.target.value as "recent" | "helpful" | "controversial",
            )
          }
          className="rounded-2xl border border-white/8 bg-background/70 px-3 py-2 text-xs text-textMain outline-none"
        >
          <option value="recent">Recentes</option>
          <option value="helpful">Úteis</option>
          <option value="controversial">Polêmicos</option>
        </select>
      </div>

      <div className="mb-5 rounded-[1.75rem] border border-white/6 bg-background/55 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={commentTitle}
            onChange={(event) => setCommentTitle(event.target.value)}
            placeholder="Título opcional"
            className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm text-textMain outline-none placeholder:text-textDim"
          />
          <select
            value={commentType}
            onChange={(event) =>
              setCommentType(event.target.value as CommentType)
            }
            className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm text-textMain outline-none"
          >
            {COMMENT_TYPES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escreva sua mensagem para a comunidade"
          className="mt-3 min-h-28 w-full rounded-3xl border border-white/8 bg-background px-4 py-3 text-sm text-textMain outline-none placeholder:text-textDim"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-textDim">
            <input
              type="checkbox"
              checked={hasSpoilers}
              onChange={(event) => setHasSpoilers(event.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-background"
            />
            Marcar como spoiler
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={
              createSeriesComment.isPending || createMediaComment.isPending
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {createSeriesComment.isPending || createMediaComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/6 bg-background/40 px-4 py-4 text-sm text-textDim">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando comentários...
          </div>
        ) : null}
        {!isLoading && comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/8 bg-background/30 px-4 py-8 text-center text-sm text-textDim">
            Nenhum comentário ainda. Abra a conversa.
          </div>
        ) : null}
        {comments.map((item) => (
          <CommentCard
            key={item.id}
            item={item}
            canManage={item.userId === user?.id}
            currentUserId={user?.id}
            currentUserBadges={primaryBadge}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onVote={handleVote}
          />
        ))}
        {hasNextPage ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isFetchingNextPage}
            className="mx-auto flex items-center gap-2 rounded-2xl border border-white/8 bg-background/60 px-4 py-3 text-sm font-semibold text-textMain transition-colors hover:bg-background disabled:opacity-60"
          >
            {isFetchingNextPage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Carregar mais comentários
          </button>
        ) : null}
      </div>
    </section>
  );
}
