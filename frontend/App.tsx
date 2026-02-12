import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import NewsTicker from "./components/NewsTicker";
import { Menu, Calendar, Bell } from "lucide-react";
import * as FinanceService from "./services/financialService";
import { SystemState, UserProfile, UserRole } from "./types";

// Pages
import Login from "./pages/Login";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Investments from "./pages/Investments";
import Yields from "./pages/Yields";
import Withdrawals from "./pages/Withdrawals";
import Transactions from "./pages/Transactions";
import Referrals from "./pages/Referrals";
import Transparency from "./pages/Transparency";

const App: React.FC = () => {
  // Authentication State
  const [role, setRole] = useState<UserRole>("GUEST");
  const [authView, setAuthView] = useState<"login" | "signup">("login");

  // ⚠️ Agora o 2FA só será usado para ADMIN (demo)
  const [loginStep, setLoginStep] = useState<"roleSelection" | "2fa">("roleSelection");
  const [selectedRoleFor2FA, setSelectedRoleFor2FA] = useState<UserRole | null>(null);

  const [activePage, setActivePage] = useState("dashboard");
  const [systemState, setSystemState] = useState<SystemState>(FinanceService.getSystemState());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Ref for Main Content Scrolling
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Mock User (mantido como estava)
  const user: UserProfile = {
    id: "CLT-8821",
    name: role === "ADMIN" ? "Administrador" : "Carlos Mendes",
    email: role === "ADMIN" ? "admin@verticefx.com" : "carlos.m@example.com",
    referralCode: "VFX-9921",
    joinedDate: "2023-11-15",
    avatarUrl: "https://picsum.photos/100/100",
    isVerified: true,
    role: role,
  };

  useEffect(() => {
    setSystemState(FinanceService.getSystemState());
  }, []);

  // Smooth Scroll on Page Change
  useEffect(() => {
    if (mainContentRef.current) {
      if (activePage !== "admin-withdrawals") {
        mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [activePage]);

  // --- Login Flow Handlers ---

  /**
   * ✅ CLIENT: não tem 2FA (agora). Se tiver token do Django, entra direto.
   * ✅ ADMIN: mantém 2FA demo
   */
  const handleLoginRequest = (requestedRole: UserRole) => {
    if (requestedRole === "CLIENT") {
      const hasToken = !!localStorage.getItem("access");
      if (!hasToken) {
        alert("Faça o login para continuar.");
        return;
      }

      setRole("CLIENT");
      setActivePage("dashboard");
      setLoginStep("roleSelection");
      setSelectedRoleFor2FA(null);
      return;
    }

    // ADMIN -> mantém 2FA (demo)
    setSelectedRoleFor2FA("ADMIN");
    setLoginStep("2fa");
  };

  const handleSignUp = (userData: any) => {
    const newState = FinanceService.createUser(userData);
    setSystemState(newState);
    alert("Cadastro realizado com sucesso! Sua conta está em análise. Você já pode fazer o login.");
    setAuthView("login");
  };

  const handle2FAVerification = (code: string) => {
    // Demo: qualquer código de 6 dígitos é válido
    if (selectedRoleFor2FA && code.length === 6) {
      setRole(selectedRoleFor2FA);
      setActivePage(selectedRoleFor2FA === "ADMIN" ? "admin-dashboard" : "dashboard");

      // Reset login state
      setLoginStep("roleSelection");
      setSelectedRoleFor2FA(null);
    } else {
      alert("Código de verificação inválido.");
    }
  };

  const handleBackToRoleSelection = () => {
    setLoginStep("roleSelection");
    setSelectedRoleFor2FA(null);
  };

  const handleLogout = () => {
    setRole("GUEST");
    setAuthView("login");
    setLoginStep("roleSelection");
    setSelectedRoleFor2FA(null);
    setActivePage("dashboard");
    setIsMobileMenuOpen(false);

    // ✅ limpa tokens do Django
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  };

  // --- Client Actions ---

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

  // --- Admin Actions ---

  const handleAdminApprove = (id: string) => {
    const newState = FinanceService.approveTransaction(id);
    setSystemState(newState);
  };

  const handleAdminReject = (id: string) => {
    const newState = FinanceService.rejectTransaction(id);
    setSystemState(newState);
  };

  const handleSetPerformance = (percent: number) => {
    const newState = FinanceService.processManualPerformance(percent);
    setSystemState(newState);
  };

  const handleToggleVerification = (userId: string) => {
    const newState = FinanceService.toggleUserVerification(userId);
    setSystemState(newState);
  };

  // --- Simulation for Demo ---
  const simulateNextDay = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const newState = FinanceService.processPerformanceDistribution();
      setSystemState(newState);
      setIsSimulating(false);
    }, 600);
  };

  // --- Router ---

  const renderPage = () => {
    if (activePage === "transactions") return <Transactions state={systemState} />;

    if (role === "ADMIN") {
      switch (activePage) {
        case "admin-dashboard":
        case "admin-withdrawals":
        case "admin-performance":
        case "admin-compliance":
          return (
            <AdminDashboard
              state={systemState}
              onApprove={handleAdminApprove}
              onReject={handleAdminReject}
              onSetPerformance={handleSetPerformance}
              onToggleVerification={handleToggleVerification}
              view={activePage}
              onNavigate={setActivePage}
            />
          );
        default:
          return (
            <AdminDashboard
              state={systemState}
              onApprove={handleAdminApprove}
              onReject={handleAdminReject}
              onSetPerformance={handleSetPerformance}
              onToggleVerification={handleToggleVerification}
              view="admin-dashboard"
              onNavigate={setActivePage}
            />
          );
      }
    }

    switch (activePage) {
      case "dashboard":
        return <Dashboard state={systemState} onNavigate={setActivePage} onReinvest={handleReinvest} />;
      case "investments":
        return <Investments state={systemState} onCreateInvestment={handleCreateInvestment} />;
      case "yields":
        return <Yields state={systemState} onReinvest={handleReinvest} />;
      case "withdrawals":
        return <Withdrawals state={systemState} onRequestWithdrawal={handleWithdraw} />;
      case "referrals":
        return <Referrals user={user} state={systemState} />;
      case "transparency":
        return <Transparency />;
      default:
        return <Dashboard state={systemState} onNavigate={setActivePage} onReinvest={handleReinvest} />;
    }
  };

  const currentDate = new Date(systemState.currentVirtualDate);
  const formattedDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(currentDate);

  // --- Render Login Flow if Guest ---
  if (role === "GUEST") {
    if (authView === "signup") {
      return <SignUp onSignUp={handleSignUp} onBackToLogin={() => setAuthView("login")} />;
    }

    // 2FA só para ADMIN (demo)
    if (loginStep === "2fa") {
      return <TwoFactorAuth onVerify={handle2FAVerification} onBack={handleBackToRoleSelection} />;
    }

    return <Login onLoginRequest={handleLoginRequest} onGoToSignUp={() => setAuthView("signup")} />;
  }

  // --- Main App Layout ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 flex font-sans">
      <Sidebar
        activePage={activePage}
        role={role}
        onNavigate={(p) => {
          setActivePage(p);
          setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu />
            </button>

            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-white capitalize tracking-wide">{activePage.replace(/-/g, " ")}</h2>
            </div>

            <div className="sm:hidden">
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">
                VÉRTICE FX
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {role === "CLIENT" && (
              <div className="hidden md:flex items-center gap-2 bg-slate-900 rounded border border-slate-800 px-3 py-1">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-xs font-mono text-slate-400">{formattedDate}</span>
                <button
                  onClick={simulateNextDay}
                  disabled={isSimulating}
                  className="ml-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors disabled:opacity-50 border border-slate-700"
                >
                  {isSimulating ? "..." : "Avançar"}
                </button>
              </div>
            )}

            {role === "ADMIN" && (
              <div className="hidden md:flex items-center gap-2 bg-slate-900 rounded border border-slate-800 px-3 py-1">
                <Calendar size={14} className="text-emerald-500" />
                <span className="text-xs font-mono text-emerald-400">{formattedDate}</span>
              </div>
            )}

            <button className="p-2 relative text-slate-400 hover:text-white transition-colors">
              <Bell size={18} />
              {role === "ADMIN" && systemState.pendingApprovals > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </button>

            <div
              className={`h-8 w-8 rounded flex items-center justify-center text-xs font-bold cursor-pointer border ${
                role === "ADMIN"
                  ? "bg-emerald-900/30 border-emerald-800 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              {role === "ADMIN" ? "AD" : "CM"}
            </div>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-2">
                Fechar
              </button>
            </div>

            <div className="space-y-2">
              {(role === "ADMIN"
                ? [
                    { id: "admin-dashboard", label: "Mesa Operacional" },
                    { id: "admin-withdrawals", label: "Aprovações" },
                    { id: "admin-compliance", label: "Compliance (KYC)" },
                    { id: "transactions", label: "Log Transações" },
                  ]
                : [
                    { id: "dashboard", label: "Visão Geral" },
                    { id: "investments", label: "Meus Aportes" },
                    { id: "yields", label: "Performance" },
                    { id: "withdrawals", label: "Resgates" },
                    { id: "transactions", label: "Extrato" },
                  ]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left p-4 text-base font-medium rounded-lg transition-colors ${
                    activePage === item.id
                      ? "bg-slate-800 text-white border-l-4 border-emerald-500"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="mt-8 w-full py-3 bg-red-900/20 border border-red-900/50 text-red-400 rounded-lg text-sm font-medium"
            >
              Sair
            </button>
          </div>
        )}

        <div ref={mainContentRef} className="flex-1 p-4 md:p-6 pb-12 overflow-y-auto bg-slate-950 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">{renderPage()}</div>
        </div>

        <NewsTicker />
      </main>
    </div>
  );
};

export default App;
