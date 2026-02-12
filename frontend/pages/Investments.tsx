import React, { useState } from 'react';
import { SystemState } from '../types';
import { PlusCircle, Lock, PieChart, Shield, FileCheck } from 'lucide-react';
import * as PixService from '../services/pixService';
import PixModal from '../components/PixModal';

interface InvestmentsProps {
  state: SystemState;
  onCreateInvestment: (amount: number) => void;
}

const Investments: React.FC<InvestmentsProps> = ({ state, onCreateInvestment }) => {
  const [amount, setAmount] = useState<string>('');
  const [agreed, setAgreed] = useState(false);
  
  // State for PIX Modal
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [pixAmount, setPixAmount] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert("É necessário aceitar os termos do contrato digital.");
      return;
    }
    const val = parseFloat(amount);
    if (val && val > 0) {
      // Generate PIX code instead of creating investment directly
      const txid = `VFX${Date.now()}${(Math.random() * 1000).toFixed(0)}`;
      const code = PixService.generatePIXCode(val, txid.slice(0, 25));
      setPixAmount(val);
      setPixCode(code);
      setShowPixModal(true);
    }
  };

  const handleConfirmPayment = () => {
    // This simulates the bank confirming the payment
    if (pixAmount > 0) {
      onCreateInvestment(pixAmount);
    }
    // Reset all states after confirmation
    setShowPixModal(false);
    setAmount('');
    setAgreed(false);
    setPixCode('');
    setPixAmount(0);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <>
      <PixModal 
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        onConfirm={handleConfirmPayment}
        amount={pixAmount}
        pixCode={pixCode}
      />
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Create Investment Form */}
          <div className="md:w-1/3">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 static md:sticky md:top-24">
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <PlusCircle className="text-slate-400" size={20} />
                Novo Aporte
              </h3>
              <p className="text-xs text-slate-500 mb-6">Aporte de capital para gestão de ativos.</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Valor do Aporte</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-500">R$</span>
                    <input 
                      type="number" 
                      min="100"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-all placeholder:text-slate-600"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="text-slate-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <strong>Carência de Liquidez:</strong> O capital aportado estará sujeito a uma carência contratual de 90 dias para estruturação das operações.
                    </p>
                  </div>
                </div>

                {/* Legal Checkbox */}
                <div className="flex items-start gap-3 px-1">
                  <div className="relative flex items-center pt-0.5">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-600/20"
                    />
                  </div>
                  <label htmlFor="terms" className="text-xs text-slate-400">
                    Declaro que li e concordo com os <a href="#" className="text-blue-500 hover:underline">Termos de Uso</a> e a <a href="#" className="text-blue-500 hover:underline">Política de Riscos</a>. Estou ciente que a performance é variável.
                  </label>
                </div>

                <button 
                  type="submit"
                  disabled={!agreed || !amount || parseFloat(amount) <= 0}
                  className="w-full py-3 bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-600 text-slate-900 font-bold rounded-lg transition-all"
                >
                  Gerar PIX para Aporte
                </button>
              </form>
            </div>
          </div>

          {/* Active Investments List */}
          <div className="md:w-2/3">
            <h3 className="text-lg font-bold text-white mb-4">Portfólio Ativo</h3>
            <div className="grid gap-4">
              {state.investments.length === 0 ? (
                 <div className="bg-slate-900 border border-slate-800 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-slate-600">
                   <PieChart size={48} className="mb-4 opacity-20" />
                   <p className="text-sm">Nenhum contrato ativo encontrado.</p>
                 </div>
              ) : (
                state.investments.map((inv) => {
                  const isLocked = new Date(state.currentVirtualDate) < new Date(inv.lockupDate);
                  return (
                    <div key={inv.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                          <FileCheck className="text-slate-400" size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Valor do Contrato</p>
                          <h4 className="text-lg font-semibold text-white">{formatCurrency(inv.amount)}</h4>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wide border ${
                          isLocked 
                            ? 'bg-slate-800 text-slate-400 border-slate-700' 
                            : 'bg-blue-900/20 text-blue-400 border-blue-800/30'
                        }`}>
                          {isLocked ? <Lock size={10} /> : null}
                          {isLocked ? 'Carência Vigente' : 'Liquidez Disponível'}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Data de liberação: {new Date(inv.lockupDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Investments;