"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * Google Drive OAuth callback popup.
 *
 * Opened via window.open from useGoogleDriveAuth. Flow:
 *   1. Google redirects here with ?code=...&state=...
 *   2. We forward to the backend proxy (JSON mode) to exchange the code.
 *   3. On success, postMessage to opener and auto-close.
 *   4. On failure, show error with retry link.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "@/services/api";

type CallbackState = "loading" | "success" | "error";

export default function GoogleDriveCallbackPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setState("error");
      setErrorMsg(
        error === "access_denied" ? "Acesso negado pelo usuário." : error,
      );
      return;
    }

    if (!code) {
      setState("error");
      setErrorMsg("Código de autorização ausente.");
      return;
    }

    async function exchange() {
      try {
        await api.get("/integrations/google-drive/callback", {
          params: { code, state: stateParam, mode: "json" },
        });

        setState("success");

        if (window.opener) {
          window.opener.postMessage(
            { type: "google-drive-connected", success: true },
            window.location.origin,
          );
        }

        setTimeout(() => window.close(), 1500);
      } catch (err: unknown) {
        setState("error");
        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao conectar com Google Drive.";
        setErrorMsg(msg);

        if (window.opener) {
          window.opener.postMessage(
            { type: "google-drive-connected", success: false, error: msg },
            window.location.origin,
          );
        }
      }
    }

    exchange();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/5 bg-[var(--color-surface)] p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--color-primary)]" />
            <p className="mt-4 text-sm text-[var(--color-textMain)]">
              Conectando ao Google Drive...
            </p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-4 font-medium text-emerald-300">Conectado!</p>
            <p className="mt-1 text-xs text-[var(--color-textDim)]">
              Esta janela será fechada automaticamente.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
            <p className="mt-4 font-medium text-rose-300">Falha na conexão</p>
            <p className="mt-2 text-xs text-[var(--color-textDim)]">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => window.close()}
              className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-[var(--color-textMain)] hover:bg-white/20"
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
