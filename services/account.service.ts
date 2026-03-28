import api from "./api";
import type {
  Account,
  AccountResponse,
  AvatarRemoveResponse,
  AvatarUploadResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserPreferences,
  UsernameCheckResponse,
} from "@/types/api";

export const accountService = {
  // Obter dados completos da conta + preferências
  async getAccount(): Promise<AccountResponse> {
    const response = await api.get<AccountResponse>("/account");
    return response.data;
  },

  // Obter somente preferências
  async getPreferences(): Promise<UserPreferences> {
    const response = await api.get<UserPreferences>("/account/preferences");
    return response.data;
  },

  // Verificar disponibilidade de username
  async checkUsername(username: string): Promise<UsernameCheckResponse> {
    const response = await api.get<UsernameCheckResponse>(
      "/account/username/check",
      { params: { username } },
    );
    return response.data;
  },

  // Atualizar perfil (nome, username, bio, website, localização)
  async updateProfile(
    data: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    const response = await api.patch<UpdateProfileResponse>(
      "/account/profile",
      data,
    );
    return response.data;
  },

  // Atualizar preferências
  async updatePreferences(
    data: UpdatePreferencesRequest,
  ): Promise<UpdatePreferencesResponse> {
    const response = await api.patch<UpdatePreferencesResponse>(
      "/account/preferences",
      data,
    );
    return response.data;
  },

  // Trocar email (exige senha atual)
  async changeEmail(
    data: ChangeEmailRequest,
  ): Promise<{ account: Pick<Account, "id" | "name" | "email" | "username"> }> {
    const response = await api.patch<{
      account: Pick<Account, "id" | "name" | "email" | "username">;
    }>("/account/security/email", data);
    return response.data;
  },

  // Trocar senha (exige senha atual)
  async changePassword(
    data: ChangePasswordRequest,
  ): Promise<{ success: boolean }> {
    const response = await api.patch<{ success: boolean }>(
      "/account/security/password",
      data,
    );
    return response.data;
  },

  // Upload de avatar
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await api.post<AvatarUploadResponse>(
      "/account/avatar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  // Remover avatar
  async removeAvatar(): Promise<AvatarRemoveResponse> {
    const response = await api.delete<AvatarRemoveResponse>("/account/avatar");
    return response.data;
  },

  getAvatarUrl(userId: string): string {
    return `/api/account/avatar/${userId}`;
  },
};
