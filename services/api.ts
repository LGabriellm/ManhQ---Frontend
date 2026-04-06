import axios, {
  AxiosError,
  AxiosHeaderValue,
  AxiosHeaders,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import type { User } from "@/types/api";

// Proxy via Next.js Route Handler (mesmo domínio, sem CORS)
const API_BASE_URL = "/api";
const API_TIMEOUT_MS = 30_000;
const MAX_IDEMPOTENT_RETRIES = 1;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const RETRYABLE_METHODS = new Set(["get", "head"]);
const STORED_USER_KEY = "user";
export const STORED_USER_EVENT = "manhq:stored-user";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

function supportsAbortListeners(
  signal: RetriableRequestConfig["signal"],
): signal is AbortSignal {
  return Boolean(
    signal &&
    typeof signal.addEventListener === "function" &&
    typeof signal.removeEventListener === "function",
  );
}

// Criar instância do axios
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getHeaderValue(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isUrlSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams;
}

function isJsonLikeContentType(contentType?: string): boolean {
  if (!contentType) return false;
  return (
    contentType.includes("application/json") ||
    contentType.includes("+json") ||
    contentType.includes("application/problem+json")
  );
}

function isHtmlLikePayload(payload: string): boolean {
  const normalized = payload.trim().toLowerCase();
  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html");
}

function getTextPreview(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, 160);
}

function extractMessageFromPayload(
  payload: Record<string, unknown> | string | null,
  contentType?: string,
): string | undefined {
  if (!payload) return undefined;

  if (typeof payload === "string") {
    if (isHtmlLikePayload(payload) || contentType?.includes("text/html")) {
      if (
        payload.toLowerCase().includes("cloudflare") ||
        payload.toLowerCase().includes("__cf_chl")
      ) {
        return "A API retornou uma página do Cloudflare em vez de JSON. Revise o proxy do domínio e desative challenge/WAF nas rotas da API.";
      }

      return "A API retornou HTML em vez de JSON. Isso costuma indicar sessão inválida, rota errada ou uma página intermediária do proxy.";
    }

    const preview = getTextPreview(payload);
    return preview || "Resposta inesperada da API.";
  }

  return (
    (payload.message as string | undefined) ||
    (payload.error as string | undefined)
  );
}

async function parseResponsePayload(
  payload: unknown,
): Promise<Record<string, unknown> | string | null> {
  if (isBlob(payload)) {
    const text = await payload.text();
    if (!text) return null;

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return text;
    }
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return payload;
    }
  }

  if (payload && typeof payload === "object") {
    return payload as Record<string, unknown>;
  }

  return null;
}

function normalizeHeaders(
  headers: AxiosHeaders | Record<string, unknown> | undefined,
): AxiosHeaders {
  if (headers instanceof AxiosHeaders) {
    return headers;
  }

  if (!headers) {
    return new AxiosHeaders();
  }

  const normalizedEntries = Object.entries(headers).filter(
    (
      entry,
    ): entry is [string, AxiosHeaderValue] => {
      const value = entry[1];
      if (value === null) return true;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every((item) => typeof item === "string");
      }
      return false;
    },
  );

  return new AxiosHeaders(Object.fromEntries(normalizedEntries));
}

function getRetryAfterSeconds(
  value: unknown,
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value <= 60_000 ? value : Math.ceil(value / 1000);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsedSeconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
    return parsedSeconds;
  }

  const retryAt = Date.parse(trimmed);
  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  const deltaMs = retryAt - Date.now();
  if (deltaMs <= 0) {
    return undefined;
  }

  return Math.max(1, Math.ceil(deltaMs / 1000));
}

function shouldRetryRequest(error: AxiosError): boolean {
  const config = error.config as RetriableRequestConfig | undefined;
  if (!config?.method || !RETRYABLE_METHODS.has(config.method.toLowerCase())) {
    return false;
  }

  if ((config.__retryCount ?? 0) >= MAX_IDEMPOTENT_RETRIES) {
    return false;
  }

  if (config.signal?.aborted) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(error.response.status);
}

async function retryRequest(error: AxiosError): Promise<unknown> {
  const config = error.config as RetriableRequestConfig | undefined;
  if (!config) {
    return Promise.reject(error);
  }

  config.__retryCount = (config.__retryCount ?? 0) + 1;
  const retryAfterSeconds =
    getRetryAfterSeconds(error.response?.headers?.["retry-after"]) ?? 0;
  const delayMs =
    retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 250 * config.__retryCount;

  await new Promise<void>((resolve, reject) => {
    const abortSignal = config.signal;
    const canListenToAbort = supportsAbortListeners(abortSignal);
    const timeoutId = setTimeout(() => {
      if (canListenToAbort) {
        abortSignal.removeEventListener("abort", onAbort);
      }
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timeoutId);
      if (canListenToAbort) {
        abortSignal.removeEventListener("abort", onAbort);
      }
      reject(error);
    };

    if (abortSignal?.aborted) {
      onAbort();
      return;
    }

    if (canListenToAbort) {
      abortSignal.addEventListener("abort", onAbort, { once: true });
    }
  });

  return api.request(config);
}

