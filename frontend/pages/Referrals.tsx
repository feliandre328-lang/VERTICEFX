import React, { useEffect, useMemo, useState } from "react";
import { UserProfile, SystemState } from "../types";
import { Copy, Users, Gift, Ticket, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "../layouts/AuthContext";
import {
  createReferralInvite,
  getReferralSummary,
  listReferralInvites,
  type ReferralInvite,
  type ReferralSummary,
} from "../services/api";

interface ReferralsProps {
  user: UserProfile;
  state: SystemState;
}

const Referrals: React.FC<ReferralsProps> = ({ user }) => {
  const { getAccessToken } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [invites, setInvites] = useState<ReferralInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const referralCode = summary?.referral_code || user.referralCode;
  const referralLink = `https://vertice.fx/invite/${referralCode}`;

  const loadData = async () => {
    if (!access) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [summaryData, invitesData] = await Promise.all([getReferralSummary(access), listReferralInvites(access)]);
      setSummary(summaryData);
      setInvites(invitesData);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao carregar indicacoes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert("Link de convite copiado!");
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access || (!inviteName.trim() && !inviteEmail.trim())) return;
    try {
      setSubmitting(true);
      setErrorMsg("");
      await createReferralInvite(access, {
        referred_name: inviteName.trim() || undefined,
        referred_email: inviteEmail.trim() || undefined,
      });
      setInviteName("");
      setInviteEmail("");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao registrar indicacao.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const activeReferralsCount = summary?.active_referrals_count ?? 0;
  const pendingReferralsCount = summary?.pending_referrals_count ?? 0;
  const totalEarnings = (summary?.total_credits_cents ?? 0) / 100;
  const currentTier = summary?.current_tier;
  const nextTier = summary?.next_tier;
  const creditsToNext = (summary?.credits_to_next_cents ?? 0) / 100;
  const activeToNext = summary?.active_to_next ?? 0;

  const sortedReferrals = [...invites].sort((a, b) => new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      {errorMsg ? (
        <div className="rounded border border-red-800/60 bg-red-900/20 px-3 py-2 text-xs text-red-300">{errorMsg}</div>
      ) : null}

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

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 md:p-6">
        <h3 className="text-sm font-bold text-white tracking-wide mb-4">Registrar Indicacao</h3>
        <form onSubmit={handleCreateInvite} className="grid md:grid-cols-3 gap-3">
          <input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Nome do indicado"
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200"
          />
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="E-mail do indicado"
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="submit"
            disabled={submitting || (!inviteName.trim() && !inviteEmail.trim())}
            className="bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 font-semibold rounded px-3 py-2 text-sm"
          >
            {submitting ? "Enviando..." : "Criar Indicacao"}
          </button>
        </form>
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
            <h3 className="text-xl font-bold text-white">{currentTier?.name ?? "Start"}</h3>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 md:p-6 space-y-3">
        <h3 className="text-sm font-bold text-white tracking-wide">Regras do Programa de Beneficios</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Desconto em Taxa</p>
            <p className="text-lg font-semibold text-white mt-1">{currentTier?.fee_discount ?? "0%"}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Relatorio Bonus</p>
            <p className="text-lg font-semibold text-white mt-1">{currentTier?.bonus_report ?? "Mensal"}</p>
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
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-600">Carregando...</p>
        ) : sortedReferrals.length === 0 ? (
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
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {ref.referred_username || ref.referred_name || ref.referred_email || `Indicacao #${ref.id}`}
                      </td>
                      <td className="px-6 py-4">{new Date(ref.joined_date).toLocaleDateString("pt-BR")}</td>
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
                        {ref.credits_cents > 0 ? `+${formatCurrency(ref.credits_cents / 100)}` : "-"}
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
