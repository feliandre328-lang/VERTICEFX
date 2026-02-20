import React, { useEffect, useMemo, useState } from "react";
import { SystemState } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  LineChart,
  Line,
} from "recharts";
import { Repeat, Info, TrendingUp, Wallet, Percent } from "lucide-react";
import { useAuth } from "../layouts/AuthContext";
import {
  getWithdrawalSummary,
  listDailyPerformanceDistributions,
  type DailyPerformanceDistribution,
} from "../services/api";

interface YieldsProps {
  state: SystemState;
  onReinvest: () => void;
}

const Yields: React.FC<YieldsProps> = ({ onReinvest }) => {
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [rows, setRows] = useState<DailyPerformanceDistribution[]>([]);
  const [availableResultCents, setAvailableResultCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!access) return;
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const [summary, dist] = await Promise.all([
          getWithdrawalSummary(access),
          listDailyPerformanceDistributions(access),
        ]);
        setAvailableResultCents(summary.available_result_cents ?? 0);
        setRows(dist ?? []);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Falha ao carregar relatório de performance.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [access]);

  useEffect(() => {
    if (!access) return;
    const onNotif = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const [summary, dist] = await Promise.all([
          getWithdrawalSummary(access),
          listDailyPerformanceDistributions(access),
        ]);
        setAvailableResultCents(summary.available_result_cents ?? 0);
        setRows(dist ?? []);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Falha ao carregar relatorio de performance.");
      } finally {
        setLoading(false);
      }
    };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
  }, [access]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => new Date(a.reference_date).getTime() - new Date(b.reference_date).getTime())
        .slice(-30)
        .map((r) => ({
          date: new Date(r.reference_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          amount: (r.result_cents ?? 0) / 100,
          factor: Number(r.performance_percent ?? 0),
          base: (r.base_capital_cents ?? 0) / 100,
        })),
    [rows]
  );

  const distributedTotal = useMemo(
    () => rows.reduce((sum, r) => sum + (r.result_cents ?? 0), 0) / 100,
    [rows]
  );
  const avgPerformance = useMemo(() => {
    if (!rows.length) return 0;
    const total = rows.reduce((sum, r) => sum + Number(r.performance_percent ?? 0), 0);
    return total / rows.length;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 bg-slate-900 p-6 rounded-lg border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Relatório de Performance</h2>
          <p className="text-sm text-slate-500">
            Resultado líquido, variação diária e detalhamento das distribuições realizadas.
          </p>
        </div>
        <div className="text-left sm:text-right mt-2 sm:mt-0">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Resultado Líquido Disponível</p>
          <h3 className="text-3xl font-semibold text-white tracking-tight">{formatCurrency(availableResultCents / 100)}</h3>
          <button
            onClick={onReinvest}
            className="mt-3 text-xs flex items-center justify-center sm:justify-end gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-2 rounded transition-colors w-full sm:w-auto ml-auto border border-slate-700 font-medium"
          >
            <Repeat size={14} />
            Reinvestir em novo contrato
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider">Valor Distribuído</div>
          <div className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            <Wallet size={16} className="text-slate-400" />
            {formatCurrency(distributedTotal)}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider">Variação Média Diária (%)</div>
          <div className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            <Percent size={16} className="text-slate-400" />
            {avgPerformance.toFixed(4)}%
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-slate-500 text-xs uppercase tracking-wider">Última Variação (%)</div>
          <div className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-400" />
            {rows.length ? Number(rows[0].performance_percent).toFixed(4) : "0.0000"}%
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded p-4 flex gap-3">
        <Info size={20} className="text-slate-500 shrink-0" />
        <p className="text-xs text-slate-400">
          <strong>Nota de Transparência:</strong> o valor distribuído é registrado por data de referência e fica
          disponível para liquidação conforme o saldo de resultados.
        </p>
      </div>

      {errorMsg ? (
        <div className="rounded border border-red-800/60 bg-red-900/20 px-4 py-3 text-xs text-red-300">{errorMsg}</div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 h-72 md:h-80">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Variação Diária da Performance (%)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#475569"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Number(val).toFixed(2)}%`}
              />
              <Tooltip
                cursor={{ stroke: "#475569", strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", fontSize: "12px" }}
                formatter={(value: number) => [`${value.toFixed(4)}%`, "Performance"]}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="factor" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 h-72 md:h-80">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Valor Distribuído (R$)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
              <Tooltip
                cursor={{ fill: "#1e293b" }}
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", fontSize: "12px" }}
                formatter={(value: number) => [formatCurrency(value), "Distribuído"]}
              />
              <ReferenceLine y={0} stroke="#334155" />
              <Bar dataKey="amount" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/30">
          <h4 className="text-sm font-bold text-slate-300">Detalhamento de Distribuição</h4>
        </div>
        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Carregando distribuições...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhuma distribuição registrada.</div>
          ) : (
            rows.map((item) => (
              <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
                <div>
                  <p className="text-slate-300 text-sm font-medium">
                    Distribuição {new Date(item.reference_date).toLocaleDateString("pt-BR")} | Base:{" "}
                    {formatCurrency((item.base_capital_cents ?? 0) / 100)} | Perf: {Number(item.performance_percent).toFixed(4)}%
                  </p>
                  <p className="text-xs text-slate-500">
                    Registro em {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    {item.note ? ` | ${item.note}` : ""}
                  </p>
                </div>
                <span className="text-slate-200 font-mono text-sm">+{formatCurrency((item.result_cents ?? 0) / 100)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Yields;
