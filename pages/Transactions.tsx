import React from 'react';
import { SystemState, Transaction, TransactionType } from '../types';
import { Download } from 'lucide-react';

interface TransactionsProps {
  state: SystemState;
}

const Transactions: React.FC<TransactionsProps> = ({ state }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const translateType = (type: TransactionType) => {
    switch (type) {
      case TransactionType.CONTRIBUTION: return 'APORTE';
      case TransactionType.RESULT_DISTRIBUTION: return 'DISTRIBUIÇÃO';
      case TransactionType.REDEMPTION_CAPITAL: return 'RESGATE (CAP)';
      case TransactionType.REDEMPTION_RESULT: return 'LIQUIDAÇÃO (RES)';
      case TransactionType.REINVESTMENT: return 'REINVESTIMENTO';
      case TransactionType.REFERRAL_CREDIT: return 'CRÉDITO';
      default: return type;
    }
  };

  const StatusBadge = ({ status }: { status: Transaction['status'] }) => (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
      status === 'COMPLETED' ? 'bg-slate-800 text-slate-300' :
      status === 'ANALYSIS' ? 'bg-amber-900/20 text-amber-500' :
      'bg-red-900/20 text-red-500'
    }`}>
      {status === 'COMPLETED' ? 'Concluído' : 
       status === 'ANALYSIS' ? 'Em Análise' : 'Rejeitado'}
    </span>
  );
  
  const sortedTransactions = state.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
        <h2 className="text-xl font-bold text-white">Extrato Financeiro</h2>
        <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors text-xs font-medium w-full sm:w-auto">
          <Download size={14} />
          Exportar PDF
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        {state.transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-600">
            Nenhum registro encontrado.
          </div>
        ) : (
          <div>
            {/* Mobile View: Card List */}
            <div className="md:hidden p-4 space-y-3">
              {sortedTransactions.map((tx) => (
                <div key={tx.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-300 text-sm font-medium break-all pr-4">{tx.description}</span>
                    <span className={`text-lg font-medium whitespace-nowrap ${
                       tx.type.includes('REDEMPTION') ? 'text-slate-400' : 'text-slate-200'
                    }`}>
                      {tx.type.includes('REDEMPTION') ? '-' : '+'} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">Data</div>
                      <div className="text-slate-300">{new Date(tx.date).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Operação</div>
                      <div className="font-mono">{translateType(tx.type)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500 mb-1">Status</div>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Operação</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sortedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300">{new Date(tx.date).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-slate-600">{new Date(tx.date).toLocaleTimeString('pt-BR')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-400">{translateType(tx.type)}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-xs">{tx.description}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className={`px-6 py-4 text-right font-medium text-sm ${
                        tx.type.includes('REDEMPTION') ? 'text-slate-400' : 'text-slate-200'
                      }`}>
                        {tx.type.includes('REDEMPTION') ? '-' : '+'} {formatCurrency(tx.amount)}
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

export default Transactions;