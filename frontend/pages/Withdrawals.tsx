import React, { useEffect, useMemo, useRef, useState } from "react";
import { SystemState } from "../types";
import {
  Wallet,
  ShieldCheck,
  CheckCircle,
  FileSearch,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
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

const toInputDate = (value?: string | number) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateBR = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleDateString("pt-BR");
};

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

/** ---------- Regras de data (FRONT) ---------- **/

// Evita bug de timezone: sempre interpreta yyyy-mm-dd como "meia-noite local"
const asLocalDate = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00`);

const isFridayInput = (yyyyMmDd: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return false;
  return asLocalDate(yyyyMmDd).getDay() === 5; // 5 = sexta (JS)
};

const maxDateStr = (a: string, b?: string | null) => {
  if (!b) return a;
  return a > b ? a : b; // yyyy-mm-dd compara lexicograficamente OK
};

// Próxima sexta a partir de hoje (se hoje for sexta, pega a próxima semana)
const getNextFridayFromToday = () => {
  const today = new Date();
  const day = today.getDay(); // 0..6
  const diff = ((5 - day + 7) % 7) || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + diff);
  return toInputDate(friday.getTime());
};

// Primeira sexta >= startYmd (se start já for sexta e includeIfFriday=true, retorna start)
const nextFridayFrom = (startYmd: string, includeIfFriday = true) => {
  const start = asLocalDate(startYmd);
  const day = start.getDay(); // 0..6
  let diff = (5 - day + 7) % 7; // sexta = 5
  if (!includeIfFriday && diff === 0) diff = 7;
  const d = new Date(start);
  d.setDate(start.getDate() + diff);
  return toInputDate(d.getTime());
};

const Withdrawals: React.FC<WithdrawalsProps> = ({ state: _state }) => {
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const todayDate = useMemo(() => toInputDate(Date.now()), []);
  const nextFriday = useMemo(() => getNextFridayFromToday(), []);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"CAPITAL" | "RESULT">("RESULT");

  // ✅ Regra “ao contrário”:
  // - RESULT: usuário escolhe a sexta (input aparece)
  // - CAPITAL: data automática (sem input)
  const [scheduledDate, setScheduledDate] = useState(nextFriday);

  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const summaryRequestSeq = useRef(0);

  async function loadWithdrawalData(
    referenceDate?: string,
    options?: { silent?: boolean; refreshItems?: boolean }
  ) {
    if (!access) return;
    const silent = !!options?.silent;
    const refreshItems = options?.refreshItems ?? true;
    const requestSeq = ++summaryRequestSeq.current;
    if (!silent) setLoading(true);
    setErrorMsg("");
    try {
      const [summaryData, withdrawalsData] = await Promise.all([
        getWithdrawalSummary(access, referenceDate),
        refreshItems ? listWithdrawals(access) : Promise.resolve(null),
      ]);
      if (requestSeq !== summaryRequestSeq.current) return;
      setSummary(summaryData);
      if (withdrawalsData) setItems(withdrawalsData);
    } catch (err: any) {
      if (requestSeq !== summaryRequestSeq.current) return;
      setErrorMsg(err?.message ?? "Falha ao carregar dados de resgate.");
    } finally {
      if (requestSeq !== summaryRequestSeq.current) return;
      if (!silent) setLoading(false);
      if (!initialized) setInitialized(true);
    }
  }

  useEffect(() => {
    const refreshItems = !initialized || type !== "CAPITAL";
    loadWithdrawalData(undefined, { silent: initialized, refreshItems });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, type, initialized]);

  useEffect(() => {
    const onNotif = () => loadWithdrawalData(undefined, { silent: true });
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, type]);

  // Data mínima para CAPITAL = maior entre hoje e cutoff (90 dias do 1º aporte)
  const capitalMinDate = useMemo(() => {
    return maxDateStr(todayDate, summary?.capital_cutoff_date ?? null);
  }, [todayDate, summary?.capital_cutoff_date]);

  // ✅ CAPITAL: data automática (próxima sexta >= capitalMinDate)
  useEffect(() => {
    if (type === "CAPITAL") {
      setErrorMsg("");
      setScheduledDate(nextFridayFrom(capitalMinDate, true));
    }
  }, [type, capitalMinDate]);

  // ✅ RESULT: default quando muda para RESULT -> próxima sexta
  useEffect(() => {
    if (type === "RESULT") {
      setErrorMsg("");
      if (!scheduledDate || !isFridayInput(scheduledDate) || scheduledDate < nextFriday) {
        setScheduledDate(nextFriday);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, nextFriday]);

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

  const scheduledIsValid =
    type === "CAPITAL"
      ? !!scheduledDate && isFridayInput(scheduledDate) && scheduledDate >= capitalMinDate
      : !!scheduledDate && isFridayInput(scheduledDate) && scheduledDate >= nextFriday;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValue || !access) return;

    // trava final no front
    if (!scheduledIsValid) {
      setErrorMsg("Escolha uma sexta-feira válida para agendar.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      await createWithdrawal(access, {
        withdrawal_type: type === "CAPITAL" ? "CAPITAL_REDEMPTION" : "RESULT_SETTLEMENT",
        amount: amountValue,
        // ✅ Agora sempre manda scheduled_for (CAPITAL é automático; RESULT escolhido)
        scheduled_for: scheduledDate,
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
            Solicitar Resgate/Saque
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
              Saque Semanal
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
              {type === "CAPITAL" ? "Capital Disponível Total" : "Saldo de Resultados Disponível"}
            </p>
            <p className="text-xl font-bold text-white">{toCurrency(displayAvailable)}</p>

            {type === "CAPITAL" && summary?.capital_cutoff_date && (
              <p className="text-[11px] text-slate-600 mt-1">
                Corte de capital para resgate: {formatDateBR(summary.capital_cutoff_date)}.
              </p>
            )}

            {type === "CAPITAL" && (
              <p className="text-[11px] text-slate-600 mt-1">
                Data automática: {scheduledDate ? formatDateBR(scheduledDate) : "-"} (próxima sexta após o prazo).
              </p>
            )}

            {type === "RESULT" && (
              <p className="text-[11px] text-slate-600 mt-1">
                Escolha uma sexta-feira (mínimo {formatDateBR(nextFriday)}).
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

              {/* ✅ AO CONTRÁRIO: input de data aparece só no RESULT */}
              {type === "RESULT" && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Agendamento
                    <small>(toda sexta-feira)</small>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-500 pointer-events-none">
                      <CalendarIcon size={16} />
                    </span>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={nextFriday}
                      onChange={(e) => {
                        const value = e.target.value;

                        if (!value) return;

                        // bloqueia qualquer dia que não seja sexta
                        if (!isFridayInput(value)) {
                          setErrorMsg("Só é permitido agendar em uma sexta-feira.");
                          return;
                        }

                        // bloqueia datas anteriores à próxima sexta
                        if (value < nextFriday) {
                          setErrorMsg(`Escolha uma sexta a partir de ${formatDateBR(nextFriday)}.`);
                          return;
                        }

                        setErrorMsg("");
                        setScheduledDate(value);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-900/10 border border-blue-900/30 rounded p-4 flex gap-3 items-start">
              <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-blue-300/80 space-y-1 leading-relaxed">
                <p>Todas as solicitações passam por análise preventiva e validação operacional.</p>
                <p className="mt-2">
                  <strong>Saque Semanal</strong>: agendar apenas em sextas-feiras (usuário escolhe a sexta).{" "}
                  <strong>Resgate de Capital</strong>: data automática (sexta) e somente após 90 dias do primeiro aporte.
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
                !scheduledIsValid
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

                  <span className="text-slate-300 text-sm font-medium">
                    {toCurrency(centsToReais(item.amount_cents))}
                  </span>
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