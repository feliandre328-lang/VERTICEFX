import React from 'react';
import { LayoutDashboard, PieChart, TrendingUp, Wallet, ShieldCheck, FileText, Users, LogOut, Settings, BarChart3, AlertCircle, UserCheck } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activePage: string;
  role: UserRole;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, role, onNavigate, onLogout }) => {
  
  const clientItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'investments', label: 'Meus Aportes', icon: PieChart },
    { id: 'yields', label: 'Relatório de Performance', icon: TrendingUp },
    { id: 'withdrawals', label: 'Resgates', icon: Wallet },
    { id: 'transactions', label: 'Extrato Financeiro', icon: FileText },
    { id: 'referrals', label: 'Programa de Benefícios', icon: Users },
    { id: 'transparency', label: 'Transparência & Riscos', icon: ShieldCheck },
  ];

  const adminItems = [
    { id: 'admin-dashboard', label: 'Mesa Operacional', icon: LayoutDashboard },
    { id: 'admin-withdrawals', label: 'Aprovações Pendentes', icon: AlertCircle },
    { id: 'admin-performance', label: 'Performance Diária', icon: BarChart3 },
    { id: 'admin-compliance', label: 'Compliance (KYC)', icon: UserCheck },
    { id: 'transactions', label: 'Log de Transações', icon: FileText },
    { id: 'admin-settings', label: 'Configurações', icon: Settings },
  ];

  const menuItems = role === 'ADMIN' ? adminItems : clientItems;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 hidden md:flex">
      <div className="p-6 border-b border-slate-800">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Vértice FX Logo */}
          <div className="mb-3 relative w-12 h-12">
             <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <path d="M50 10 L90 90 L10 90 Z" fill="url(#logoGradient)" opacity="0.2" />
                <path d="M35 80 L35 65" stroke="url(#logoGradient)" strokeWidth="8" strokeLinecap="round" />
                <path d="M50 80 L50 50" stroke="url(#logoGradient)" strokeWidth="8" strokeLinecap="round" />
                <path d="M65 80 L65 35" stroke="url(#logoGradient)" strokeWidth="8" strokeLinecap="round" />
             </svg>
          </div>

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400 tracking-tight">
            VÉRTICE FX
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1">
            {role === 'ADMIN' ? 'Backoffice' : 'Gestão de Ativos'}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 space-y-1 px-3 scroll-smooth">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-slate-800 text-white font-medium border-l-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;