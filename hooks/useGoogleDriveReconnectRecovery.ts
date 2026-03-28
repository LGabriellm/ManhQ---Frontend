"use client";

import {
  getGoogleDriveReconnectRequirement,
  getUploadErrorMessage,
} from "@/lib/uploadErrors";
import { useGoogleDrivePopupAuth } from "@/hooks/useGoogleDrivePopupAuth";

interface RecoverGoogleDriveReconnectOptions {
  error: unknown;
  draftId?: string | null;
  intent?: string;
  onConnected?: () => Promise<void> | void;
  retry?: () => Promise<void>;
}

export function useGoogleDriveReconnectRecovery() {
  const { isConnecting, launchGoogleDriveAuth } = useGoogleDrivePopupAuth();

  const recoverGoogleDriveReconnect = async ({
    error,
    draftId,
    intent,
    onConnected,
    retry,
  }: RecoverGoogleDriveReconnectOptions) => {
    const requirement = getGoogleDriveReconnectRequirement(error);
    if (!requirement) {
      return false;
    }

    const message = await launchGoogleDriveAuth({
      authUrl: requirement.authUrl,
      intent: requirement.intent ?? intent,
      draftId: requirement.draftId ?? draftId ?? undefined,
      returnUrl: requirement.returnUrl ?? undefined,
    });

    if (!message.success || !message.connected) {
      throw new Error(
        message.error ||
          getUploadErrorMessage(
            error,
            "A reconexão com Google Drive não foi concluída.",
          ),
      );
    }

    await onConnected?.();
    if (retry) {
      await retry();
    }

    return true;
  };

  return {
    isReconnectingGoogleDrive: isConnecting,
    recoverGoogleDriveReconnect,
  };
}
