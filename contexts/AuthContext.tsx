"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getStoredUser, setStoredUser, clearStoredUser } from "@/services/api";
import { authService } from "@/services/auth.service";
import type { User, LoginRequest, RegisterRequest } from "@/types/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user?.role === "ADMIN";
  const isEditor =
    isAuthenticated && (user?.role === "EDITOR" || user?.role === "ADMIN");

  // Carregar sessão na inicialização
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = getStoredUser();

        if (storedUser) {
          setUser(storedUser);
        }

        try {
          const freshUser = await authService.me();
          setUser(freshUser);
          setStoredUser(freshUser);
        } catch {
          clearStoredUser();
          setUser(null);
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setStoredUser(response.user);
  };

  const register = async (data: RegisterRequest) => {
    await authService.register(data);
    // Após registro, fazer login automaticamente
    await login({ email: data.email, password: data.password });
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      // Limpar estado local independentemente do resultado
      clearStoredUser();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authService.me();
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isAdmin,
        isEditor,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
