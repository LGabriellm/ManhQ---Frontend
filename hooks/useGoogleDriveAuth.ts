"use client";

/* ─────────────────────────────────────────────────────────────────────────────
 * Google Drive — OAuth Popup Hook
 *
 * Opens a popup for Google Drive authentication and listens for result.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadKeys } from "@/hooks/useUpload";
import * as svc from "@/services/upload.service";
import type { GoogleDriveCallbackMessage } from "@/types/upload";

const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 700;

export function useGoogleDriveAuth() {
  const qc = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const launch = useCallback(
    async (intent?: string) => {
      if (isConnecting) return;
      setIsConnecting(true);

      try {
        const { url } = await svc.fetchGoogleDriveAuthUrl({
          intent,
          returnUrl: window.location.href,
        });

        const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
        const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;

        const popup = window.open(
          url,
          "google_drive_auth",
          `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},popup=true`,
        );

        if (!popup) {
          setIsConnecting(false);
          return;
        }

        popupRef.current = popup;

        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          const data = event.data as GoogleDriveCallbackMessage | undefined;
          if (data?.source !== "google_drive_callback") return;

          window.removeEventListener("message", handleMessage);
          setIsConnecting(false);

          if (data.success) {
            qc.invalidateQueries({ queryKey: uploadKeys.gdriveStatus() });
          }
        };

        window.addEventListener("message", handleMessage);

        // Safety: clean up if popup closes without reporting
        const pollClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollClosed);
            window.removeEventListener("message", handleMessage);
            setIsConnecting(false);
          }
        }, 500);
      } catch {
        setIsConnecting(false);
      }
    },
    [isConnecting, qc],
  );

  return { isConnecting, launch };
}
