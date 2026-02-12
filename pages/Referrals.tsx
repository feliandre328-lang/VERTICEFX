import React from 'react';
import { UserProfile, SystemState } from '../types';
import { Copy, Users, Gift, Ticket, CheckCircle, Clock } from 'lucide-react';

interface ReferralsProps {
  user: UserProfile;
  state: SystemState;
}

const Referrals: React.FC<ReferralsProps> = ({ user, state }) => {
  const referralLink = `https://vertice.fx/invite/${user.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Link de convite copiado!');
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const activeReferralsCount = state.referrals.filter(r => r.status === 'ACTIVE').length;
  const totalEarnings = state.referrals.reduce((sum, r) => sum + r.earnings, 0);
  
  const sortedReferrals = [...state.referrals].sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
      
      {/* Hero Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Programa de Benefícios</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm mb-6 leading-relaxed">
            Convide parceiros para a plataforma e acumule <strong>Créditos Operacionais</strong>. 
            Utilize seus créditos para abater taxas de performance ou acessar relatórios exclusivos.
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

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded text-slate-400 border border-slate-700">
            <Users size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Indicações Ativas</p>
            <h3 className="text-xl font-bold text-white">{activeReferralsCount}</h3>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded text-slate-400 border border-slate-700">
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Créditos Gerados</p>
            <h3 className="text-xl font-bold text-white">{formatCurrency(totalEarnings)}</h3>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded text-slate-400 border border-slate-700">
            <Gift size={20} />
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Nível de Cliente</p>
            <h3 className="text-xl font-bold text-white">Prime</h3>
          </div>
        </div>
      </div>
      
      {/* Referrals List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <h3 className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-800 text-sm font-bold text-white tracking-wide">Minhas Indicações</h3>
        {sortedReferrals.length === 0 ? (
           <p className="p-8 text-center text-sm text-slate-600">Nenhuma indicação registrada.</p>
        ) : (
          <div>
             {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                 <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Cliente Indicado</th>
                    <th className="px-6 py-4">Data de Cadastro</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Créditos Gerados</th>
                  </tr>
                </thead>
                 <tbody className="divide-y divide-slate-800">
                  {sortedReferrals.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-200">{ref.name}</td>
                      <td className="px-6 py-4">{new Date(ref.joinedDate).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">
                         {ref.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500"><CheckCircle size={12} />Ativo</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500"><Clock size={12} />Pendente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">
                        {ref.earnings > 0 ? `+${formatCurrency(ref.earnings)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
             {/* Mobile Card List */}
            <div className="block md:hidden p-2">
              <div className="space-y-2">
                {sortedReferrals.map(ref => (
                  <div key={ref.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-start mb-3">
                       <div>
                        <p className="font-medium text-slate-200 text-sm">{ref.name}</p>
                        <p className="text-xs text-slate-500">Cadastro: {new Date(ref.joinedDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {ref.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500"><CheckCircle size={12} />Ativo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500"><Clock size={12} />Pendente</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400">Créditos Gerados:</p>
                      <p className="font-mono text-emerald-400 text-sm">
                        {ref.earnings > 0 ? `+${formatCurrency(ref.earnings)}` : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Referrals;