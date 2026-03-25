export type GoogleDriveCallbackParams =
  | {
      type: "valid";
      code: string;
      errorMessage: null;
    }
  | {
      type: "error" | "missing-code";
      code: null;
      errorMessage: string;
    };

export type GoogleDriveCallbackPhase = "processing" | "success" | "error";

export interface GoogleDriveCallbackUiState {
  phase: GoogleDriveCallbackPhase;
  message: string;
  error: string | null;
}

export function parseGoogleDriveCallbackParams(
  params: URLSearchParams,
): GoogleDriveCallbackParams {
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");
  const authCode = params.get("code");

  if (oauthError) {
    const details = oauthErrorDescription
      ? decodeURIComponent(oauthErrorDescription)
      : oauthError;
    return {
      type: "error",
      code: null,
      errorMessage: `OAuth Google falhou: ${details}`,
    };
  }

  if (!authCode) {
    return {
      type: "missing-code",
      code: null,
      errorMessage: "Código de autorização não encontrado.",
    };
  }

  return {
    type: "valid",
    code: authCode,
    errorMessage: null,
  };
}

export function getInitialGoogleDriveCallbackUiState(
  params: GoogleDriveCallbackParams,
): GoogleDriveCallbackUiState {
  if (params.type === "valid") {
    return {
      phase: "processing",
      message: "Conectando sua conta Google...",
      error: null,
    };
  }

  return {
    phase: "error",
    message: "Falha na conexão com Google Drive.",
    error: params.errorMessage,
  };
}

export function getGoogleDriveCallbackSuccessState(): GoogleDriveCallbackUiState {
  return {
    phase: "success",
    message: "Google Drive conectado com sucesso!",
    error: null,
  };
}

export function getGoogleDriveCallbackErrorState(
  errorMessage: string,
): GoogleDriveCallbackUiState {
  return {
    phase: "error",
    message: "Falha na conexão com Google Drive.",
    error: errorMessage,
  };
}

export function mapGoogleDriveCallbackError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isTimeout = error instanceof Error && error.message.includes("timeout");

  if (isTimeout) {
    return "Timeout ao conectar com Google Drive. Tente novamente.";
  }

  return `Falha na autenticação: ${errorMessage}`;
}

