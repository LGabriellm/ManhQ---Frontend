"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { setStoredToken, setStoredUser } from "@/services/api";
import type { ApiError } from "@/types/api";

type PageState = "loading" | "form" | "success" | "invalid";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ caracteres", ok: password.length >= 8 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Número", ok: /\d/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const strength =
    passed === 0 ? 0 : passed === 1 ? 33 : passed === 2 ? 66 : 100;
  const color =
    strength <= 33
      ? "bg-red-500"
      : strength <= 66
        ? "bg-yellow-500"
        : "bg-emerald-500";

  if (!password) return null;

  return (
    <div className="mt-2.5 space-y-2">
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${strength}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-[11px] flex items-center gap-1 transition-colors ${
              c.ok ? "text-emerald-400" : "text-textDim/50"
            }`}
          >
            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<PageState>("loading");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [invalidMessage, setInvalidMessage] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setInvalidMessage(
        "Nenhum token de ativação fornecido. Verifique o link enviado por email.",
      );
      setState("invalid");
      return;
    }

    const validate = async () => {
      try {
        const result = await authService.validateActivationToken(token);
        if (result.valid) {
          setUserName(result.name || "");
          setUserEmail(result.email || "");
          setState("form");
        } else {
          setInvalidMessage(result.error || "Token inválido ou expirado.");
          setState("invalid");
        }
      } catch {
        setInvalidMessage(
          "Não foi possível validar o token. Tente novamente mais tarde.",
        );
        setState("invalid");
      }
    };

    validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorDetails([]);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.activateAccount({ token, password });
      setStoredToken(result.token);
      setStoredUser(result.user);
      setState("success");
      setTimeout(() => {
        window.location.href = "/";
      }, 2500);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.error) {
        setError(apiError.error);
        if (apiError.details && Array.isArray(apiError.details)) {
          setErrorDetails(apiError.details);
        }
      } else {
        setError(apiError.message || "Erro ao ativar conta");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/8 rounded-full blur-[128px]" />

      <AnimatePresence mode="wait">
        {state === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/15">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <p className="text-textDim text-sm">Validando seu convite…</p>
          </motion.div>
        )}

        {state === "invalid" && (
          <motion.div
            key="invalid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-red-500/15">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-textMain mb-2">
              Link Inválido
            </h1>
            <p className="text-textDim text-sm mb-8 leading-relaxed">
              {invalidMessage}
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/auth/login")}
              className="px-6 py-3 bg-surface/80 backdrop-blur-sm text-textMain rounded-xl text-sm font-medium hover:bg-surface transition-colors border border-white/5"
            >
              Ir para o Login
            </motion.button>
          </motion.div>
        )}

        {state === "success" && (
          <motion.div
            key="success"
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
              Conta Ativada!
            </h1>
            <p className="text-textDim text-sm mb-1">
              Bem-vindo ao ManHQ,{" "}
              <span className="text-white font-medium">{userName}</span>!
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-textDim/50 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              Redirecionando…
            </div>
          </motion.div>
        )}

        {state === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm relative"
          >
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/15">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary tracking-tight mb-1">
                ManHQ
              </h1>
              <p className="text-textMain font-medium">Ative sua conta</p>
              <p className="text-textDim text-sm mt-1.5 leading-relaxed">
                Olá, <span className="text-white font-medium">{userName}</span>!
                Defina sua senha para começar.
              </p>
              <p className="text-textDim/50 text-xs mt-1">{userEmail}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
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
                <PasswordStrength password={password} />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-textMain mb-2"
                >
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-textDim/50" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-surface/60 backdrop-blur-sm text-textMain rounded-xl border border-white/6 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-sm placeholder:text-textDim/30"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    As senhas não coincidem
                  </p>
                )}
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
                </motion.div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    Ativando…
                  </>
                ) : (
                  "Ativar Conta"
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-textDim/50 text-xs">
                Já tem uma conta?{" "}
                <button
                  onClick={() => router.push("/auth/login")}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Fazer login
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
