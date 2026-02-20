import React from "react";
import { ShieldAlert, FileText, Scale, Lock, AlertTriangle } from "lucide-react";

const cardClass =
  "bg-slate-900 border border-slate-800 rounded-lg p-5 md:p-6 space-y-4";

const Transparency: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">
          Vigencia desta versao: 20/02/2026
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
          Transparencia, Politicas e Termos
        </h2>
        <p className="text-slate-400 mt-3 text-sm leading-relaxed">
          Este modulo consolida as regras operacionais e juridicas da plataforma:
          politica de risco, metodologia de performance, privacidade e LGPD, e
          termos de uso.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <a href="#politica-risco" className={`${cardClass} block hover:border-slate-700 transition-colors`}>
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-amber-400" />
            <h3 className="text-white font-semibold">Politica de Risco</h3>
          </div>
          <p className="text-sm text-slate-400">
            Limites, exposicao, cenarios de estresse, bloqueios e controles de liquidez.
          </p>
        </a>

        <a href="#metodologia-performance" className={`${cardClass} block hover:border-slate-700 transition-colors`}>
          <div className="flex items-center gap-3">
            <Scale size={18} className="text-blue-400" />
            <h3 className="text-white font-semibold">Metodologia de Performance</h3>
          </div>
          <p className="text-sm text-slate-400">
            Como o resultado diario e calculado, distribuido e registrado no extrato.
          </p>
        </a>

        <a href="#privacidade-lgpd" className={`${cardClass} block hover:border-slate-700 transition-colors`}>
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-emerald-400" />
            <h3 className="text-white font-semibold">Privacidade e LGPD</h3>
          </div>
          <p className="text-sm text-slate-400">
            Bases legais, direitos do titular, retencao de dados e atendimento de solicitacoes.
          </p>
        </a>

        <a href="#termos-uso" className={`${cardClass} block hover:border-slate-700 transition-colors`}>
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-violet-400" />
            <h3 className="text-white font-semibold">Termos de Uso</h3>
          </div>
          <p className="text-sm text-slate-400">
            Regras da conta, responsabilidades das partes, suspensao e encerramento.
          </p>
        </a>
      </div>

      <section id="politica-risco" className={cardClass}>
        <h3 className="text-lg font-bold text-white">1. Politica de Risco</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          O cliente reconhece que operacoes com ativos digitais possuem risco elevado, inclusive
          risco de perda parcial ou total do capital alocado.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-400 space-y-2">
          <li>Risco de mercado: variacao de preco, volatilidade e eventos extremos.</li>
          <li>Risco de liquidez: dificuldade de execucao em determinados horarios e ativos.</li>
          <li>Risco operacional: indisponibilidade de sistemas, falhas de integracao e latencia.</li>
          <li>Risco regulatorio: alteracoes normativas podem impactar operacao e disponibilidade.</li>
          <li>Risco de contraparte: exposicao a terceiros em custodias, corretoras e provedores.</li>
        </ul>
        <div className="rounded border border-amber-900/40 bg-amber-900/10 p-3 text-xs text-amber-200 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p>
            Nao existe garantia de retorno, rendimento fixo ou protecao por FGC. Historico passado
            nao representa resultado futuro.
          </p>
        </div>
      </section>

      <section id="metodologia-performance" className={cardClass}>
        <h3 className="text-lg font-bold text-white">2. Metodologia de Performance</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          A performance e apurada por dia de referencia. O resultado do cliente considera base de
          capital elegivel e percentual de performance definido para o periodo.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-400 space-y-2">
          <li>Base de calculo: soma de aportes aprovados ate a data de referencia.</li>
          <li>Formula: resultado do dia = base de capital x percentual diario.</li>
          <li>Distribuicao: o valor e registrado como credito de resultado no razao do cliente.</li>
          <li>Extrato: o evento aparece como "Distribuicao de Resultado".</li>
          <li>Liquidez: resgate de resultado segue regras de solicitacao e janela operacional.</li>
        </ul>
        <p className="text-xs text-slate-500">
          Pode haver ajuste retroativo em caso de erro operacional, duplicidade ou necessidade de
          conciliacao.
        </p>
      </section>

      <section id="privacidade-lgpd" className={cardClass}>
        <h3 className="text-lg font-bold text-white">3. Privacidade e LGPD</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          O tratamento de dados pessoais observa a Lei 13.709/2018 (LGPD), com principios de
          finalidade, necessidade, seguranca e transparencia.
        </p>
        <ul className="list-disc pl-5 text-sm text-slate-400 space-y-2">
          <li>Dados coletados: cadastro, autenticacao, dados operacionais e trilhas de auditoria.</li>
          <li>Finalidades: execucao do contrato, seguranca, prevencao a fraude e obrigacoes legais.</li>
          <li>Compartilhamento: apenas com operadores e parceiros estritamente necessarios.</li>
          <li>Retencao: pelo prazo legal, regulatorio ou necessario para defesa de direitos.</li>
          <li>Direitos do titular: confirmacao, acesso, correcao, portabilidade, eliminacao e oposicao.</li>
        </ul>
        <p className="text-xs text-slate-500">
          Canal para solicitacoes LGPD: <span className="text-slate-300">privacidade@vertice.fx</span>
        </p>
      </section>

      <section id="termos-uso" className={cardClass}>
        <h3 className="text-lg font-bold text-white">4. Termos de Uso</h3>
        <ul className="list-disc pl-5 text-sm text-slate-400 space-y-2">
          <li>A conta e pessoal, intransferivel e depende de informacoes verdadeiras e atualizadas.</li>
          <li>O cliente responde pela guarda de senha, dispositivo e fatores de autenticacao.</li>
          <li>Pedidos de aporte, resgate e liquidacao ficam sujeitos a validacoes internas.</li>
          <li>A plataforma pode suspender operacoes em caso de suspeita de fraude ou risco elevado.</li>
          <li>Taxas, prazos e regras operacionais podem ser atualizados mediante aviso no sistema.</li>
          <li>O uso continuado da plataforma representa concordancia com a versao vigente dos termos.</li>
        </ul>
        <p className="text-xs text-slate-500">
          Em caso de conflito, prevalece a legislacao brasileira e o foro contratualmente definido.
        </p>
      </section>

      <div className="border-t border-slate-800 pt-6 text-xs text-slate-500 leading-relaxed">
        <p>Vertice FX - Documento informativo de governanca interna.</p>
        <p>
          Este conteudo e modelo operacional e deve ser revisado por assessoria juridica antes da
          publicacao institucional definitiva.
        </p>
      </div>
    </div>
  );
};

export default Transparency;
