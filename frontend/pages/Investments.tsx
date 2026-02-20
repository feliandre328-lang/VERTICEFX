import React, { useEffect, useMemo, useState } from "react";
import { listInvestments, type InvestmentItem } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Investments() {
  const nav = useNavigate();
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [items, setItems] = useState<InvestmentItem[]>([]);
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");

  async function refresh() {
    if (!access) {
      nav("/login", { replace: true });
      return;
    }
    const data = await listInvestments(access);
    setItems(data ?? []);
  }

  useEffect(() => {
    refresh().catch((e) => console.warn(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onNotif = () => refresh().catch(() => {});
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const date = new Date(it.created_at).toLocaleString("pt-BR");
      const amount = fmt(it.amount_cents);
      const rawAmount = String((it.amount_cents || 0) / 100);
      return (
        String(it.id).toLowerCase().includes(q) ||
        (it.status || "").toLowerCase().includes(q) ||
        (it.external_ref || "").toLowerCase().includes(q) ||
        date.toLowerCase().includes(q) ||
        amount.toLowerCase().includes(q) ||
        rawAmount.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setQuery(queryInput);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-white font-bold">Meus Aportes</h3>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Pesquisar por id, status, valor, data, ref..."
                className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white w-[520px] max-w-[52vw]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded border border-slate-700 bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
              >
                Pesquisar
              </button>
            </form>
            <button onClick={() => refresh().catch(() => {})} className="text-xs text-slate-300 hover:text-white">
              Atualizar
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[520px] overflow-y-auto space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-slate-500 text-sm">
              {items.length === 0 ? "Nenhum aporte ainda." : "Nenhum aporte encontrado para a busca."}
            </div>
          ) : (
            filteredItems.map((it) => (
              <div key={it.id} className="flex justify-between bg-slate-950/40 border border-slate-800 rounded p-3">
                <div className="text-slate-200 text-sm">
                  <div className="font-semibold">{fmt(it.amount_cents)}</div>
                  <div className="text-slate-500 text-xs">{new Date(it.created_at).toLocaleString("pt-BR")}</div>
                  {it.external_ref ? <div className="text-slate-500 text-xs">ref: {it.external_ref}</div> : null}
                </div>

                <div className="text-xs text-slate-300 flex items-center">
                  <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">{it.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
