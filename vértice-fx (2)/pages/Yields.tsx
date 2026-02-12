import React from 'react';
import { SystemState, TransactionType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LineChart, Line, Legend } from 'recharts';
import { Repeat, Info } from 'lucide-react';

interface YieldsProps {
  state: SystemState;
  onReinvest: () => void;
}

const Yields: React.FC<YieldsProps> = ({ state, onReinvest }) => {
  const history = state.transactions
    .filter(t => t.type === TransactionType.RESULT_DISTRIBUTION)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30);

  const chartData = history.map(t => ({
    date: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    amount: t.amount,
    factor: t.performanceFactor ?? 0,
  }));

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      
      {/* Header Stats */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 bg-slate-900 p-6 rounded-lg border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Relatório de Performance</h2>
          <p className="text-sm text-slate-500">Acompanhe a distribuição de resultados sobre o capital alocado.</p>
        </div>
        <div className="text-left sm:text-right mt-2 sm:mt-0">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Resultado Líquido Disponível</p>
          <h3 className="text-3xl font-semibold text-white tracking-tight">{formatCurrency(state.balanceResults)}</h3>
          <button 
            onClick={onReinvest}
            className="mt-3 text-xs flex items-center justify-center sm:justify-end gap-2 bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-2 rounded transition-colors w-full sm:w-auto ml-auto border border-slate-700 font-medium"
          >
            <Repeat size={14} /> 
            Reinvestir em novo contrato
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded p-4 flex gap-3">
         <Info size={20} className="text-slate-500 shrink-0" />
         <p className="text-xs text-slate-400">
           <strong>Nota de Transparência:</strong> Os valores abaixo referem-se aos resultados apurados e distribuídos. Em dias de performance negativa ou neutra, não há distribuição de resultados.
         </p>
      </div>
      
      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Factor Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 h-72 md:h-80">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Variação Diária da Performance (%)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="colorFactor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val.toFixed(2)}%`} domain={['auto', 'auto']} />
              <Tooltip 
                cursor={{stroke: '#475569', strokeDasharray: '3 3'}}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                itemStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Performance']}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="factor" stroke="url(#colorFactor)" strokeWidth={2} dot={{ r: 2, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Amount Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 h-72 md:h-80">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Valor Distribuído (R$)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
              <Tooltip 
                cursor={{fill: '#1e293b'}}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                itemStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => [formatCurrency(value), 'Resultado']}
              />
              <ReferenceLine y={0} stroke="#334155" />
              <Bar dataKey="amount" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History List */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/30">
          <h4 className="text-sm font-bold text-slate-300">Detalhamento de Distribuição</h4>
        </div>
        <div className="divide-y divide-slate-800">
          {state.transactions
            .filter(t => t.type === TransactionType.RESULT_DISTRIBUTION)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(item => (
            <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
              <div>
                <p className="text-slate-300 text-sm font-medium">{item.description}</p>
                <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className="text-slate-200 font-mono text-sm">+{formatCurrency(item.amount)}</span>
            </div>
          ))}
          {state.transactions.filter(t => t.type === TransactionType.RESULT_DISTRIBUTION).length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">Nenhum resultado distribuído no período.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Yields;