import { useState } from "react";
import { HelpCircle, ChevronDown, Sparkles, MessageSquare, ArrowRight } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Como funciona a migração das nossas planilhas e histórico para o MidiaOS?",
      a: "Nossa equipe realiza a importação assistida de dados (clientes, agências, produtos, tabelas de preço e contatos). Além disso, a plataforma conta com Inteligência Artificial que lê PDFs de PIs antigas e preenche os cadastros automaticamente, tornando a transição indolor e rápida.",
    },
    {
      q: "O MidiaOS é compatível com múltiplos tipos de mídia na mesma conta?",
      a: "Sim! O sistema é 100% omnichannel e multi-veículo. Você pode gerenciar TV, Rádio, Portais de Notícias, Painéis Digitais (DOOH), Mídia Impressa e Projetos Especiais no mesmo painel, com controle de inventário e tabelas de preço específicas para cada formato.",
    },
    {
      q: "Quanto tempo leva a implantação e o treinamento da equipe comercial?",
      a: "A implantação padrão é concluída em até 7 dias úteis. Nossa equipe conduz sessões práticas de treinamento ao vivo para sua equipe comercial, OPEC e setor financeiro, garantindo adesão imediata de todos os usuários.",
    },
    {
      q: "O MidiaOS faz a gestão completa do time comercial e metas de vendedores?",
      a: "Sim, de ponta a ponta! O sistema conta com painel de metas individuais e coletivas, ranking gamificado em tempo real, controle estrito de carteiras de clientes e alçadas de desconto progressivas (gerência e diretoria). Tudo integrado automaticamente ao cálculo de comissões por faturamento e liquidação.",
    },
    {
      q: "Como as agências de publicidade utilizam o MidiaOS?",
      a: "As agências de publicidade parceiras podem receber orçamentos digitais interativos, assinar Pedidos de Inserção (PIs) com 1 clique e acompanhar em tempo real o checking fotográfico/veiculação de suas campanhas, além de contar com conciliação clara e automática de bonificação de volume (BV).",
    },
    {
      q: "Como o MidiaOS calcula comissões e repasses para Representações Comerciais?",
      a: "O módulo de repasses permite cadastrar as alíquotas contratuais de cada veículo representado, deduções de BV de agência e impostos. O sistema gera automaticamente o extrato de repasse líquido para a emissora e o extrato de comissão dos executivos comerciais, eliminando horas de conferência em planilhas.",
    },
    {
      q: "A assinatura eletrônica de propostas e PIs tem validade jurídica?",
      a: "Sim, validade jurídica plena. A assinatura digital do MidiaOS cumpre rigorosamente os termos da Medida Provisória nº 2.200-2/2001 e do Código Civil Brasileiro, registrando carimbo de data/hora, endereço IP, hash SHA-256 e trilha de auditoria completa aceita por agências e órgãos públicos.",
    },
    {
      q: "Meus dados comerciais e de faturamento estão seguros na nuvem?",
      a: "Absolutamente. Os dados são armazenados com criptografia em repouso e em trânsito (SSL/TLS 256 bits), backups diários automatizados e conformidade estrita com a LGPD. Cada usuário só visualiza as informações permitidas pelo seu nível de permissão (administrador, gerente, vendedor ou OPEC).",
    },
  ];

  return (
    <section
      id="faq"
      className="relative py-24 sm:py-32 bg-[#0A0E17] border-t border-slate-800/80 overflow-hidden"
    >
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <HelpCircle className="size-3" /> DÚVIDAS FREQUENTES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Perguntas frequentes &amp;{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              respostas claras
            </span>
          </h2>
          <p className="text-slate-400 text-base">
            Tudo o que você precisa saber antes de modernizar a gestão do seu veículo ou
            representação.
          </p>
        </div>

        {/* Acordeão Interativo */}
        <div className="space-y-4">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`rounded-2xl transition-all border ${
                  isOpen
                    ? "bg-slate-900 border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.1)]"
                    : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {f.q}
                  </span>
                  <div
                    className={`size-8 rounded-full border border-slate-700 flex items-center justify-center shrink-0 transition-transform ${
                      isOpen
                        ? "rotate-180 bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        : "text-slate-400"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 mt-1 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Chamada para Dúvidas Específicas */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Tem uma dúvida técnica específica?</div>
              <div className="text-xs text-slate-400">
                Nossos consultores comerciais respondem em minutos pelo WhatsApp.
              </div>
            </div>
          </div>
          <a
            href="https://wa.me/5561984746857"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 border border-slate-700 transition-colors"
          >
            <span>Conversar no WhatsApp</span>
            <ArrowRight className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
