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
  TrendingUp,
  KeyRound,
  User
} from "lucide-react";

import { useAuth } from "../layouts/AuthContext";
import { API_BASE } from "../services/api";

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
    pix_key?: string;
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
    total_gained_cents?: number;
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
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format((cents ?? 0) / 100);

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
  }, [access, userId]);

  const u = data?.user;
  const p = data?.profile;

  const totalGainedCents = data?.totals?.total_gained_cents ?? 0;

  const clientTotals = useMemo(() => {

    const investments = data?.investments ?? [];
    const withdrawals = data?.withdrawals ?? [];

    const totalAportadoCents = investments
      .filter((inv) => inv.status === "APPROVED")
      .reduce((sum, inv) => sum + inv.amount_cents, 0);

    const resgatesAportesCents = withdrawals
      .filter((w) => w.withdrawal_type === "CAPITAL_REDEMPTION" && ["APPROVED", "PAID"].includes(w.status))
      .reduce((sum, w) => sum + w.amount_cents, 0);

    const saquesSemanaisCents = withdrawals
      .filter((w) => w.withdrawal_type === "RESULT_SETTLEMENT" && ["APPROVED", "PAID"].includes(w.status))
      .reduce((sum, w) => sum + w.amount_cents, 0);

    const aporteAtualCents = Math.max(totalAportadoCents - resgatesAportesCents, 0);

    const patrimonioPrincipalCents = aporteAtualCents + totalGainedCents;

    return {
      totalAportadoCents,
      aporteAtualCents,
      saquesSemanaisCents,
      resgatesAportesCents,
      patrimonioPrincipalCents,
      totalJaGanhoCents: totalGainedCents,
    };

  }, [data]);

  return (

    <div className="space-y-4">

      {/* HEADER */}

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
            <UserCheck className="text-emerald-500" size={18}/>
            <h1 className="text-lg font-bold text-white">Detalhes do Cliente</h1>
          </div>

        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/50 text-slate-200 text-sm"
        >
          <RefreshCcw size={16}/>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>

      </div>

      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {loading && !data && (
        <div className="p-10 text-center text-slate-400 text-sm bg-slate-900 border border-slate-800 rounded-lg">
          Carregando cliente...
        </div>
      )}

      {data && u && (

        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* CLIENTE */}

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 xl:col-span-2">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Cliente
                  </p>

                  <p className="text-white font-bold text-lg">
                    {p?.full_name || u.username}
                  </p>

                  <p className="text-xs text-slate-400 font-mono">
                    ID #{u.id}
                  </p>

                </div>

                <div>
                  {u.is_active ? badge("Ativo", "ok") : badge("Inativo", "bad")}
                </div>

              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">

                <div className="flex items-center gap-2 text-slate-300">
                  <User size={14} className="text-slate-500"/>
                  <span>{u.username || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Mail size={14} className="text-slate-500"/>
                  <span className="truncate">{u.email || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Phone size={14} className="text-slate-500"/>
                  <span>{p?.phone || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <KeyRound size={14} className="text-slate-500"/>
                  <span>{p?.pix_key || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <IdCard size={14} className="text-slate-500"/>
                  <span>{p?.cpf || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar size={14} className="text-slate-500"/>
                  <span>
                    {u.date_joined
                      ? new Date(u.date_joined).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>

              </div>

            </div>

            {/* TOTAIS */}

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">

              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Totais
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div className="flex justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <span className="text-slate-300 text-sm">Total aportado</span>
                  <span className="font-mono text-white">
                    {money(clientTotals.totalAportadoCents)}
                  </span>
                </div>

                <div className="flex justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <span className="text-slate-300 text-sm">Aporte atual</span>
                  <span className="font-mono text-white">
                    {money(clientTotals.aporteAtualCents)}
                  </span>
                </div>

                <div className="flex justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <span className="text-slate-300 text-sm">Saques semanais</span>
                  <span className="font-mono text-white">
                    {money(clientTotals.saquesSemanaisCents)}
                  </span>
                </div>

                <div className="flex justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <span className="text-slate-300 text-sm">Resgates</span>
                  <span className="font-mono text-white">
                    {money(clientTotals.resgatesAportesCents)}
                  </span>
                </div>

                <div className="flex justify-between bg-slate-950/30 border border-slate-800 rounded-lg p-3">
                  <span className="text-slate-300 text-sm">Patrimônio</span>
                  <span className="font-mono text-white">
                    {money(clientTotals.patrimonioPrincipalCents)}
                  </span>
                </div>

                <div className="flex justify-between bg-emerald-900/20 border border-emerald-900/40 rounded-lg p-3">
                  <span className="text-emerald-300 text-sm">Total ganho</span>
                  <span className="font-mono text-emerald-400">
                    {money(clientTotals.totalJaGanhoCents)}
                  </span>
                </div>

              </div>

            </div>

          </div>

        </>
      )}

    </div>
  );
}
