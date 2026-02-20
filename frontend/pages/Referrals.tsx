import React from "react";
import { UserProfile, SystemState } from "../types";
import { Copy, Users, Gift, Ticket, CheckCircle, Clock } from "lucide-react";

interface ReferralsProps {
  user: UserProfile;
  state: SystemState;
}

const Referrals: React.FC<ReferralsProps> = ({ user, state }) => {
  const referralLink = `https://vertice.fx/invite/${user.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Link de convite copiado!");
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const activeReferralsCount = state.referrals.filter((r) => r.status === "ACTIVE").length;
  const pendingReferralsCount = state.referrals.filter((r) => r.status === "PENDING").length;
  const totalEarnings = state.referrals.reduce((sum, r) => sum + r.earnings, 0);

  const tierRules = [
    { name: "Start", minCredits: 0, minActive: 0, feeDiscount: "0%", bonusReport: "Mensal" },
    { name: "Prime", minCredits: 500, minActive: 2, feeDiscount: "5%", bonusReport: "Semanal" },
    { name: "Elite", minCredits: 1500, minActive: 5, feeDiscount: "10%", bonusReport: "Diario" },
  ] as const;

  const currentTier =
    [...tierRules]
      .reverse()
      .find((tier) => totalEarnings >= tier.minCredits && activeReferralsCount >= tier.minActive) ?? tierRules[0];

  const currentTierIndex = tierRules.findIndex((tier) => tier.name === currentTier.name);
  const nextTier = currentTierIndex >= 0 ? tierRules[currentTierIndex + 1] : undefined;
  const creditsToNext = nextTier ? Math.max(nextTier.minCredits - totalEarnings, 0) : 0;
  const activeToNext = nextTier ? Math.max(nextTier.minActive - activeReferralsCount, 0) : 0;

  const sortedReferrals = [...state.referrals].sort(
    (a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime()
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Programa de Beneficios</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm mb-6 leading-relaxed">
            Convide parceiros para a plataforma e acumule <strong>Creditos Operacionais</strong>. Use os creditos para
            abater custos e liberar beneficios de nivel.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <div className="bg-slate-950 border border-slate-800 rounded px-4 py-2.5 flex-1 w-full text-slate-300 font-mono text-xs truncate">
              {referralLink}
            </div>
            <button
              onClick={handleCopy}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 border border-slate-700 text-sm w-full md:w-auto"
            >
              <Copy size={14} /> Copiar Link
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded text-slate-400 border border-slate-700">
            <Users size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Indicacoes Ativas</p>
            <h3 className="text-xl font-bold text-white">{activeReferralsCount}</h3>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded text-slate-400 border border-slate-700">
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Creditos Gerados</p>
            <h3 className="text-xl font-bold text-white">{formatCurrency(totalEarnings)}</h3>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded text-slate-400 border border-slate-700">
            <Gift size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Nivel de Cliente</p>
            <h3 className="text-xl font-bold text-white">{currentTier.name}</h3>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 md:p-6 space-y-3">
        <h3 className="text-sm font-bold text-white tracking-wide">Regras do Programa de Beneficios</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Desconto em Taxa</p>
            <p className="text-lg font-semibold text-white mt-1">{currentTier.feeDiscount}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Relatorio Bonus</p>
            <p className="text-lg font-semibold text-white mt-1">{currentTier.bonusReport}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Indicacoes Pendentes</p>
            <p className="text-lg font-semibold text-white mt-1">{pendingReferralsCount}</p>
          </div>
        </div>
        {nextTier ? (
          <p className="text-xs text-slate-400">
            Proximo nivel: <strong>{nextTier.name}</strong> | faltam {formatCurrency(creditsToNext)} e {activeToNext}{" "}
            indicacoes ativas.
          </p>
        ) : (
          <p className="text-xs text-emerald-400">Nivel maximo alcancado. Beneficios no maior patamar.</p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <h3 className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 text-sm font-bold text-white tracking-wide">
          Minhas Indicacoes
        </h3>
        {sortedReferrals.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-600">Nenhuma indicacao registrada.</p>
        ) : (
          <div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Cliente Indicado</th>
                    <th className="px-6 py-4">Data de Cadastro</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Creditos Gerados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedReferrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">{ref.name}</td>
                      <td className="px-6 py-4">{new Date(ref.joinedDate).toLocaleDateString("pt-BR")}</td>
                      <td className="px-6 py-4">
                        {ref.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500">
                            <CheckCircle size={12} />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500">
                            <Clock size={12} />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">
                        {ref.earnings > 0 ? `+${formatCurrency(ref.earnings)}` : "-"}
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

export default Referrals;
