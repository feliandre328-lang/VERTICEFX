// frontend/pages/AdminClientDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserCheck,
  RefreshCcw,
  Mail,
  Phone,
  IdCard,
  MapPin,
  Calendar,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

import { useAuth } from "../layouts/AuthContext";
import { API_BASE } from "../services/api"; // se no seu projeto API_BASE não é exportado, veja nota abaixo





// -------- Types (igual o backend retorna) --------
type ClientStatement = {
  user: {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    date_joined: string;
  };
  profile: {
    full_name?: string;
    cpf?: string;
    phone?: string;
    dob?: string | null;
    zip_code?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
  totals: {
    invested_cents: number;
    withdrawn_cents: number;
    balance_cents: number;
  };
  investments: Array<{
    id: number;
    amount_cents: number;
    status: string;
    created_at: string;
    paid_at: string | null;
    external_ref: string | null;
  }>;
  withdrawals: Array<{
    id: number;
    amount_cents: number;
    status: string;
    withdrawal_type: string;
    pix_key: string;
    scheduled_for: string | null;
    requested_at: string;
    approved_at: string | null;
    paid_at: string | null;
    external_ref: string | null;
  }>;
};

// -------- helpers (sem depender do resto do api.ts) --------
function authHeaders(access: string) {
  return { Authorization: `Bearer ${access}` };
}
async function readBodyOnce(res: Response) {
  const raw = await res.text();
  try {
    return { raw, json: raw ? JSON.parse(raw) : null };
  } catch {
    return { raw, json: null };
  }
}
function formatError(raw: string, json: any) {
  if (json?.detail) return String(json.detail);
  if (!raw) return "Erro desconhecido.";
  return raw.slice(0, 220);
}

async function getAdminClientStatement(access: string, userId: number): Promise<ClientStatement> {
  const res = await fetch(`${API_BASE}/admin/clients/${userId}/statement/`, {
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);
  if (!res.ok) {
    throw new Error(`Falha ao buscar cliente: ${res.status} ${formatError(raw, json)}`);
  }
  return json as ClientStatement;
}

export default function AdminClientDetail() {
  const nav = useNavigate();
  const params = useParams();
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const userId = useMemo(() => Number(params.id), [params.id]);

  const [data, setData] = useState<ClientStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const money = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents ?? 0) / 100);

  const badge = (text: string, kind: "ok" | "warn" | "bad" | "neutral") => {
    const cls =
      kind === "ok"
        ? "bg-emerald-900/20 text-emerald-400 border-emerald-900/30"
        : kind === "warn"
        ? "bg-amber-900/20 text-amber-400 border-amber-900/30"
        : kind === "bad"
        ? "bg-red-900/20 text-red-400 border-red-900/30"
        : "bg-slate-800/40 text-slate-300 border-slate-700/40";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cls}`}>
        {text}
      </span>
    );
  };

  const load = async () => {
    if (!access) return;
    if (!Number.isFinite(userId) || userId <= 0) {
      setErr("ID inválido na URL.");
      return;
    }

    try {
      setLoading(true);
      setErr("");
      const s = await getAdminClientStatement(access, userId);
      setData(s);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao carregar cliente.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, userId]);

  const u = data?.user;
  const p = data?.profile;

  

  const statusLabel = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") return badge("Aprovado", "ok");
    if (s === "PENDING") return badge("Pendente", "warn");
    if (s === "REJECTED") return badge("Rejeitado", "bad");
    if (s === "PAID") return badge("Pago", "ok");
    return badge(status || "—", "neutral");
  };

  const typeLabel = (t: string) => {
    const s = (t || "").toUpperCase();
    if (s === "CAPITAL_REDEMPTION") return "Resgate de capital";
    if (s === "RESULT_SETTLEMENT") return "Liquidação de resultado";
    return t || "—";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/app/admin/clients")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/50 text-slate-200 text-sm"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <div className="flex items-center gap-2">
            <UserCheck className="text-emerald-500" size={18} />
            <h1 className="text-lg font-bold text-white">Detalhes do Cliente</h1>
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/50 text-slate-200 text-sm disabled:opacity-60"
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

      {/* Loading */}
      {loading && !data ? (
        <div className="p-10 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-lg">
          Carregando cliente...
        </div>
      ) : null}

      {/* Content */}
      {data && u ? (
        <>
          {/* Top cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Cliente</p>
                  <p className="text-white font-bold text-lg truncate">{p?.full_name || u.username}</p>
                  <p className="text-[12px] text-slate-400 font-mono">ID #{u.id}</p>
                  <div className="mt-4 text-xs text-slate-500">
                Nascimento: <span className="text-slate-300">{p?.dob ? new Date(p.dob).toLocaleDateString("pt-BR") : "—"}</span>
              </div>
                </div>
                <div className="shrink-0">
                  {u.is_active ? badge("Ativo", "ok") : badge("Inativo", "bad")}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail size={14} className="text-slate-500" />
                  <span className="truncate">{ u.username || "sem-email"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Phone size={14} className="text-slate-500" />
                  <span>{p?.phone || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <IdCard size={14} className="text-slate-500" />
                  <span>{p?.cpf || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar size={14} className="text-slate-500" />
                  <span>
                    Cadastro:{" "}
                    <span className="text-slate-200">
                      {u.date_joined ? new Date(u.date_joined).toLocaleString("pt-BR") : "—"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Endereço</p>

              <div className="mt-3 flex items-start gap-2 text-slate-300">
                <MapPin size={16} className="text-slate-500 mt-0.5" />
                <div className="text-sm">
                  <p className="text-slate-200 font-semibold">
                    {(p?.street || "—") + (p?.number ? `, ${p.number}` : "")}
                  </p>
                  <p className="text-slate-400">
                    {(p?.neighborhood || "—") + (p?.city ? ` - ${p.city}` : "") + (p?.state ? `/${p.state}` : "")}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    CEP: {p?.zip_code || "—"} {p?.complement ? ` • ${p.complement}` : ""}
                  </p>
                </div>
              </div>

              
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Totais</p>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight size={16} className="text-emerald-500" />
                    <span className="text-sm text-slate-300">Aportado</span>
                  </div>
                  <span className="font-mono text-slate-100">{money(data.totals.invested_cents)}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight size={16} className="text-amber-500" />
                    <span className="text-sm text-slate-300">Sacado</span>
                  </div>
                  <span className="font-mono text-slate-100">{money(data.totals.withdrawn_cents)}</span>
                </div>

                <div className="flex items-center justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-blue-500" />
                    <span className="text-sm text-slate-300">Saldo</span>
                  </div>
                  <span className="font-mono text-slate-100">{money(data.totals.balance_cents)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Investments */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Aportes</h2>
              <span className="text-xs text-slate-500">{data.investments.length} registro(s)</span>
            </div>

            {data.investments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhum aporte.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {data.investments.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {statusLabel(inv.status)}
                        <span className="text-white font-bold">{money(inv.amount_cents)}</span>
                        <span className="text-[11px] text-slate-600 font-mono">#{inv.id}</span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1">
                        Criado:{" "}
                        <span className="text-slate-300">
                          {inv.created_at ? new Date(inv.created_at).toLocaleString("pt-BR") : "—"}
                        </span>
                        {inv.paid_at ? (
                          <>
                            {" "}• Pago:{" "}
                            <span className="text-slate-300">{new Date(inv.paid_at).toLocaleString("pt-BR")}</span>
                          </>
                        ) : null}
                      </p>

                      {inv.external_ref ? (
                        <p className="text-[10px] text-slate-600 mt-1 break-all">Ref: {inv.external_ref}</p>
                      ) : null}
                    </div>

                    <div className="text-[11px] text-slate-500 md:text-right">
                      {/* espaço pra futuras ações */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Withdrawals */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Resgates</h2>
              <span className="text-xs text-slate-500">{data.withdrawals.length} registro(s)</span>
            </div>

            {data.withdrawals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhum resgate.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {data.withdrawals.map((w) => (
                  <div key={w.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusLabel(w.status)}
                        <span className="text-white font-bold">{money(w.amount_cents)}</span>
                        <span className="text-[11px] text-slate-600 font-mono">#{w.id}</span>
                        <span className="text-[11px] text-slate-400">{typeLabel(w.withdrawal_type)}</span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1">
                        Solicitado:{" "}
                        <span className="text-slate-300">
                          {w.requested_at ? new Date(w.requested_at).toLocaleString("pt-BR") : "—"}
                        </span>
                        {w.scheduled_for ? (
                          <>
                            {" "}• Agendado:{" "}
                            <span className="text-slate-300">{new Date(w.scheduled_for).toLocaleDateString("pt-BR")}</span>
                          </>
                        ) : null}
                        {w.paid_at ? (
                          <>
                            {" "}• Pago:{" "}
                            <span className="text-slate-300">{new Date(w.paid_at).toLocaleString("pt-BR")}</span>
                          </>
                        ) : null}
                      </p>

                      {w.pix_key ? (
                        <p className="text-[10px] text-slate-600 mt-1 break-all">PIX: {w.pix_key}</p>
                      ) : null}

                      {w.external_ref ? (
                        <p className="text-[10px] text-slate-600 mt-1 break-all">Ref: {w.external_ref}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}


/**
 * ⚠️ NOTA IMPORTANTE
 * Se der erro dizendo que API_BASE não existe:
 * - Abra frontend/services/api.ts
 * - Garanta que está exportado assim:
 *   export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
 *
 * Se você NÃO quiser exportar API_BASE, me diga e eu adapto este arquivo pra chamar "/api" direto.
 */