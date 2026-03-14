import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountService } from "@/services/account.service";
import type {
  ChangeEmailRequest,
  ChangePasswordRequest,
  UpdatePreferencesRequest,
  UpdateProfileRequest,
} from "@/types/api";

// ===== QUERY KEYS =====
export const accountKeys = {
  all: ["account"] as const,
  profile: () => [...accountKeys.all, "profile"] as const,
  preferences: () => [...accountKeys.all, "preferences"] as const,
};

// ===== HOOKS DE LEITURA =====

export function useAccount() {
  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: () => accountService.getAccount(),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: accountKeys.preferences(),
    queryFn: () => accountService.getPreferences(),
    staleTime: 1000 * 60 * 5,
  });
}

// ===== HOOKS DE ESCRITA =====

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      accountService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.profile() });
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferencesRequest) =>
      accountService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.preferences() });
    },
  });
}

export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChangeEmailRequest) => accountService.changeEmail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.profile() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.profile() });
    },
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountService.removeAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.profile() });
    },
  });
}
