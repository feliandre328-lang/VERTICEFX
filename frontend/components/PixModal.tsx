import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check } from "lucide-react";

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Nubank flow
  onGeneratePix: () => void | Promise<void>;
  onConfirm: (externalRefOverride?: string) => void | Promise<void>;

  // input dinâmico
  minAmount: number;
  amountInput: string;
  onAmountChange: (v: string) => void;
  amountNumber: number;

  // payload
  pixCode: string;
  qrBase64?: string;
  externalRef?: string;

  loading?: boolean;
}

export default function PixModal({
  isOpen,
  onClose,
  onGeneratePix,
  onConfirm,
  minAmount,
  amountInput,
  onAmountChange,
  amountNumber,
  pixCode,
  qrBase64,
  externalRef,
  loading,
}: PixModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [externalRefInput, setExternalRefInput] = useState("");

  const hasQrImage = !!qrBase64;
  const canConfirm = !!pixCode && !!externalRef;

  const formatBRL = useMemo(
    () => (val: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val),
    []
  );

  // fallback QR via library (quando nao vier imagem base64)
  useEffect(() => {
    if (!isOpen) return;
    setIsCopied(false);

    if (!hasQrImage && canvasRef.current && pixCode) {
      QRCode.toCanvas(canvasRef.current, pixCode, { width: 220, margin: 1 }, (error) => {
        if (error) console.error("QR error:", error);
      });
    }
  }, [isOpen, pixCode, hasQrImage]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode || "");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1200);
    } catch {
      alert("Não consegui copiar. Copie manualmente.");
    }
  };

  return (
    <div className="fixed inset-0 z-[99999]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative mx-auto mt-8 w-[92%] max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        {/* header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Pagamento via Pix</h2>
            <p className="text-xs text-slate-400 mt-1">
              Valor do aporte:{" "}
              <span className="text-slate-200 font-semibold">{formatBRL(amountNumber)}</span>{" "}
              <span className="text-slate-500">(minimo {formatBRL(minAmount)})</span>
            </p>
            {externalRef ? <p className="text-[10px] text-slate-500 mt-1">TXID: {externalRef}</p> : null}
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* body scroll */}
        <div className="px-5 py-4 max-h-[62vh] overflow-y-auto space-y-4">
          {/* input valor */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <label className="block text-xs text-slate-400 mb-2">Quanto você quer aportar?</label>
            <input
              value={amountInput}
              onChange={(e) => onAmountChange(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-700"
              placeholder="Ex: 300,00"
              disabled={!!loading}
            />

            <button
              onClick={() => onGeneratePix()}
              disabled={!!loading}
              className="mt-3 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm transition"
            >
              {loading ? "Gerando..." : "Gerar Pix"}
            </button>

            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
              Dica: digite com virgula (ex: <b>300,00</b>). O QR e o copia e cola sao gerados localmente.
            </p>
          </div>

          {/* QR */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex flex-col items-center">
            {!pixCode ? (
              <div className="text-sm text-slate-400 text-center">
                Clique em <b>Gerar Pix</b> para carregar o QR Code.
              </div>
            ) : hasQrImage ? (
              <img
                src={`data:image/png;base64,${qrBase64}`}
                alt="QR Code Pix"
                className="w-[220px] h-[220px] rounded bg-white p-2"
              />
            ) : (
              <canvas ref={canvasRef} />
            )}
          </div>

          {/* copia e cola */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="text-xs text-slate-400 mb-2">Pix "copia e cola"</div>
            <div className="text-[11px] text-slate-200 break-all p-3 rounded-lg bg-slate-950 border border-slate-800">
              {pixCode || "(vazio)"}
            </div>

            <button
              onClick={handleCopy}
              className="mt-3 w-full py-2 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-60"
              disabled={!pixCode}
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
              {isCopied ? "Copiado" : "Copiar codigo"}
            </button>
          </div>

          {/* external ref opcional */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <label className="block text-xs text-slate-400 mb-2">Referencia externa (opcional)</label>
            <input
              value={externalRefInput}
              onChange={(e) => setExternalRefInput(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-700"
              placeholder="pix-abc-123"
              disabled={!!loading}
            />

            <p className="mt-2 text-[11px] text-slate-500">
              Normalmente voce nao precisa preencher. Se preencher, este valor sera salvo no aporte.
            </p>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            1) Abra o app do banco → Pix → QR Code / Copia e Cola. <br />
            2) Faça o pagamento. <br />
            3) Volte aqui e clique em <b>Já paguei</b> para registrar.
          </div>
        </div>

        {/* footer fixo */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={() => onConfirm(externalRefInput || undefined)}
            disabled={!canConfirm || !!loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            Já paguei — registrar aporte
          </button>

          <button
            onClick={onClose}
            disabled={!!loading}
            className="mt-2 w-full py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm hover:bg-slate-800 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
