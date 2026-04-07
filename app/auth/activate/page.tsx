"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { setStoredUser } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatSubscriptionDateTime,
  getDefaultAuthenticatedPath,
} from "@/lib/subscription";
import { SubscriptionStateBadge } from "@/components/subscription/SubscriptionStateBadge";
import type { ApiError, User, ValidateTokenResponse } from "@/types/api";

type PageState = "loading" | "ready" | "invalid" | "success";

function passwordChecks(password: string) {
  return [
    { label: "Pelo menos 8 caracteres", ok: password.length >= 8 },
    { label: "Uma letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Uma letra minúscula", ok: /[a-z]/.test(password) },
    { label: "Um número", ok: /\d/.test(password) },
  ];
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = passwordChecks(password);
  const passed = checks.filter((item) => item.ok).length;
  const strength = Math.round((passed / checks.length) * 100);
  const tone =
    strength >= 100
      ? "bg-emerald-500"
      : strength >= 75
        ? "bg-sky-500"
        : strength >= 50
          ? "bg-amber-500"
          : "bg-rose-500";

  return (
    <div className="mt-3 space-y-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${tone}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-2 text-xs ${
              check.ok ? "text-emerald-300" : "text-textDim"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                check.ok ? "bg-emerald-500/15" : "bg-white/5"
              }`}
            >
              {check.ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { refreshUser } = useAuth();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [validation, setValidation] = useState<ValidateTokenResponse | null>(
    null,
  );
  const [invalidMessage, setInvalidMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRequestRef = useRef(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current);
      }
      usernameRequestRef.current += 1;
    };
  }, []);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameSuggestions([]);

    const normalizedValue = value.trim();

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current);
      usernameDebounceRef.current = null;
    }

    if (normalizedValue.length < 3) {
      usernameRequestRef.current += 1;
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const requestId = usernameRequestRef.current + 1;
    usernameRequestRef.current = requestId;
    usernameDebounceRef.current = setTimeout(() => {
      authService
        .checkUsernamePublic(normalizedValue)
        .then((result) => {
          if (usernameRequestRef.current !== requestId) return;
          setUsernameStatus(result.available ? "available" : "unavailable");
          setUsernameSuggestions(result.suggestions || []);
        })
        .catch(() => {
          if (usernameRequestRef.current !== requestId) return;
          setUsernameStatus("idle");
        });
    }, 400);
  };

  const passwordValidation = useMemo(
    () => passwordChecks(password),
    [password],
  );
  const isPasswordValid = passwordValidation.every((item) => item.ok);
  const passwordsMatch = password === confirmPassword;
  const isSubmitDisabled =
    isSubmitting ||
    !displayName.trim() ||
    !password ||
    !confirmPassword;
  const expiresAtLabel = validation?.expiresAt
    ? formatSubscriptionDateTime(validation.expiresAt)
    : null;

  useEffect(() => {
    if (!token) {
      setInvalidMessage(
        "Nenhum token de ativação foi encontrado neste link. Verifique o email recebido e tente novamente.",
      );
      setPageState("invalid");
      return;
    }

    let cancelled = false;

    const validateToken = async () => {
      try {
        const result = await authService.validateActivationToken(token);
        if (cancelled) return;

        if (!result.valid) {
          setInvalidMessage(result.error || "Token inválido ou expirado.");
          setPageState("invalid");
          return;
        }

        setValidation(result);
        setDisplayName(result.name || "");
        setUsername(result.suggestedUsername || "");
        setPageState("ready");
      } catch (rawError) {
        if (cancelled) return;

        const apiError = rawError as ApiError;
        setInvalidMessage(
          apiError.error ||
            apiError.message ||
            "Não foi possível validar seu link agora. Tente novamente em alguns instantes.",
        );
        setPageState("invalid");
      }
    };

    void validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setErrorDetails([]);

    if (!displayName.trim()) {
      setError("Informe como você quer aparecer no ManHQ.");
      return;
    }

    if (username.trim().length > 0 && username.trim().length < 3) {
      setError("O username precisa ter pelo menos 3 caracteres.");
      return;
    }

    if (usernameStatus === "unavailable") {
      setError("O username escolhido já está em uso. Escolha outro ou deixe em branco.");
      return;
    }

    if (!isPasswordValid) {
      setError("Sua senha ainda não atende aos requisitos mínimos.");
      return;
    }

    if (!passwordsMatch) {
      setError("A confirmação de senha não confere.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.activateAccount({
        token,
        password,
        username: username.trim() || undefined,
        name: displayName.trim(),
      });

      const fallbackUser: User = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name ?? displayName.trim(),
        role: "SUBSCRIBER",
        username: result.user.username ?? (username.trim() || null),
        subscriptionState: "active",
        accessGranted: true,
      };

      setStoredUser(fallbackUser);
      setSuccessMessage(result.message);
      setPageState("success");

      if (hasRedirectedRef.current) {
        return;
      }

      hasRedirectedRef.current = true;

      const refreshedUser = await refreshUser();
      const nextPath = getDefaultAuthenticatedPath(refreshedUser ?? fallbackUser);

      window.location.assign(nextPath);
    } catch (rawError) {
      const apiError = rawError as ApiError;
      setError(
        apiError.error || apiError.message || "Não foi possível concluir a ativação.",
      );
      setErrorDetails(Array.isArray(apiError.details) ? apiError.details : []);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <p className="mt-5 text-sm text-textDim">
            Validando seu link de configuração...
          </p>
        </div>
      </main>
    );
  }

  if (pageState === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="surface-panel w-full max-w-lg rounded-[32px] p-6 text-center sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-200">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="section-kicker mt-5">Link inválido</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-textMain">
            Não foi possível usar este convite
          </h1>
          <p className="mt-4 text-sm leading-7 text-textDim">
            {invalidMessage}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/auth/login"
              className="ui-btn-primary px-5 py-3 text-sm font-semibold"
            >
              Fazer login
            </Link>
            <Link
              href="/subscription/renew"
              className="ui-btn-secondary px-5 py-3 text-sm font-semibold"
            >
              Ver renovação
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (pageState === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="surface-panel w-full max-w-lg rounded-[32px] p-6 text-center sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-200">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="section-kicker mt-5">Conta liberada</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-textMain">
            Tudo certo. Sua conta está pronta.
          </h1>
          <p className="mt-4 text-sm leading-7 text-textDim">
            {successMessage || "Estamos finalizando sua entrada no app."}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm text-textDim">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecionando para sua área...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-panel rounded-[32px] p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            pagamento confirmado
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-textMain sm:text-4xl">
            Falta pouco para entrar no ManHQ.
          </h1>
          <p className="mt-4 text-sm leading-7 text-textDim sm:text-base">
            Seu pagamento já foi reconhecido. Agora você só precisa definir como
            vai acessar a plataforma: nome, username e senha.
          </p>

          <div className="mt-6 space-y-4">
            <div className="surface-panel-muted rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-textMain">
                <Mail className="h-4 w-4 text-primary" />
                Email reservado
              </div>
              <p className="mt-2 text-sm text-textDim">
                {validation?.email || "Email não informado"}
              </p>
            </div>

            <div className="surface-panel-muted rounded-[24px] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-textMain">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Link válido até
              </div>
              <p className="mt-2 text-sm text-textDim">
                {expiresAtLabel || "Prazo não informado"}
              </p>
            </div>

            {validation?.subscription ? (
              <div className="surface-panel-muted rounded-[24px] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-textMain">
                    Assinatura vinculada
                  </p>
                  <SubscriptionStateBadge state={validation.subscription.state} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
                      Plano
                    </p>
                    <p className="mt-1 text-sm text-textMain">
                      {validation.subscription.plan || "premium"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-textDim/65">
                      Período atual
                    </p>
                    <p className="mt-1 text-sm text-textMain">
                      {formatSubscriptionDateTime(
                        validation.subscription.currentPeriodEnd,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="state-panel state-panel-info">
              <p className="text-sm font-semibold text-textMain">
                O que acontece depois
              </p>
              <p className="mt-2 text-sm leading-6">
                Assim que você concluir este formulário, sua sessão será criada
                automaticamente e o acesso premium ficará liberado sem precisar
                voltar ao email.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[32px] p-6 sm:p-8">
          <p className="section-kicker">Configuração inicial</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-textMain">
            Escolha como sua conta vai aparecer
          </h2>
          <p className="mt-3 text-sm leading-7 text-textDim">
            Você poderá ajustar esses dados depois, mas já vale sair com tudo
            configurado do jeito certo.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-textMain">
                Nome de exibição
              </span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-textDim/60" />
                <input
                  id="display-name"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Como você quer aparecer…"
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "activate-form-error" : undefined}
                  className="field-input rounded-[24px] py-3 pl-11 pr-4 text-sm"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-textMain">
                Username
              </span>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => handleUsernameChange(event.target.value)}
                  placeholder={`${validation?.suggestedUsername || "seu_username"}…`}
                  maxLength={24}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={usernameStatus === "unavailable" || Boolean(error)}
                  aria-describedby="activate-username-hint"
                  className="field-input rounded-[24px] px-4 py-3 pr-10 text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-textDim" />
                  ) : usernameStatus === "available" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : usernameStatus === "unavailable" ? (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  ) : null}
                </div>
              </div>
              {usernameStatus === "unavailable" && usernameSuggestions.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-textDim">Tente:</span>
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
              ) : (
                <p
                  id="activate-username-hint"
                  className="mt-2 text-xs leading-6 text-textDim"
                >
                  {usernameStatus === "unavailable"
                    ? "Este username já está em uso. Tente outro."
                    : "Opcional. 3–24 caracteres, minúsculas, números, `.`, `_`, `-`."}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-textMain">
                Senha
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-textDim/60" />
                <input
                  id="activate-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Crie uma senha segura…"
                  required
                  autoComplete="new-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "activate-form-error" : undefined}
                  className="field-input rounded-[24px] py-3 pl-11 pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-textDim/70 transition-colors hover:text-textMain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-textMain">
                Confirmar senha
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-textDim/60" />
                <input
                  id="activate-confirm-password"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a senha…"
                  required
                  autoComplete="new-password"
                  aria-invalid={Boolean(error) || (confirmPassword.length > 0 && !passwordsMatch)}
                  aria-describedby={
                    confirmPassword && !passwordsMatch
                      ? "activate-confirm-password-error"
                      : error
                        ? "activate-form-error"
                        : undefined
                  }
                  className="field-input rounded-[24px] py-3 pl-11 pr-4 text-sm"
                />
              </div>
              {confirmPassword && !passwordsMatch ? (
                <p
                  id="activate-confirm-password-error"
                  className="mt-2 text-xs text-rose-300"
                  role="alert"
                >
                  A confirmação precisa ser exatamente igual à senha.
                </p>
              ) : null}
            </label>

            {error ? (
              <div
                id="activate-form-error"
                className="state-panel state-panel-danger"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm font-semibold text-textMain">{error}</p>
                {errorDetails.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs">
                    {errorDetails.map((detail) => (
                      <li key={detail} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitDisabled}
              aria-busy={isSubmitting}
              className="ui-btn-primary w-full rounded-[24px] px-5 py-3.5 text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando sua conta
                </>
              ) : (
                <>
                  Ativar conta e entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-textDim">
              Ao concluir, você entra automaticamente e pode ajustar perfil e
              preferências depois.
            </p>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Já tenho conta
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
