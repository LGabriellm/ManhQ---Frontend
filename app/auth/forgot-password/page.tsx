"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword({ email });
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

  if (sent) {
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
            Email Enviado
          </h1>
          <p className="text-textDim text-sm mb-6">
            Se o email estiver cadastrado, você receberá um link de recuperação.
            Verifique também a pasta de spam.
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="px-6 py-3 bg-surface text-textMain rounded-lg text-sm font-medium hover:bg-surface/80 transition-colors"
          >
            Voltar ao Login
          </button>
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
          <p className="text-textMain font-medium">Recuperar Senha</p>
          <p className="text-textDim text-sm mt-1">
            Informe seu email para receber um link de recuperação.
          </p>
        </div>

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
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-textDim" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
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
                Enviando...
              </>
            ) : (
              "Enviar Link de Recuperação"
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="text-textDim text-sm hover:text-textMain transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
