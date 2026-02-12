import React from 'react';
// FIX: Import TransactionStatus to correctly type the getStatusBadge function parameter.
import { SystemState, TransactionStatus, TransactionType } from '../types';
import StatCard from '../components/StatCard';
import { Wallet, TrendingUp, Archive, ArrowUpRight, Repeat, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  state: SystemState;
  onNavigate: (page: string) => void;
  onReinvest: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onReinvest }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const recentTransactions = state.transactions.slice(0, 5);

  // FIX: Update getStatusBadge to accept TransactionStatus enum and handle all cases.
  // The function was previously typed to only accept a subset of statuses, causing a type error.
  // The `APPROVED` status is now handled alongside `COMPLETED`.
  const getStatusBadge = (status: TransactionStatus) => (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${
      status === 'COMPLETED' || status === 'APPROVED' ? 'bg-slate-700 text-slate-300' :
      status === 'ANALYSIS' ? 'bg-amber-900/30 text-amber-500' :
      'bg-red-900/20 text-red-500'
    }`}>
      {status === 'COMPLETED' || status === 'APPROVED' ? 'Processado' : status === 'ANALYSIS' ? 'Em Análise' : 'Rejeitado'}
    </span>
  );

  return (
    <>
      {/* Compliance Banner */}
      <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg flex flex-col sm:flex-row gap-3 items-start">
        <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
          <strong>Aviso de Risco:</strong> A rentabilidade passada não representa garantia de rentabilidade futura. 
          Ativos digitais são investimentos de risco. Leia a Política de Riscos e o Contrato de Prestação de Serviços antes de operar.
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          label="Patrimônio Principal" 
          value={formatCurrency(state.balanceCapital)} 
          subValue="Capital sob gestão"
          icon={Wallet} 
          color="slate"
        />
        <StatCard 
          label="Performance Acumulada" 
          value={formatCurrency(state.balanceResults)} 
          subValue="Resultado disponível"
          icon={TrendingUp} 
          color="blue"
        />
        <StatCard 
          label="Total Aportado" 
          value={formatCurrency(state.totalContributed)} 
          subValue="Histórico de entradas"
          icon={Archive} 
          color="slate"
        />
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 flex flex-col justify-center gap-3">
           <button 
             onClick={() => onNavigate('investments')}
             className="w-full py-2 px-4 bg-slate-100 hover:bg-white text-slate-900 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
           >
             <ArrowUpRight size={16} />
             Novo Aporte
           </button>
           <button 
             onClick={onReinvest}
             className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-700"
           >
             <Repeat size={16} />
             Reinvestir Resultado
           </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Movimentações Recentes</h3>
          <button 
            onClick={() => onNavigate('transactions')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver extrato completo
          </button>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="p-8 md:p-12 text-center text-slate-500 text-sm">
            <p>Nenhuma movimentação registrada.</p>
          </div>
        ) : (
          <div>
            {/* Mobile View: Card List */}
            <div className="md:hidden p-4 space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-300 text-sm font-medium break-all pr-2">{tx.description}</span>
                    <span className={`font-medium whitespace-nowrap ${
                      tx.type.includes('CONTRIBUTION') || tx.type.includes('DISTRIBUTION') || tx.type.includes('CREDIT')
                        ? 'text-slate-200' 
                        : 'text-slate-400'
                    }`}>
                      {tx.type.includes('REDEMPTION') ? '-' : '+'} 
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/30 text-slate-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Operação</th>
                    <th className="px-6 py-4">Data de Apuração</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-300">
                          {tx.description}
                      </td>
                      <td className="px-6 py-4">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">{getStatusBadge(tx.status)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${
                        tx.type.includes('CONTRIBUTION') || tx.type.includes('DISTRIBUTION') || tx.type.includes('CREDIT')
                          ? 'text-slate-200' 
                          : 'text-slate-400'
                      }`}>
                        {tx.type.includes('REDEMPTION') ? '-' : '+'} 
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
