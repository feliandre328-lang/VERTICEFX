import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserRole } from "../types";
import { ShieldCheck, User, Mail, Lock, ChevronLeft } from "lucide-react";
import { useAuth } from "../layouts/AuthContext";

const Login: React.FC = () => {
  const nav = useNavigate();
  const { loginClient, startAdmin2FA } = useAuth();

  const [view, setView] = useState<"role" | "clientForm">("role");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const goToSignUp = () => nav("/signup");
  const goToClientForm = () => setView("clientForm");
  const goBackToRole = () => setView("role");

  const goAdmin = () => {
    // Admin usa 2FA (demo)
    startAdmin2FA();
    nav("/2fa", { replace: true });
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      setLoading(true);

      // ✅ login real via AuthContext (que usa /api/auth/token/)
      await loginClient(usernameOrEmail, password);

      // ✅ rota profissional (área logada)
      nav("/app/dashboard", { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  const LogoHeader = () => (
    <div className="mb-8 flex flex-col items-center">
      <div className="w-16 h-16 mb-4">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="loginGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path d="M50 10 L90 90 L10 90 Z" fill="url(#loginGradient)" opacity="0.2" />
          <path d="M35 80 L35 65" stroke="url(#loginGradient)" strokeWidth="8" strokeLinecap="round" />
          <path d="M50 80 L50 50" stroke="url(#loginGradient)" strokeWidth="8" strokeLinecap="round" />
          <path d="M65 80 L65 35" stroke="url(#loginGradient)" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">VÉRTICE FX</h1>
      <p className="text-slate-500 text-sm uppercase tracking-widest mt-2">Sistema de Gestão Financeira</p>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="w-full max-w-2xl">
      <LogoHeader />

      <div className="grid md:grid-cols-2 gap-6">
        {/* CLIENT */}
        <button
          onClick={goToClientForm}
          className="bg-slate-900 border border-slate-800 p-8 rounded-xl hover:border-blue-500/50 hover:bg-slate-800 transition-all group text-left"
          disabled={loading}
        >
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20">
            <User className="text-blue-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Área do Cliente</h2>
          <p className="text-sm text-slate-400">
            Acesso para investidores visualizarem saldo, solicitarem saques e acompanharem rendimentos.
          </p>
        </button>

        {/* ADMIN */}
        <button
          onClick={goAdmin}
          className="bg-slate-900 border border-slate-800 p-8 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800 transition-all group text-left"
          disabled={loading}
        >
          <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/20">
            <ShieldCheck className="text-emerald-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Backoffice / Admin</h2>
          <p className="text-sm text-slate-400">
            Acesso restrito para gestão de caixa, aprovação de saques e definição de performance.
          </p>
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-slate-500">
        <p>
          Não tem uma conta?{" "}
          <button onClick={goToSignUp} className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
            Criar Conta
          </button>
        </p>
      </div>

      <div className="mt-8 text-center text-xs text-slate-600">
        <p>&copy; 2024 Vértice FX. Ambiente Seguro.</p>
      </div>
    </div>
  );

  const renderClientForm = () => (
    <div className="w-full max-w-sm">
      <LogoHeader />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
        <h2 className="text-xl font-bold text-white text-center mb-1">Acesso do Cliente</h2>
        <p className="text-sm text-slate-500 text-center mb-6">Entre com suas credenciais.</p>

        {errorMsg ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={handleClientSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Usuário (ou Email)
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 transition-all placeholder:text-slate-600"
                placeholder="admin (ou seu email, se for seu username)"
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Continuar"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            Não tem uma conta?{" "}
            <button onClick={goToSignUp} className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
              Criar Conta
            </button>
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={goBackToRole}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 mx-auto"
          disabled={loading}
        >
          <ChevronLeft size={16} />
          Voltar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {view === "role" ? renderRoleSelection() : renderClientForm()}
    </div>
  );
};

export default Login;
