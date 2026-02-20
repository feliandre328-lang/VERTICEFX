import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Menu, Calendar, Bell } from "lucide-react";

import Sidebar from "../components/Sidebar";
import NewsTicker from "../components/NewsTicker";

import AdminPendingInvestments from "../pages/AdminPendingInvestments";

import * as FinanceService from "../services/financialService";
import { SystemState, UserProfile, UserRole } from "../types";

import { useAuth } from "./AuthContext";
import {
  getNotificationsUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "../services/api";

// Pages
import Dashboard from "../pages/Dashboard";
import AdminDashboard from "../pages/AdminDashboard";
import Investments from "../pages/Investments";
import Yields from "../pages/Yields";
import Withdrawals from "../pages/Withdrawals";
import Transactions from "../pages/Transactions";
import Referrals from "../pages/Referrals";
import Transparency from "../pages/Transparency";

import DashboardRoute from "../pages/DashboardRoute";

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== "ADMIN") return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export default function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { role, logout, getAccessToken, user: authUser } = useAuth();

  // ✅ VOLTANDO O "CORAÇÃO" DO APP ANTIGO: systemState aqui
  const [systemState, setSystemState] = useState<SystemState>(() => FinanceService.getSystemState());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);
  const hasLoadedNotificationsRef = useRef(false);
  const canPlaySoundRef = useRef(false);

  const playNotificationBeep = () => {
    if (!canPlaySoundRef.current) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.2);
      osc.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch {
      // sem audio suportado ou bloqueado
    }
  };

  // ✅ Mesmo mock user do seu App.tsx antigo
  const user: UserProfile = useMemo(
    () => ({
      id: "CLT-8821",
      name: role === "ADMIN" ? "Administrador" : "Carlos Mendes",
      email: role === "ADMIN" ? "admin@verticefx.com" : "carlos.m@example.com",
      referralCode: "VFX-9921",
      joinedDate: "2023-11-15",
      avatarUrl: "https://picsum.photos/100/100",
      isVerified: true,
      role: role,
    }),
    [role]
  );

  useEffect(() => {
    setSystemState(FinanceService.getSystemState());
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      canPlaySoundRef.current = true;
    };

    window.addEventListener("click", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const loadNotifications = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const [count, list] = await Promise.all([
        getNotificationsUnreadCount(token),
        listNotifications(token, { limit: 20 }),
      ]);
      setUnreadCount(count);
      setNotifications(list);

      if (hasLoadedNotificationsRef.current && count > prevUnreadRef.current) {
        playNotificationBeep();
        window.dispatchEvent(new CustomEvent("vfx:notifications:new", { detail: { unread_count: count } }));
      }
      prevUnreadRef.current = count;
      hasLoadedNotificationsRef.current = true;
    } catch {
      // nao bloqueia a tela principal por erro de notificacao
    }
  };

  // scroll top ao trocar rota
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
    setIsBellOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const timer = setInterval(() => {
      loadNotifications();
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleNotificationClick = async (id: number) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await markNotificationRead(token, id);
      await loadNotifications();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      await loadNotifications();
    } catch {}
  };

  // --- Handlers (iguais do App.tsx antigo) ---
  const handleCreateInvestment = (amount: number) => {
    const newState = FinanceService.createContribution(amount);
    setSystemState(newState);
  };

  const handleWithdraw = (amount: number, type: "CAPITAL" | "RESULT", date: string) => {
    const result = FinanceService.requestRedemption(amount, type, date, user);
    if (result.success && result.newState) {
      setSystemState(result.newState);
      alert(result.message);
    } else {
      alert(`Aviso de Compliance: ${result.message}`);
    }
  };

  const handleReinvest = () => {
    const result = FinanceService.reinvestResults();
    if (result.success && result.newState) {
      setSystemState(result.newState);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // Admin
  const handleAdminApprove = (id: string) => setSystemState(FinanceService.approveTransaction(id));
  const handleAdminReject = (id: string) => setSystemState(FinanceService.rejectTransaction(id));
  const handleSetPerformance = (percent: number) => setSystemState(FinanceService.processManualPerformance(percent));
  const handleToggleVerification = (userId: string) => setSystemState(FinanceService.toggleUserVerification(userId));

  // Simulação demo
  const simulateNextDay = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSystemState(FinanceService.processPerformanceDistribution());
      setIsSimulating(false);
    }, 600);
  };

  const formattedDate =
    systemState?.currentVirtualDate
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(systemState.currentVirtualDate))
      : "";

  const title = loc.pathname
    .replace("/app/", "")
    .replaceAll("-", " ")
    .replaceAll("/", " / ");

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  })();
  const greetingName = authUser?.username || (role === "ADMIN" ? "Administrador" : "Cliente");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex font-sans">
      <Sidebar
        role={role as UserRole}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        onLogout={() => {
          logout();
          nav("/login", { replace: true });
        }}
      />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
              aria-label="Abrir menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu />
            </button>

            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-white capitalize tracking-wide">{title || "dashboard"}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {greeting}, <span className="text-slate-300">{greetingName}</span>
              </p>
            </div>

            <div className="sm:hidden">
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">
                VÉRTICE FX
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {formattedDate && (
              <div className="hidden md:flex items-center gap-2 bg-slate-900 rounded border border-slate-800 px-3 py-1">
                <Calendar size={14} className={role === "ADMIN" ? "text-emerald-500" : "text-slate-500"} />
                <span className={`text-xs font-mono ${role === "ADMIN" ? "text-emerald-400" : "text-slate-400"}`}>
                  {formattedDate}
                </span>

                {/* botão só pra CLIENT (igual seu original) */}
                {role !== "ADMIN" && (
                  <button
                    onClick={simulateNextDay}
                    disabled={isSimulating}
                    className="ml-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors disabled:opacity-50 border border-slate-700"
                  >
                    {isSimulating ? "..." : "Avançar"}
                  </button>
                )}
              </div>
            )}

            <button
              className="p-2 relative text-slate-400 hover:text-white transition-colors"
              onClick={() => setIsBellOpen((v) => !v)}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </button>
            {isBellOpen && (
              <div className="absolute right-4 md:right-6 top-14 w-[360px] max-w-[calc(100vw-2rem)] z-30 rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Notificações</p>
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-slate-400 hover:text-slate-200"
                    disabled={unreadCount === 0}
                  >
                    Marcar todas como lidas
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 text-center">Sem notificações.</p>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleNotificationClick(item.id)}
                        className={`w-full text-left px-4 py-3 border-b border-slate-800/70 hover:bg-slate-800/40 ${
                          item.is_read ? "" : "bg-slate-800/20"
                        }`}
                      >
                        <p className="text-sm text-slate-200 font-medium">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{item.message}</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {new Date(item.created_at).toLocaleString("pt-BR")}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Conteúdo */}
        <div ref={mainContentRef} className="flex-1 p-4 md:p-6 pb-12 overflow-y-auto bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            <Routes>
              {/* CLIENT */}
              <Route
                path="dashboard"
                element={<DashboardRoute />}
              />
              <Route path="investments" element={<Investments state={systemState} onCreateInvestment={handleCreateInvestment} />} />
              <Route path="yields" element={<Yields state={systemState} onReinvest={handleReinvest} />} />
              <Route path="withdrawals" element={<Withdrawals state={systemState} onRequestWithdrawal={handleWithdraw} />} />
              <Route path="transactions" element={<Transactions state={systemState} />} />
              <Route path="referrals" element={<Referrals user={user} state={systemState} />} />
              <Route path="transparency" element={<Transparency />} />

              {/* ADMIN (/app/admin/...) */}
              <Route
                path="admin/dashboard"
                element={
                  <RequireAdmin>
                    <AdminDashboard
                      state={systemState}
                      onApprove={handleAdminApprove}
                      onReject={handleAdminReject}
                      onSetPerformance={handleSetPerformance}
                      onToggleVerification={handleToggleVerification}
                      view="admin-dashboard"
                      onNavigate={(p) => nav(`/app/${p}`)}
                    />
                  </RequireAdmin>
                }
              />

              <Route
                path="admin/withdrawals"
                element={
                  <RequireAdmin>
                    <AdminPendingInvestments/>
                  </RequireAdmin>
                }
              />

              <Route
                path="admin/performance"
                element={
                  <RequireAdmin>
                    <AdminDashboard
                      state={systemState}
                      onApprove={handleAdminApprove}
                      onReject={handleAdminReject}
                      onSetPerformance={handleSetPerformance}
                      onToggleVerification={handleToggleVerification}
                      view="admin-performance"
                      onNavigate={(p) => nav(`/app/${p}`)}
                    />
                  </RequireAdmin>
                }
              />

              <Route
                path="admin/compliance"
                element={
                  <RequireAdmin>
                    <AdminDashboard
                      state={systemState}
                      onApprove={handleAdminApprove}
                      onReject={handleAdminReject}
                      onSetPerformance={handleSetPerformance}
                      onToggleVerification={handleToggleVerification}
                      view="admin-compliance"
                      onNavigate={(p) => nav(`/app/${p}`)}
                    />
                  </RequireAdmin>
                }
              />

              <Route
                path="admin/transactions"
                element={
                  <RequireAdmin>
                    <Transactions state={systemState} />
                  </RequireAdmin>
                }
              />

              <Route
                path="admin/settings"
                element={
                  <RequireAdmin>
                    <div className="p-6 text-slate-300">Configurações (Admin)</div>
                  </RequireAdmin>
                }
              />

              {/* defaults */}
              <Route index element={<Navigate to={role === "ADMIN" ? "admin/dashboard" : "dashboard"} replace />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </div>
        </div>

        <NewsTicker />
      </main>
    </div>
  );
}
