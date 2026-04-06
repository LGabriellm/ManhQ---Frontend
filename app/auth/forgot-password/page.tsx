"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, CheckCircle, ArrowLeft, WifiOff } from "lucide-react";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const normalizedEmail = email.trim();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isOffline) {
      setError("Sem conexão com a internet. Verifique sua rede e tente novamente.");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword({ email: normalizedEmail });
      setSent(true);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.statusCode === 0 || !apiError.statusCode) {
        setError(
          "Não foi possível conectar ao servidor. Tente novamente mais tarde.",
        );
      } else {
        setError(
          apiError.error ||
            apiError.message ||
            "Erro ao enviar email de recuperação",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/8 rounded-full blur-[128px]" />

      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-emerald-500/15"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h1 className="text-2xl font-bold text-textMain mb-2">
              Email Enviado
            </h1>
            <p className="text-textDim text-sm mb-8 leading-relaxed" aria-live="polite">
              Se o email estiver cadastrado, você receberá um link de
              recuperação. Verifique também a pasta de spam.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => router.push("/auth/login")}
              className="px-6 py-3 bg-surface/80 backdrop-blur-sm text-textMain rounded-xl text-sm font-medium hover:bg-surface transition-colors border border-white/5"
            >
              Voltar ao Login
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm relative"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-primary tracking-tight mb-1">
                ManHQ
              </h1>
              <p className="text-textMain font-medium">Recuperar Senha</p>
              <p className="text-textDim text-sm mt-1.5 leading-relaxed">
                Informe seu email para receber um link de recuperação.
              </p>
            </div>

            {isOffline ? (
              <div
                className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/15 bg-amber-500/8 px-4 py-3 text-sm text-amber-100"
                role="status"
                aria-live="polite"
              >
                <WifiOff className="h-4 w-4 shrink-0" />
                Sem conexão com a internet.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-textMain mb-2"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-textDim/50" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com…"
                    required
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "forgot-password-error" : undefined}
                    className="w-full pl-11 pr-4 py-3 bg-surface/60 backdrop-blur-sm text-textMain rounded-xl border border-white/6 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-sm placeholder:text-textDim/30"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  id="forgot-password-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-500/8 border border-red-500/15 rounded-xl"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || isOffline || !normalizedEmail}
                aria-busy={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    Enviando…
                  </>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="text-textDim/60 text-sm hover:text-textMain transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
