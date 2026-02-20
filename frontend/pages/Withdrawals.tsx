import React, { useEffect, useMemo, useState } from "react";
import { SystemState } from "../types";
import { Wallet, ShieldCheck, CheckCircle, FileSearch, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useAuth } from "../layouts/AuthContext";
import {
  createWithdrawal,
  getWithdrawalSummary,
  listWithdrawals,
  type WithdrawalItem,
  type WithdrawalSummary,
  type WithdrawalType,
} from "../services/api";

interface WithdrawalsProps {
  state: SystemState;
  onRequestWithdrawal: (amount: number, type: "CAPITAL" | "RESULT", date: string) => void;
}

const toCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const centsToReais = (cents: number) => cents / 100;
const parsePtBrCurrency = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const statusLabel = (status: string) => {
  if (status === "PENDING") return "Em análise";
  if (status === "APPROVED") return "Aprovado";
  if (status === "PAID") return "Pago";
  if (status === "REJECTED") return "Rejeitado";
  return status;
};

const typeLabel = (kind: WithdrawalType) =>
  kind === "CAPITAL_REDEMPTION" ? "Resgate de Capital" : "Liquidação de Resultados";

const Withdrawals: React.FC<WithdrawalsProps> = ({ state }) => {
  const { getAccessToken } = useAuth();

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"CAPITAL" | "RESULT">("RESULT");
  const [scheduledDate, setScheduledDate] = useState("");
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  async function loadWithdrawalData(referenceDate?: string, options?: { silent?: boolean }) {
    if (!access) return;
    const silent = !!options?.silent;
    if (!silent) setLoading(true);
    setErrorMsg("");
    try {
      const [summaryData, withdrawalsData] = await Promise.all([
        getWithdrawalSummary(access, referenceDate),
        listWithdrawals(access),
      ]);
      setSummary(summaryData);
      setItems(withdrawalsData);
      if (!scheduledDate && summaryData.capital_cutoff_date) {
        setScheduledDate(summaryData.capital_cutoff_date);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao carregar dados de resgate.");
    } finally {
      if (!silent) setLoading(false);
      if (!initialized) setInitialized(true);
    }
  }

  useEffect(() => {
    const refDate = type === "CAPITAL" ? scheduledDate || undefined : undefined;
    loadWithdrawalData(refDate, { silent: initialized });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, type, scheduledDate, initialized]);

  useEffect(() => {
    const onNotif = () => {
      const refDate = type === "CAPITAL" ? scheduledDate || undefined : undefined;
      loadWithdrawalData(refDate, { silent: true });
    };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, type, scheduledDate]);

  useEffect(() => {
    if (type === "CAPITAL") {
      setScheduledDate(summary?.capital_cutoff_date ?? "");
      return;
    }
    setScheduledDate(new Date(state.currentVirtualDate || Date.now()).toISOString().split("T")[0]);
  }, [type, summary?.capital_cutoff_date, state.currentVirtualDate]);

  const maxAvailable =
    type === "CAPITAL"
      ? centsToReais(summary?.available_capital_cents ?? 0)
      : centsToReais(summary?.available_result_cents ?? 0);

  const displayAvailable =
    type === "CAPITAL"
      ? centsToReais(summary?.available_capital_cents ?? 0)
      : centsToReais(summary?.available_result_cents ?? 0);
  const amountValue = parsePtBrCurrency(amount);
  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setAmount("");
      return;
    }
    const value = Number(digits) / 100;
    setAmount(value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValue || !access) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      await createWithdrawal(access, {
        withdrawal_type: type === "CAPITAL" ? "CAPITAL_REDEMPTION" : "RESULT_SETTLEMENT",
        amount: amountValue,
        scheduled_for: type === "CAPITAL" ? scheduledDate : undefined,
      });
      setAmount("");
      await loadWithdrawalData(undefined, { silent: true });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao solicitar resgate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Wallet className="text-slate-400" size={20} />
            Solicitar Resgate
          </h3>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={() => {
                setType("RESULT");
                setAmount("");
              }}
              className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all ${
                type === "RESULT"
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
              }`}
            >
              Liquidação de Resultados
            </button>
            <button
              onClick={() => {
                setType("CAPITAL");
                setAmount("");
              }}
              className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all ${
                type === "CAPITAL"
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
              }`}
            >
              Resgate de Capital
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-950 rounded border border-slate-800">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
              {type === "CAPITAL" ? "Capital Disponível (até hoje)" : "Saldo de Resultados Disponível"}
            </p>
            <p className="text-xl font-bold text-white">{toCurrency(displayAvailable)}</p>
            {type === "CAPITAL" && summary?.capital_cutoff_date && (
              <p className="text-[11px] text-slate-600 mt-1">
                Corte de capital para resgate: {new Date(summary.capital_cutoff_date).toLocaleDateString("pt-BR")}.
              </p>
            )}
          </div>

          {errorMsg ? (
            <div className="mb-4 rounded border border-red-800/60 bg-red-900/20 px-3 py-2 text-xs text-red-300">
              {errorMsg}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Valor da Ordem
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-500">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 placeholder:text-slate-700"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Data do Agendamento
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500 pointer-events-none">
                    <CalendarIcon size={16} />
                  </span>
                  <input
                    type="date"
                    value={scheduledDate}
                    min={type === "RESULT" ? new Date(state.currentVirtualDate || Date.now()).toISOString().split("T")[0] : undefined}
                    max={type === "CAPITAL" ? summary?.capital_cutoff_date : undefined}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 [color-scheme:dark]"
                    required={type === "CAPITAL"}
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-900/10 border border-blue-900/30 rounded p-4 flex gap-3 items-start">
              <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-blue-300/80 space-y-1 leading-relaxed">
                <p>Todas as solicitações passam por análise preventiva e validação operacional.</p>
                <p className="mt-2">
                  <strong>Prazo Operacional:</strong> D+3 (3 dias úteis) a partir da data agendada.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                submitting ||
                !amount ||
                amountValue <= 0 ||
                amountValue > maxAvailable ||
                (type === "CAPITAL" && !scheduledDate)
              }
              className="w-full py-3 bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold rounded-lg transition-all"
            >
              {submitting ? "Enviando..." : "Agendar Solicitação"}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Etapas do Processo</h4>
          <ul className="space-y-6 relative">
            <div className="absolute left-3.5 top-0 h-full w-px bg-slate-800 z-0"></div>
            <li className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Solicitação</p>
                <p className="text-xs text-slate-500">O usuário formaliza o pedido na plataforma.</p>
              </div>
            </li>
            <li className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Compliance & KYC</p>
                <p className="text-xs text-slate-500">Validação de titularidade e origem dos fundos.</p>
              </div>
            </li>
            <li className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Liquidação</p>
                <p className="text-xs text-slate-500">Pagamento por PIX/TED para conta de mesma titularidade.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 bg-slate-950/30 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status das Solicitações</h4>
          </div>
          <div className="p-4 space-y-3">
            {loading ? (
              <p className="text-center text-slate-500 text-xs py-2">Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-2">Nenhuma solicitação em andamento.</p>
            ) : (
              items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    {item.status === "PENDING" ? (
                      <FileSearch size={16} className="text-amber-500" />
                    ) : item.status === "PAID" ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : (
                      <Clock size={16} className="text-slate-500" />
                    )}
                    <div>
                      <p className="text-xs text-slate-300 font-medium">
                        {typeLabel(item.withdrawal_type)} - {statusLabel(item.status)}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {new Date(item.requested_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-300 text-sm font-medium">{toCurrency(centsToReais(item.amount_cents))}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdrawals;
