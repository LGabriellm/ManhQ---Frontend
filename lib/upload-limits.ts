export const LOCAL_UPLOAD_MAX_SINGLE_FILE_BYTES = 512 * 1024 * 1024;
export const LOCAL_UPLOAD_BATCH_TARGET_BYTES = 256 * 1024 * 1024;
export const LOCAL_UPLOAD_BATCH_MAX_FILES = 6;
export const UPLOAD_STAGING_TIMEOUT_MS = 900_000;
export const LOCAL_UPLOAD_PROXY_MAX_BODY_SIZE = "768mb";

export function formatUploadSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function assertLocalUploadFilesWithinLimit(files: readonly File[]): void {
  const oversizedFile = files.find(
    (file) => file.size > LOCAL_UPLOAD_MAX_SINGLE_FILE_BYTES,
  );

  if (!oversizedFile) return;

  throw new Error(
    `Arquivo muito grande para upload local: ${oversizedFile.name} tem ${formatUploadSize(oversizedFile.size)}. Limite por arquivo: ${formatUploadSize(LOCAL_UPLOAD_MAX_SINGLE_FILE_BYTES)}.`,
  );
}

export function splitLocalUploadBatches(files: readonly File[]): File[][] {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentSize = 0;

  for (const file of files) {
    const size = file.size || 0;
    const exceedsByteLimit =
      currentBatch.length > 0 &&
      currentSize + size > LOCAL_UPLOAD_BATCH_TARGET_BYTES;
    const exceedsFileLimit = currentBatch.length >= LOCAL_UPLOAD_BATCH_MAX_FILES;

    if (exceedsByteLimit || exceedsFileLimit) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }

    currentBatch.push(file);
    currentSize += size;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
