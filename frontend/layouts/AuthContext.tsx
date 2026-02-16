import React, { createContext, useContext, useMemo, useState } from "react";
import { UserRole } from "../types";
import { login as apiLogin } from "../services/api";

type AuthState = {
  role: UserRole;
  isAuthenticated: boolean;
  loginClient: (username: string, password: string) => Promise<void>;
  startAdmin2FA: () => void;
  finishAdmin2FA: (code: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("GUEST");

  const isAuthenticated = useMemo(() => {
    return !!localStorage.getItem("access");
  }, []);

  const loginClient = async (username: string, password: string) => {
    const { access, refresh } = await apiLogin(username, password);
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);
    setRole("CLIENT");
  };

  // admin demo (2FA fake)
  const startAdmin2FA = () => {
    setRole("GUEST"); // ainda não logou
  };

  const finishAdmin2FA = async (code: string) => {
    if (code.length !== 6) throw new Error("Código inválido");
    // aqui você pode exigir login real também, se quiser.
    setRole("ADMIN");
    // se admin também usar token, você salva token aqui.
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setRole("GUEST");
  };

  const value: AuthState = {
    role,
    isAuthenticated: !!localStorage.getItem("access"),
    loginClient,
    startAdmin2FA,
    finishAdmin2FA,
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
