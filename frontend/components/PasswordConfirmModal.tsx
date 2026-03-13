import React, { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

interface PasswordConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
}

export default function PasswordConfirmModal({
  isOpen,
  title = "Confirmar com senha",
  description = "Digite sua senha para continuar.",
  confirmLabel = "Confirmar",
  loading = false,
  error = "",
  onClose,
  onConfirm,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    setShowPassword(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      <div className="absolute inset-0 bg-black/70" onClick={loading ? undefined : onClose} />

      <div className="relative mx-auto mt-10 w-[92%] max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onConfirm(password);
          }}
          className="px-5 py-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-3 pr-11 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-900"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
                disabled={loading}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded border border-red-800/60 bg-red-900/20 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm hover:bg-slate-800 transition disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm transition"
            >
              {loading ? "Validando..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
