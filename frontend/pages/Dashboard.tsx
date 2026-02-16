import React from "react";
import { SystemState, TransactionStatus } from "../types";
import StatCard from "../components/StatCard";
import { Wallet, TrendingUp, Archive, ArrowUpRight, Repeat, AlertTriangle } from "lucide-react";

interface DashboardProps {
  state: SystemState;
  onNavigate: (page: string) => void;
  onReinvest: () => void;

  // ✅ NOVO: Pix
  onOpenPix: () => void;
  amountInput: string;
  setAmountInput: (v: string) => void;
  loadingPix: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  state,
  onNavigate,
  onReinvest,
  onOpenPix,
  amountInput,
  setAmountInput,
  loadingPix,
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const recentTransactions = state.transactions.slice(0, 5);

  const getStatusBadge = (status: TransactionStatus) => (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
        status === "COMPLETED" || status === "APPROVED"
          ? "bg-slate-700 text-slate-300"
          : status === "ANALYSIS"
          ? "bg-amber-900/30 text-amber-500"
          : "bg-red-900/20 text-red-500"
      }`}
    >
      {status === "COMPLETED" || status === "APPROVED"
        ? "Processado"
        : status === "ANALYSIS"
        ? "Em Análise"
        : "Rejeitado"}
    </span>
  );

  return (
    <>
      <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg flex flex-col sm:flex-row gap-3 items-start">
        <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
          <strong>Aviso de Risco:</strong> A rentabilidade passada não representa garantia de rentabilidade futura.
          Ativos digitais são investimentos de risco. Leia a Política de Riscos e o Contrato de Prestação de Serviços
          antes de operar.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          label="Patrimônio Principal"
          value={formatCurrency(state.balanceCapital)}
          subValue="Capital sob gestão"
          icon={Wallet}
          color="slate"
        />
        <StatCard
          label="Performance Acumulada"
          value={formatCurrency(state.balanceResults)}
          subValue="Resultado disponível"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          label="Total Aportado"
          value={formatCurrency(state.totalContributed)}
          subValue="Histórico de entradas"
          icon={Archive}
          color="slate"
        />

        {/* ✅ Card de ação (mantendo o padrão) */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 flex flex-col justify-center gap-3">
          {/* input valor */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Valor do aporte (mín. R$ 300,00)</label>
            <input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-700"
              placeholder="300,00"
              inputMode="decimal"
            />
            <div className="mt-1 text-[10px] text-slate-500">Use vírgula: 500,00</div>
          </div>

          <button
            onClick={onOpenPix}
            disabled={loadingPix}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-white disabled:opacity-60 text-slate-900 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={16} />
            {loadingPix ? "Gerando Pix..." : "Gerar Pix"}
          </button>

          <button
            onClick={onReinvest}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700"
          >
            <Repeat size={16} />
            Reinvestir Resultado
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Movimentações Recentes</h3>
          <button
            onClick={() => onNavigate("transactions")}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver extrato completo
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 md:p-12 text-center text-slate-500 text-sm">
            <p>Nenhuma movimentação registrada.</p>
          </div>
        ) : (
          <div>
            <div className="md:hidden p-4 space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-300 text-sm font-medium break-all pr-2">{tx.description}</span>
                    <span className="font-medium whitespace-nowrap text-slate-200">
                      {tx.type.includes("REDEMPTION") ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{new Date(tx.date).toLocaleDateString("pt-BR")}</span>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/30 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Operação</th>
                    <th className="px-6 py-4">Data de Apuração</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-300">{tx.description}</td>
                      <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-6 py-4">{getStatusBadge(tx.status)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-200">
                        {tx.type.includes("REDEMPTION") ? "-" : "+"}
                        {formatCurrency(tx.amount)}
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
