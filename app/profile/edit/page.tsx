"use client";

import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Monitor,
  RefreshCw,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  useLogoutAllSessions,
  useMyBadges,
  useRevokeSession,
  useSetFeaturedBadge,
  useSessions,
} from "@/hooks/useApi";
import {
  useAccount,
  useChangePassword,
  useRemoveAvatar,
  useUpdateProfile,
  useUploadAvatar,
} from "@/hooks/useAccount";
import { UserAvatar } from "@/components/community/UserAvatar";
import { UserBadge } from "@/components/community/UserBadge";
import { SubscriptionStateBadge } from "@/components/subscription/SubscriptionStateBadge";
import { accountService } from "@/services/account.service";
import {
  formatSubscriptionDate,
  getPaymentMethodLabel,
} from "@/lib/subscription";

function relativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(dateString).toLocaleDateString("pt-BR");
}

function deviceIcon(userAgent?: string) {
  const ua = (userAgent || "").toLowerCase();
  return /iphone|android|mobile|ipad/.test(ua) ? Smartphone : Monitor;
}

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function getActionErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message =
      typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : undefined;

    if (message) {
      return message;
    }
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, refreshUser, logout, subscription } = useAuth();
  const account = useAccount();

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

  const sessions = useSessions();
  const revokeSession = useRevokeSession();
  const logoutAllSessions = useLogoutAllSessions();

  const { data: myBadges, isLoading: badgesLoading } = useMyBadges();
  const setFeaturedBadge = useSetFeaturedBadge();
  const currentFeaturedId = myBadges?.find((b) => b.isFeatured)?.id ?? null;
  const [pendingFeaturedId, setPendingFeaturedId] = useState<string | null | undefined>(undefined);
  const featuredId = pendingFeaturedId !== undefined ? pendingFeaturedId : currentFeaturedId;
  const hasFeaturedChanged = pendingFeaturedId !== undefined && pendingFeaturedId !== currentFeaturedId;

  const saveFeaturedBadge = async () => {
    await setFeaturedBadge.mutateAsync(featuredId);
    setPendingFeaturedId(undefined);
    toast.success(featuredId ? "Badge em destaque atualizado." : "Badge em destaque removido.");
  };

  const profile = account.data?.account;

  const [displayNameInput, setDisplayNameInput] = useState<string | undefined>(
    undefined,
  );
  const currentDisplayName = (profile?.name || "").trim();
  const displayName = displayNameInput ?? currentDisplayName;
  const hasDisplayNameChanged = displayName.trim() !== currentDisplayName;

  const [usernameInput, setUsernameInput] = useState<string | undefined>(
    undefined,
  );
  const currentUsername = (profile?.username || "").trim();
  const username = usernameInput ?? currentUsername;
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const usernameRequestRef = useRef(0);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [avatarBust, setAvatarBust] = useState<number | undefined>(undefined);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  const orderedSessions = useMemo(() => {
    const list = Array.isArray(sessions.data) ? sessions.data : [];
    return [...list].sort(
      (left, right) =>
        new Date(right.lastUsedAt).getTime() -
        new Date(left.lastUsedAt).getTime(),
    );
  }, [sessions.data]);

  const checks = passwordChecks(passwordForm.newPassword);
  const isPasswordValid =
    checks.length &&
    checks.upper &&
    checks.lower &&
    checks.number &&
    checks.special;
  const trimmedUsername = username.trim();
  const hasUsernameChanged = trimmedUsername !== currentUsername;
  const canSaveUsername =
    hasUsernameChanged &&
    usernameStatus !== "checking" &&
    usernameStatus !== "unavailable" &&
    (trimmedUsername.length === 0 || trimmedUsername.length >= 3);

  useEffect(() => {
    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }
      usernameRequestRef.current += 1;
    };
  }, []);

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshUser(), account.refetch(), sessions.refetch()]);
      setDisplayNameInput(undefined);
      setUsernameInput(undefined);
      setUsernameStatus("idle");
      setUsernameSuggestions([]);
      toast.success("Dados atualizados.");
    } catch {
      toast.error("Não foi possível atualizar os dados.");
    }
  };

  const saveDisplayName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("O nome de exibição não pode ficar vazio.");
      return;
    }
    if (!hasDisplayNameChanged) {
      toast("Nenhuma alteração para salvar.");
      return;
    }

    try {
      await updateProfile.mutateAsync({ name: trimmed });
      await Promise.all([refreshUser(), account.refetch()]);
      setDisplayNameInput(trimmed);
      toast.success("Nome de exibição atualizado.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, "Não foi possível atualizar o nome."),
      );
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsernameInput(value);
    setUsernameSuggestions([]);

    const normalizedValue = value.trim();

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }

    if (normalizedValue === currentUsername || normalizedValue.length < 3) {
      usernameRequestRef.current += 1;
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const requestId = usernameRequestRef.current + 1;
    usernameRequestRef.current = requestId;
    usernameDebounceRef.current = setTimeout(() => {
      accountService
        .checkUsername(normalizedValue)
        .then((result) => {
          if (usernameRequestRef.current !== requestId) {
            return;
          }
          setUsernameStatus(result.available ? "available" : "unavailable");
          setUsernameSuggestions(result.suggestions || []);
        })
        .catch(() => {
          if (usernameRequestRef.current !== requestId) {
            return;
          }
          setUsernameStatus("idle");
        });
    }, 400);
  };

  const saveUsername = async () => {
    if (usernameStatus === "unavailable") {
      toast.error("Username indisponível.");
      return;
    }

    if (!hasUsernameChanged) {
      toast("Nenhuma alteração para salvar.");
      return;
    }

    if (trimmedUsername.length > 0 && trimmedUsername.length < 3) {
      toast.error("O username precisa ter pelo menos 3 caracteres.");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        username: trimmedUsername || undefined,
      });
      await Promise.all([refreshUser(), account.refetch()]);
      setUsernameInput(trimmedUsername);
      setUsernameStatus("idle");
      setUsernameSuggestions([]);
      toast.success("Username atualizado com sucesso.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, "Não foi possível atualizar o username."),
      );
    }
  };

  const submitPasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("A confirmação de senha não confere.");
      return;
    }
    if (!isPasswordValid) {
      toast.error("A nova senha não atende aos requisitos mínimos.");
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, "Não foi possível alterar a senha."),
      );
    }
  };

  const uploadAvatarFile = async (file?: File) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Use JPEG, PNG, WEBP ou GIF.");
      return;
    }

    try {
      await uploadAvatar.mutateAsync(file);
      await Promise.all([refreshUser(), account.refetch()]);
      setAvatarBust(Date.now());
      toast.success("Foto de perfil atualizada.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, "Não foi possível enviar a foto."),
      );
    }
  };

  const deleteAvatar = async () => {
    try {
      await removeAvatar.mutateAsync();
      await Promise.all([refreshUser(), account.refetch()]);
      setAvatarBust(Date.now());
      toast.success("Foto de perfil removida.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, "Não foi possível remover a foto."),
      );
    }
  };

  const revokeOneSession = async (sessionId: string) => {
    setPendingSessionId(sessionId);
    try {
      await revokeSession.mutateAsync(sessionId);
      await sessions.refetch();
      toast.success("Sessão revogada.");
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, "Não foi possível revogar essa sessão."),
      );
    } finally {
      setPendingSessionId((current) =>
        current === sessionId ? null : current,
      );
    }
  };

  const closeAllSessions = async () => {
    try {
      await logoutAllSessions.mutateAsync();
      await logout();
      toast.success("Todas as sessões foram encerradas.");
      router.replace("/auth/login");
    } catch (error) {
      toast.error(
        getActionErrorMessage(
          error,
          "Não foi possível encerrar todas as sessões.",
        ),
      );
    }
  };

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-background/60 px-4 py-2 text-sm text-textMain hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
          </Link>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-background/60 px-4 py-2 text-sm text-textMain hover:bg-background"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar dados
          </button>
        </div>

        <section className="rounded-4xl border border-white/6 bg-surface/30 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-textMain">Perfil</h1>
              <p className="mt-1 text-sm text-textDim">
                Foto, nome de exibição e username.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-3xl border border-white/6 bg-background/55 p-4">
            <UserAvatar
              userId={user?.id}
              avatarUrl={profile?.avatarUrl}
              cacheBust={avatarBust}
              name={user?.name || undefined}
              className="h-16 w-16 rounded-2xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-textMain">
                {profile?.name || user?.name || "Sem nome"}
              </p>
              <p className="truncate text-sm text-textDim">
                @{profile?.username || "usuario"} · {user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void uploadAvatarFile(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-background/60 px-3 py-2 text-xs font-semibold text-textMain hover:bg-background disabled:opacity-60"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Upload foto
              </button>
              <button
                type="button"
                onClick={() => void deleteAvatar()}
                disabled={removeAvatar.isPending || !profile?.avatarUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs font-semibold text-textMain hover:bg-black/35 disabled:opacity-60"
              >
                {removeAvatar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remover foto
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-textMain">
                Nome de exibição
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                maxLength={100}
                className="block w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 text-sm text-textMain outline-none focus:border-primary/50"
                placeholder="Como você aparece no ManHQ"
              />
              <p className="mt-1 text-xs text-textDim">
                O nome que aparece nos comentários e no seu perfil.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void saveDisplayName()}
              disabled={updateProfile.isPending || !hasDisplayNameChanged || !displayName.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {updateProfile.isPending && hasDisplayNameChanged ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar nome
            </button>
          </div>

          <div className="mt-5 border-t border-white/6 pt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-textMain">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(event) => handleUsernameChange(event.target.value)}
                  maxLength={24}
                  className="block w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 pr-10 text-sm text-textMain outline-none focus:border-primary/50"
                  placeholder="seu_username"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-textDim" />
                  ) : usernameStatus === "available" ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : usernameStatus === "unavailable" ? (
                    <X className="h-4 w-4 text-rose-400" />
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-textDim">
                3–24 chars, minúsculas, números, `.`, `_`, `-`.
              </p>
              {usernameStatus === "unavailable" &&
              usernameSuggestions.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-textDim">Sugestões:</span>
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleUsernameChange(suggestion)}
                      className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void saveUsername()}
              disabled={updateProfile.isPending || !canSaveUsername}
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {updateProfile.isPending && hasUsernameChanged ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar username
            </button>
          </div>
        </section>

        {/* ── Badges section ── */}
        <section className="rounded-4xl border border-white/6 bg-surface/25 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Award className="h-4 w-4" />
            </div>
            <div className="w-full">
              <h2 className="text-lg font-semibold text-textMain">Meus Badges</h2>
              <p className="mt-1 text-sm text-textDim">
                Escolha qual badge aparece ao lado do seu nome em comentários e no seu perfil.
              </p>

              <div className="mt-4">
                {badgesLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/6 bg-background/40 px-4 py-5 text-sm text-textDim">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando badges...
                  </div>
                ) : !myBadges || myBadges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/8 bg-background/30 px-4 py-8 text-center">
                    <Award className="mx-auto mb-3 h-8 w-8 text-textDim/30" />
                    <p className="text-sm font-medium text-textDim">
                      Você ainda não tem badges.
                    </p>
                    <p className="mt-1 text-xs text-textDim/60">
                      Badges são concedidos automaticamente conforme você usa a plataforma.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* None option */}
                    <button
                      type="button"
                      onClick={() => setPendingFeaturedId(null)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        featuredId === null
                          ? "border-primary/40 bg-primary/5"
                          : "border-white/6 bg-background/40 hover:border-white/12"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          featuredId === null
                            ? "border-primary bg-primary"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {featuredId === null && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm text-textDim">
                        Nenhum badge em destaque
                      </span>
                    </button>

                    {/* Badge options */}
                    {myBadges.map((badge) => (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => setPendingFeaturedId(badge.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                          featuredId === badge.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-white/6 bg-background/40 hover:border-white/12"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            featuredId === badge.id
                              ? "border-primary bg-primary"
                              : "border-white/20 bg-transparent"
                          }`}
                        >
                          {featuredId === badge.id && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <UserBadge badge={badge} size="sm" />
                          <p className="mt-1 line-clamp-1 text-xs text-textDim/70">
                            {badge.description}
                          </p>
                        </div>
                        {badge.type === "FOUNDER" && badge.founderNumber && (
                          <span className="shrink-0 text-[10px] font-bold text-amber-400/80">
                            #{String(badge.founderNumber).padStart(3, "0")}
                          </span>
                        )}
                      </button>
                    ))}

                    {hasFeaturedChanged && (
                      <button
                        type="button"
                        onClick={() => void saveFeaturedBadge()}
                        disabled={setFeaturedBadge.isPending}
                        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {setFeaturedBadge.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar badge em destaque
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-white/6 bg-surface/25 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-textMain">Assinatura</h2>
              <p className="mt-1 text-sm text-textDim">
                Resumo rápido do seu plano.
              </p>

              <div className="mt-4 rounded-2xl border border-white/6 bg-background/55 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <SubscriptionStateBadge state={subscription?.state} />
                  {subscription?.plan ? (
                    <span className="text-xs font-medium text-textDim">
                      {subscription.plan}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-textDim">Pagamento</p>
                    <p className="mt-0.5 text-sm font-medium text-textMain">
                      {getPaymentMethodLabel(subscription?.paymentMethod)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-textDim">Próximo vencimento</p>
                    <p className="mt-0.5 text-sm font-medium text-textMain">
                      {formatSubscriptionDate(subscription?.currentPeriodEnd)}
                    </p>
                  </div>
                </div>

                <Link
                  href="/subscription"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/8 bg-background/60 px-4 py-2.5 text-xs font-semibold text-textMain hover:bg-background"
                >
                  Gerenciar assinatura
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-white/6 bg-surface/25 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div className="w-full">
              <h2 className="text-lg font-semibold text-textMain">Segurança</h2>
              <p className="mt-1 text-sm text-textDim">
                Redefina sua senha por aqui, sem precisar ir para recuperação.
              </p>

              <div className="mt-4 space-y-3">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    placeholder="Senha atual"
                    className="w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 pr-10 text-sm text-textMain outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textDim"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    placeholder="Nova senha"
                    className="w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 pr-10 text-sm text-textMain outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textDim"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  placeholder="Confirmar nova senha"
                  className="w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 text-sm text-textMain outline-none"
                />

                <div className="rounded-2xl border border-white/6 bg-background/35 p-3 text-xs text-textDim">
                  <p className="mb-1 font-semibold text-textMain">
                    Requisitos:
                  </p>
                  <p>{checks.length ? "✅" : "⬜"} Mínimo 8 caracteres</p>
                  <p>{checks.upper ? "✅" : "⬜"} Letra maiúscula</p>
                  <p>{checks.lower ? "✅" : "⬜"} Letra minúscula</p>
                  <p>{checks.number ? "✅" : "⬜"} Número</p>
                  <p>{checks.special ? "✅" : "⬜"} Caractere especial</p>
                </div>

                <button
                  type="button"
                  onClick={() => void submitPasswordChange()}
                  disabled={
                    changePassword.isPending ||
                    !passwordForm.currentPassword ||
                    !passwordForm.newPassword ||
                    !passwordForm.confirmPassword
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {changePassword.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Redefinir senha
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-white/6 bg-surface/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-textMain">
                Sessões ativas
              </h2>
              <p className="mt-1 text-sm text-textDim">
                Revogue dispositivos específicos ou encerre todas as sessões.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void closeAllSessions()}
              disabled={logoutAllSessions.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
            >
              {logoutAllSessions.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Encerrar todas as sessões
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sessions.isLoading ? (
              <div className="flex min-h-28 items-center justify-center gap-2 rounded-2xl border border-white/6 bg-background/40 text-sm text-textDim">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando sessões...
              </div>
            ) : sessions.isError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-100">
                <p className="font-medium">Não foi possível carregar as sessões.</p>
                <button
                  type="button"
                  onClick={() => void sessions.refetch()}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-black/20 px-3 py-2 text-xs font-semibold text-rose-100 transition-colors hover:bg-black/35"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Tentar novamente
                </button>
              </div>
            ) : orderedSessions.length ? (
              orderedSessions.map((session) => {
                const DeviceIcon = deviceIcon(session.userAgent);
                return (
                  <article
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/6 bg-background/55 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <DeviceIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-textMain">
                          {session.ipAddress || "IP não informado"}
                        </p>
                        <p className="truncate text-xs text-textDim">
                          Último uso: {relativeTime(session.lastUsedAt)} •
                          Criada:{" "}
                          {new Date(session.createdAt).toLocaleDateString(
                            "pt-BR",
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void revokeOneSession(session.id)}
                      disabled={pendingSessionId === session.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs font-semibold text-textMain transition-colors hover:bg-black/35 disabled:opacity-60"
                    >
                      {pendingSessionId === session.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Revogar sessão
                    </button>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/8 bg-background/30 px-4 py-8 text-center text-sm text-textDim">
                Nenhuma sessão ativa encontrada.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
