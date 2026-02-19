import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Dashboard from "./Dashboard";
import PixModal from "../components/PixModal";

import * as FinanceService from "../services/financialService";
import { SystemState } from "../types";
import { createInvestment, getDashboardSummary } from "../services/api";
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
  // Limite recomendado do txid no BR Code: ate 25 chars
  return `VFX${timePart}${randomPart}`.slice(0, 25);
}

export default function DashboardRoute() {
  const navigate = useNavigate();

  // state original do app (mantém TUDO como antes)
  const [systemState, setSystemState] = useState<SystemState>(() => FinanceService.getSystemState());

  // ✅ token JWT
  const access = useMemo(() => localStorage.getItem("access") || "", []);

  // PIX modal
  const [isPixOpen, setIsPixOpen] = useState(false);

  // valor do aporte (dinâmico)
  const [amountInput, setAmountInput] = useState<string>("300,00");
  const [amountNumber, setAmountNumber] = useState<number>(MIN_PIX_AMOUNT);

  // request state
  const [saving, setSaving] = useState(false);

  // pix payload local (sem Mercado Pago)
  const [pix, setPix] = useState<LocalPixPayload | null>(null);

  // ✅ carrega o patrimônio real do banco e injeta em state.balanceCapital
  useEffect(() => {
    if (!access) return;

    (async () => {
      try {
        const sum = await getDashboardSummary(access);
        const balanceCapital = (sum.balance_capital_cents || 0) / 100;

        setSystemState((prev) => ({
          ...prev,
          balanceCapital,
          totalContributed: balanceCapital, // opcional: alinhar card
        }));
      } catch (e) {
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

  // helpers
  const parseBRL = (value: string) => {
    const s = (value || "")
      .trim()
      .replace(/\s/g, "")
      .replace("R$", "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const formatBRL = (n: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
  };

  // ✅ abre modal (NÃO gera pix automaticamente — igual Nubank)
  const handleOpenPix = () => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    // reseta estado do pix para forçar gerar de novo ao clicar no botão do modal
    setPix(null);
    setIsPixOpen(true);
  };

  // ✅ valida e atualiza amountNumber quando digita
  const handleAmountChange = (next: string) => {
    setAmountInput(next);

    const n = parseBRL(next);
    if (!Number.isFinite(n)) return;

    setAmountNumber(n);
  };

  // ✅ botao dentro do modal: gera Pix local (copia e cola + QR)
  const handleGeneratePix = async () => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    const n = amountNumber;

    if (!Number.isFinite(n) || n < MIN_PIX_AMOUNT) {
      alert(`O valor mínimo para aporte é ${formatBRL(MIN_PIX_AMOUNT)}.`);
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

  // ✅ “Já paguei” -> cria investimento PENDING no Django
  const handleConfirmPaid = async (refFromInput?: string) => {
    if (!access) {
      alert("Sessão expirada. Faça login novamente.");
      navigate("/login", { replace: true });
      return;
    }

    // precisa ter gerado pix antes, porque o fluxo é "Nubank"
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

      // atualiza summary
      try {
        const sum = await getDashboardSummary(access);
        const balanceCapital = (sum.balance_capital_cents || 0) / 100;
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
