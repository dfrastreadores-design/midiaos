import { XCircle, CheckCircle2, AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function BeforeAfterSection() {
  const comparisons = [
    {
      problema: "Vendas duplicadas & Overbooking de Horários",
      dor: "Vendedores vendem o mesmo intervalo comercial ou painel LED simultaneamente porque a grade fica travada em planilha no computador da OPEC.",
      solucao: "Disponibilidade e Mapa de Ocupação em Tempo Real",
      ganho:
        "Grade 100% sincronizada na nuvem com trava automática de concorrência e bloqueio instantâneo após reserva.",
    },
    {
      problema: "Cálculo Manual de Comissão em Planilhas",
      dor: "Dias inteiros perdidos todo início de mês recalculando comissões, deduções de impostos, repasses e queixas de executivos comerciais.",
      solucao: "Fechamento de Comissões e Repasses Automatizado",
      ganho:
        "Extratos consolidados e transparentes gerados em 1 clique para emissoras parceiras e representantes comerciais.",
    },
    {
      problema: "Demora de Dias para Emitir Propostas e P.I.",
      dor: "Orçamentos montados manualmente em Word ou Excel com risco de erro em tabelas de preços e perda do timing com as agências.",
      solucao: "Geração de Propostas em 40 Segundos & Assinatura Digital",
      ganho:
        "Modelos oficiais pré-formatados com tabela inteligente, descontos padronizados e assinatura eletrônica jurídica.",
    },
    {
      problema: "Desencontro Financeiro & Comprovantes Perdidos",
      dor: "Faturas emitidas sem cruzamento com veiculação efetiva, checking fotográfico espalhado pelo WhatsApp e retrabalho contábil.",
      solucao: "Relatórios de Faturamento Precisos & Checking Centralizado",
      ganho:
        "Conciliação completa de faturamento bruto/líquido, BV de agência e relatórios de comprovação anexados à PI.",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-[#0A0E17] border-t border-slate-800/80 overflow-hidden">
      {/* Background Subtle Cyber Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3/4 h-80 bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
            <AlertTriangle className="size-3" /> TRANSFORMAÇÃO OPERACIONAL
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            A diferença entre o caos operacional e a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              eficiência do MidiaOS
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Compare o modelo arcaico baseado em planilhas soltas com a inteligência integrada de uma
            plataforma feita sob medida para quem vende mídia.
          </p>
        </div>

        {/* Comparativo Lado a Lado */}
        <div className="space-y-6">
          {comparisons.map((item, idx) => (
            <div
              key={idx}
              className="grid lg:grid-cols-2 gap-4 lg:gap-6 rounded-2xl p-1 bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
            >
              {/* Lado ANTES (Vermelho / Alerta) */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-red-950/20 via-slate-900/80 to-slate-900 border border-red-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                    <XCircle className="size-4 shrink-0" />
                    <span>Como a maioria opera hoje (Antes)</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{item.problema}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.dor}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-red-500/10 text-xs text-red-300/80 font-medium flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-red-400" />
                  Gera perda de receita, atrito com clientes e retrabalho constante.
                </div>
              </div>

              {/* Lado COM MIDIAOS (Ciano / Sucesso) */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-950/30 via-slate-900/90 to-slate-900 border border-cyan-500/30 shadow-[0_0_25px_rgba(0,242,254,0.06)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Com a plataforma MidiaOS (Depois)</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{item.solucao}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.ganho}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-cyan-500/20 text-xs text-cyan-300 font-medium flex items-center gap-1.5">
                  <Zap className="size-3.5 text-cyan-400 shrink-0" />
                  Operação fluida, agilidade extrema e confiança nos números.
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner Central */}
        <div className="mt-12 text-center">
          <Link
            to="/site/demo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-slate-950 font-extrabold text-sm uppercase tracking-wider hover:opacity-95 shadow-[0_0_25px_rgba(0,242,254,0.35)] transition-all hover:scale-[1.02]"
          >
            <span>Eliminar esses gargalos na minha empresa</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
