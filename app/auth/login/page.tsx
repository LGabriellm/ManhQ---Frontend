"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, WifiOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { ApiError } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Detectar offline
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
    setErrorDetails([]);
    setRetryAfter(null);

    if (isOffline) {
      setError("Sem conexão com a internet. Verifique sua rede.");
      return;
    }

    setIsLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      const apiError = err as ApiError;

      if (apiError.statusCode === 0 || !apiError.statusCode) {
        setError(
          "Não foi possível conectar ao servidor. Tente novamente mais tarde.",
        );
      } else if (apiError.error) {
        setError(apiError.error);
        if (apiError.details && Array.isArray(apiError.details)) {
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/8 rounded-full blur-[128px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary tracking-tight mb-1">
            ManHQ
          </h1>
          <p className="text-textDim text-sm">Entre para continuar lendo</p>
        </div>

        {/* Offline banner */}
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 mb-4 bg-yellow-500/8 border border-yellow-500/15 rounded-xl"
          >
            <WifiOff className="w-[18px] h-[18px] text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-400">
              Sem conexão com a internet
            </p>
          </motion.div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3 bg-surface/60 backdrop-blur-sm text-textMain rounded-xl border border-white/6 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-sm placeholder:text-textDim/30"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-textMain mb-2"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-textDim/50" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-11 pr-11 py-3 bg-surface/60 backdrop-blur-sm text-textMain rounded-xl border border-white/6 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-sm placeholder:text-textDim/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-textDim/40 hover:text-textDim transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/8 border border-red-500/15 rounded-xl"
            >
              <p className="text-sm text-red-400 font-medium">{error}</p>
              {errorDetails.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {errorDetails.map((detail, index) => (
                    <li
                      key={index}
                      className="text-xs text-red-400/70 flex items-start gap-1.5"
                    >
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
              {retryAfter && (
                <p className="text-xs text-red-400/60 mt-2">
                  Aguarde {retryAfter} segundos antes de tentar novamente.
                </p>
              )}
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || isOffline}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </motion.button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => router.push("/auth/forgot-password")}
            className="text-textDim/60 text-sm hover:text-primary transition-colors"
          >
            Esqueceu sua senha?
          </button>
        </div>

        <div className="mt-5 text-center">
          <p className="text-textDim/40 text-xs leading-relaxed">
            O acesso é exclusivo para assinantes.
            <br />
            Após a compra, você receberá um email para ativar sua conta.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
