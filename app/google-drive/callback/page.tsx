"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useGoogleDriveCallback } from "@/hooks/useAdmin";

const CALLBACK_TIMEOUT = 30000;
const REDIRECT_DELAY = 1500;

export default function GoogleDriveCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackMutation = useGoogleDriveCallback();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [message, setMessage] = useState("Conectando sua conta Google...");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const callbackParams = useMemo(() => {
    const oErr = searchParams.get("error");
    const oDesc = searchParams.get("error_description");
    const authCode = searchParams.get("code");

    if (oErr) {
      const details = oDesc ? decodeURIComponent(oDesc) : oErr;
      console.error("[OAuth Error]", oErr, details);
      return {
        type: "error",
        code: null,
        errorMessage: `OAuth Google falhou: ${details}`,
      } as const;
    }

    if (!authCode) {
      console.warn("[OAuth Callback] Código não encontrado");
      return {
        type: "missing-code",
        code: null,
        errorMessage: "Código de autorização não encontrado.",
      } as const;
    }

    return {
      type: "valid",
      code: authCode,
      errorMessage: null,
    } as const;
  }, [searchParams]);

  useEffect(() => {
    if (callbackParams.type !== "valid" && callbackParams.errorMessage) {
      setError(callbackParams.errorMessage);
      setMessage("Falha na conexão com Google Drive.");
      setIsProcessing(false);
    }
  }, [callbackParams]);

  useEffect(() => {
    if (callbackParams.type !== "valid" || !callbackParams.code) {
      return;
    }

    let isMounted = true;
    let callbackTimeoutId: NodeJS.Timeout | null = null;

    const performCallback = async () => {
      setIsProcessing(true);

      try {
        console.log(
          "[OAuth Callback] Iniciando com code:",
          callbackParams.code,
        );

        const result = await callbackMutation.mutateAsync(callbackParams.code!);

        console.log("[OAuth Callback] Resposta:", result);

        if (!isMounted) return;

        if (result.success && result.connected) {
          console.log("[OAuth Callback] Sucesso!");
          if (!isMounted) return;
          setMessage("Google Drive conectado com sucesso!");

          timeoutRef.current = setTimeout(() => {
            if (isMounted) {
              router.replace("/dashboard/uploads");
            }
          }, REDIRECT_DELAY);
          return;
        }

        if (!isMounted) return;
        console.warn("[OAuth Callback] Resposta inválida:", result);
        setError("Não foi possível confirmar a conexão com Google Drive.");
        setMessage("Falha na conexão com Google Drive.");
        setIsProcessing(false);
      } catch (err) {
        if (!isMounted) return;

        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[OAuth Callback] Erro:", errorMessage);

        const isTimeout =
          err instanceof Error && err.message.includes("timeout");
        setError(
          isTimeout
            ? "Timeout ao conectar com Google Drive. Tente novamente."
            : `Falha na autenticação: ${errorMessage}`,
        );
        setMessage("Falha na conexão com Google Drive.");
        setIsProcessing(false);
      }
    };

    performCallback();

    callbackTimeoutId = setTimeout(() => {
      if (isMounted) {
        console.error("[OAuth Callback] Timeout geral");
        setError("Timeout ao conectar com Google Drive. Tente novamente.");
        setMessage("Falha na conexão com Google Drive.");
        setIsProcessing(false);
      }
    }, CALLBACK_TIMEOUT);

    return () => {
      isMounted = false;
      if (callbackTimeoutId) clearTimeout(callbackTimeoutId);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [callbackParams, callbackMutation, router]);

  const isLoading = isProcessing && !error;
  const isSuccess = !error && !isProcessing && isProcessing !== undefined;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-xl p-8 text-center space-y-6">
          {/* Status Icon with Animation */}
          <div className="flex justify-center mb-2">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {isLoading && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 border-r-blue-400 animate-spin" />
                  <Loader2 className="h-8 w-8 text-blue-400 animate-spin relative" />
                </>
              )}
              {error && (
                <div className="animate-bounce">
                  <XCircle className="h-12 w-12 text-red-400" />
                </div>
              )}
              {isSuccess && (
                <div className="animate-bounce">
                  <CheckCircle2 className="h-12 w-12 text-green-400" />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Google Drive</h1>
            <p className="text-sm text-gray-400">Integração de Autenticação</p>
          </div>

          {/* Main Message */}
          <p className="text-base text-gray-200 font-medium">{message}</p>

          {/* Error Details */}
          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-red-300 uppercase tracking-wide">
                ⚠️ Erro de Autenticação
              </p>
              <p className="text-sm text-red-200 break-words">{error}</p>
              <div className="text-xs text-red-300 pt-2 border-t border-red-500/20">
                Verifique se o backend está configurado corretamente.
              </div>
            </div>
          )}

          {/* Success State */}
          {isSuccess && (
            <div className="bg-green-500/15 border border-green-500/30 rounded-lg p-4 space-y-2">
              <p className="text-sm text-green-300">
                ✓ Conta conectada com sucesso!
              </p>
              <p className="text-xs text-green-200">
                Você será redirecionado em breve...
              </p>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            {error && (
              <>
                <button
                  onClick={() => router.replace("/dashboard/uploads")}
                  className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  Voltar para Uploads
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full px-4 py-3 rounded-lg border border-blue-600/50 text-blue-300 hover:bg-blue-600/10 font-medium transition-colors"
                >
                  Tentar Novamente
                </button>
              </>
            )}
            {isLoading && (
              <p className="text-xs text-gray-400">Por favor aguarde...</p>
            )}
          </div>

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 pt-4 border-t border-white/10 text-left space-y-1">
              <p className="text-xs text-gray-500 font-mono">
                <span className="text-gray-600">Status:</span>{" "}
                <span className="text-blue-300">
                  {isLoading
                    ? "loading"
                    : error
                      ? "error"
                      : isSuccess
                        ? "success"
                        : "idle"}
                </span>
              </p>
              <p className="text-xs text-gray-500 font-mono">
                <span className="text-gray-600">Mutation:</span>{" "}
                <span className="text-blue-300">
                  {callbackMutation.isPending ? "pending" : "idle"}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Não vê um progresso? Verifique a console para detalhes.
        </div>
      </div>
    </div>
  );
}