api.interceptors.request.use((config) => {
  const headers = normalizeHeaders(config.headers);
  const hasBody = config.data !== undefined && config.data !== null;

  if (isFormData(config.data)) {
    // Let the browser/axios set the multipart boundary automatically.
    headers.delete("Content-Type");
  } else if (isUrlSearchParams(config.data)) {
    headers.set(
      "Content-Type",
      "application/x-www-form-urlencoded;charset=UTF-8",
    );
  } else if (!hasBody || config.method?.toLowerCase() === "get") {
    headers.delete("Content-Type");
  }

  config.headers = headers;
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  async (response) => {
    const contentType = getHeaderValue(
      response.headers as Record<string, unknown>,
      "content-type",
    );

    if (
      response.config.responseType === "blob" &&
      isBlob(response.data) &&
      (isJsonLikeContentType(contentType) || contentType?.includes("text/"))
    ) {
      const parsedPayload = await parseResponsePayload(response.data);
      return Promise.reject({
        message:
          extractMessageFromPayload(parsedPayload, contentType) ||
          "A API retornou um payload textual em vez do arquivo esperado.",
        statusCode: response.status,
        error:
          parsedPayload && typeof parsedPayload === "object"
            ? ((parsedPayload.error as string | undefined) ??
              (parsedPayload.message as string | undefined))
            : undefined,
        details:
          parsedPayload && typeof parsedPayload === "string"
            ? [getTextPreview(parsedPayload)].filter(Boolean)
            : undefined,
        contentType,
        isUnexpectedPayload: true,
      });
    }

    return response;
  },
  async (error: AxiosError<Record<string, unknown>>) => {
    if (shouldRetryRequest(error)) {
      return retryRequest(error);
    }

    // Erro de rede (sem conexão ou servidor inacessível)
    if (!error.response) {
      const isBrowser = typeof navigator !== "undefined";
      const apiError = {
        message: isBrowser && navigator.onLine
          ? "Não foi possível conectar ao servidor. Tente novamente mais tarde."
          : "Sem conexão com a internet. Verifique sua rede.",
        statusCode: 0,
        isNetworkError: true,
      };
      return Promise.reject(apiError);
    }

    const responseHeaders = error.response.headers as Record<string, unknown>;
    const contentType = getHeaderValue(responseHeaders, "content-type");
    const parsedPayload = await parseResponsePayload(error.response.data);
    const requestUrl = error.config?.url || "";
    const isAuthRoute =
      requestUrl.includes("/login") ||
      requestUrl.includes("/register") ||
      requestUrl.includes("/activate") ||
      requestUrl.includes("/forgot-password") ||
      requestUrl.includes("/reset-password");
    const isMeRoute = requestUrl.includes("/me");

    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    const isPublicPath =
      currentPath === "/" ||
      currentPath.startsWith("/auth/") ||
      currentPath.startsWith("/termos-de-servico") ||
      currentPath.startsWith("/politica-de-privacidade");

    // Se receber 401 e NÃO for uma rota de autenticação, limpar token e redirecionar
    if (
      error.response.status === 401 &&
      !isAuthRoute &&
      !isMeRoute &&
      !isPublicPath
    ) {
      clearStoredToken();
      clearStoredUser();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }

    // Formatar erro - suporta tanto o formato antigo quanto o novo
    const responseData =
      parsedPayload && typeof parsedPayload === "object" ? parsedPayload : {};
    const fallbackMessage = extractMessageFromPayload(parsedPayload, contentType);
    const requestId =
      (responseData.requestId as string | undefined) ||
      getHeaderValue(responseHeaders, "x-request-id");
    const endpoint = requestUrl || undefined;
    const method = error.config?.method?.toUpperCase();
    const retryAfter =
      (responseData.retryAfter as number | undefined) ??
      getRetryAfterSeconds(getHeaderValue(responseHeaders, "retry-after"));
    const apiError = {
      message:
        (responseData.message as string) ||
        (responseData.error as string) ||
        fallbackMessage ||
        "Erro desconhecido",
      errors: responseData.errors as Record<string, string[]> | undefined,
      statusCode: error.response.status || 500,
      error: responseData.error as string | undefined,
      details: responseData.details as string[] | undefined,
      retryAfter,
      data: responseData,
      authRequired: responseData.authRequired as boolean | undefined,
      errorCode:
        (responseData.errorCode as string | undefined) ||
        getHeaderValue(responseHeaders, "x-error-code"),
      googleDrive: responseData.googleDrive as Record<string, unknown> | undefined,
      requestId,
      endpoint,
      method,
      contentType,
      isUnexpectedPayload:
        typeof parsedPayload === "string" &&
        (contentType?.includes("text/html") || isHtmlLikePayload(parsedPayload)),
    };

    if (typeof window !== "undefined") {
      console.error("[API_ERROR]", {
        endpoint,
        method,
        status: apiError.statusCode,
        requestId,
        errorCode: apiError.errorCode,
        message: apiError.message,
      });
    }

    return Promise.reject(apiError);
  },
);

// Funções auxiliares para gerenciar token
export function getStoredToken(): string | null {
  return null;
}

export function setStoredToken(_token: string): void {
  void _token;
  // No-op: autenticação baseada em cookie de sessão (httpOnly)
}

export function clearStoredToken(): void {
  // No-op: autenticação baseada em cookie de sessão (httpOnly)
}

function isValidUserShape(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === "string" && typeof obj.email === "string";
}

// Funções auxiliares para gerenciar usuário
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(STORED_USER_KEY);
  if (!userStr) return null;
  try {
    const parsed: unknown = JSON.parse(userStr);
    if (!isValidUserShape(parsed)) {
      localStorage.removeItem(STORED_USER_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORED_USER_KEY);
    return null;
  }
}

function dispatchStoredUserEvent(user: User | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<User | null>(STORED_USER_EVENT, {
      detail: user,
    }),
  );
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORED_USER_KEY, JSON.stringify(user));
  dispatchStoredUserEvent(user);
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORED_USER_KEY);
  dispatchStoredUserEvent(null);
}

export default api;
