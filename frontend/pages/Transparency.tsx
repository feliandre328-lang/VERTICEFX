import React from 'react';
import { ShieldAlert, FileText, Scale, Lock } from 'lucide-react';

const Transparency: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Transparência e Governança</h2>
        <p className="text-slate-400">Central de documentos, políticas de risco e conformidade regulatória.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Risk Policy */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-800 rounded text-slate-300 group-hover:bg-slate-700 transition-colors">
              <ShieldAlert size={20} />
            </div>
            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Política de Riscos</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Ativos digitais são instrumentos voláteis. Não garantimos rentabilidade fixa. 
            O investidor deve estar ciente da possibilidade de variação negativa de patrimônio em cenários de estresse de mercado.
          </p>
          <a href="#" className="text-xs text-blue-500 group-hover:text-blue-400 uppercase font-bold tracking-wide">Ler documento completo →</a>
        </div>

        {/* Operational Methodology */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-800 rounded text-slate-300 group-hover:bg-slate-700 transition-colors">
              <Scale size={20} />
            </div>
            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Metodologia de Performance</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Os resultados são apurados diariamente com base na liquidação efetiva das operações. 
            A distribuição de resultados ocorre após a dedução de custos operacionais e taxa de administração.
          </p>
          <a href="#" className="text-xs text-blue-500 group-hover:text-blue-400 uppercase font-bold tracking-wide">Ver relatórios auditados →</a>
        </div>

        {/* Privacy & LGPD */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-800 rounded text-slate-300 group-hover:bg-slate-700 transition-colors">
              <Lock size={20} />
            </div>
            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Privacidade e Dados (LGPD)</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Seus dados são tratados em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018). 
            Utilizamos criptografia de ponta a ponta e não compartilhamos informações com terceiros sem consentimento.
          </p>
          <a href="#" className="text-xs text-blue-500 group-hover:text-blue-400 uppercase font-bold tracking-wide">Política de Privacidade →</a>
        </div>

        {/* Terms of Service */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg hover:border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-800 rounded text-slate-300 group-hover:bg-slate-700 transition-colors">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Termos de Uso</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            Regras de utilização da plataforma, prazos de liquidação, carências contratuais e responsabilidades das partes.
          </p>
          <a href="#" className="text-xs text-blue-500 group-hover:text-blue-400 uppercase font-bold tracking-wide">Baixar PDF →</a>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-8 mt-12 text-center">
        <p className="text-xs text-slate-600 max-w-2xl mx-auto">
          Vértice FX Gestão de Ativos Ltda. CNPJ: 00.000.000/0001-00.<br/>
          A Vértice FX não é uma instituição financeira, mas uma plataforma de tecnologia para gestão de ativos digitais. 
          As operações realizadas não contam com a garantia do Fundo Garantidor de Créditos (FGC).
        </p>
      </div>

    </div>
  );
};

export default Transparency;