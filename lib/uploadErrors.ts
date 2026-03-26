export function getUploadErrorMessage(error: unknown, fallback: string): string {
  const parsed = error as
    | {
        message?: string;
        statusCode?: number;
      }
    | undefined;

  if (parsed?.statusCode === 413) {
    return "Arquivo muito grande. Reduza o tamanho e tente novamente.";
  }
  if (parsed?.statusCode === 504) {
    return "Tempo limite excedido. Tente novamente em instantes.";
  }
  if (parsed?.statusCode === 404) {
    return "Draft não encontrado ou expirado. Refaça o stage.";
  }
  if (parsed?.statusCode === 409) {
    return parsed.message || "Conflito de processamento. Atualize o draft.";
  }

  return parsed?.message || fallback;
}

