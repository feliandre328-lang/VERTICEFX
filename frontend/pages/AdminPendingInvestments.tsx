import React, { useEffect, useMemo, useState } from "react";
import {
  listAdminInvestments,
  approveAdminWithdrawal,
  listAdminWithdrawals,
  payAdminWithdrawal,
  rejectAdminWithdrawal,
  type AdminInvestmentItem,
  type AdminWithdrawalItem,
} from "../services/api";

type StatusFilter = "" | "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "UNPAID";
type WithdrawalTypeFilter = "" | "RESULT_SETTLEMENT" | "CAPITAL_REDEMPTION";

const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const normalizeSearch = (value: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const typeLabel = (kind: string) =>
  kind === "CAPITAL_REDEMPTION" ? "Resgate de Capital" : "Saque Semanal";

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

const investmentStatusLabel = (status: string) => {
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Rejeitado";
  return "Pendente";
};

const investmentStatusBadgeClass = (status: string) => {
  if (status === "APPROVED") return "bg-emerald-900/20 text-emerald-400";
  if (status === "REJECTED") return "bg-red-900/20 text-red-400";
  return "bg-amber-900/20 text-amber-400";
};

export default function AdminPendingInvestments() {
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState<WithdrawalTypeFilter>("");
  const [showAllInvestments, setShowAllInvestments] = useState(false);
  const [search, setSearch] = useState("");
  const [withdrawalItems, setWithdrawalItems] = useState<AdminWithdrawalItem[]>([]);
  const [investmentItems, setInvestmentItems] = useState<AdminInvestmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    if (!access) {
      setMsg("Sem token. Faça login como admin.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const [withdrawals, investments] = await Promise.all([
        listAdminWithdrawals(access),
        listAdminInvestments(access),
      ]);
      setWithdrawalItems(withdrawals);
      setInvestmentItems(investments);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh().catch(() => {}); }, []);
  useEffect(() => {
    const onNotif = () => { refresh(); };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
  }, [access]);

  const onApproveWithdrawal = async (id: number | string) => {
    if (!confirm("Aprovar esta solicitação?")) return;
    try { await approveAdminWithdrawal(access, id); await refresh(); } 
    catch (e: any) { alert(e?.message ?? "Erro ao aprovar solicitação"); }
  };

  const onRejectWithdrawal = async (id: number | string) => {
    const reason = prompt("Motivo da rejeição:", "Solicitação fora da política operacional.");
    if (!reason) return;
    try { await rejectAdminWithdrawal(access, id, reason); await refresh(); } 
    catch (e: any) { alert(e?.message ?? "Erro ao rejeitar solicitação"); }
  };

  const onPayWithdrawal = async (id: number | string) => {
    if (!confirm("Confirmar pagamento desta solicitação?")) return;
    const externalRef = prompt("Referência externa do pagamento (opcional):", "");
    if (externalRef === null) return;
    try { await payAdminWithdrawal(access, id, { external_ref: externalRef || undefined }); await refresh(); } 
    catch (e: any) { alert(e?.message ?? "Erro ao pagar solicitação"); }
  };

  // Pesquisa
  const searchedWithdrawals = useMemo(() => {
    const q = normalizeSearch(search);
    return withdrawalItems.filter((it) => {
      if (!q) return true;
      const haystack = normalizeSearch(
        [
          it.username, it.email, String(it.user), String(it.id),
          it.pix_key || "", it.external_ref || "",
          typeLabel(it.withdrawal_type), statusLabel(it.status),
          fmt(it.amount_cents)
        ].join(" ")
      );
      return haystack.includes(q);
    });
  }, [withdrawalItems, search]);

  const searchedInvestments = useMemo(() => {
    const q = normalizeSearch(search);
    return investmentItems.filter((it) => {
      if (!q) return true;
      const username = it.user_username || it.username || "";
      const email = it.user_email || it.email || "";
      const haystack = normalizeSearch(
        [String(it.id), username, email, String(it.user_id || ""),
         investmentStatusLabel(it.status), fmt(it.amount_cents), it.external_ref || "", it.created_at || ""].join(" ")
      );
      return haystack.includes(q);
    });
  }, [investmentItems, search]);

  // Filtragem
  const filteredWithdrawalItems = useMemo(() => {
    let items = searchedWithdrawals;
    if (typeFilter) items = items.filter((it) => it.withdrawal_type === typeFilter);
    if (statusFilter) {
      if (statusFilter === "UNPAID") items = items.filter((it) => it.status !== "PAID");
      else items = items.filter((it) => it.status === statusFilter);
    }
    return items;
  }, [searchedWithdrawals, typeFilter, statusFilter]);

  // FILTRAGEM DE INVESTIMENTOS CORRIGIDA: pendentes aparecem
  const filteredInvestments = useMemo(() => {
    if (!statusFilter) return searchedInvestments;
    if (statusFilter === "PENDING") return searchedInvestments.filter((it) => it.status === "PENDING");
    if (statusFilter === "UNPAID") return searchedInvestments.filter((it) => it.status === "PENDING");
    return searchedInvestments.filter((it) => it.status === statusFilter);
  }, [searchedInvestments, statusFilter]);

  // Separação de saques
  const capitalWithdrawals = filteredWithdrawalItems.filter((it) => it.withdrawal_type === "CAPITAL_REDEMPTION");
  const resultWithdrawals = filteredWithdrawalItems.filter((it) => it.withdrawal_type === "RESULT_SETTLEMENT");

  // Contadores
  const counts = useMemo(() => ({
    pending: [
      ...withdrawalItems.filter((it) => it.status === "PENDING"),
      ...investmentItems.filter((it) => it.status === "PENDING")
    ].length,
    approved: [
      ...withdrawalItems.filter((it) => it.status === "APPROVED"),
      ...investmentItems.filter((it) => it.status === "APPROVED")
    ].length,
    rejected: [
      ...withdrawalItems.filter((it) => it.status === "REJECTED"),
      ...investmentItems.filter((it) => it.status === "REJECTED")
    ].length,
    paid: withdrawalItems.filter((it) => it.status === "PAID").length,
    unpaid: [
      ...withdrawalItems.filter((it) => it.status !== "PAID"),
      ...investmentItems.filter((it) => it.status === "PENDING") // Considera pendente como não pago
    ].length,
    weekly: withdrawalItems.filter((it) => it.withdrawal_type === "RESULT_SETTLEMENT").length,
    capital: withdrawalItems.filter((it) => it.withdrawal_type === "CAPITAL_REDEMPTION").length,
    investments: investmentItems.length
  }), [withdrawalItems, investmentItems]);

  const onClickTypeFilter = (next: WithdrawalTypeFilter) => {
    setShowAllInvestments(false);
    setTypeFilter((cur) => (cur === next ? "" : next));
  };

  const onClickStatusFilter = (next: Exclude<StatusFilter, "">) => {
    // Ativa a exibição dos investments pendentes
    setShowAllInvestments(next === "PENDING" || next === "UNPAID" ? true : false);
    setStatusFilter((cur) => (cur === next ? "" : next));
  };


  const clearFilters = () => { setTypeFilter(""); setStatusFilter(""); setShowAllInvestments(false); };

  // Render Helpers
  const renderInvestmentGroup = (title: string, items: AdminInvestmentItem[]) => (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">{title} ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">Nenhum aporte encontrado.</div>
      ) : (
        <div className="divide-y divide-slate-800">
          {items.map((it) => {
            const username = it.user_username || it.username || "sem-usuario";
            const email = it.user_email || it.email || "sem-email";
            return (
              <div key={it.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                    <span>{fmt(it.amount_cents)}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${investmentStatusBadgeClass(it.status)}`}>
                      {investmentStatusLabel(it.status)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <b className="text-slate-400">Usuario:</b> {username} ({email}) - id {it.user_id || "-"}
                  </div>
                  <div className="text-xs text-slate-500">
                    <b className="text-slate-400">Aporte:</b> #{it.id}
                  </div>
                  <div className="text-xs text-slate-500">
                    <b className="text-slate-400">Criado em:</b> {new Date(it.created_at).toLocaleString("pt-BR")}
                  </div>
                  {it.external_ref && <div className="text-xs text-slate-500"><b className="text-slate-400">Ref. Externa:</b> {it.external_ref}</div>}
                </div>
                <div className="text-xs text-slate-500">
                  {it.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button className="px-4 py-2 rounded-lg border border-red-900/50 bg-red-900/20 text-red-300 text-sm hover:bg-red-900/30">Rejeitar</button>
                      <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500">Aprovar</button>
                    </div>
                  ) : (
                    "Sem ação"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderWithdrawalGroup = (title: string, items: AdminWithdrawalItem[]) => (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">{title} ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">Nenhuma solicitação nesta categoria.</div>
      ) : (
        <div className="divide-y divide-slate-800">
          {items.map((it) => (
            <div key={it.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1">
                <div className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                  <span>{fmt(it.amount_cents)}</span>
                  <span className="text-slate-500 font-normal">({typeLabel(it.withdrawal_type)})</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(it.status)}`}>
                    {statusLabel(it.status)}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  <b className="text-slate-400">Usuario:</b> {it.username} ({it.email}) - id {it.user}
                </div>
                <div className="text-xs text-slate-500">
                  <b className="text-slate-400">Solicitado:</b> {new Date(it.requested_at).toLocaleString("pt-BR")}
                </div>
                {it.scheduled_for && <div className="text-xs text-slate-500"><b className="text-slate-400">Agendado:</b> {new Date(it.scheduled_for).toLocaleDateString("pt-BR")}</div>}
                {it.rejection_reason && <div className="text-xs text-red-300"><b>Motivo:</b> {it.rejection_reason}</div>}
              </div>
              {it.status === "PENDING" ? (
                <div className="flex gap-2">
                  <button onClick={() => onRejectWithdrawal(it.id)} className="px-4 py-2 rounded-lg border border-red-900/50 bg-red-900/20 text-red-300 text-sm hover:bg-red-900/30">Rejeitar</button>
                  <button onClick={() => onApproveWithdrawal(it.id)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500">Aprovar</button>
                </div>
              ) : it.status === "APPROVED" ? (
                <div className="flex gap-2">
                  <button onClick={() => onPayWithdrawal(it.id)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500">Pagar</button>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Sem ação</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Admin de Saques e Resgates</h2>
          <p className="text-slate-400 text-sm mt-1">Controle operacional de saque semanal e resgate de aporte.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60">
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por usuario, email, id, valor, tipo, status, pix, referencia..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-3 pr-20 text-sm text-white focus:outline-none focus:border-blue-900"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800">
              Limpar
            </button>
          )}
        </div>

        {/* Botões principais */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={clearFilters} className={`px-3 py-2 rounded-lg border text-sm ${!typeFilter && !statusFilter && !showAllInvestments ? "border-slate-600 bg-slate-800 text-white" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Todos ({withdrawalItems.length})</button>
          <button onClick={() => onClickTypeFilter("RESULT_SETTLEMENT")} className={`px-3 py-2 rounded-lg border text-sm ${typeFilter === "RESULT_SETTLEMENT" ? "border-cyan-700 bg-cyan-900/20 text-cyan-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Saques Semanais ({counts.weekly})</button>
          <button onClick={() => onClickTypeFilter("CAPITAL_REDEMPTION")} className={`px-3 py-2 rounded-lg border text-sm ${typeFilter === "CAPITAL_REDEMPTION" ? "border-orange-700 bg-orange-900/20 text-orange-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Resgates de Aporte ({counts.capital})</button>
          <button onClick={() => setShowAllInvestments((v) => !v)} className={`px-3 py-2 rounded-lg border text-sm ${showAllInvestments ? "border-fuchsia-700 bg-fuchsia-900/20 text-fuchsia-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Todos os Aportes ({counts.investments})</button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => onClickStatusFilter("PENDING")} className={`px-3 py-2 rounded-lg border text-sm ${statusFilter === "PENDING" ? "border-amber-600 bg-amber-900/20 text-amber-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Pendentes ({counts.pending})</button>
          <button onClick={() => onClickStatusFilter("APPROVED")} className={`px-3 py-2 rounded-lg border text-sm ${statusFilter === "APPROVED" ? "border-emerald-600 bg-emerald-900/20 text-emerald-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Aprovados ({counts.approved})</button>
          <button onClick={() => onClickStatusFilter("REJECTED")} className={`px-3 py-2 rounded-lg border text-sm ${statusFilter === "REJECTED" ? "border-red-600 bg-red-900/20 text-red-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Rejeitados ({counts.rejected})</button>
          <button onClick={() => onClickStatusFilter("PAID")} className={`px-3 py-2 rounded-lg border text-sm ${statusFilter === "PAID" ? "border-blue-600 bg-blue-900/20 text-blue-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Pagos ({counts.paid})</button>
          <button onClick={() => onClickStatusFilter("UNPAID")} className={`px-3 py-2 rounded-lg border text-sm ${statusFilter === "UNPAID" ? "border-amber-600 bg-amber-900/20 text-amber-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"}`}>Não pagos ({counts.unpaid})</button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="space-y-4">
        {/* Saques */}
        {typeFilter === "RESULT_SETTLEMENT" || (!typeFilter && !showAllInvestments) ? renderWithdrawalGroup("Saques Semanais", resultWithdrawals) : null}
        {typeFilter === "CAPITAL_REDEMPTION" || (!typeFilter && !showAllInvestments) ? renderWithdrawalGroup("Resgates de Aporte", capitalWithdrawals) : null}

        {/* Investimentos */}
        {showAllInvestments && filteredInvestments.length > 0
          ? renderInvestmentGroup("Todos os Aportes", filteredInvestments)
          : null}

        {/* Mensagem de status */}
        {msg && <div className="p-4 text-center text-red-500 font-semibold">{msg}</div>}
      </div>
    </div>
  );
}
