import React, { useEffect, useMemo, useState } from "react";
import {
  approveAdminWithdrawal,
  listAdminWithdrawals,
  rejectAdminWithdrawal,
  type AdminWithdrawalItem,
} from "../services/api";

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const typeLabel = (kind: string) =>
  kind === "CAPITAL_REDEMPTION" ? "Resgate de Capital" : "Liquidacao de Resultados";

export default function AdminPendingInvestments() {
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [items, setItems] = useState<AdminWithdrawalItem[]>([]);
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
      const data = await listAdminWithdrawals(access, "PENDING");
      setItems(data);
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

  const onApprove = async (id: number | string) => {
    if (!confirm("Aprovar esta solicitacao?")) return;
    try {
      await approveAdminWithdrawal(access, id);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao aprovar");
    }
  };

  const onReject = async (id: number | string) => {
    const reason = prompt("Motivo da rejeicao:", "Solicitacao fora da politica operacional.");
    if (!reason) return;
    try {
      await rejectAdminWithdrawal(access, id, reason);
      await refresh();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao rejeitar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Resgates e Liquidacoes Pendentes</h2>
          <p className="text-slate-400 text-sm mt-1">
            Analise e decisao de pedidos de <b>resgate de capital</b> e <b>liquidacao de resultados</b>.
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

      {msg ? (
        <div className="rounded-lg border border-amber-800/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          {msg}
        </div>
      ) : null}

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-bold">Pendencias</h3>
          <span className="text-xs text-slate-400">{items.length} itens</span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhuma solicitacao pendente.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {items.map((it) => (
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
                    {it.scheduled_for ? (
                      <>
                        {" "}
                        - <b className="text-slate-400">Agendamento:</b>{" "}
                        {new Date(it.scheduled_for).toLocaleDateString("pt-BR")}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onReject(it.id)}
                    className="px-4 py-2 rounded-lg border border-red-900/50 bg-red-900/20 text-red-300 text-sm hover:bg-red-900/30"
                  >
                    Rejeitar
                  </button>

                  <button
                    onClick={() => onApprove(it.id)}
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
    </div>
  );
}
