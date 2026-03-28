"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadWorkflowKeys, useGoogleDriveAuthUrl } from "@/hooks/useUploadWorkflow";
import type { GoogleDriveCallbackMessage } from "@/types/upload-workflow";

const POPUP_NAME = "manhq-google-drive-auth";
const POPUP_FEATURES =
  "popup=yes,width=560,height=760,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes";
const POPUP_CLOSE_POLL_INTERVAL_MS = 500;

interface LaunchGoogleDriveAuthOptions {
  authUrl?: string;
  intent?: string;
  draftId?: string | null;
  returnUrl?: string;
}

function getBackendOrigin(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    return null;
  }

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

function parseCallbackMessage(data: unknown): GoogleDriveCallbackMessage | null {
  const parsed =
    typeof data === "string"
      ? (() => {
          try {
            return JSON.parse(data) as unknown;
          } catch {
            return null;
          }
        })()
      : data;

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Partial<GoogleDriveCallbackMessage>;
  if (candidate.source !== "google_drive_callback") {
    return null;
  }

  if (
    typeof candidate.success !== "boolean" ||
    typeof candidate.connected !== "boolean"
  ) {
    return null;
  }

  return candidate as GoogleDriveCallbackMessage;
}

export function useGoogleDrivePopupAuth() {
  const queryClient = useQueryClient();
  const authUrlMutation = useGoogleDriveAuthUrl();
  const popupRef = useRef<Window | null>(null);
  const popupClosePollRef = useRef<number | null>(null);
  const inflightPromiseRef = useRef<Promise<GoogleDriveCallbackMessage> | null>(null);
  const resolveRef = useRef<((message: GoogleDriveCallbackMessage) => void) | null>(null);
  const rejectRef = useRef<((reason?: unknown) => void) | null>(null);
  const expectedOriginRef = useRef<string | null>(getBackendOrigin());
  const [isConnecting, setIsConnecting] = useState(false);

  const resetPendingFlow = () => {
    if (popupClosePollRef.current != null) {
      window.clearInterval(popupClosePollRef.current);
      popupClosePollRef.current = null;
    }

    popupRef.current?.close();
    popupRef.current = null;
    inflightPromiseRef.current = null;
    resolveRef.current = null;
    rejectRef.current = null;
    setIsConnecting(false);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const expectedOrigin = expectedOriginRef.current;
      if (expectedOrigin && event.origin !== expectedOrigin) {
        return;
      }

      const message = parseCallbackMessage(event.data);
      if (!message) {
        return;
      }

      void queryClient
        .invalidateQueries({
          queryKey: uploadWorkflowKeys.googleDriveStatus(),
        })
        .finally(() => {
          resolveRef.current?.(message);
          resetPendingFlow();
        });
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      resetPendingFlow();
    };
  }, [queryClient]);

  const launchGoogleDriveAuth = async ({
    authUrl,
    intent,
    draftId,
    returnUrl,
  }: LaunchGoogleDriveAuthOptions = {}) => {
    if (inflightPromiseRef.current) {
      popupRef.current?.focus();
      return inflightPromiseRef.current;
    }

    const resolvedReturnUrl =
      returnUrl || (typeof window !== "undefined" ? window.location.href : undefined);

    const authConfig = authUrl
      ? { url: authUrl }
      : await authUrlMutation.mutateAsync({
          returnUrl: resolvedReturnUrl,
          intent,
          draftId: draftId ?? undefined,
        });

    const popup = window.open(authConfig.url, POPUP_NAME, POPUP_FEATURES);
    if (!popup) {
      throw new Error("Não foi possível abrir a janela de autenticação do Google Drive.");
    }

    popupRef.current = popup;
    popup.focus();
    setIsConnecting(true);

    const promise = new Promise<GoogleDriveCallbackMessage>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
    });

    inflightPromiseRef.current = promise;
    popupClosePollRef.current = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        rejectRef.current?.(
          new Error("A janela de autenticação foi fechada antes da conclusão."),
        );
        resetPendingFlow();
      }
    }, POPUP_CLOSE_POLL_INTERVAL_MS);

    return promise;
  };

  return {
    isConnecting: isConnecting || authUrlMutation.isPending,
    launchGoogleDriveAuth,
  };
}
