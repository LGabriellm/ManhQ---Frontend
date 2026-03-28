import type { GoogleDriveAuthUrlResponse } from "@/types/upload-workflow";

type UploadApiErrorLike = {
  message?: string;
  statusCode?: number;
  errorCode?: string;
  authRequired?: boolean;
  googleDrive?: Partial<GoogleDriveAuthUrlResponse> & {
    authUrl?: string;
  };
  data?: {
    authRequired?: boolean;
    errorCode?: string;
    googleDrive?: Partial<GoogleDriveAuthUrlResponse> & {
      authUrl?: string;
    };
  };
};

export interface GoogleDriveReconnectRequirement {
  authUrl: string;
  callbackMode?: string | null;
  returnUrl?: string | null;
  intent?: string | null;
  draftId?: string | null;
}

function asUploadApiError(error: unknown): UploadApiErrorLike {
  return (error as UploadApiErrorLike | undefined) ?? {};
}

export function getUploadErrorStatus(error: unknown): number | undefined {
  return asUploadApiError(error).statusCode;
}

export function isUploadConflictError(error: unknown): boolean {
  return getUploadErrorStatus(error) === 409;
}

export function isUploadMissingError(error: unknown): boolean {
  return getUploadErrorStatus(error) === 404;
}

export function getGoogleDriveReconnectRequirement(
  error: unknown,
): GoogleDriveReconnectRequirement | null {
  const parsed = asUploadApiError(error);
  const googleDrive = parsed.googleDrive ?? parsed.data?.googleDrive;
  const errorCode = parsed.errorCode ?? parsed.data?.errorCode;
  const authRequired = parsed.authRequired ?? parsed.data?.authRequired;
  const authUrl = googleDrive?.authUrl ?? googleDrive?.url;

  if (
    parsed.statusCode !== 428 ||
    !authRequired ||
    errorCode !== "GOOGLE_DRIVE_AUTH_REQUIRED" ||
    !authUrl
  ) {
    return null;
  }

  return {
    authUrl,
    callbackMode: googleDrive?.callbackMode ?? null,
    returnUrl: googleDrive?.returnUrl ?? null,
    intent: googleDrive?.intent ?? null,
    draftId: googleDrive?.draftId ?? null,
  };
}

export function getUploadErrorMessage(error: unknown, fallback: string): string {
  const parsed = asUploadApiError(error);

  if (parsed.statusCode === 413) {
    return "Arquivo muito grande. Reduza o tamanho e tente novamente.";
  }
  if (parsed.statusCode === 428) {
    const reconnect = getGoogleDriveReconnectRequirement(error);
    if (reconnect) {
      return "A conexão com Google Drive expirou. Reconecte a conta para continuar.";
    }

    return parsed.message || "Pré-condição não atendida. Revise o fluxo e tente novamente.";
  }
  if (parsed.statusCode === 504) {
    return "Tempo limite excedido. Tente novamente em instantes.";
  }
  if (parsed.statusCode === 404) {
    return "Draft não encontrado ou expirado. Refaça o stage.";
  }
  if (parsed.statusCode === 409) {
    return parsed.message || "Conflito de processamento. Atualize o draft.";
  }

  return parsed.message || fallback;
}
