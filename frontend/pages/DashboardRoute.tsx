import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Dashboard from "./Dashboard";
import PixModal from "../components/PixModal";

import * as FinanceService from "../services/financialService";
import { SystemState } from "../types";
import { createInvestment, createPixCharge, getDashboardSummary } from "../services/api";

export default function DashboardRoute() {
  const navigate = useNavigate();

  // state original do app (mantém TUDO como antes)
  const [systemState, setSystemState] = useState<SystemState>(() => FinanceService.getSystemState());

  // pix modal
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [saving, setSaving] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [externalRef, setExternalRef] = useState<string | undefined>(undefined);

  const access = useMemo(() => localStorage.getItem("access") || "", []);

  // ✅ carrega o patrimônio real do banco e injeta em state.balanceCapital
  useEffect(() => {
    if (!access) return;

    (async () => {
      try {
        const sum = await getDashboardSummary(access);
        const balanceCapital = sum.balance_capital_cents / 100;

        setSystemState((prev) => ({
          ...prev,
          balanceCapital,          // 🔥 aqui seu StatCard passa a mostrar do banco
          totalContributed: balanceCapital, // opcional: se quiser alinhar o card Total Aportado
        }));
      } catch (e) {
        // não trava o app
        console.warn("Resumo do dashboard falhou:", e);
      }
    })();
  }, [access]);

  const handleReinvest = () => {
    const result = FinanceService.reinvestResults();
    if (result.success && result.newState) {
      setSystemState(result.newState);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // ✅ abre modal e gera PIX no backend (pix_code + external_ref)
  const handleOpenPix = async () => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);
      const charge = await createPixCharge(access, { amount });
      setPixCode(charge.pix_code);
      setExternalRef(charge.external_ref);
      setIsPixOpen(true);
    } catch (err: any) {
      alert(err?.message ?? "Erro ao gerar Pix.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ “Já paguei” -> cria investimento PENDING no Django
  const handleConfirmPaid = async (refFromInput?: string) => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);

      await createInvestment(access, {
        amount,
        paid_at: new Date().toISOString(),
        external_ref: refFromInput || externalRef,
      });

      setIsPixOpen(false);

      // opcional: atualiza summary de novo (pra refletir pendente/contadores)
      try {
        const sum = await getDashboardSummary(access);
        const balanceCapital = sum.balance_capital_cents / 100;
        setSystemState((prev) => ({
          ...prev,
          balanceCapital,
          totalContributed: balanceCapital,
        }));
      } catch {}

      navigate("/app/investments", { replace: true });
    } catch (err: any) {
      alert(err?.message ?? "Erro ao registrar aporte.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dashboard
        state={systemState}
        onNavigate={(p) => navigate(`/app/${p}`)}
        onReinvest={handleReinvest}
        onOpenPix={handleOpenPix}
      />

      <PixModal
        isOpen={isPixOpen}
        onClose={() => setIsPixOpen(false)}
        onConfirm={handleConfirmPaid}
        amount={amount}
        pixCode={pixCode}
      />

      {saving && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-5 py-3 text-sm text-slate-200">
            Processando...
          </div>
        </div>
      )}
    </>
  );
}
