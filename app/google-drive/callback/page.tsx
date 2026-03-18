"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useGoogleDriveCallback } from "@/hooks/useAdmin";

const CALLBACK_TIMEOUT = 30000; // 30s timeout para segurança
const REDIRECT_DELAY = 1500; // 1.5s para o usuário ver sucesso

export default function GoogleDriveCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackMutation = useGoogleDriveCallback();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [message, setMessage] = useState("Conectando sua conta Google...");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extrair parâmetros de URL
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

  // Efeito: Mostrar erro inicial se houver
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (callbackParams.type !== "valid" && callbackParams.errorMessage) {
      setError(callbackParams.errorMessage);
      setMessage("Falha na conexão com Google Drive.");
      setIsProcessing(false);
    }
  }, [callbackParams]);

  // Efeito: Executar callback
  useEffect(() => {
    if (callbackParams.type !== "valid" || !callbackParams.code) {
      return;
    }

    let isMounted = true;
    let callbackTimeoutId: NodeJS.Timeout | null = null;

    const performCallback = async () => {
      setIsProcessing(true);

      try {
        console.log("[OAuth Callback] Iniciando com code:", callbackParams.code);

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

        const isTimeout = err instanceof Error && err.message.includes("timeout");
        setError(
          isTimeout
            ? "Timeout ao conectar com Google Drive. Tente novamente."
            : `Falha na autenticação: ${errorMessage}`
        );
        setMessage("Falha na conexão com Google Drive.");
        setIsProcessing(false);
      }
    };

    // Executar callback
    performCallback();

    // Timeout de segurança
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
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface p-6 text-center space-y-4">
        {/* Status Icon */}
        <div className="flex justify-center">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : error ? (
            <XCircle className="h-8 w-8 text-red-400" />
          ) : isSuccess ? (
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          ) : null}
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-textMain">
          Integração Google Drive
        </h1>

        {/* Main Message */}
        <p className="text-sm text-textDim">{message}</p>

        {/* Error Details */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-300 text-left">
              <span className="font-semibold">Erro: </span>
              <span className="inline-block">{error}</span>
            </p>
          </div>
        )}

        {/* Success State - Auto Redirect Info */}
        {isSuccess && (
          <p className="text-xs text-green-300">
            Redirecionando em breve...
          </p>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {error && (
            <>
              <button
                onClick={() => router.replace("/dashboard/uploads")}
                className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Voltar para Uploads
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 rounded-lg border border-primary/30 text-textMain text-sm font-medium hover:bg-primary/5 transition-colors"
              >
                Tentar Novamente
              </button>
            </>
          )}
        </div>

        {/* Debug Info in Development */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 pt-4 border-t border-white/10 text-left">
            <p className="text-xs text-textDim font-mono">
              <span className="block">Status: {isLoading ? "loading" : error ? "error" : isSuccess ? "success" : "idle"}</span>
              <span className="block">Mutation: {callbackMutation.isPending ? "pending" : "idle"}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
