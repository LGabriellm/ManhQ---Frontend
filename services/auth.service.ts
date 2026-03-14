import api from "./api";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RegisterResponse,
  User,
  Session,
  ValidateTokenResponse,
  ActivateAccountRequest,
  ActivateAccountResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
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
    const response = await api.get<
      Session[] | { sessions?: Session[]; data?: Session[] }
    >("/sessions");

    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.sessions)) return payload.sessions;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  },

  // Revogar sessão específica
  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
  },

  // Validar token de ativação
  async validateActivationToken(token: string): Promise<ValidateTokenResponse> {
    const response = await api.get<ValidateTokenResponse>(
      `/activate/validate/${token}`,
    );
    return response.data;
  },

  // Ativar conta (definir senha)
  async activateAccount(
    data: ActivateAccountRequest,
  ): Promise<ActivateAccountResponse> {
    const response = await api.post<ActivateAccountResponse>("/activate", data);
    return response.data;
  },

  // Solicitar recuperação de senha
  async forgotPassword(
    data: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    const response = await api.post<ForgotPasswordResponse>(
      "/forgot-password",
      data,
    );
    return response.data;
  },

  // Redefinir senha com token
  async resetPassword(
    data: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const response = await api.post<ResetPasswordResponse>(
      "/reset-password",
      data,
    );
    return response.data;
  },
};
