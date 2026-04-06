"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDefaultAuthenticatedPath } from "@/lib/subscription";
import { useAuth } from "@/contexts/AuthContext";
import type { ApiError } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const {
    defaultAuthenticatedPath,
    isAuthenticated,
    isLoading: authLoading,
    login,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const normalizedEmail = email.trim();
  const isSubmitDisabled =
    isLoading || isOffline || !normalizedEmail || password.length === 0;

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(defaultAuthenticatedPath);
    }
  }, [authLoading, defaultAuthenticatedPath, isAuthenticated, router]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setErrorDetails([]);
    setRetryAfter(null);

    if (isOffline) {
      setError("Sem conexão com a internet. Verifique sua rede.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({ email: normalizedEmail, password });
      router.replace(getDefaultAuthenticatedPath(response.user));
    } catch (rawError) {
      const apiError = rawError as ApiError;

      if (apiError.statusCode === 0 || !apiError.statusCode) {
        setError(
          "Não foi possível conectar ao servidor. Tente novamente mais tarde.",
        );
      } else if (apiError.error) {
        setError(apiError.error);

        if (Array.isArray(apiError.details)) {
          setErrorDetails(apiError.details);
        }

        if (apiError.retryAfter) {
          setRetryAfter(apiError.retryAfter);
        }
      } else {
        setError(apiError.message || "Erro ao fazer login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_28%)]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-panel relative w-full max-w-md rounded-[32px] p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Acesso</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-textMain)]">
              Entrar no ManHQ
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-textDim)]">
              Área exclusiva para assinantes com biblioteca, progresso e
              dashboard administrativo. Se sua assinatura precisar de renovação,
              você continuará com acesso à área da conta para regularizar.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary)]/12 p-3 text-[var(--color-primary)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        {isOffline ? (
          <div
            className="state-panel state-panel-warning mt-5 flex items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="h-[18px] w-[18px] shrink-0" />
            <p className="text-sm">Sem conexão com a internet.</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-textMain)]">
              Email
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-textDim)]/60" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com…"
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-form-error" : undefined}
                className="field-input rounded-2xl py-3 pl-11 pr-4 text-sm"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-textMain)]">
              Senha
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-textDim)]/60" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••…"
                required
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-form-error" : undefined}
                className="field-input rounded-2xl py-3 pl-11 pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-textDim)]/60 transition-colors hover:text-[var(--color-textMain)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40"
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
          </label>

          {error ? (
            <div
              id="login-form-error"
              className="state-panel state-panel-danger"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm font-medium">{error}</p>
              {errorDetails.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs">
                  {errorDetails.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {retryAfter ? (
                <p className="mt-2 text-xs opacity-80">
                  Aguarde {retryAfter} segundos antes de tentar novamente.
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            aria-busy={isLoading}
            className="ui-btn-primary w-full rounded-2xl px-4 py-3.5 text-sm font-semibold shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="mt-5 flex flex-col gap-4 text-center">
          <button
            type="button"
            onClick={() => router.push("/auth/forgot-password")}
            className="text-sm text-[var(--color-textDim)] transition-colors hover:text-[var(--color-primary)]"
          >
            Esqueceu sua senha?
          </button>

          <div className="surface-panel-muted rounded-[24px] px-4 py-3">
            <p className="text-xs leading-6 text-[var(--color-textDim)]">
              O acesso é exclusivo para assinantes. Após a compra, você recebe
              um email para ativar a conta e definir sua senha.
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
