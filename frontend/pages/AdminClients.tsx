import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, RefreshCcw, ChevronRight } from "lucide-react";

import { useAuth } from "../layouts/AuthContext";
import { listAdminClients, type AdminClient } from "../services/api";

export default function AdminClients() {
  const nav = useNavigate();
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [items, setItems] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!access) return;
    try {
      setLoading(true);
      setErr("");
      const data = await listAdminClients(access);
      setItems(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const goDetail = (id: number) => nav(`/app/admin/clients/${id}`);

  return (
    <div className="space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="text-emerald-500" size={20} />
          <h1 className="text-lg font-bold text-white">Clientes</h1>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/50 text-slate-200 text-sm disabled:opacity-60"
          title="Atualizar"
        >
          <RefreshCcw size={16} />
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando clientes...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhum cliente cadastrado.</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Cadastro</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Abrir</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {items.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => goDetail(u.id)}
                    >
                      <td className="px-6 py-4 font-mono text-slate-300">{u.id}</td>
                      <td className="px-6 py-4 text-slate-200 font-medium">{u.username}</td>
                      <td className="px-6 py-4">{u.email || <span className="text-slate-600">—</span>}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {u.date_joined ? new Date(u.date_joined).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-emerald-900/20 text-emerald-400">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-red-900/20 text-red-400">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          Detalhes <ChevronRight size={16} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden p-4 space-y-3">
              {items.map((u) => (
                <button
                  key={u.id}
                  onClick={() => goDetail(u.id)}
                  className="w-full text-left bg-slate-950/30 border border-slate-800 rounded-lg p-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-slate-200 font-semibold truncate">{u.username}</p>
                      <p className="text-[11px] text-slate-500 truncate">{u.email || "sem-email"}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">#{u.id}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className={u.is_active ? "text-emerald-400 text-xs font-semibold" : "text-red-400 text-xs font-semibold"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-300">
                      Detalhes <ChevronRight size={16} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}