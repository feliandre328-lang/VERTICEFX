import React, { useEffect, useMemo, useState } from "react";
import { listInvestments } from "../services/api";

export default function Investments() {
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string>("");

  async function refresh() {
    if (!access) return;
    const data = await listInvestments(access);
    setItems(data);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e?.message ?? "Erro ao carregar"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h2 className="text-white font-bold text-lg">Meus Aportes</h2>
        <p className="text-slate-400 text-sm mt-1">
          Aportes são registrados como <b>PENDING</b> e aprovados manualmente.
        </p>
        {err && <div className="mt-3 text-sm text-red-300">{err}</div>}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-bold">Histórico</h3>
        </div>
        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-slate-500 text-sm">Nenhum aporte ainda.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex justify-between bg-slate-950/40 border border-slate-800 rounded p-3">
                <div className="text-slate-200 text-sm">
                  <div>
                    <b>R$</b> {(it.amount_cents / 100).toFixed(2)}
                  </div>
                  <div className="text-slate-500 text-xs">
                    {new Date(it.created_at).toLocaleString("pt-BR")}
                  </div>
                  {it.payment_ref ? (
                    <div className="text-slate-500 text-xs">Ref: {it.payment_ref}</div>
                  ) : null}
                </div>
                <div className="text-xs text-slate-300">
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
