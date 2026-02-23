import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Wallet,
  ShieldCheck,
  FileText,
  Users,
  LogOut,
  Settings,
  BarChart3,
  UserCheck,
  X,
} from "lucide-react";
import { UserRole } from "../types";

interface SidebarProps {
  role: UserRole;
  onLogout: () => void | Promise<void>;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  to: string;
};

const clientItems: MenuItem[] = [
  { label: "Visão Geral", icon: LayoutDashboard, to: "/app/dashboard" },
  { label: "Meus Aportes", icon: PieChart, to: "/app/investments" },
  { label: "Relatório de Performance", icon: TrendingUp, to: "/app/yields" },
  { label: "Resgates", icon: Wallet, to: "/app/withdrawals" },
  { label: "Extrato Financeiro", icon: FileText, to: "/app/transactions" },
  { label: "Programa de Benefícios", icon: Users, to: "/app/referrals" },
  { label: "Transparência & Riscos", icon: ShieldCheck, to: "/app/transparency" },
];

const adminItems: MenuItem[] = [
  { label: "Mesa Operacional", icon: LayoutDashboard, to: "/app/admin/dashboard" },
  { label: "Aprovações Pendentes", icon: Wallet, to: "/app/admin/withdrawals" },
  { label: "Performance Diária", icon: BarChart3, to: "/app/admin/performance" },
  { label: "Clientes", icon: UserCheck, to: "/app/admin/clients" }, // ✅ AQUI
  { label: "Log de Transações", icon: FileText, to: "/app/transactions" },
  { label: "Configurações", icon: Settings, to: "/app/admin/settings" },
];

export default function Sidebar({ role, onLogout, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const menuItems = role === "ADMIN" ? adminItems : clientItems;

  const baseClass = "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200";
  const inactiveClass = "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50";
  const activeClass = "bg-slate-800 text-white font-medium border-l-2 border-emerald-500";

  const handleLogout = async () => {
    try {
      await onLogout();
    } finally {
      onMobileClose?.();
      navigate("/login", { replace: true });
    }
  };

  const sidebarInner = (
    <>
      <div className="p-6 border-b border-slate-800">
        <div className="flex flex-col items-center justify-center text-center">
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
            {role === "ADMIN" ? "Backoffice" : "Gestão de Ativos"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 space-y-1 px-3 scroll-smooth">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}
              end
              onClick={onMobileClose}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Encerrar Sessão</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 hidden md:flex md:flex-col z-20">
        {sidebarInner}
      </aside>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col z-50">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Menu</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onMobileClose}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            {sidebarInner}
          </aside>
        </div>
      )}
    </>
  );
}