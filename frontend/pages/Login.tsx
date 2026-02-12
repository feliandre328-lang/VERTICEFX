import React, { useState } from "react";
import { UserRole } from "../types";
import { ShieldCheck, User, Mail, Lock, ChevronLeft } from "lucide-react";
import { login as apiLogin } from "../services/api";

interface LoginProps {
  onLoginRequest: (role: UserRole) => void;
  onGoToSignUp: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginRequest, onGoToSignUp }) => {
  const [view, setView] = useState<"role" | "clientForm">("role");
  const [usernameOrEmail, setUsernameOrEmail] = useState(""); // ⚠️ por padrão do Django JWT, use username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      setLoading(true);

      // ✅ Login real no Django (SimpleJWT: TokenObtainPair)
      // Por padrão ele espera "username" e "password".
      // Aqui tratamos o campo como username (mesmo que o placeholder seja email).
      const { access, refresh } = await apiLogin(usernameOrEmail, password);

      // ✅ Guarda tokens (simples e funcional)
      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      // ✅ segue o fluxo normal do app
      onLoginRequest("CLIENT");
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
        <button
          onClick={() => setView("clientForm")}
          className="bg-slate-900 border border-slate-800 p-8 rounded-xl hover:border-blue-500/50 hover:bg-slate-800 transition-all group text-left"
        >
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20">
            <User className="text-blue-500" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Área do Cliente</h2>
          <p className="text-sm text-slate-400">
            Acesso para investidores visualizarem saldo, solicitarem saques e acompanharem rendimentos.
          </p>
        </button>

        <button
          onClick={() => onLoginRequest("ADMIN")}
          className="bg-slate-900 border border-slate-800 p-8 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800 transition-all group text-left"
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
          <button onClick={onGoToSignUp} className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
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
            <button onClick={onGoToSignUp} className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
              Criar Conta
            </button>
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => setView("role")}
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
