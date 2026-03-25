export type UploadDraftProcessingState =
  | "idle"
  | "processing"
  | "completed"
  | "failed";

export interface UploadDraftConfirmationCheck {
  canConfirm: boolean;
  errorMessage?: string;
}

export function resolveUploadDraftProcessingState(
  localState: UploadDraftProcessingState,
  remoteState?: UploadDraftProcessingState,
): UploadDraftProcessingState {
  return remoteState ?? localState;
}

export function validateUploadDraftConfirmation(
  state: UploadDraftProcessingState,
): UploadDraftConfirmationCheck {
  if (state === "completed") {
    return { canConfirm: true };
  }

  if (state === "processing") {
    return {
      canConfirm: false,
      errorMessage: "Aguarde a conclusão da análise antes de confirmar",
    };
  }

  if (state === "failed") {
    return {
      canConfirm: false,
      errorMessage: "A análise falhou. Revise os erros e tente novamente.",
    };
  }

  return {
    canConfirm: false,
    errorMessage: "Finalize a análise antes de confirmar o draft.",
  };
}

