import React, { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import { Wallet, TrendingUp, Archive, ArrowUpRight } from "lucide-react";
import { SystemState } from "../types";
import { InvestmentItem, listInvestments } from "../services/api";
import { useAuth } from "../layouts/AuthContext";
import Money from "../components/Money";

interface DashboardProps {
  state: SystemState;
  onNavigate: (page: string) => void;
  onOpenPix: () => void;
  amountInput?: string;
  setAmountInput?: (v: string) => void;
  loadingPix?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  state,
  onNavigate,
  onOpenPix,
  amountInput = "",
  setAmountInput = () => {},
  loadingPix = false,
}) => {
  const { getAccessToken, user } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [recentInvestments, setRecentInvestments] = useState<InvestmentItem[]>([]);
  const [loadingRecentInvestments, setLoadingRecentInvestments] = useState(false);
  const [recentInvestmentsError, setRecentInvestmentsError] = useState("");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const loadRecentInvestments = async () => {
    if (!access) return;
    try {
      setLoadingRecentInvestments(true);
      setRecentInvestmentsError("");

      const data = await listInvestments(access);
      const filtered = (data as any[]).filter((item) => {
        if (!user?.id) return true;
        if (item.user_id === undefined || item.user_id === null) return true;
        return Number(item.user_id) === Number(user.id);
      }) as InvestmentItem[];

      const sorted = [...filtered].sort((a, b) => {
        const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id) - Number(a.id);
      });

      setRecentInvestments(sorted.slice(0, 5));
    } catch (e: any) {
      setRecentInvestmentsError(e?.message ?? "Falha ao carregar aportes recentes.");
    } finally {
      setLoadingRecentInvestments(false);
    }
  };

  useEffect(() => {
    loadRecentInvestments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, user?.id]);

  useEffect(() => {
    const onNotif = () => {
      loadRecentInvestments();
    };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, user?.id]);

  const getStatusBadge = (status: InvestmentItem["status"]) => (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
        status === "APPROVED"
          ? "bg-emerald-900/20 text-emerald-400"
          : status === "PENDING"
          ? "bg-amber-900/30 text-amber-500"
          : "bg-red-900/20 text-red-500"
      }`}
    >
      {status === "APPROVED" ? "Aprovado" : status === "PENDING" ? "Pendente" : "Rejeitado"}
    </span>
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          label="Patrimonio Principal"
          value={<Money>{formatCurrency(state.balanceCapital)}</Money>}
          subValue="Capital sob gestao"
          icon={Wallet}
          color="slate"
        />
        <StatCard
          label="Performance Acumulada"
          value={<Money>{formatCurrency(state.balanceResults)}</Money>}
          subValue="Ganhos em destaque"
          icon={TrendingUp}
          color="emerald"
          isAnimated
        />
        <StatCard
          label="Total Aportado"
          value={formatCurrency(state.totalContributed)}
          subValue="Historico de entradas"
          icon={Archive}
          color="slate"
        />

        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 flex flex-col justify-center gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Valor do aporte (min. R$ 300,00)</label>
            <input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-700"
              placeholder="300,00"
              inputMode="decimal"
            />
            <div className="mt-1 text-[10px] text-slate-500">Use virgula: 500,00</div>
          </div>

          <button
            onClick={onOpenPix}
            disabled={loadingPix}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-white disabled:opacity-60 text-slate-900 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={16} />
            {loadingPix ? "Gerando Pix..." : "Gerar Pix"}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Movimentacoes Recentes</h3>
          <button
            onClick={() => onNavigate("transactions")}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver extrato completo
          </button>
        </div>

        {loadingRecentInvestments ? (
          <div className="p-8 md:p-12 text-center text-slate-500 text-sm">
            <p>Carregando movimentacoes...</p>
          </div>
        ) : recentInvestmentsError ? (
          <div className="p-6 text-sm text-red-300 bg-red-500/10 border-t border-red-500/20">
            {recentInvestmentsError}
          </div>
        ) : recentInvestments.length === 0 ? (
          <div className="p-8 md:p-12 text-center text-slate-500 text-sm">
            <p>Nenhum aporte registrado.</p>
          </div>
        ) : (
          <div>
            <div className="md:hidden p-4 space-y-3">
              {recentInvestments.map((inv) => (
                <div key={inv.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-500">ID</span>
                      <p className="text-slate-200 font-medium">#{inv.id}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Valor</span>
                      <p className="text-slate-200 font-medium">{formatCurrency(inv.amount_cents / 100)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{new Date(inv.created_at).toLocaleDateString("pt-BR")}</span>
                    {getStatusBadge(inv.status)}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/30 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentInvestments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-300">#{inv.id}</td>
                      <td className="px-6 py-4">{new Date(inv.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-200">
                        {formatCurrency(inv.amount_cents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
