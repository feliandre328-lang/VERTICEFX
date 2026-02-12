import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check } from 'lucide-react';

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  pixCode: string;
}

const PixModal: React.FC<PixModalProps> = ({ isOpen, onClose, onConfirm, amount, pixCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && pixCode) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 240,
        margin: 1,
        color: {
          dark: '#e2e8f0', // slate-200
          light: '#0f172a'  // slate-900
        }
      }, (error) => {
        if (error) console.error('Error generating QR Code:', error);
      });
    }
  }, [isOpen, pixCode]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-blue-900/10 w-full max-w-md m-4 p-6 md:p-8 text-center flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div>
            <h2 className="text-xl font-bold text-white">Pagar com PIX</h2>
            <p className="text-sm text-slate-400 mt-1">
                Valor do Aporte: <span className="font-bold text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}</span>
            </p>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <canvas ref={canvasRef} className="rounded-md"></canvas>
        </div>

        <div>
            <p className="text-xs text-slate-500 mb-2">Ou use o PIX Copia e Cola:</p>
            <div className="relative">
                <textarea 
                    readOnly 
                    value={pixCode}
                    className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded p-3 pr-10 resize-none h-24 text-slate-400 focus:outline-none"
                />
                <button 
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                    {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
            </div>
        </div>
        
        <button 
            onClick={onConfirm}
            className="w-full py-3 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-lg transition-all"
        >
            Já realizei o pagamento
        </button>
      </div>
    </div>
  );
};

export default PixModal;