import React, { createContext, useContext, useMemo, useState } from "react";
import { UserRole } from "../types";
import { fetchMe, login as apiLogin, Me } from "../services/api";

type AuthState = {
  role: UserRole;
  isAuthenticated: boolean;
  user: Me | null;

  loginClient: (username: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;

  logout: () => void;
  getAccessToken: () => string;
};

const AuthContext = createContext<AuthState | null>(null);

function readAccess() {
  return localStorage.getItem("access") || "";
}
function readRefresh() {
  return localStorage.getItem("refresh") || "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem("role") as UserRole) || "CLIENT");
  const [user, setUser] = useState<Me | null>(null);

  const isAuthenticated = !!readAccess();

  const setSession = (tokens: { access: string; refresh: string }, nextRole: UserRole, me: Me) => {
    localStorage.setItem("access", tokens.access);
    localStorage.setItem("refresh", tokens.refresh);
    localStorage.setItem("role", nextRole);
    setRole(nextRole);
    setUser(me);
  };

  const clearSession = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("role");
    setRole("CLIENT");
    setUser(null);
  };

  const loginClient = async (username: string, password: string) => {
    // 1) token
    const tokens = await apiLogin(username, password);

    // 2) me
    const me = await fetchMe(tokens.access);

    // 3) role real: se for admin, a gente até pode entrar como CLIENT,
    // mas normalmente cliente deve cair como CLIENT mesmo.
    // Se quiser: admin logando pelo botão "cliente" entra como CLIENT.
    setSession(tokens, "CLIENT", me);
  };

  const loginAdmin = async (username: string, password: string) => {
    // 1) token
    const tokens = await apiLogin(username, password);

    // 2) me
    const me = await fetchMe(tokens.access);

    // 3) valida admin
    const isAdmin = !!me.is_staff || !!me.is_superuser;
    if (!isAdmin) {
      // não deixa ficar logado
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      throw new Error("Este usuário não tem permissão de Backoffice (ADMIN).");
    }

    setSession(tokens, "ADMIN", me);
  };

  const logout = () => {
    clearSession();
  };

  const getAccessToken = () => readAccess();

  const value = useMemo<AuthState>(
    () => ({
      role,
      isAuthenticated,
      user,
      loginClient,
      loginAdmin,
      logout,
      getAccessToken,
    }),
    [role, isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
