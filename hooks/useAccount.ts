import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountService } from "@/services/account.service";
import { getStoredUser, setStoredUser } from "@/services/api";
import type {
  AccountResponse,
  AvatarRemoveResponse,
  AvatarUploadResponse,
  ChangeEmailRequest,
  ChangePasswordRequest,
  UpdatePreferencesResponse,
  UpdatePreferencesRequest,
  UpdateProfileResponse,
  UpdateProfileRequest,
  User,
  UserPreferences,
} from "@/types/api";

// ===== QUERY KEYS =====
export const accountKeys = {
  all: ["account"] as const,
  profile: () => [...accountKeys.all, "profile"] as const,
  preferences: () => [...accountKeys.all, "preferences"] as const,
};

function updateStoredAuthUser(
  updater: (current: User) => User,
): void {
  const currentUser = getStoredUser() as User | null;
  if (!currentUser) {
    return;
  }

  setStoredUser(updater(currentUser));
}

// ===== HOOKS DE LEITURA =====

export function useAccount() {
  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: () => accountService.getAccount(),
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: accountKeys.preferences(),
    queryFn: () => accountService.getPreferences(),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// ===== HOOKS DE ESCRITA =====

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      accountService.updateProfile(data),
    onSuccess: (response: UpdateProfileResponse) => {
      updateStoredAuthUser((current) => ({
        ...current,
        name: response.profile.name ?? current.name,
        username: response.profile.username ?? current.username,
        email: response.profile.email ?? current.email,
        role: response.profile.role ?? current.role,
        subStatus: response.profile.subStatus ?? current.subStatus,
        subExpiresAt: response.profile.subExpiresAt ?? current.subExpiresAt,
        maxDevices: response.profile.maxDevices ?? current.maxDevices,
        createdAt: response.profile.createdAt ?? current.createdAt,
      }));
      queryClient.setQueryData<AccountResponse | undefined>(
        accountKeys.profile(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            account: response.profile,
          };
        },
      );
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferencesRequest) =>
      accountService.updatePreferences(data),
    onSuccess: (response: UpdatePreferencesResponse) => {
      queryClient.setQueryData<UserPreferences | undefined>(
        accountKeys.preferences(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            ...response.preferences,
          };
        },
      );
      queryClient.setQueryData<AccountResponse | undefined>(
        accountKeys.profile(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            preferences: {
              ...current.preferences,
              ...response.preferences,
            },
          };
        },
      );
    },
  });
}

export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChangeEmailRequest) => accountService.changeEmail(data),
    onSuccess: (response) => {
      updateStoredAuthUser((current) => ({
        ...current,
        name: response.account.name ?? current.name,
        username: response.account.username ?? current.username,
        email: response.account.email ?? current.email,
      }));
      queryClient.setQueryData<AccountResponse | undefined>(
        accountKeys.profile(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            account: {
              ...current.account,
              ...response.account,
            },
          };
        },
      );
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      accountService.changePassword(data),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => accountService.uploadAvatar(file),
    onSuccess: (response: AvatarUploadResponse) => {
      queryClient.setQueryData<AccountResponse | undefined>(
        accountKeys.profile(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            account: {
              ...current.account,
              avatarUrl: response.profile.avatarUrl,
            },
          };
        },
      );
    },
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountService.removeAvatar(),
    onSuccess: (response: AvatarRemoveResponse) => {
      queryClient.setQueryData<AccountResponse | undefined>(
        accountKeys.profile(),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            account: {
              ...current.account,
              avatarUrl: response.profile.avatarUrl ?? null,
            },
          };
        },
      );
    },
  });
}
