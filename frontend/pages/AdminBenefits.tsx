import React, { useEffect, useMemo, useState } from "react";
import { Gift, RefreshCcw, Search, Users, Crown, TrendingUp } from "lucide-react";

import { useAuth } from "../layouts/AuthContext";
import { listAdminReferralInvites, type AdminReferralInvite } from "../services/api";

type StatusFilter = "ALL" | "ACTIVE" | "PENDING";

const COMMISSION_BY_LEVEL: Record<number, number> = {
  1: 5,
  2: 3,
  3: 2,
};

export default function AdminBenefits() {
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [items, setItems] = useState<AdminReferralInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [onlyEligible, setOnlyEligible] = useState(false);

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const load = async () => {
    if (!access) return;
    try {
      setLoading(true);
      setErr("");
      const data = await listAdminReferralInvites(access);
      setItems(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao carregar indicacoes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const filteredItems = useMemo(() => {
    const q = normalize(searchTerm);
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (onlyEligible && !item.commission_eligible) return false;
      if (!q) return true;
      const referrer = normalize(
        `${item.referrer_username ?? ""} ${item.referrer_email ?? ""} ${item.referrer ?? ""}`
      );
      const referred = normalize(
        `${item.referred_username ?? ""} ${item.referred_name ?? ""} ${item.referred_email ?? ""} ${item.referred_user ?? ""}`
      );
      return referrer.includes(q) || referred.includes(q);
    });
  }, [items, searchTerm, statusFilter, onlyEligible]);

  const summary = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.status === "ACTIVE").length;
    const pending = items.filter((i) => i.status === "PENDING").length;
    const eligible = items.filter((i) => i.commission_eligible).length;
    const creditsCents = items.reduce((acc, i) => acc + (i.credits_cents || 0), 0);
    const orderCounts = {
      level1: items.filter((i) => i.referral_level === 1).length,
      level2: items.filter((i) => i.referral_level === 2).length,
      level3: items.filter((i) => i.referral_level === 3).length,
    };

    const byReferrer = new Map<
      string,
      { id: number | null; username: string; email: string; invites: number; credits_cents: number; eligible: number }
    >();

    for (const item of items) {
      const key = String(item.referrer ?? item.referrer_username ?? "unknown");
      const current = byReferrer.get(key) || {
        id: item.referrer ?? null,
        username: item.referrer_username ?? `user-${item.referrer ?? "?"}`,
        email: item.referrer_email ?? "",
        invites: 0,
        credits_cents: 0,
        eligible: 0,
      };
      current.invites += 1;
      if (item.commission_eligible) current.eligible += 1;
      current.credits_cents += item.credits_cents || 0;
      byReferrer.set(key, current);
    }

    const topReferrers = [...byReferrer.values()]
      .sort((a, b) => b.credits_cents - a.credits_cents)
      .slice(0, 5);

    return {
      total,
      active,
      pending,
      eligible,
      creditsCents,
      orderCounts,
      topReferrers,
    };
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort(
      (a, b) => new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime()
    );
  }, [filteredItems]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="text-emerald-500" size={20} />
          <h1 className="text-lg font-bold text-white">Monitoramento do Programa de Beneficios</h1>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/50 text-slate-200 text-sm disabled:opacity-60"
          title="Atualizar"
        >
          <RefreshCcw size={16} />
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Users size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold">Resumo do Programa</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
                <p className="text-slate-500">Indicações</p>
                <p className="text-slate-200 font-semibold">{summary.total}</p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
                <p className="text-slate-500">Ativas</p>
                <p className="text-emerald-400 font-semibold">{summary.active}</p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
                <p className="text-slate-500">Pendentes</p>
                <p className="text-amber-400 font-semibold">{summary.pending}</p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
                <p className="text-slate-500">Comissão</p>
                <p className="text-slate-200 font-semibold">{summary.eligible}</p>
              </div>
            </div>

            <div className="rounded border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs">
              <p className="text-slate-500">Creditos totais</p>
              <p className="text-emerald-300 font-semibold">{formatCurrency(summary.creditsCents / 100)}</p>
            </div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <TrendingUp size={16} className="text-emerald-400" />
              <h3 className="text-sm font-semibold">Comissão por Ordem</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>1ª indicação (5%)</span>
                <span className="text-slate-200 font-mono">{summary.orderCounts.level1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2ª indicação (3%)</span>
                <span className="text-slate-200 font-mono">{summary.orderCounts.level2}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3ª indicação (2%)</span>
                <span className="text-slate-200 font-mono">{summary.orderCounts.level3}</span>
              </div>
              <hr></hr>
              <p className="font-semibold text-slate-200 mb-2">Regras</p>
              <p>1a indicação: 5% do aporte.</p>
              <p>2a indicação: 3% do aporte.</p>
              <p>3a indicação: 2% do aporte.</p>
              <p>Demais indicacoes: sem comissão.</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Crown size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold">Top Indicadores</h3>
            </div>
            {summary.topReferrers.length === 0 ? (
              <p className="text-xs text-slate-500">Sem dados suficientes.</p>
            ) : (
              <div className="space-y-2">
                {summary.topReferrers.map((ref) => (
                  <div key={`${ref.id}-${ref.username}`} className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="text-slate-200 truncate">{ref.username}</p>
                      <p className="text-[10px] text-slate-500 truncate">{ref.email || "sem-email"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-300 font-semibold">{formatCurrency(ref.credits_cents / 100)}</p>
                      <p className="text-[10px] text-slate-500">{ref.invites} indicacoes</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por indicador ou indicado..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-20 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-900"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  Limpar
                </button>
              ) : null}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="PENDING">Pendentes</option>
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={onlyEligible}
                onChange={(e) => setOnlyEligible(e.target.checked)}
                className="accent-emerald-500"
              />
              Somente comissao
            </label>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Carregando indicaçoes...</div>
            ) : sortedItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhuma indicação encontrada.</div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Indicador</th>
                        <th className="px-6 py-4">Indicado</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Ordem</th>
                        <th className="px-6 py-4">Comissão</th>
                        <th className="px-6 py-4 text-right">Creditos</th>
                        <th className="px-6 py-4 text-right">Cadastro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sortedItems.map((item) => {
                        const percent = COMMISSION_BY_LEVEL[item.referral_level] ?? 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-slate-200 font-medium">
                                {item.referrer_username || `user-${item.referrer ?? "?"}`}
                              </p>
                              <p className="text-[11px] text-slate-500">{item.referrer_email || "sem-email"}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-slate-200 font-medium">
                                {item.referred_username || item.referred_name || `#${item.referred_user ?? item.id}`}
                              </p>
                              <p className="text-[11px] text-slate-500">{item.referred_email || "sem-email"}</p>
                            </td>
                            <td className="px-6 py-4">
                              {item.status === "ACTIVE" ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-emerald-900/20 text-emerald-400">
                                  Ativo
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide bg-amber-900/20 text-amber-500">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-300">{item.referral_level}</td>
                            <td className="px-6 py-4 text-slate-300">
                              {item.commission_eligible ? `${percent}%` : "-"}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-emerald-400">
                              {item.credits_cents > 0 ? formatCurrency(item.credits_cents / 100) : "-"}
                            </td>
                            <td className="px-6 py-4 text-right text-[11px] text-slate-500">
                              {new Date(item.joined_date).toLocaleString("pt-BR")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden p-4 space-y-3">
                  {sortedItems.map((item) => {
                    const percent = COMMISSION_BY_LEVEL[item.referral_level] ?? 0;
                    return (
                      <div key={item.id} className="bg-slate-950/30 border border-slate-800 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-slate-200 text-sm font-semibold">
                              {item.referrer_username || `user-${item.referrer ?? "?"}`}
                            </p>
                            <p className="text-[11px] text-slate-500">{item.referrer_email || "sem-email"}</p>
                          </div>
                          <span className="text-[11px] text-slate-500">#{item.id}</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-400">
                          Indicado:{" "}
                          <span className="text-slate-200">
                            {item.referred_username || item.referred_name || `#${item.referred_user ?? item.id}`}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={
                              item.status === "ACTIVE"
                                ? "text-emerald-400 text-xs font-semibold"
                                : "text-amber-400 text-xs font-semibold"
                            }
                          >
                            {item.status === "ACTIVE" ? "Ativo" : "Pendente"}
                          </span>
                          <span className="text-xs text-slate-300">
                            Ordem {item.referral_level} â€¢ {item.commission_eligible ? `${percent}%` : "sem comissão"}
                          </span>
                        </div>
                        <div className="mt-3 text-xs text-emerald-300 font-mono">
                          {item.credits_cents > 0 ? formatCurrency(item.credits_cents / 100) : "Sem creditos"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
      </div>
    </div>
  );
}
