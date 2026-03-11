"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { setStoredToken, setStoredUser } from "@/services/api";
import type { ApiError } from "@/types/api";

type PageState = "loading" | "form" | "success" | "invalid";

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

  // Validar token ao carregar
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
      // Auto-login
      setStoredToken(result.token);
      setStoredUser(result.user);
      setState("success");
      // Redirecionar após 2s
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
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

  // Loading
  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-textDim text-sm">Validando token de ativação...</p>
      </div>
    );
  }

  // Token inválido/expirado
  if (state === "invalid") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-2">
            Link Inválido
          </h1>
          <p className="text-textDim text-sm mb-6">{invalidMessage}</p>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-6 py-3 bg-surface text-textMain rounded-lg text-sm font-medium hover:bg-surface/80 transition-colors"
          >
            Ir para o Login
          </button>
        </motion.div>
      </div>
    );
  }

  // Sucesso
  if (state === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-textMain mb-2">
            Conta Ativada!
          </h1>
          <p className="text-textDim text-sm mb-2">
            Bem-vindo ao ManHQ,{" "}
            <strong className="text-textMain">{userName}</strong>!
          </p>
          <p className="text-textDim text-xs">Redirecionando...</p>
        </motion.div>
      </div>
    );
  }

  // Formulário de ativação
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">ManHQ</h1>
          <p className="text-textMain font-medium">Ative sua conta</p>
          <p className="text-textDim text-sm mt-1">
            Olá, <strong className="text-textMain">{userName}</strong>! Defina
            sua senha para começar.
          </p>
          <p className="text-textDim text-xs mt-1">{userEmail}</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Senha */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-textMain mb-2"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textDim" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full pl-12 pr-12 py-3 bg-surface text-textMain rounded-lg border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-textDim hover:text-textMain transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-textMain mb-2"
            >
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textDim" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full pl-12 pr-4 py-3 bg-surface text-textMain rounded-lg border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-red-500 font-medium">{error}</p>
              {errorDetails.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {errorDetails.map((detail, index) => (
                    <li
                      key={index}
                      className="text-xs text-red-400 flex items-start gap-1"
                    >
                      <span className="mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {/* Botão */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ativando...
              </>
            ) : (
              "Ativar Conta"
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-textDim text-sm">
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
    </div>
  );
}
