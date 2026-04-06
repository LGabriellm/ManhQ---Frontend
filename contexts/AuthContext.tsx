"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getDefaultAuthenticatedPath,
  hasSubscriptionAccess,
} from "@/lib/subscription";
import {
  STORED_USER_EVENT,
  clearStoredUser,
  getStoredUser,
  setStoredUser,
} from "@/services/api";
import { authService } from "@/services/auth.service";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiError,
  SubscriptionState,
  SubscriptionView,
  User,
} from "@/types/api";

interface AuthContextType {
  user: User | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const meRequestRef = useRef<Promise<User> | null>(null);

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user?.role === "ADMIN";
  const isEditor =
    isAuthenticated && (user?.role === "EDITOR" || user?.role === "ADMIN");
  const accessGranted = hasSubscriptionAccess(user);
  const subscription = user?.subscription ?? null;
  const subscriptionState =
    subscription?.state ?? user?.subscriptionState ?? "inactive";
  const defaultAuthenticatedPath = getDefaultAuthenticatedPath(user);

  const clearAuthState = useCallback(
    (shouldClearQueries = false) => {
      clearStoredUser();
      setUser(null);

      if (shouldClearQueries) {
        queryClient.clear();
      }
    },
    [queryClient],
  );

  const fetchFreshUser = useCallback(async () => {
    if (!meRequestRef.current) {
      meRequestRef.current = authService.me().finally(() => {
        meRequestRef.current = null;
      });
    }

    return meRequestRef.current;
  }, []);

  // Carregar sessão na inicialização
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const storedUser = getStoredUser();

      if (storedUser && isMounted) {
        setUser(storedUser);
      }

      try {
        const freshUser = await fetchFreshUser();
        if (!isMounted) {
          return;
        }

        setUser(freshUser);
        setStoredUser(freshUser);
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.statusCode === 401 && isMounted) {
          clearAuthState(true);
        }
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
  }, [clearAuthState, fetchFreshUser]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncStoredUser = () => {
      setUser(getStoredUser());
    };

    const handleStoredUserChange = () => {
      syncStoredUser();
    };

    window.addEventListener("storage", syncStoredUser);
    window.addEventListener(STORED_USER_EVENT, handleStoredUserChange);

    return () => {
      window.removeEventListener("storage", syncStoredUser);
      window.removeEventListener(STORED_USER_EVENT, handleStoredUserChange);
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
    } finally {
      // Limpar estado local independentemente do resultado
      clearAuthState(true);
    }
  }, [clearAuthState]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await fetchFreshUser();
      setUser(freshUser);
      setStoredUser(freshUser);
      return freshUser;
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.statusCode === 401) {
        clearAuthState(true);
        return null;
      }

      return getStoredUser();
    }
  }, [clearAuthState, fetchFreshUser]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
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
