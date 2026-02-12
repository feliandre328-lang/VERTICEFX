import React, { useState, useEffect, useMemo } from 'react';
import { SystemState } from '../types';
import { Wallet, ShieldCheck, CheckCircle, Clock, FileSearch, Calendar as CalendarIcon } from 'lucide-react';

interface WithdrawalsProps {
  state: SystemState;
  onRequestWithdrawal: (amount: number, type: 'CAPITAL' | 'RESULT', date: string) => void;
}

const Withdrawals: React.FC<WithdrawalsProps> = ({ state, onRequestWithdrawal }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'CAPITAL' | 'RESULT'>('RESULT');
  const [scheduledDate, setScheduledDate] = useState('');

  // Set default date to current virtual date
  useEffect(() => {
    if (state.currentVirtualDate) {
      setScheduledDate(new Date(state.currentVirtualDate).toISOString().split('T')[0]);
    }
  }, [state.currentVirtualDate]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    onRequestWithdrawal(parseFloat(amount), type, scheduledDate);
    setAmount('');
  };
  
  // Calculate available capital dynamically based on selected date
  const liquidCapitalOnDate = useMemo(() => {
    if (scheduledDate) {
      return state.investments
        .filter(inv => inv.status === 'ACTIVE' && new Date(inv.lockupDate) <= new Date(scheduledDate))
        .reduce((sum, inv) => sum + inv.amount, 0);
    }
    return 0;
  }, [scheduledDate, state.investments]);

  const maxAvailable = type === 'CAPITAL' ? liquidCapitalOnDate : state.balanceResults;
  const minDate = new Date(state.currentVirtualDate).toISOString().split('T')[0];

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Request Form */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Wallet className="text-slate-400" size={20} />
            Solicitar Resgate
          </h3>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              onClick={() => { setType('RESULT'); setAmount(''); }}
              className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all ${
                type === 'RESULT' 
                  ? 'bg-slate-800 border-slate-600 text-white' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              Liquidação de Resultados
            </button>
            <button
              onClick={() => { setType('CAPITAL'); setAmount(''); }}
              className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all ${
                type === 'CAPITAL' 
                  ? 'bg-slate-800 border-slate-600 text-white' 
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              Resgate de Capital
            </button>
          </div>

          <div className="mb-6 p-4 bg-slate-950 rounded border border-slate-800">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
              {type === 'CAPITAL' ? 'Capital Líquido na Data Selecionada' : 'Saldo de Resultados Disponível'}
            </p>
            <p className="text-xl font-bold text-white">{formatCurrency(maxAvailable)}</p>
             {type === 'CAPITAL' && scheduledDate && (
              <p className="text-[11px] text-slate-600 mt-1">
                  O valor considera os contratos com carência finalizada até {new Date(scheduledDate).toLocaleDateString('pt-BR')}.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Valor da Ordem</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-500">R$</span>
                  <input 
                    type="number" 
                    min="1"
                    step="0.01"
                    max={maxAvailable}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 placeholder:text-slate-700"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Data do Agendamento</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500 pointer-events-none">
                    <CalendarIcon size={16} />
                  </span>
                  <input 
                    type="date"
                    min={minDate}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-900/10 border border-blue-900/30 rounded p-4 flex gap-3 items-start">
               <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={16} />
               <div className="text-xs text-blue-300/80 space-y-1 leading-relaxed">
                 <p>Por razões de segurança e compliance (Lei 9.613/98), todas as solicitações passam por análise preventiva.</p>
                 <p className="mt-2"><strong>Prazo Operacional:</strong> D+3 (3 dias úteis) a partir da data agendada.</p>
               </div>
            </div>

            <button 
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAvailable}
              className="w-full py-3 bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold rounded-lg transition-all"
            >
              Agendar Solicitação
            </button>
          </form>
        </div>
      </div>

      {/* Info Column */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Etapas do Processo</h4>
          <ul className="space-y-6 relative">
             <div className="absolute left-3.5 top-0 h-full w-px bg-slate-800 z-0"></div>
            <li className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">1</div>
              <div>
                 <p className="text-sm font-medium text-slate-200">Solicitação</p>
                 <p className="text-xs text-slate-500">O usuário formaliza o pedido de resgate na plataforma.</p>
              </div>
            </li>
            <li className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">2</div>
              <div>
                 <p className="text-sm font-medium text-slate-200">Compliance & KYC</p>
                 <p className="text-xs text-slate-500">Verificação de titularidade e origem dos fundos.</p>
              </div>
            </li>
            <li className="flex gap-4 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">3</div>
              <div>
                 <p className="text-sm font-medium text-slate-200">Liquidação</p>
                 <p className="text-xs text-slate-500">Envio bancário (TED/PIX) para conta de mesma titularidade.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Recent Withdrawals */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 bg-slate-950/30 border-b border-slate-800">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status das Solicitações</h4>
          </div>
          <div className="p-4 space-y-3">
             {state.transactions.filter(t => t.type.includes('REDEMPTION')).length === 0 ? (
               <p className="text-center text-slate-500 text-xs py-2">Nenhuma solicitação em andamento.</p>
             ) : (
                state.transactions
                  .filter(t => t.type.includes('REDEMPTION'))
                  .slice(0, 3)
                  .map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded border border-slate-800">
                      <div className="flex items-center gap-3">
                        {t.status === 'ANALYSIS' ? <FileSearch size={16} className="text-amber-500"/> : <CheckCircle size={16} className="text-slate-500"/>}
                        <div>
                          <p className="text-xs text-slate-300 font-medium">{t.description}</p>
                          <p className="text-[10px] text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <span className="text-slate-300 text-sm font-medium">{formatCurrency(t.amount)}</span>
                    </div>
                  ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdrawals;