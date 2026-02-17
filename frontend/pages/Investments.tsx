import React, { useEffect, useMemo, useState } from "react";
import { createInvestment, listInvestments, type InvestmentItem } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Investments() {
  const nav = useNavigate();
  const access = useMemo(() => localStorage.getItem("access") || "", []);

  const [amount, setAmount] = useState<string>("300.00");
  const [externalRef, setExternalRef] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [items, setItems] = useState<InvestmentItem[]>([]);

  async function refresh() {
    if (!access) {
      nav("/login", { replace: true });
      return;
    }
    const data = await listInvestments(access);
    setItems(data);
  }

  useEffect(() => {
    refresh().catch((e) => console.warn(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmPaid = async () => {
    setMsg("");

    if (!access) {
      nav("/login", { replace: true });
      return;
    }

    const val = Number(amount.replace(",", "."));
    if (!val || val < 300) {
      setMsg("Valor mínimo do aporte é R$ 300,00.");
      return;
    }

    try {
      setLoading(true);

      await createInvestment(access, {
        amount: val,
        paid_at: new Date().toISOString(),
        external_ref: externalRef || undefined,
      });

      setMsg("Aporte registrado como PENDENTE. Aguarde confirmação manual.");
      setExternalRef("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao registrar aporte");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-white font-bold text-lg">Novo Aporte</h2>
        <p className="text-slate-400 text-sm mt-1">
          Após realizar o pagamento, clique em <b>Já paguei</b> para registrar (fica <b>PENDENTE</b> até aprovação).
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Valor (mín. 300.00)"
            disabled={loading}
            inputMode="decimal"
          />

          <input
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            placeholder="Ref. externa (opcional)"
            disabled={loading}
          />

          <button
            onClick={handleConfirmPaid}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded px-4 py-2 font-bold text-white"
          >
            {loading ? "Enviando..." : "Já paguei"}
          </button>
        </div>

        {msg && <div className="mt-3 text-sm text-slate-200">{msg}</div>}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-bold">Meus Aportes</h3>
          <button
            onClick={() => refresh().catch(() => {})}
            className="text-xs text-slate-300 hover:text-white"
          >
            Atualizar
          </button>
        </div>

        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-slate-500 text-sm">Nenhum aporte ainda.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex justify-between bg-slate-950/40 border border-slate-800 rounded p-3">
                <div className="text-slate-200 text-sm">
                  <div className="font-semibold">{fmt(it.amount_cents)}</div>
                  <div className="text-slate-500 text-xs">
                    {new Date(it.created_at).toLocaleString("pt-BR")}
                  </div>
                  {it.external_ref ? (
                    <div className="text-slate-500 text-xs">ref: {it.external_ref}</div>
                  ) : null}
                </div>

                <div className="text-xs text-slate-300 flex items-center">
                  <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                    {it.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
