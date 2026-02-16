import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check } from "lucide-react";

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  amount: number;
  pixCode: string;
  externalRef?: string;
}

export default function PixModal({ isOpen, onClose, onConfirm, amount, pixCode, externalRef }: PixModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsCopied(false);

    if (canvasRef.current && pixCode) {
      QRCode.toCanvas(
        canvasRef.current,
        pixCode,
        { width: 220, margin: 1 },
        (error) => {
          if (error) console.error("QR error:", error);
        }
      );
    }
  }, [isOpen, pixCode]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

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

      {/* container central com altura controlada */}
      <div className="relative mx-auto mt-10 w-[92%] max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden">
        {/* header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Pagamento via Pix</h2>
            <p className="text-xs text-slate-400 mt-1">
              Valor do aporte: <span className="text-slate-200 font-semibold">{formatCurrency(amount)}</span>
            </p>
            {externalRef ? (
              <p className="text-[10px] text-slate-500 mt-1">Ref: {externalRef}</p>
            ) : null}
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* body com scroll */}
        <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex flex-col items-center">
            {pixCode ? (
              <canvas ref={canvasRef} />
            ) : (
              <div className="text-sm text-amber-300">Pix vazio. Não foi possível gerar.</div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
            <div className="text-xs text-slate-400 mb-2">Pix copia e cola</div>
            <div className="text-[11px] text-slate-200 break-all p-3 rounded-lg bg-slate-950 border border-slate-800">
              {pixCode || "(vazio)"}
            </div>

            <button
              onClick={handleCopy}
              className="mt-3 w-full py-2 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm hover:bg-slate-800 transition flex items-center justify-center gap-2"
              disabled={!pixCode}
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
              {isCopied ? "Copiado" : "Copiar código"}
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-400 leading-relaxed">
            1) Abra o app do seu banco → Pix → “copia e cola” ou QR Code. <br />
            2) Faça o pagamento. <br />
            3) Volte aqui e clique em <b>Já paguei</b> para registrar.
          </div>
        </div>

        {/* footer fixo */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={() => onConfirm()}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
          >
            Já paguei — registrar aporte
          </button>

          <button
            onClick={onClose}
            className="mt-2 w-full py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-sm hover:bg-slate-800 transition"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
