import assert from "node:assert/strict";
import test from "node:test";
import {
  getGoogleDriveCallbackErrorState,
  getGoogleDriveCallbackSuccessState,
  getInitialGoogleDriveCallbackUiState,
  mapGoogleDriveCallbackError,
  parseGoogleDriveCallbackParams,
} from "../lib/googleDriveCallbackFlow.ts";

test("parseGoogleDriveCallbackParams returns valid payload when code exists", () => {
  const params = new URLSearchParams("code=abc123");
  const result = parseGoogleDriveCallbackParams(params);

  assert.equal(result.type, "valid");
  assert.equal(result.code, "abc123");
});

test("parseGoogleDriveCallbackParams returns oauth error payload when provider sends error", () => {
  const params = new URLSearchParams(
    "error=access_denied&error_description=Not%20allowed",
  );
  const result = parseGoogleDriveCallbackParams(params);

  assert.equal(result.type, "error");
  assert.equal(result.errorMessage, "OAuth Google falhou: Not allowed");
});

test("parseGoogleDriveCallbackParams returns missing-code payload when code is absent", () => {
  const result = parseGoogleDriveCallbackParams(new URLSearchParams(""));

  assert.equal(result.type, "missing-code");
  assert.equal(result.errorMessage, "Código de autorização não encontrado.");
});

test("initial callback UI state is processing for valid params and error for invalid params", () => {
  const valid = getInitialGoogleDriveCallbackUiState({
    type: "valid",
    code: "abc123",
    errorMessage: null,
  });
  const invalid = getInitialGoogleDriveCallbackUiState({
    type: "missing-code",
    code: null,
    errorMessage: "Código de autorização não encontrado.",
  });

  assert.equal(valid.phase, "processing");
  assert.equal(valid.error, null);
  assert.equal(invalid.phase, "error");
  assert.equal(invalid.message, "Falha na conexão com Google Drive.");
});

test("callback success and error state helpers produce deterministic transitions", () => {
  const success = getGoogleDriveCallbackSuccessState();
  const error = getGoogleDriveCallbackErrorState("Falha customizada");

  assert.deepEqual(success, {
    phase: "success",
    message: "Google Drive conectado com sucesso!",
    error: null,
  });
  assert.deepEqual(error, {
    phase: "error",
    message: "Falha na conexão com Google Drive.",
    error: "Falha customizada",
  });
});

test("mapGoogleDriveCallbackError maps timeout and generic errors", () => {
  const timeoutError = new Error("request timeout");
  const genericError = new Error("forbidden");

  assert.equal(
    mapGoogleDriveCallbackError(timeoutError),
    "Timeout ao conectar com Google Drive. Tente novamente.",
  );
  assert.equal(
    mapGoogleDriveCallbackError(genericError),
    "Falha na autenticação: forbidden",
  );
});

