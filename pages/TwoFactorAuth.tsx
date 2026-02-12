import React, { useState, useRef, ChangeEvent, KeyboardEvent, ClipboardEvent, useEffect } from 'react';
import { KeyRound, ChevronLeft } from 'lucide-react';

interface TwoFactorAuthProps {
  onVerify: (code: string) => void;
  onBack: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onVerify, onBack }) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return false;

    const newOtp = [...otp];
    newOtp[index] = element.value.slice(-1);
    setOtp(newOtp);

    if (element.value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text');
    if (/^\d{6}$/.test(paste)) {
      const newOtp = paste.split('');
      setOtp(newOtp);
      inputsRef.current[5]?.focus();
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length === 6) {
      onVerify(code);
    }
  };

  const isButtonDisabled = otp.join('').length !== 6;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <KeyRound className="text-slate-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Verificação de Dois Fatores</h1>
          <p className="text-slate-400 text-sm mt-2">
            Insira o código de 6 dígitos gerado pelo seu aplicativo de autenticação.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 md:gap-3 my-8" onPaste={handlePaste}>
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  // FIX: The ref callback should not return a value. Changed `(...)` to `{...}` to prevent implicit return.
                  ref={(el) => { inputsRef.current[index] = el; }}
                  className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold text-white bg-slate-950 border border-slate-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
            >
              Verificar Código
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <ChevronLeft size={16} />
            Voltar para seleção de perfil
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
