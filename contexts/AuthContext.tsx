"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDefaultAuthenticatedPath,
  hasSubscriptionAccess,
} from "@/lib/subscription";
import { getStoredUser, setStoredUser, clearStoredUser } from "@/services/api";
import { authService } from "@/services/auth.service";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  SubscriptionState,
  SubscriptionView,
  User,
} from "@/types/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  accessGranted: boolean;
  subscription: SubscriptionView | null;
  subscriptionState: SubscriptionState;
  defaultAuthenticatedPath: string;
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const token: string | null = null;
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user?.role === "ADMIN";
  const isEditor =
    isAuthenticated && (user?.role === "EDITOR" || user?.role === "ADMIN");
  const accessGranted = hasSubscriptionAccess(user);
  const subscription = user?.subscription ?? null;
  const subscriptionState =
    subscription?.state ?? user?.subscriptionState ?? "inactive";
  const defaultAuthenticatedPath = getDefaultAuthenticatedPath(user);

  // Carregar sessão na inicialização
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const storedUser = getStoredUser();

        if (storedUser && isMounted) {
          setUser(storedUser);
        }

        try {
          const freshUser = await authService.me();
          if (isMounted) {
            setUser(freshUser);
            setStoredUser(freshUser);
          }
        } catch {
          if (isMounted) {
            clearStoredUser();
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setStoredUser(response.user);
    return response;
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authService.register(data);
      // Após registro, fazer login automaticamente
      await login({ email: data.email, password: data.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      // Limpar estado local independentemente do resultado
      clearStoredUser();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.me();
      setUser(freshUser);
      setStoredUser(freshUser);
      return freshUser;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      const apiError = error as { statusCode?: number };
      if (apiError.statusCode === 401) {
        clearStoredUser();
        setUser(null);
        queryClient.clear();
      }
      return null;
    }
  }, [queryClient]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      isAdmin,
      isEditor,
      accessGranted,
      subscription,
      subscriptionState,
      defaultAuthenticatedPath,
      login,
      register,
      logout,
      refreshUser,
    }),
    [
      accessGranted,
      defaultAuthenticatedPath,
      isAdmin,
      isAuthenticated,
      isEditor,
      isLoading,
      login,
      logout,
      refreshUser,
      register,
      subscription,
      subscriptionState,
      token,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
