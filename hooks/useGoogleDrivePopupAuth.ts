"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadWorkflowKeys, useGoogleDriveAuthUrl } from "@/hooks/useUploadWorkflow";
import { uploadWorkflowService } from "@/services/upload-workflow.service";
import type { GoogleDriveCallbackMessage } from "@/types/upload-workflow";

const POPUP_NAME = "manhq-google-drive-auth";
const POPUP_FEATURES =
  "popup=yes,width=560,height=760,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes";
const POPUP_CLOSE_POLL_INTERVAL_MS = 500;
const POPUP_CLOSE_GRACE_MS = 500;
const POPUP_CLOSE_STATUS_RETRY_INTERVAL_MS = 700;
const POPUP_CLOSE_STATUS_MAX_ATTEMPTS = 6;

interface LaunchGoogleDriveAuthOptions {
  authUrl?: string;
  intent?: string;
  draftId?: string | null;
  returnUrl?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function getCurrentOrigin(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.origin;
}

function getOriginFromUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, getCurrentOrigin() ?? undefined).origin;
  } catch {
    return null;
  }
}

function buildAllowedOrigins(
  authUrl: string | undefined,
  returnUrl: string | undefined,
): Set<string> {
  const origins = new Set<string>();
  const candidates = [
    getBackendOrigin(),
    getCurrentOrigin(),
    getOriginFromUrl(authUrl),
    getOriginFromUrl(returnUrl),
  ];

  for (const origin of candidates) {
    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
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
  const allowedOriginsRef = useRef<Set<string>>(new Set());
  const closeVerificationRef = useRef(false);
  const settledRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const resetPendingFlow = useCallback(() => {
    if (popupClosePollRef.current != null) {
      window.clearInterval(popupClosePollRef.current);
      popupClosePollRef.current = null;
    }

    popupRef.current?.close();
    popupRef.current = null;
    inflightPromiseRef.current = null;
    resolveRef.current = null;
    rejectRef.current = null;
    settledRef.current = false;
    closeVerificationRef.current = false;
    allowedOriginsRef.current = new Set();
    setIsConnecting(false);
  }, []);

  const resolveFlow = useCallback(
    (message: GoogleDriveCallbackMessage) => {
      if (settledRef.current) {
        return;
      }

      settledRef.current = true;
      resolveRef.current?.(message);
      resetPendingFlow();
    },
    [resetPendingFlow],
  );

  const rejectFlow = useCallback(
    (reason: unknown) => {
      if (settledRef.current) {
        return;
      }

      settledRef.current = true;
      rejectRef.current?.(reason);
      resetPendingFlow();
    },
    [resetPendingFlow],
  );

  const verifyStatusAfterPopupClosed = useCallback(async () => {
    if (settledRef.current) {
      return;
    }
    if (closeVerificationRef.current) {
      return;
    }
    closeVerificationRef.current = true;

    try {
      await sleep(POPUP_CLOSE_GRACE_MS);
      if (settledRef.current || !inflightPromiseRef.current) {
        return;
      }

      for (let attempt = 0; attempt < POPUP_CLOSE_STATUS_MAX_ATTEMPTS; attempt += 1) {
        if (settledRef.current || !inflightPromiseRef.current) {
          return;
        }

        try {
          const status = await queryClient.fetchQuery({
            queryKey: uploadWorkflowKeys.googleDriveStatus(),
            queryFn: () => uploadWorkflowService.getGoogleDriveStatus(),
            staleTime: 0,
          });

          if (status.connected) {
            resolveFlow({
              source: "google_drive_callback",
              success: true,
              connected: true,
              account: status.account,
              nextAction: "REFRESH_GOOGLE_DRIVE_STATUS",
            });
            return;
          }
        } catch {
          // Network/transient failure during popup close verification; keep retrying briefly.
        }

        if (attempt < POPUP_CLOSE_STATUS_MAX_ATTEMPTS - 1) {
          await sleep(POPUP_CLOSE_STATUS_RETRY_INTERVAL_MS);
        }
      }

      rejectFlow(new Error("A janela de autenticação foi fechada antes da conclusão."));
    } finally {
      closeVerificationRef.current = false;
    }
  }, [queryClient, rejectFlow, resolveFlow]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!inflightPromiseRef.current) {
        return;
      }

      const allowedOrigins = allowedOriginsRef.current;
      if (allowedOrigins.size > 0 && !allowedOrigins.has(event.origin)) {
        return;
      }

      if (popupRef.current && event.source && event.source !== popupRef.current) {
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
          resolveFlow(message);
        });
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      resetPendingFlow();
    };
  }, [queryClient, resetPendingFlow, resolveFlow]);

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
      ? { url: authUrl, callbackMode: "popup" as const }
      : await authUrlMutation.mutateAsync({
          returnUrl: resolvedReturnUrl,
          intent,
          draftId: draftId ?? undefined,
          mode: "popup",
        });

    allowedOriginsRef.current = buildAllowedOrigins(authConfig.url, resolvedReturnUrl);
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
        if (popupClosePollRef.current != null) {
          window.clearInterval(popupClosePollRef.current);
          popupClosePollRef.current = null;
        }
        void verifyStatusAfterPopupClosed();
      }
    }, POPUP_CLOSE_POLL_INTERVAL_MS);

    return promise;
  };

  return {
    isConnecting: isConnecting || authUrlMutation.isPending,
    launchGoogleDriveAuth,
  };
}
