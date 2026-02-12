import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate';
  isAnimated?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon: Icon, color = 'slate', isAnimated = false }) => {
  const colorMap = {
    blue: 'bg-blue-500/5 text-blue-500 border-blue-500/10',
    emerald: 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10', // Darker green
    amber: 'bg-amber-500/5 text-amber-500 border-amber-500/10',
    purple: 'bg-purple-500/5 text-purple-500 border-purple-500/10',
    slate: 'bg-slate-500/5 text-slate-400 border-slate-500/10',
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border bg-slate-900/50 p-6 ${colorMap[color].split(' ')[2]} ${isAnimated ? 'animate-float' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100 tracking-tight">{value}</h3>
          {subValue && (
            <p className="mt-1 text-xs text-slate-400">{subValue}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;