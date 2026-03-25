import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveUploadDraftProcessingState,
  validateUploadDraftConfirmation,
} from "../lib/uploadDraftFlow.ts";

test("resolveUploadDraftProcessingState keeps local state when remote is missing", () => {
  const state = resolveUploadDraftProcessingState("processing");
  assert.equal(state, "processing");
});

test("resolveUploadDraftProcessingState prioritizes remote state", () => {
  const state = resolveUploadDraftProcessingState("processing", "completed");
  assert.equal(state, "completed");
});

test("validateUploadDraftConfirmation allows confirm only in completed state", () => {
  const completed = validateUploadDraftConfirmation("completed");
  const processing = validateUploadDraftConfirmation("processing");
  const failed = validateUploadDraftConfirmation("failed");
  const idle = validateUploadDraftConfirmation("idle");

  assert.equal(completed.canConfirm, true);
  assert.equal(processing.canConfirm, false);
  assert.equal(processing.errorMessage, "Aguarde a conclusão da análise antes de confirmar");
  assert.equal(failed.canConfirm, false);
  assert.equal(failed.errorMessage, "A análise falhou. Revise os erros e tente novamente.");
  assert.equal(idle.canConfirm, false);
  assert.equal(idle.errorMessage, "Finalize a análise antes de confirmar o draft.");
});

