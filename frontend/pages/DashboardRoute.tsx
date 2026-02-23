import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Dashboard from "./Dashboard";
import PixModal from "../components/PixModal";

import * as FinanceService from "../services/financialService";
import { SystemState } from "../types";
import { createInvestment, getDashboardSummary, listDailyPerformanceDistributions } from "../services/api";
import { generatePIXCode } from "../services/pixService";

const MIN_PIX_AMOUNT = 300;

type LocalPixPayload = {
  pix_code: string;
  external_ref: string;
  qr_code_base64?: string;
};

function createLocalTxid() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `VFX${timePart}${randomPart}`.slice(0, 25);
}

export default function DashboardRoute() {
  const navigate = useNavigate();
  const [systemState, setSystemState] = useState<SystemState>(() => FinanceService.getSystemState());
  const access = useMemo(() => localStorage.getItem("access") || "", []);
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [amountInput, setAmountInput] = useState<string>("300,00");
  const [amountNumber, setAmountNumber] = useState<number>(MIN_PIX_AMOUNT);
  const [saving, setSaving] = useState(false);
  const [pix, setPix] = useState<LocalPixPayload | null>(null);

  const refreshDashboardSummary = async () => {
    if (!access) return;
    try {
      const [sum, distributions] = await Promise.all([
        getDashboardSummary(access),
        listDailyPerformanceDistributions(access),
      ]);
      const balanceCapital = (sum.balance_capital_cents || 0) / 100;
      const balanceResults =
        (distributions ?? []).reduce((acc, item) => acc + (item.result_cents || 0), 0) / 100;
      setSystemState((prev) => ({
        ...prev,
        balanceCapital,
        balanceResults,
        totalContributed: balanceCapital,
      }));
    } catch (e) {
      console.warn("Resumo do dashboard falhou:", e);
    }
  };

  useEffect(() => {
    if (!access) return;
    refreshDashboardSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  useEffect(() => {
    const onNotif = () => {
      refreshDashboardSummary();
    };
    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const parseBRL = (value: string) => {
    const s = (value || "").trim().replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const formatBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);

  const handleOpenPix = () => {
    if (!access) {
      alert("Sessao expirada. Faca login novamente.");
      navigate("/login", { replace: true });
      return;
    }
    setPix(null);
    setIsPixOpen(true);
  };

  const handleAmountChange = (next: string) => {
    setAmountInput(next);
    const n = parseBRL(next);
    if (!Number.isFinite(n)) return;
    setAmountNumber(n);
  };

  const handleGeneratePix = async () => {
    if (!access) {
      alert("Sessao expirada. Faca login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    const n = amountNumber;
    if (!Number.isFinite(n) || n < MIN_PIX_AMOUNT) {
      alert(`O valor minimo para aporte e ${formatBRL(MIN_PIX_AMOUNT)}.`);
      return;
    }

    try {
      const txid = createLocalTxid();
      const pixCode = generatePIXCode(n, txid);
      setPix({
        pix_code: pixCode,
        external_ref: txid,
      });
    } catch (err: any) {
      alert(err?.message ?? "Erro ao gerar Pix local.");
    }
  };

  const handleConfirmPaid = async (refFromInput?: string) => {
    if (!access) {
      alert("Sessao expirada. Faca login novamente.");
      navigate("/login", { replace: true });
      return;
    }
    if (!pix?.external_ref) {
      alert("Gere o Pix antes de confirmar o pagamento.");
      return;
    }

    try {
      setSaving(true);
      await createInvestment(access, {
        amount: amountNumber,
        paid_at: new Date().toISOString(),
        external_ref: refFromInput || pix.external_ref,
      });
      setIsPixOpen(false);
      await refreshDashboardSummary();
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
        onOpenPix={handleOpenPix}
        amountInput={amountInput}
        setAmountInput={handleAmountChange}
        loadingPix={saving}
      />

      <PixModal
        isOpen={isPixOpen}
        onClose={() => setIsPixOpen(false)}
        onGeneratePix={handleGeneratePix}
        onConfirm={handleConfirmPaid}
        minAmount={MIN_PIX_AMOUNT}
        amountInput={amountInput}
        onAmountChange={handleAmountChange}
        amountNumber={amountNumber}
        pixCode={pix?.pix_code || ""}
        qrBase64={pix?.qr_code_base64 || ""}
        externalRef={pix?.external_ref}
        loading={saving}
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
