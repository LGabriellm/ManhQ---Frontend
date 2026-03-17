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

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
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
    const responseData = error.response.data || {};
    const apiError = {
      message:
        (responseData.message as string) ||
        (responseData.error as string) ||
        "Erro desconhecido",
      errors: responseData.errors as Record<string, string[]> | undefined,
      statusCode: error.response.status || 500,
      error: responseData.error as string | undefined,
      details: responseData.details as string[] | undefined,
      retryAfter: responseData.retryAfter as number | undefined,
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
