"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  // Token ausente
  if (!token) {
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
          <p className="text-textDim text-sm mb-6">
            Nenhum token de recuperação fornecido. Verifique o link enviado por
            email.
          </p>
          <button
            onClick={() => router.push("/auth/forgot-password")}
            className="px-6 py-3 bg-surface text-textMain rounded-lg text-sm font-medium hover:bg-surface/80 transition-colors"
          >
            Solicitar Novo Link
          </button>
        </motion.div>
      </div>
    );
  }

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

    setIsLoading(true);

    try {
      await authService.resetPassword({ token, password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
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
      } else {
        setError(apiError.message || "Erro ao redefinir senha");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
            Senha Redefinida!
          </h1>
          <p className="text-textDim text-sm mb-2">
            Sua senha foi alterada com sucesso.
          </p>
          <p className="text-textDim text-xs">Redirecionando para o login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">ManHQ</h1>
          <p className="text-textMain font-medium">Redefinir Senha</p>
          <p className="text-textDim text-sm mt-1">
            Escolha uma nova senha para sua conta.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-textMain mb-2"
            >
              Nova Senha
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-textMain mb-2"
            >
              Confirmar Nova Senha
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

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redefinindo...
              </>
            ) : (
              "Redefinir Senha"
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-textDim text-sm">
            Lembrou a senha?{" "}
            <button
              onClick={() => router.push("/auth/login")}
              className="text-primary hover:underline font-medium"
            >
              Faça login
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
