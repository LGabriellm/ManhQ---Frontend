"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useGoogleDriveCallback } from "@/hooks/useAdmin";

export default function GoogleDriveCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackMutation = useGoogleDriveCallback();

  const [message, setMessage] = useState("Conectando sua conta Google...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");
    const code = searchParams.get("code");

    if (oauthError) {
      const details = oauthErrorDescription
        ? decodeURIComponent(oauthErrorDescription)
        : oauthError;
      setError(`OAuth Google falhou: ${details}`);
      setMessage("Falha na conexão com Google Drive.");
      return;
    }

    if (!code) {
      setError("Código de autorização não encontrado.");
      setMessage("Falha na conexão com Google Drive.");
      return;
    }

    let isMounted = true;

    callbackMutation
      .mutateAsync(code)
      .then((result) => {
        if (!isMounted) return;

        if (result.success && result.connected) {
          setMessage("Google Drive conectado com sucesso!");
          setTimeout(() => {
            router.replace("/dashboard/uploads");
          }, 1200);
          return;
        }

        setError("Não foi possível confirmar a conexão com Google Drive.");
        setMessage("Falha na conexão com Google Drive.");
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Não foi possível concluir a autenticação.");
        setMessage("Falha na conexão com Google Drive.");
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, router, callbackMutation]);

  const isLoading = callbackMutation.isPending && !error;

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--color-surface)] p-6 text-center space-y-3">
        <div className="flex justify-center">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
          ) : error ? (
            <XCircle className="h-7 w-7 text-red-400" />
          ) : (
            <CheckCircle2 className="h-7 w-7 text-green-400" />
          )}
        </div>

        <h1 className="text-base font-semibold text-[var(--color-textMain)]">
          Integração Google Drive
        </h1>

        <p className="text-sm text-[var(--color-textDim)]">{message}</p>

        {error && (
          <button
            onClick={() => router.replace("/dashboard/uploads")}
            className="mt-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90"
          >
            Voltar para Uploads
          </button>
        )}
      </div>
    </div>
  );
}
