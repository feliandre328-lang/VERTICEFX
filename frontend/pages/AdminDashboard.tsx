import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Activity,
  Globe,
  Wallet,
  UserCheck,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

import { SystemState } from "../types";
import { useAuth } from "../layouts/AuthContext";
import {
  createDailyPerformanceDistribution,
  listAdminInvestments,
  listAdminWithdrawals,
  type AdminSummary,
  type AdminWithdrawalItem,
  approveInvestment,
  rejectInvestment,
  getAdminSummary,
} from "../services/api";

type AdminInvestmentItem = {
  id: number;
  user_id?: number;
  user_username?: string;
  user_email?: string;
  amount_cents: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  paid_at: string | null;
  external_ref: string | null;
  created_at: string;
};

interface AdminDashboardProps {
  state: SystemState; // ainda usamos para partes mock (performance, compliance etc)
  onApprove: (id: string) => void; // pode manter (mock) — mas aprovar investment real usaremos API
  onReject: (id: string) => void;
  onSetPerformance: (percent: number) => void;
  onToggleVerification: (userId: string) => void;
  view: string;
  onNavigate: (page: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  state,
  onSetPerformance,
  onToggleVerification,
  view,
  onNavigate,
}) => {
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [performanceInput, setPerformanceInput] = useState<string>("0.50");
  const [searchClient, setSearchClient] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [processingSelected, setProcessingSelected] = useState(false);
  const [forexExposure, setForexExposure] = useState(65.0);

  // ✅ Banco (admin)
  const [adminItems, setAdminItems] = useState<AdminInvestmentItem[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<AdminWithdrawalItem[]>([]);
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const distributionPassphrase = "DISTRIBUIR";

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const moneyFromCents = (cents: number) => cents / 100;
  const normalizeSearch = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const parsedPerformancePercent = Number.parseFloat(performanceInput);
  const validPerformancePercent = Number.isFinite(parsedPerformancePercent) ? parsedPerformancePercent : 0;
  const previewPerformanceFactor = validPerformancePercent / 100;
  const performancePercentLabel = validPerformancePercent.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  async function refreshAdminSummary() {
    if (!access) return;
    try {
      setLoadingSummary(true);
      const s = await getAdminSummary(access);
      setAdminSummary(s);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    refreshAdminSummary().catch(() => {});
  }, [access]);



  async function refreshAdminList() {
    if (!access) return;
    try {
      setLoadingList(true);
      setErrMsg("");

      // pega tudo
      const [investmentsData, withdrawalsData] = await Promise.all([
        listAdminInvestments(access),
        listAdminWithdrawals(access),
      ]);
      const data = investmentsData as AdminInvestmentItem[];
      setAdminWithdrawals(withdrawalsData ?? []);

      // ✅ ordena do mais antigo -> mais novo (menor data/hora primeiro)
      const sorted = [...data].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setAdminItems(sorted);
    } catch (e: any) {
      console.warn(e);
      setErrMsg(e?.message ?? "Falha ao carregar lista admin.");
    } finally {
      setLoadingList(false);
    }
  }

  // ✅ carrega ao abrir tela / mudar role
  useEffect(() => {
    refreshAdminSummary().catch(() => {});
    refreshAdminList().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  useEffect(() => {
    const onNotif = () => {
      refreshAdminSummary().catch(() => {});
      refreshAdminList().catch(() => {});
    };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  
  const handlePerformanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const percent = parsedPerformancePercent;
    if (!access || !Number.isFinite(percent)) {
      alert("Percentual de performance invalido.");
      return;
    }
    const typedPassphrase = window.prompt('Digite a contra-senha para confirmar a distribuicao:');
    if (typedPassphrase === null) return;
    if (typedPassphrase.trim().toUpperCase() !== distributionPassphrase) {
      alert("Contra-senha invalida. Distribuicao cancelada.");
      return;
    }

    createDailyPerformanceDistribution(access, { performance_percent: percent })
      .then(async (rows) => {
        await refreshAdminSummary();
        onSetPerformance(percent);
        alert(`Performance diaria aplicada. Distribuicoes geradas: ${rows.length}.`);
      })
      .catch((err: any) => {
        alert(err?.message ?? "Falha ao distribuir performance diaria.");
      });
  };

  const toggleSelectUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllFiltered = () => {
    setSelectedUserIds((prev) => {
      const allSelected =
        filteredEligibleIds.length > 0 && filteredEligibleIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !filteredEligibleIds.includes(id));
      }
      const merged = new Set([...prev, ...filteredEligibleIds]);
      return [...merged];
    });
  };

  const handleDistributeSelected = async () => {
    const percent = parsedPerformancePercent;
    if (!access || !Number.isFinite(percent)) {
      alert("Percentual de performance invalido.");
      return;
    }
    if (selectedUserIds.length === 0) {
      alert("Selecione pelo menos 1 cliente.");
      return;
    }
    const typedPassphrase = window.prompt('Digite a contra-senha para confirmar a distribuicao:');
    if (typedPassphrase === null) return;
    if (typedPassphrase.trim().toUpperCase() !== distributionPassphrase) {
      alert("Contra-senha invalida. Distribuicao cancelada.");
      return;
    }

    try {
      setProcessingSelected(true);
      let totalRows = 0;

      for (const userId of selectedUserIds) {
        const rows = await createDailyPerformanceDistribution(access, {
          performance_percent: percent,
          user_id: userId,
        });
        totalRows += rows.length;
      }

      await refreshAdminSummary();
      alert(`Distribuicao individual concluida para ${selectedUserIds.length} cliente(s). Registros: ${totalRows}.`);
      setSelectedUserIds([]);
    } catch (err: any) {
      alert(err?.message ?? "Falha ao distribuir performance individual.");
    } finally {
      setProcessingSelected(false);
    }
  };

  // ✅ aprovar/rejeitar INVESTMENT REAL (banco)
  const handleApproveInvestment = async (id: number) => {
    if (!access) return;
    try {
      await approveInvestment(access, id);
      await refreshAdminSummary();
      await refreshAdminList();
    } catch (e: any) {
      alert(e?.message ?? "Falha ao aprovar.");
    }
  };

  const handleRejectInvestment = async (id: number) => {
    if (!access) return;
    try {
      await rejectInvestment(access, id);
      await refreshAdminSummary();
      await refreshAdminList();
    } catch (e: any) {
      alert(e?.message ?? "Falha ao rejeitar.");
    }
  };

  // ---------- SECTIONS ----------
  const safeNumber = (v: any, fallback = 0) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const eligibleClients = useMemo(() => {
    const grouped = new Map<
      number,
      { user_id: number; username: string; email: string; invested_cents: number; capital_out_cents: number }
    >();

    for (const inv of adminItems) {
      if (inv.status !== "APPROVED") continue;
      if (!inv.user_id || inv.user_id <= 0) continue;

      const current = grouped.get(inv.user_id) || {
        user_id: inv.user_id,
        username: inv.user_username || `user-${inv.user_id}`,
        email: inv.user_email || "",
        invested_cents: 0,
        capital_out_cents: 0,
      };
      current.invested_cents += inv.amount_cents || 0;
      grouped.set(inv.user_id, current);
    }

    for (const wd of adminWithdrawals) {
      if (wd.withdrawal_type !== "CAPITAL_REDEMPTION") continue;
      if (wd.status !== "APPROVED" && wd.status !== "PAID") continue;
      if (!wd.user || wd.user <= 0) continue;

      const current = grouped.get(wd.user) || {
        user_id: wd.user,
        username: wd.username || `user-${wd.user}`,
        email: wd.email || "",
        invested_cents: 0,
        capital_out_cents: 0,
      };
      current.capital_out_cents += wd.amount_cents || 0;
      grouped.set(wd.user, current);
    }

    return [...grouped.values()]
      .map((row) => ({
        ...row,
        eligible_cents: Math.max(row.invested_cents - row.capital_out_cents, 0),
      }))
      .filter((row) => row.eligible_cents > 0)
      .sort((a, b) => b.eligible_cents - a.eligible_cents);
  }, [adminItems, adminWithdrawals]);

  const filteredEligibleClients = useMemo(() => {
    const q = normalizeSearch(searchClient);
    if (!q) return eligibleClients;
    return eligibleClients.filter(
      (u) =>
        normalizeSearch(u.username).includes(q) ||
        normalizeSearch(u.email).includes(q) ||
        String(u.user_id).includes(q)
    );
  }, [eligibleClients, searchClient]);

  const filteredEligibleIds = useMemo(
    () => filteredEligibleClients.map((u) => u.user_id),
    [filteredEligibleClients]
  );

  const renderStatsSection = () => {
    const tvl = safeNumber(adminSummary?.tvl_cents, 0) / 100;
    const pendingValue = safeNumber(adminSummary?.pending_cents, 0) / 100;
    const pendingCount = safeNumber(adminSummary?.pending_count, 0);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Sob Gestão (TVL)"
          value={
            <span className="text-emerald-500 font-semibold">
              {formatCurrency(tvl)}
            </span>
          }
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          label="Pendências"
          value={formatCurrency(pendingValue)}
          subValue={`${pendingCount} pendentes`}
          icon={AlertCircle}
          color="amber"
        />

        <StatCard
          label="Performance Hoje"
          value={`${state.lastPerformanceFactor}%`}
          subValue={new Date(state.currentVirtualDate).toLocaleDateString()}
          icon={Activity}
          color="blue"
        />
      </div>
    );
  };



  const renderApprovalsSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <AlertCircle size={20} className="text-amber-500" />
        {view === "admin-withdrawals" ? "Resgates e Liquidações Pendentes" : "Investments (todas)"}
      </h3>

      {errMsg ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errMsg}
        </div>
      ) : null}

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loadingList ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
        ) : adminItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhum aporte registrado.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {adminItems.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="min-w-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1
                      ${
                        inv.status === "APPROVED"
                          ? "bg-emerald-900/20 text-emerald-400"
                          : inv.status === "PENDING"
                          ? "bg-amber-900/30 text-amber-500"
                          : "bg-red-900/20 text-red-400"
                      }`}
                  >
                    {inv.status === "APPROVED" ? "Aprovado" : inv.status === "PENDING" ? "Pendente" : "Rejeitado"}
                  </span>

                  <p className="text-white font-bold">
                    {formatCurrency(moneyFromCents(inv.amount_cents))}
                  </p>

                  {(inv.user_username || inv.user_email) && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono break-all">
                      Cliente: {inv.user_username || "-"}{" "}
                      {inv.user_email ? `(${inv.user_email})` : ""}
                    </p>
                  )}

                  {inv.external_ref ? (
                    <p className="text-[10px] text-slate-600 mt-1 break-all">Ref: {inv.external_ref}</p>
                  ) : null}

                  <p className="text-[10px] text-slate-600 mt-1">
                    {new Date(inv.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>

                {/* ✅ botões só fazem sentido quando PENDING */}
                {inv.status === "PENDING" ? (
                  <div className="flex gap-2 self-start sm:self-center">
                    <button
                      onClick={() => handleRejectInvestment(inv.id)}
                      className="p-2 rounded bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/30"
                      title="Rejeitar"
                    >
                      <XCircle size={20} />
                    </button>

                    <button
                      onClick={() => handleApproveInvestment(inv.id)}
                      className="p-2 rounded bg-emerald-900/20 text-emerald-500 hover:bg-emerald-900/40 border border-emerald-900/30"
                      title="Aprovar"
                    >
                      <CheckCircle size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">—</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPerformanceSection = () => {
    const tvl = safeNumber(adminSummary?.tvl_cents, 0) / 100;
    const clientsBalance = safeNumber(adminSummary?.clients_result_balance_cents, 0) / 100;
    const simulatedClientsGain = tvl * previewPerformanceFactor;
    const simulatedClientsGainPositive = simulatedClientsGain >= 0;
    const consolidatedWallet = tvl + clientsBalance;
    const distributionsUnpaid = safeNumber(adminSummary?.daily_distribution_total_cents, 0) / 100;
    const ledgerManualUnpaid = safeNumber(adminSummary?.result_ledger_manual_total_cents, 0) / 100;
    const resultWithdrawals = safeNumber(adminSummary?.result_settlement_withdrawals_cents, 0) / 100;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          Controle de Performance
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-emerald-400" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Carteira Consolidada</p>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(consolidatedWallet)}</p>
              <p className="text-xs text-slate-400 mt-1">
                TVL em gestao + saldo de todos os clientes (distribuicoes/ledger).
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">TVL</p>
                  <p className="text-sm font-semibold text-emerald-400">{formatCurrency(tvl)}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Saldo Clientes</p>
                  <p className="text-sm font-semibold text-blue-300">{formatCurrency(clientsBalance)}</p>
                </div>
                <div
                  className={`rounded-lg border px-3 py-2 ${
                    simulatedClientsGainPositive
                      ? "border-emerald-900/40 bg-emerald-900/10"
                      : "border-red-900/40 bg-red-900/10"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Ganho Simulado TVL ({performancePercentLabel}%)
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      simulatedClientsGainPositive ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {formatCurrency(simulatedClientsGain)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2">
                Base saldo clientes: Distribuiçao de Performance não liquidadas {formatCurrency(distributionsUnpaid)} +
                Resgaste de Aporte não liquidados {formatCurrency(ledgerManualUnpaid)} - Saques Semanal{" "}
                {formatCurrency(resultWithdrawals)}.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <p className="text-sm text-slate-400 mb-6">
          Defina o percentual diario e distribua para todos os contratos ativos ou somente para clientes selecionados.
        </p>

        <form onSubmit={handlePerformanceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Performance Diaria (%)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                step="0.01"
                value={performanceInput}
                onChange={(e) => setPerformanceInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-900 transition-all text-center font-bold text-lg"
              />
              <div className="flex flex-row sm:flex-col gap-1 justify-center">
                <button
                  type="button"
                  onClick={() => setPerformanceInput("0.10")}
                  className="flex-1 text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  Conservador
                </button>
                <button
                  type="button"
                  onClick={() => setPerformanceInput("0.85")}
                  className="flex-1 text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white"
                >
                  Agressivo
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p className="text-xs text-slate-500">
              Data de Referencia:{" "}
              <span className="text-white font-mono">
                {new Date(state.currentVirtualDate).toLocaleDateString()}
              </span>
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20"
          >
            Distribuir para Todos Elegiveis
          </button>
        </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h4 className="text-white font-semibold">Distribuicao Individual (Saldo &gt; 0)</h4>
          <div className="text-xs text-slate-500">
            Selecionados: <span className="text-slate-300 font-mono">{selectedUserIds.length}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              placeholder="Pesquisar por usuario, e-mail ou id..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-3 pr-20 text-sm text-white focus:outline-none focus:border-blue-900"
            />
            {searchClient ? (
              <button
                type="button"
                onClick={() => setSearchClient("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Limpar
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={toggleSelectAllFiltered}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-sm"
          >
            Marcar/Desmarcar filtrados
          </button>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
            {filteredEligibleClients.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Nenhum cliente elegivel encontrado.</div>
            ) : (
              filteredEligibleClients.map((client) => {
                const simulatedDistributionCents = Math.round(client.eligible_cents * previewPerformanceFactor);
                const simulatedDistributionPositive = simulatedDistributionCents >= 0;
                const netAporteCents = Math.max(client.invested_cents - client.capital_out_cents, 0);
                return (
                  <label
                    key={client.user_id}
                    className="block p-3 bg-slate-950/30 hover:bg-slate-800/30 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(client.user_id)}
                          onChange={() => toggleSelectUser(client.user_id)}
                          className="accent-blue-600"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 truncate">{client.username}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {client.email || "sem-email"} - id {client.user_id}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`shrink-0 rounded-lg border px-3 py-2 text-right ${
                          simulatedDistributionPositive
                            ? "border-emerald-900/40 bg-emerald-900/10"
                            : "border-red-900/40 bg-red-900/10"
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">
                          Ganho simul. ({performancePercentLabel}%)
                        </p>
                        <p
                          className={`text-sm font-bold font-mono ${
                            simulatedDistributionPositive ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {formatCurrency(moneyFromCents(simulatedDistributionCents))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Aporte Total Atual</p>
                        <p className="text-sm font-semibold text-slate-200 font-mono">
                          {formatCurrency(moneyFromCents(netAporteCents))}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          Bruto {formatCurrency(moneyFromCents(client.invested_cents))} - Resgatado{" "}
                          {formatCurrency(moneyFromCents(client.capital_out_cents))}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          Saldo de Resgate Atual
                        </p>
                        <p className="text-sm font-semibold text-emerald-400 font-mono">
                          {formatCurrency(moneyFromCents(client.eligible_cents))}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDistributeSelected}
          disabled={processingSelected || selectedUserIds.length === 0}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-all"
        >
          {processingSelected ? "Processando..." : "Distribuir para Selecionados"}
        </button>
      </div>
      </div>
    );
  };

  const renderComplianceSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <UserCheck size={20} className="text-purple-500" />
        Compliance & Verificação (KYC)
      </h3>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Data de Cadastro</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {state.users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{new Date(user.joinedDate).toLocaleDateString("pt-BR")}</td>
                  <td className="px-6 py-4">
                    {user.isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500">
                        <ShieldCheck size={12} />
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500">
                        <ShieldOff size={12} />
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onToggleVerification(user.id)}
                      className={`py-1 px-3 text-xs font-medium rounded border transition-colors ${
                        user.isVerified
                          ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                          : "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
                      }`}
                    >
                      {user.isVerified ? "Invalidar" : "Aprovar KYC"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="block md:hidden p-2">
          <div className="space-y-2">
            {state.users.map((user) => (
              <div key={user.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full" />
                    <div>
                      <p className="font-medium text-slate-200 text-sm">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.id}</p>
                    </div>
                  </div>
                  {user.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500">
                      <ShieldCheck size={12} /> Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500">
                      <ShieldOff size={12} /> Pendente
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                  <div className="text-xs text-slate-500">
                    Cadastro:{" "}
                    <span className="text-slate-400 font-medium">
                      {new Date(user.joinedDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <button
                    onClick={() => onToggleVerification(user.id)}
                    className={`py-1 px-3 text-xs font-medium rounded border transition-colors ${
                      user.isVerified
                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        : "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500"
                    }`}
                  >
                    {user.isVerified ? "Invalidar" : "Aprovar KYC"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminNavTabs = () => {
    const tabs = [
      { id: "admin-dashboard", route: "admin/dashboard", label: "Geral", icon: Globe },
      { id: "admin-withdrawals", route: "admin/withdrawals", label: "Resgates", icon: AlertCircle },
      { id: "admin-performance", route: "admin/performance", label: "Performance", icon: Activity },
      { id: "admin-compliance", route: "admin/clients", label: "KYC", icon: UserCheck },
    ];

    return (
      <div className="block lg:hidden mb-4">
        <div className="border-b border-slate-800">
          <nav className="-mb-px flex space-x-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.route)}
                className={`${
                  view === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-500"
                } flex-1 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex flex-col items-center justify-center gap-1.5`}
              >
                <tab.icon size={16} />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case "admin-withdrawals":
        return renderApprovalsSection();
      case "admin-performance":
        return renderPerformanceSection();
      case "admin-compliance":
        return renderComplianceSection();
      case "admin-dashboard":
      default:
        return (
          <div className="grid md:grid-cols-2 gap-6">
            {renderApprovalsSection()}
            {renderPerformanceSection()}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderAdminNavTabs()}

      {view === "admin-dashboard" && (
        <>
          {renderStatsSection()}
          {loadingSummary ? (
            <div className="text-xs text-slate-500">Atualizando TVL/Pendências...</div>
          ) : null}
        </>
      )}

      {renderContent()}
    </div>
  );
};

export default AdminDashboard;


