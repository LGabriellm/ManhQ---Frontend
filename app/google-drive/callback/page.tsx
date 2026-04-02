"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import {
  getGoogleDriveCallbackErrorState,
  getGoogleDriveCallbackSuccessState,
  getInitialGoogleDriveCallbackUiState,
  mapGoogleDriveCallbackError,
  parseGoogleDriveCallbackParams,
} from "@/lib/googleDriveCallbackFlow";
import type { GoogleDriveCallbackMessage } from "@/types/upload-workflow";

export default function GoogleDriveCallbackPage() {
  const [uiState, setUiState] = useState(() =>
    getInitialGoogleDriveCallbackUiState({
      type: "missing-code",
      code: null,
      errorMessage: "Inicializando callback...",
    }),
  );

  const callbackParams = useMemo(() => {
    const params = parseGoogleDriveCallbackParams(
      new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search,
      ),
    );
    return params;
  }, []);

  const postResultToOpener = (payload: GoogleDriveCallbackMessage) => {
    if (!window.opener || window.opener.closed) {
      return;
    }

    window.opener.postMessage(payload, window.location.origin);
  };

  useEffect(() => {
    let canceled = false;

    const closePopupSoon = () => {
      window.setTimeout(() => {
        if (window.opener && !window.opener.closed) {
          window.close();
        }
      }, 1200);
    };

    const notifyFailure = (message: string, errorCode?: string) => {
      postResultToOpener({
        source: "google_drive_callback",
        success: false,
        connected: false,
        error: message,
        errorCode,
      });
      closePopupSoon();
    };

    const notifySuccess = (account?: { email?: string; name?: string; picture?: string }) => {
      postResultToOpener({
        source: "google_drive_callback",
        success: true,
        connected: true,
        account,
        nextAction: "REFRESH_GOOGLE_DRIVE_STATUS",
      });
      closePopupSoon();
    };

    if (callbackParams.type !== "valid") {
      setUiState(getInitialGoogleDriveCallbackUiState(callbackParams));
      notifyFailure(callbackParams.errorMessage, "GOOGLE_DRIVE_CALLBACK_INVALID");
      return () => {
        canceled = true;
      };
    }

    setUiState(getInitialGoogleDriveCallbackUiState(callbackParams));

    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        params.set("mode", "json");

        const response = await fetch(
          `/api/integrations/google-drive/callback?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              connected?: boolean;
              account?: { email?: string; name?: string; picture?: string };
              error?: string;
              message?: string;
              errorCode?: string;
            }
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.message || payload?.error || `Falha HTTP ${response.status}.`,
          );
        }

        if (!payload?.success || !payload.connected) {
          const message = payload?.message || payload?.error || "Conexão não concluída.";
          if (!canceled) {
            setUiState(getGoogleDriveCallbackErrorState(message));
          }
          notifyFailure(message, payload?.errorCode);
          return;
        }

        if (!canceled) {
          setUiState(getGoogleDriveCallbackSuccessState());
        }
        notifySuccess(payload.account);
      } catch (error) {
        const message = mapGoogleDriveCallbackError(error);
        if (!canceled) {
          setUiState(getGoogleDriveCallbackErrorState(message));
        }
        notifyFailure(message, "GOOGLE_DRIVE_CALLBACK_FAILED");
      }
    })();

    return () => {
      canceled = true;
    };
  }, [callbackParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_42%),linear-gradient(180deg,#07111f_0%,#030712_100%)] px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/70 p-8 text-center shadow-[0_24px_120px_-40px_rgba(15,23,42,0.85)] backdrop-blur">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
            uiState.phase === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : uiState.phase === "error"
                ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                : "border-sky-500/20 bg-sky-500/10 text-sky-300"
          }`}
        >
          {uiState.phase === "processing" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : uiState.phase === "error" ? (
            <TriangleAlert className="h-8 w-8" />
          ) : (
            <CheckCircle2 className="h-8 w-8" />
          )}
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-white">
          {uiState.phase === "processing"
            ? "Conectando Google Drive"
            : uiState.phase === "error"
              ? "Falha na conexão"
              : "Conexão concluída"}
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          {uiState.message}
        </p>
        {uiState.error ? (
          <p className="mt-2 text-xs text-rose-200">{uiState.error}</p>
        ) : null}

        <Link
          href="/dashboard/uploads"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90"
        >
          Abrir uploads
        </Link>
      </div>
    </div>
  );
}
