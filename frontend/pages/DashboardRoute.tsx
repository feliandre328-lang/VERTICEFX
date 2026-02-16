import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Dashboard from "./Dashboard";
import PixModal from "../components/PixModal";

import * as FinanceService from "../services/financialService";
import { SystemState } from "../types";

import { createInvestment, createPixCharge } from "../services/api";

export default function DashboardRoute() {
  const navigate = useNavigate();

  const [systemState, setSystemState] = useState<SystemState>(() => FinanceService.getSystemState());

  // input valor
  const [amountInput, setAmountInput] = useState<string>("300,00");

  // modal
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [externalRef, setExternalRef] = useState<string | undefined>(undefined);

  const [loadingPix, setLoadingPix] = useState(false);
  const [saving, setSaving] = useState(false);

  const access = useMemo(() => localStorage.getItem("access") || "", []);

  const handleReinvest = () => {
    const result = FinanceService.reinvestResults();
    if (result.success && result.newState) {
      setSystemState(result.newState);
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  function parseAmountBR(v: string) {
    const cleaned = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  const handleOpenPix = async () => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    const amount = parseAmountBR(amountInput);
    if (!amount || amount < 300) {
      alert("Valor mínimo para aporte é R$ 300,00.");
      return;
    }

    try {
      setLoadingPix(true);

      // ✅ gera BR Code válido no backend (com CRC real)
      const { pix_code, external_ref } = await createPixCharge(access, amount);

      setPixCode(pix_code);
      setExternalRef(external_ref);
      setIsPixOpen(true);
    } catch (err: any) {
      alert(err?.message ?? "Erro ao gerar Pix.");
    } finally {
      setLoadingPix(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    const amount = parseAmountBR(amountInput);
    if (!amount || amount < 300) {
      alert("Valor mínimo para aporte é R$ 300,00.");
      return;
    }

    try {
      setSaving(true);

      await createInvestment(access, {
        amount,
        paid_at: new Date().toISOString(),
        external_ref: externalRef,
      });

      setIsPixOpen(false);
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
        amountInput={amountInput}
        setAmountInput={setAmountInput}
        loadingPix={loadingPix}
      />

      <PixModal
        isOpen={isPixOpen}
        onClose={() => setIsPixOpen(false)}
        onConfirm={handleConfirmPaid}
        amount={parseAmountBR(amountInput)}
        pixCode={pixCode}
        externalRef={externalRef}
      />

      {saving && (
        <div className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-5 py-3 text-sm text-slate-200">
            Registrando aporte...
          </div>
        </div>
      )}
    </>
  );
}
