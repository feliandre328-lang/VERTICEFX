import React from 'react';
import { Zap, TrendingUp, TrendingDown, Globe } from 'lucide-react';

const newsItems = [
  { text: 'BTC/USD', value: '$68,450.23', change: '+2.15%', icon: TrendingUp, color: 'text-emerald-500' },
  { text: 'ETH/USD', value: '$3,512.88', change: '+0.89%', icon: TrendingUp, color: 'text-emerald-500' },
  { text: 'Índice DXY', value: '105.18', change: '-0.22%', icon: TrendingDown, color: 'text-red-500' },
  { text: 'FED mantém taxas de juros estáveis em última reunião', value: '', change: 'NEUTRO', icon: Zap, color: 'text-amber-500' },
  { text: 'Varejo asiático demonstra forte recuperação no último trimestre', value: '', change: 'MERCADO', icon: Globe, color: 'text-blue-500' },
  { text: 'EUR/USD', value: '1.0741', change: '+0.11%', icon: TrendingUp, color: 'text-emerald-500' },
];

const NewsTicker: React.FC = () => {
  const TickerItem = ({ item }: { item: typeof newsItems[0] }) => (
    <div className="flex items-center shrink-0 gap-2 mx-6">
      <item.icon size={14} className={`${item.color} shrink-0`} />
      <span className="text-xs font-bold text-slate-300">{item.text}</span>
      {item.value && <span className="text-xs font-mono text-slate-400">{item.value}</span>}
      <span className={`text-xs font-mono ${item.color}`}>{item.change}</span>
    </div>
  );

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 z-30 overflow-hidden">
      <div className="w-full h-full flex items-center whitespace-nowrap">
        <div className="flex animate-marquee">
          {newsItems.map((item, index) => <TickerItem key={index} item={item} />)}
          {/* Duplicate for seamless loop */}
          {newsItems.map((item, index) => <TickerItem key={`dup-${index}`} item={item} />)}
        </div>
      </div>
    </footer>
  );
};

export default NewsTicker;
