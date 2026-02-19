import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { SystemState, Transaction } from "../types";
import { InvestmentItem, listInvestments } from "../services/api";
import { useAuth } from "../layouts/AuthContext";

interface TransactionsProps {
  state: SystemState;
}

type StatementRow = {
  id: string;
  date: string;
  operation: "APORTE" | "RESGATE";
  description: string;
  status: string;
  amount: number;
  direction: "IN" | "OUT";
};

const Transactions: React.FC<TransactionsProps> = ({ state }) => {
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [loadingInvestments, setLoadingInvestments] = useState(false);
  const [investmentsError, setInvestmentsError] = useState("");

  useEffect(() => {
    if (!access) return;

    const loadInvestments = async () => {
      try {
        setLoadingInvestments(true);
        setInvestmentsError("");
        const data = await listInvestments(access);
        setInvestments(data ?? []);
      } catch (e: any) {
        setInvestmentsError(e?.message ?? "Falha ao carregar aportes.");
      } finally {
        setLoadingInvestments(false);
      }
    };

    loadInvestments();
  }, [access]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const mapInvestmentStatus = (status: string) => {
    if (status === "APPROVED") return "Aprovado";
    if (status === "PENDING") return "Pendente";
    if (status === "REJECTED") return "Rejeitado";
    return status;
  };

  const mapRedemptionStatus = (status: string) => {
    if (status === "COMPLETED") return "Concluido";
    if (status === "ANALYSIS") return "Em Analise";
    if (status === "REJECTED") return "Rejeitado";
    if (status === "APPROVED") return "Aprovado";
    return status;
  };

  const rows = useMemo<StatementRow[]>(() => {
    const aporteRows: StatementRow[] = investments.map((inv) => ({
      id: String(inv.id),
      date: inv.created_at,
      operation: "APORTE",
      description: `Aporte #${inv.id}`,
      status: mapInvestmentStatus(inv.status),
      amount: (inv.amount_cents ?? 0) / 100,
      direction: "IN",
    }));

    const resgateRows: StatementRow[] = state.transactions
      .filter((tx) => tx.type.includes("REDEMPTION"))
      .map((tx: Transaction) => ({
        id: String(tx.id),
        date: tx.date,
        operation: "RESGATE",
        description: tx.description || `Resgate #${tx.id}`,
        status: mapRedemptionStatus(tx.status),
        amount: tx.amount,
        direction: "OUT",
      }));

    return [...aporteRows, ...resgateRows].sort((a, b) => {
      const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (byDate !== 0) return byDate;
      return b.id.localeCompare(a.id);
    });
  }, [investments, state.transactions]);

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
        status === "Aprovado" || status === "Concluido"
          ? "bg-emerald-900/20 text-emerald-400"
          : status === "Pendente" || status === "Em Analise"
          ? "bg-amber-900/20 text-amber-500"
          : "bg-red-900/20 text-red-500"
      }`}
    >
      {status}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
        <h2 className="text-xl font-bold text-white">Extrato Financeiro</h2>
        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors text-xs font-medium w-full sm:w-auto">
          <Download size={14} />
          Exportar PDF
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        {loadingInvestments ? (
          <div className="px-6 py-12 text-center text-slate-500">Carregando extrato...</div>
        ) : investmentsError ? (
          <div className="px-6 py-4 text-sm text-red-300 bg-red-500/10 border-b border-red-500/20">
            {investmentsError}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-600">Nenhum registro encontrado.</div>
        ) : (
          <div>
            <div className="md:hidden p-4 space-y-3">
              {rows.map((row) => (
                <div key={`${row.operation}-${row.id}`} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-4">
                      <span className="text-slate-300 text-sm font-medium block">{row.description}</span>
                      <span className="text-slate-500 text-xs">ID: {row.id}</span>
                    </div>
                    <span className={`text-lg font-medium whitespace-nowrap ${row.direction === "OUT" ? "text-slate-400" : "text-slate-200"}`}>
                      {row.direction === "OUT" ? "-" : "+"} {formatCurrency(row.amount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">Data</div>
                      <div className="text-slate-300">{new Date(row.date).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Operacao</div>
                      <div className="font-mono text-slate-300">{row.operation}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500 mb-1">Status</div>
                      <StatusBadge status={row.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Operacao</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Descricao</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((row) => (
                    <tr key={`${row.operation}-${row.id}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300">{new Date(row.date).toLocaleDateString("pt-BR")}</div>
                        <div className="text-[10px] text-slate-600">{new Date(row.date).toLocaleTimeString("pt-BR")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-300">{row.operation}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">{row.id}</td>
                      <td className="px-6 py-4 text-slate-300 text-xs">{row.description}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className={`px-6 py-4 text-right font-medium text-sm ${row.direction === "OUT" ? "text-slate-400" : "text-slate-200"}`}>
                        {row.direction === "OUT" ? "-" : "+"} {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
