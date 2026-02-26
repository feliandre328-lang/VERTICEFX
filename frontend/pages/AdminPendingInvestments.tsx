import React, { useEffect, useMemo, useState } from "react";
import {
  approveAdminWithdrawal,
  approveInvestment,
  listAdminInvestments,
  listAdminWithdrawals,
  payAdminWithdrawal,
  rejectAdminWithdrawal,
  rejectInvestment,
  type AdminInvestmentItem,
  type AdminWithdrawalItem,
} from "../services/api";

type StatusFilter = "" | "PENDING" | "APPROVED" | "REJECTED" | "PAID";

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const typeLabel = (kind: string) =>
  kind === "CAPITAL_REDEMPTION" ? "Resgate de Capital" : "Liquidacao de Resultados";

const statusLabel = (status: string) => {
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Rejeitado";
  if (status === "PAID") return "Pago";
  return "Pendente";
};

const statusBadgeClass = (status: string) => {
  if (status === "APPROVED") return "bg-emerald-900/20 text-emerald-400";
  if (status === "REJECTED") return "bg-red-900/20 text-red-400";
  if (status === "PAID") return "bg-blue-900/20 text-blue-300";
  return "bg-amber-900/20 text-amber-400";
};

export default function AdminPendingInvestments() {
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [tab, setTab] = useState<"INVESTMENTS" | "WITHDRAWALS">("INVESTMENTS");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
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

  useEffect(() => {
    const onNotif = () => {
      refresh();
    };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

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

  const onPayWithdrawal = async (id: number | string) => {
    if (!confirm("Confirmar pagamento desta solicitacao?")) return;
    const externalRef = prompt("Referencia externa do pagamento (opcional):", "");
    if (externalRef === null) return;

    try {
      await payAdminWithdrawal(access, id, { external_ref: externalRef || undefined });
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao pagar solicitacao");
    }
  };

  const filteredInvestmentItems = statusFilter
    ? investmentItems.filter((it) => it.status === statusFilter)
    : investmentItems;

  const filteredWithdrawalItems = statusFilter
    ? withdrawalItems.filter((it) => it.status === statusFilter)
    : withdrawalItems;

  const capitalWithdrawals = filteredWithdrawalItems.filter(
    (it) => it.withdrawal_type === "CAPITAL_REDEMPTION"
  );
  const resultWithdrawals = filteredWithdrawalItems.filter(
    (it) => it.withdrawal_type === "RESULT_SETTLEMENT"
  );

  const countBase = tab === "INVESTMENTS" ? investmentItems : withdrawalItems;
  const approvedCount = countBase.filter((it) => it.status === "APPROVED").length;
  const pendingCount = countBase.filter((it) => it.status === "PENDING").length;
  const rejectedCount = countBase.filter((it) => it.status === "REJECTED").length;
  const paidCount = tab === "WITHDRAWALS" ? withdrawalItems.filter((it) => it.status === "PAID").length : 0;

  const renderWithdrawalGroup = (title: string, items: AdminWithdrawalItem[]) => (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">
          {title} ({items.length})
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">Nenhuma solicitacao nesta categoria.</div>
      ) : (
        <div className="divide-y divide-slate-800">
          {items.map((it) => (
            <div key={it.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                  <span>{fmt(it.amount_cents)}</span>
                  <span className="text-slate-500 font-normal">({typeLabel(it.withdrawal_type)})</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(
                      it.status
                    )}`}
                  >
                    {statusLabel(it.status)}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  <b className="text-slate-400">Usuario:</b> {it.username} ({it.email}) - id {it.user}
                </div>

                <div className="text-xs text-slate-500">
                  <b className="text-slate-400">Solicitado:</b> {new Date(it.requested_at).toLocaleString("pt-BR")}
                </div>

                {it.scheduled_for ? (
                  <div className="text-xs text-slate-500">
                    <b className="text-slate-400">Agendado:</b> {new Date(it.scheduled_for).toLocaleDateString("pt-BR")}
                  </div>
                ) : null}

                {it.rejection_reason ? (
                  <div className="text-xs text-red-300">
                    <b>Motivo:</b> {it.rejection_reason}
                  </div>
                ) : null}
              </div>

              {it.status === "PENDING" ? (
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
              ) : it.status === "APPROVED" ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => onPayWithdrawal(it.id)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500"
                  >
                    Pagar
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Sem acao</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Aprovacoes Pendentes</h2>
          <p className="text-slate-400 text-sm mt-1">
            Fluxo completo do admin: aportes, resgates de capital e liquidacoes de resultados.
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

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => {
            setTab("INVESTMENTS");
            if (statusFilter === "PAID") setStatusFilter("");
          }}
          className={`px-3 py-2 rounded-lg border text-sm ${
            tab === "INVESTMENTS"
              ? "border-slate-600 bg-slate-800 text-white"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Aportes ({investmentItems.length})
        </button>

        <button
          onClick={() => setTab("WITHDRAWALS")}
          className={`px-3 py-2 rounded-lg border text-sm ${
            tab === "WITHDRAWALS"
              ? "border-slate-600 bg-slate-800 text-white"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Resgates e Liquidacoes ({withdrawalItems.length})
        </button>

        <button
          onClick={() => setStatusFilter((v) => (v === "PENDING" ? "" : "PENDING"))}
          className={`px-3 py-2 rounded-lg border text-sm ${
            statusFilter === "PENDING"
              ? "border-amber-700 bg-amber-900/20 text-amber-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Pendentes ({pendingCount})
        </button>

        <button
          onClick={() => setStatusFilter((v) => (v === "APPROVED" ? "" : "APPROVED"))}
          className={`px-3 py-2 rounded-lg border text-sm ${
            statusFilter === "APPROVED"
              ? "border-emerald-700 bg-emerald-900/20 text-emerald-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Aprovados ({approvedCount})
        </button>

        <button
          onClick={() => setStatusFilter((v) => (v === "REJECTED" ? "" : "REJECTED"))}
          className={`px-3 py-2 rounded-lg border text-sm ${
            statusFilter === "REJECTED"
              ? "border-red-700 bg-red-900/20 text-red-300"
              : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
          }`}
        >
          Rejeitados ({rejectedCount})
        </button>

        {tab === "WITHDRAWALS" ? (
          <button
            onClick={() => setStatusFilter((v) => (v === "PAID" ? "" : "PAID"))}
            className={`px-3 py-2 rounded-lg border text-sm ${
              statusFilter === "PAID"
                ? "border-blue-700 bg-blue-900/20 text-blue-300"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
            }`}
          >
            Pagos ({paidCount})
          </button>
        ) : null}
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
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(
                          it.status
                        )}`}
                      >
                        {statusLabel(it.status)}
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
                    <div className="text-xs text-slate-500">Sem acao</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {renderWithdrawalGroup("Liquidacoes de Resultados", resultWithdrawals)}
          {renderWithdrawalGroup("Resgates de Capital", capitalWithdrawals)}
        </div>
      )}
    </div>
  );
}
