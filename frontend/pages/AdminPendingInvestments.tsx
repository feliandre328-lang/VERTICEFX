import React, { useEffect, useMemo, useState } from "react";
import {
  createInvestment,
  listInvestments,
  type Investment,
  type InvestmentStatus,
} from "../services/api";

function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function badge(status: InvestmentStatus) {
  const base = "inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide";
  if (status === "APPROVED") return <span className={`${base} bg-emerald-900/30 text-emerald-400`}>Aprovado</span>;
  if (status === "REJECTED") return <span className={`${base} bg-red-900/20 text-red-400`}>Rejeitado</span>;
  return <span className={`${base} bg-amber-900/30 text-amber-400`}>Em análise</span>;
}

export default function Investments() {
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [items, setItems] = useState<Investment[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // ✅ Passo “Eu já paguei”
  const [amount, setAmount] = useState<number>(0);
  const [externalRef, setExternalRef] = useState<string>("");
  const [sending, setSending] = useState(false);

  const [msg, setMsg] = useState<string>("");

  async function refresh() {
    if (!access) return;
    setLoadingList(true);
    try {
      const data = await listInvestments(access);
      setItems(data);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao carregar aportes");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAlreadyPaid() {
    setMsg("");
    if (!access) {
      setMsg("Sem token. Faça login novamente.");
      return;
    }
    if (amount <= 0) {
      setMsg("Informe um valor maior que zero.");
      return;
    }

    try {
      setSending(true);

      // ✅ Registra no Django (status=ANALYSIS)
      await createInvestment(access, {
        amount,
        paid_at: new Date().toISOString(),
        external_ref: externalRef.trim() || undefined,
      });

      setMsg("Aporte enviado com sucesso! Status: Em análise (aguardando aprovação).");
      setAmount(0);
      setExternalRef("");
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao registrar aporte");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* BLOCO: Criar aporte (Já paguei) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h1 className="text-white font-bold text-lg mb-2">Meus Aportes</h1>
        <p className="text-slate-500 text-sm mb-6">
          Após realizar o pagamento, clique em <b>“Já paguei”</b> para registrar o aporte. Ele ficará <b>Em análise</b>
          até o admin aprovar.
        </p>

        {msg ? (
          <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
            {msg}
          </div>
        ) : null}

        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Valor</label>
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              placeholder="500"
            />
            <div className="mt-2 text-xs text-slate-500">
              Valor atual: <span className="text-slate-200 font-semibold">{formatBRL(amount || 0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Referência (opcional)
            </label>
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="ID do PIX, hash, comprovante..."
            />
            <div className="mt-2 text-xs text-slate-500">
              Ajuda o admin a confirmar mais rápido.
            </div>
          </div>

          <button
            onClick={handleAlreadyPaid}
            disabled={sending || amount <= 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
          >
            {sending ? "Enviando..." : "Já paguei (registrar)"}
          </button>
        </div>
      </div>

      {/* BLOCO: lista */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Histórico de Aportes</h3>
          <button onClick={refresh} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            {loadingList ? "Carregando..." : "Atualizar"}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhum aporte registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-950/30 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">{new Date(it.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{formatBRL(Number(it.amount))}</td>
                    <td className="px-6 py-4">{badge(it.status)}</td>
                    <td className="px-6 py-4">{it.external_ref || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
