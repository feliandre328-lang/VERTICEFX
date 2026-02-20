import React, { useEffect, useMemo, useState } from "react";
import {
  approveAdminWithdrawal,
  approveInvestment,
  listAdminInvestments,
  listAdminWithdrawals,
  rejectAdminWithdrawal,
  rejectInvestment,
  type AdminInvestmentItem,
  type AdminWithdrawalItem,
} from "../services/api";

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const typeLabel = (kind: string) =>
  kind === "CAPITAL_REDEMPTION" ? "Resgate de Capital" : "Liquidacao de Resultados";

export default function AdminPendingInvestments() {
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [tab, setTab] = useState<"INVESTMENTS" | "WITHDRAWALS">("INVESTMENTS");
  const [statusFilter, setStatusFilter] = useState<"" | "PENDING" | "APPROVED" | "REJECTED">("");
  const [investmentItems, setInvestmentItems] = useState<AdminInvestmentItem[]>([]);
  const [withdrawalItems, setWithdrawalItems] = useState<AdminWithdrawalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    if (!access) {
      setMsg("Sem token. Faca login como admin.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const [investments, withdrawals] = await Promise.all([
        listAdminInvestments(access),
        listAdminWithdrawals(access),
      ]);
      setInvestmentItems(investments);
      setWithdrawalItems(withdrawals);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao carregar pendencias");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApproveInvestment = async (id: number | string) => {
    if (!confirm("Aprovar este aporte?")) return;
    try {
      await approveInvestment(access, id);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao aprovar aporte");
    }
  };

  const onRejectInvestment = async (id: number | string) => {
    if (!confirm("Rejeitar este aporte?")) return;
    try {
      await rejectInvestment(access, id);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao rejeitar aporte");
    }
  };

  const onApproveWithdrawal = async (id: number | string) => {
    if (!confirm("Aprovar esta solicitacao?")) return;
    try {
      await approveAdminWithdrawal(access, id);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao aprovar solicitacao");
    }
  };

  const onRejectWithdrawal = async (id: number | string) => {
    const reason = prompt("Motivo da rejeicao:", "Solicitacao fora da politica operacional.");
    if (!reason) return;
    try {
      await rejectAdminWithdrawal(access, id, reason);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao rejeitar solicitacao");
    }
  };

  const filteredInvestmentItems = statusFilter
    ? investmentItems.filter((it) => it.status === statusFilter)
    : investmentItems;

  const filteredWithdrawalItems = (
    statusFilter ? withdrawalItems.filter((it) => it.status === statusFilter) : withdrawalItems
  ).sort((a, b) => {
    if (a.withdrawal_type === b.withdrawal_type) return 0;
    if (a.withdrawal_type === "CAPITAL_REDEMPTION") return 1;
    if (b.withdrawal_type === "CAPITAL_REDEMPTION") return -1;
    return 0;
  });

  const approvedCount = tab === "INVESTMENTS"
    ? investmentItems.filter((it) => it.status === "APPROVED").length
    : withdrawalItems.filter((it) => it.status === "APPROVED").length;

  const pendingCount = tab === "INVESTMENTS"
    ? investmentItems.filter((it) => it.status === "PENDING").length
    : withdrawalItems.filter((it) => it.status === "PENDING").length;

  const rejectedCount = tab === "INVESTMENTS"
    ? investmentItems.filter((it) => it.status === "REJECTED").length
    : withdrawalItems.filter((it) => it.status === "REJECTED").length;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Aprovações Pendentes</h2>
          <p className="text-slate-400 text-sm mt-1">
            Fluxo completo de pendencias do admin: aportes, resgates de capital e liquidacoes de resultados.
          </p>
        </div>

        <button
          onClick={() => refresh()}
          disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("INVESTMENTS")}
          className={`px-3 py-2 rounded-lg border text-sm ${
            tab === "INVESTMENTS"
              ? "border-slate-600 bg-slate-800 text-white"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Aportes ({investmentItems.length})
        </button>
        <button
          onClick={() => setStatusFilter((v) => (v === "PENDING" ? "" : "PENDING"))}
          className={`px-3 py-2 rounded-lg border text-sm ${
            statusFilter === "PENDING"
              ? "border-amber-700 bg-amber-900/20 text-amber-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab === "INVESTMENTS" ? "Aportes" : "Liquidações"} Pendentes ({pendingCount})
        </button>
        <button
          onClick={() => setStatusFilter((v) => (v === "APPROVED" ? "" : "APPROVED"))}
          className={`px-3 py-2 rounded-lg border text-sm ${
            statusFilter === "APPROVED"
              ? "border-emerald-700 bg-emerald-900/20 text-emerald-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab === "INVESTMENTS" ? "Aportes" : "Liquidações"} Aprovados ({approvedCount})
        </button>
        <button
          onClick={() => setStatusFilter((v) => (v === "REJECTED" ? "" : "REJECTED"))}
          className={`px-3 py-2 rounded-lg border text-sm ${
            statusFilter === "REJECTED"
              ? "border-red-700 bg-red-900/20 text-red-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab === "INVESTMENTS" ? "Aportes" : "Liquidações"} Rejeitados ({rejectedCount})
        </button>
        <button
          onClick={() => setTab("WITHDRAWALS")}
          className={`px-3 py-2 rounded-lg border text-sm ${
            tab === "WITHDRAWALS"
              ? "border-slate-600 bg-slate-800 text-white"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Resgates/Liquidacoes ({withdrawalItems.length})
        </button>
      </div>

      {msg ? (
        <div className="rounded-lg border border-amber-800/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          {msg}
        </div>
      ) : null}

      {tab === "INVESTMENTS" ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          {filteredInvestmentItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhum aporte encontrado.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredInvestmentItems.map((it) => (
                <div key={it.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                      <span>{fmt(it.amount_cents)}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          it.status === "APPROVED"
                            ? "bg-emerald-900/20 text-emerald-400"
                            : it.status === "REJECTED"
                            ? "bg-red-900/20 text-red-400"
                            : "bg-amber-900/20 text-amber-400"
                        }`}
                      >
                        {it.status === "APPROVED" ? "Aprovado" : it.status === "REJECTED" ? "Rejeitado" : "Pendente"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <b className="text-slate-400">Usuario:</b> {it.user_username || "-"} ({it.user_email || "sem-email"}) - id{" "}
                      {it.user_id || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      <b className="text-slate-400">Criado:</b> {new Date(it.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  {it.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onRejectInvestment(it.id)}
                        className="px-4 py-2 rounded-lg border border-red-900/50 bg-red-900/20 text-red-300 text-sm hover:bg-red-900/30"
                      >
                        Rejeitar
                      </button>
                      <button
                        onClick={() => onApproveInvestment(it.id)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                      >
                        Aprovar
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Sem ação</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          {filteredWithdrawalItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhuma solicitação encontrada.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredWithdrawalItems.map((it) => (
                <div key={it.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-slate-200 text-sm font-semibold">
                      {fmt(it.amount_cents)} <span className="text-slate-500 font-normal">({typeLabel(it.withdrawal_type)})</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      <b className="text-slate-400">Usuario:</b> {it.username} ({it.email}) - id {it.user}
                    </div>
                    <div className="text-xs text-slate-500">
                      <b className="text-slate-400">Solicitado:</b> {new Date(it.requested_at).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onRejectWithdrawal(it.id)}
                      className="px-4 py-2 rounded-lg border border-red-900/50 bg-red-900/20 text-red-300 text-sm hover:bg-red-900/30"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => onApproveWithdrawal(it.id)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
