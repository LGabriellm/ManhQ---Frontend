import axios, { AxiosError, AxiosInstance } from "axios";
import type { User } from "@/types/api";

// Proxy via Next.js Route Handler (mesmo domínio, sem CORS)
const API_BASE_URL = "/api";

// Criar instância do axios
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
    // Erro de rede (sem conexão ou servidor inacessível)
    if (!error.response) {
      const apiError = {
        message: navigator.onLine
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
      retryAfter: responseData.retryAfter as number | undefined,
      contentType,
      isUnexpectedPayload:
        typeof parsedPayload === "string" &&
        (contentType?.includes("text/html") || isHtmlLikePayload(parsedPayload)),
    };

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

// Funções auxiliares para gerenciar usuário
export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user");
}

export default api;
