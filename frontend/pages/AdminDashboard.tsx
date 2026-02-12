import React, { useState, useEffect } from 'react';
import { SystemState, TransactionStatus } from '../types';
import StatCard from '../components/StatCard';
import { AlertCircle, CheckCircle, XCircle, DollarSign, Activity, Globe, UserCheck, ShieldCheck, ShieldOff } from 'lucide-react';

interface AdminDashboardProps {
  state: SystemState;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSetPerformance: (percent: number) => void;
  onToggleVerification: (userId: string) => void;
  view: string;
  onNavigate: (page: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onApprove, onReject, onSetPerformance, onToggleVerification, view, onNavigate }) => {
  const [performanceInput, setPerformanceInput] = useState<string>('0.50');
  const [forexExposure, setForexExposure] = useState(65.0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const pendingTransactions = state.transactions.filter(t => t.status === TransactionStatus.ANALYSIS);
  
  const handlePerformanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSetPerformance(parseFloat(performanceInput));
    alert('Performance diária aplicada e distribuída aos clientes.');
  };

  // Animate Forex Exposure
  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = (Math.random() * 2) - 1;
      setForexExposure(prev => {
          let newValue = prev + fluctuation * 0.25;
          if (newValue > 66) newValue = 66;
          if (newValue < 64) newValue = 64;
          return newValue;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // --- Reusable Sections ---

  const ApprovalsSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <AlertCircle size={20} className="text-amber-500" />
        {view === 'admin-withdrawals' ? 'Aprovações Pendentes' : 'Fila de Aprovações'}
      </h3>
      
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {pendingTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Nenhuma solicitação pendente no momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {pendingTransactions.map(tx => (
              <div key={tx.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-amber-900/30 text-amber-500 font-bold uppercase mb-1">
                    {tx.type.includes('CAPITAL') ? 'Saque Capital' : 'Saque Lucro'}
                  </span>
                  <p className="text-white font-bold">{formatCurrency(tx.amount)}</p>
                  <p className="text-xs text-slate-500">{tx.description}</p>
                  {tx.clientName && tx.clientId && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        Cliente: {tx.clientName} ({tx.clientId})
                    </p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-1">{new Date(tx.date).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                  <button 
                    onClick={() => onReject(tx.id)}
                    className="p-2 rounded bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/30"
                    title="Rejeitar"
                  >
                    <XCircle size={20} />
                  </button>
                  <button 
                    onClick={() => onApprove(tx.id)}
                    className="p-2 rounded bg-emerald-900/20 text-emerald-500 hover:bg-emerald-900/40 border border-emerald-900/30"
                    title="Aprovar"
                  >
                    <CheckCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const PerformanceSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Activity size={20} className="text-blue-500" />
        Controle de Performance
      </h3>
      
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <p className="text-sm text-slate-400 mb-6">
          Defina a porcentagem de rendimento que será aplicada a todos os contratos ativos para o dia vigente.
        </p>
        
        <form onSubmit={handlePerformanceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Performance Diária (%)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="number" 
                step="0.01"
                value={performanceInput}
                onChange={(e) => setPerformanceInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-900 transition-all text-center font-bold text-lg"
              />
              <div className="flex flex-row sm:flex-col gap-1 justify-center">
                <button type="button" onClick={() => setPerformanceInput('0.10')} className="flex-1 text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white">Conservador</button>
                <button type="button" onClick={() => setPerformanceInput('0.85')} className="flex-1 text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white">Agressivo</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p className="text-xs text-slate-500">
              Data de Referência: <span className="text-white font-mono">{new Date(state.currentVirtualDate).toLocaleDateString()}</span>
            </p>
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20"
          >
            Processar e Distribuir
          </button>
        </form>
      </div>
    </div>
  );

  const ComplianceSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <UserCheck size={20} className="text-purple-500" />
        Compliance & Verificação (KYC)
      </h3>
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Data de Cadastro</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {state.users.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium text-slate-200">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{new Date(user.joinedDate).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    {user.isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500"><ShieldCheck size={12} />Verificado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500"><ShieldOff size={12} />Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onToggleVerification(user.id)} className={`py-1 px-3 text-xs font-medium rounded border transition-colors ${user.isVerified ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'}`}>
                      {user.isVerified ? 'Invalidar' : 'Aprovar KYC'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile Card List */}
        <div className="block md:hidden p-2">
            <div className="space-y-2">
                {state.users.map(user => (
                    <div key={user.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full" />
                                <div>
                                    <p className="font-medium text-slate-200 text-sm">{user.name}</p>
                                    <p className="text-xs text-slate-500">{user.id}</p>
                                </div>
                            </div>
                            {user.isVerified ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-900/20 text-emerald-500"><ShieldCheck size={12} /> Verificado</span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-900/20 text-amber-500"><ShieldOff size={12} /> Pendente</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                           <div className="text-xs text-slate-500">
                               Cadastro: <span className="text-slate-400 font-medium">{new Date(user.joinedDate).toLocaleDateString('pt-BR')}</span>
                           </div>
                           <button onClick={() => onToggleVerification(user.id)} className={`py-1 px-3 text-xs font-medium rounded border transition-colors ${user.isVerified ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'}`}>
                               {user.isVerified ? 'Invalidar' : 'Aprovar KYC'}
                           </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );

  const StatsSection = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        label="Total Sob Gestão (TVL)" 
        value={formatCurrency(state.balanceCapital + state.balanceResults)} 
        icon={DollarSign} 
        color="emerald"
      />
      <StatCard 
        label="Pendências" 
        value={pendingTransactions.length.toString()} 
        subValue="Aguardando aprovação"
        icon={AlertCircle} 
        color="amber"
      />
      <StatCard 
        label="Exposição Cambial" 
        value={`${forexExposure.toFixed(2)}%`} 
        subValue="Alocação em USD"
        icon={Globe} 
        color="purple"
        isAnimated={true}
      />
      <StatCard 
        label="Performance Hoje" 
        value={`${state.lastPerformanceFactor}%`} 
        subValue={new Date(state.currentVirtualDate).toLocaleDateString()}
        icon={Activity} 
        color="blue"
      />
    </div>
  );

  // --- Mobile Navigation ---
  const AdminNavTabs = () => {
    const tabs = [
        { id: 'admin-dashboard', label: 'Geral', icon: Globe },
        { id: 'admin-withdrawals', label: 'Aprovações', icon: AlertCircle },
        { id: 'admin-performance', label: 'Performance', icon: Activity },
        { id: 'admin-compliance', label: 'KYC', icon: UserCheck },
    ];
    return (
        <div className="block lg:hidden mb-4">
            <div className="border-b border-slate-800">
                <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onNavigate(tab.id)}
                            className={`${
                                view === tab.id
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-500'
                            } flex-1 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex flex-col items-center justify-center gap-1.5`}
                        >
                            <tab.icon size={16} />
                            <span className="text-[10px]">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
  };


  // --- Main Render Logic ---
  
  const renderContent = () => {
    switch(view) {
      case 'admin-withdrawals': return <ApprovalsSection />;
      case 'admin-performance': return <PerformanceSection />;
      case 'admin-compliance': return <ComplianceSection />;
      case 'admin-dashboard':
      default:
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <ApprovalsSection />
            <PerformanceSection />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <AdminNavTabs />
      {view === 'admin-dashboard' && <StatsSection />}
      {renderContent()}
    </div>
  );
};

export default AdminDashboard;