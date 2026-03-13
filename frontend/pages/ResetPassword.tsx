import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, Lock, Mail } from "lucide-react";

import { confirmPasswordReset, requestPasswordReset } from "../services/api";

function parseResetQueryFromUrl(value: string): { uid: string; token: string } | null {
  try {
    const url = new URL(value);
    const uid = url.searchParams.get("uid") || "";
    const token = url.searchParams.get("token") || "";
    if (uid && token) return { uid, token };
  } catch {
    // ignore and try fallback below
  }

  const qIndex = value.indexOf("?");
  if (qIndex < 0) return null;
  const params = new URLSearchParams(value.slice(qIndex));
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";
  if (uid && token) return { uid, token };
  return null;
}

export default function ResetPassword() {
  const nav = useNavigate();
  const loc = useLocation();
  const [searchParams] = useSearchParams();

  const isConfirmStep = loc.pathname.endsWith("/new");
  const uid = useMemo(() => searchParams.get("uid") ?? "", [searchParams]);
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [requestLoading, setRequestLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    try {
      setRequestLoading(true);
      const resp = await requestPasswordReset(identifier.trim());
      const parsed = parseResetQueryFromUrl(resp?.reset_url || "");

      if (parsed?.uid && parsed?.token) {
        nav(
          `/reset-password/new?uid=${encodeURIComponent(parsed.uid)}&token=${encodeURIComponent(parsed.token)}`,
          { replace: true }
        );
        return;
      }

      setInfoMsg(resp?.detail || "Solicitacao processada. Use o link de redefinicao recebido.");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao solicitar redefinicao.");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (!uid || !token) {
      setErrorMsg("Link de redefinicao invalido. Solicite um novo.");
      return;
    }

    try {
      setConfirmLoading(true);
      const resp = await confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        new_password2: newPassword2,
      });
      setInfoMsg(resp?.detail || "Senha redefinida com sucesso.");
      setNewPassword("");
      setNewPassword2("");
      setTimeout(() => nav("/login", { replace: true }), 1500);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao redefinir senha.");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-white text-xl font-bold">
            {isConfirmStep ? "Definir nova senha" : "Recuperar senha"}
          </h1>
          <button
            type="button"
            onClick={() => nav("/login")}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft size={14} />
            Voltar
          </button>
        </div>

        {errorMsg ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMsg}
          </div>
        ) : null}

        {infoMsg ? (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 inline-flex items-center gap-2">
            <CheckCircle2 size={16} />
            {infoMsg}
          </div>
        ) : null}

        {!isConfirmStep ? (
          <form onSubmit={handleRequestReset} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Usuario ou E-mail
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900"
                placeholder="seu usuario ou email"
                required
                disabled={requestLoading}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold rounded-lg transition-all"
              disabled={requestLoading}
            >
              {requestLoading ? "Gerando..." : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-3">
            {!uid || !token ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Link invalido. Solicite uma nova redefinicao.
              </div>
            ) : null}

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-blue-900"
                placeholder="nova senha"
                required
                disabled={confirmLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:border-blue-900"
                placeholder="confirmar nova senha"
                required
                disabled={confirmLoading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg transition-all"
              disabled={confirmLoading || !uid || !token}
            >
              {confirmLoading ? "Salvando..." : "Redefinir senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

