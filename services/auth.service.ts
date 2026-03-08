import api from "./api";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RegisterResponse,
  User,
  Session,
} from "@/types/api";

export const authService = {
  // Registrar novo usuário
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>("/register", data);
    return response.data;
  },

  // Login
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/login", data);
    return response.data;
  },

  // Obter dados do usuário logado
  async me(): Promise<User> {
    const response = await api.get<User>("/me");
    return response.data;
  },

  // Logout da sessão atual
  async logout(): Promise<void> {
    await api.post("/logout");
  },

  // Invalidar todas as sessões
  async logoutAll(): Promise<void> {
    await api.post("/logout-all");
  },

  // Listar sessões ativas
  async getSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>("/sessions");
    return response.data;
  },

  // Revogar sessão específica
  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
  },
};
