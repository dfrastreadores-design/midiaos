import { useState } from "react";
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Zap, PhoneCall } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PricingSection() {
  const [anual, setAnual] = useState(true);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      sub: "Pequeno Porte",
      desc: "Para emissoras locais, rádios comunitárias ou equipes comerciais enxutas.",
      precoMensal: 250,
      precoAnual: 199,
      usuarios: "Até 2 usuários inclusos",
      features: [
        "Gestão de Inventário e Grade de Mídia",
        "CRM Comercial e Funil de Vendas",
        "Emissor de Propostas Comerciais",
        "Geração de P.I. Digital com Assinatura",
        "Controle de Faturamento Básico",
        "Suporte por E-mail e WhatsApp",
      ],
      popular: false,
      cta: "Começar com Starter",
    },
    {
      id: "profissional",
      name: "Profissional",
      sub: "Médio Porte — Mais Popular",
      desc: "Para veículos consolidados e representações comerciais com equipe ativa.",
      precoMensal: 550,
      precoAnual: 440,
      usuarios: "Até 8 usuários inclusos",
      features: [
        "Tudo do plano Starter +",
        "Módulo de Repasses e Comissões Automáticas",
        "Multi-Veículos e Gestão de Representação",
        "Controle de Checking Fotográfico e Comprovação",
        "Dashboard Executivo e Metas de Vendedores",
        "Copiloto Comercial IA para Extração de PIs",
        "Acesso ao Aplicativo Mobile Android & iOS",
        "Onboarding Assistido com Especialista de Mídia",
      ],
      popular: true,
      cta: "Contratar Profissional",
    },
    {
      id: "enterprise",
      name: "Enterprise & Redes",
      sub: "Grande Porte",
      desc: "Para grupos de mídia multi-praça, redes de afiliadas e grandes agências de representação.",
      precoMensal: 1499,
      precoAnual: 1199,
      usuarios: "Usuários Ilimitados",
      features: [
        "Tudo do plano Profissional +",
        "Múltiplas Empresas / CNPJs (Multi-Tenant)",
        "API Aberta e Integrações Customizadas",
        "Controle de Alçadas e Aprovação por Diretoria",
        "SLA de Atendimento Garantido 99.9%",
        "Gerente de Conta Dedicado e Treinamento In-Company",
        "Suporte Prioritário 24/7",
      ],
      popular: false,
      cta: "Falar com Consultor Enterprise",
    },
  ];

  return (
    <section
      id="planos"
      className="relative py-24 sm:py-32 bg-[#070b12] border-t border-slate-800/80 overflow-hidden"
    >
      {/* Glow Center */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-cyan-500/5 rounded-full blur-[170px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Sparkles className="size-3" /> PLANOS TRANSPARENTES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Investimento sob medida para a escala da sua{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              operação comercial
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Sem pegadinhas, sem taxas ocultas de implantação e com cancelamento a qualquer momento.
          </p>

          {/* Toggle Anual / Mensal */}
          <div className="pt-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold">
            <span className={!anual ? "text-white font-bold" : "text-slate-400"}>Mensal</span>
            <button
              type="button"
              onClick={() => setAnual(!anual)}
              className="relative w-14 h-8 rounded-full bg-slate-800 border border-slate-700 p-1 transition-colors cursor-pointer"
              aria-label="Alternar ciclo de pagamento"
            >
              <div
                className={`size-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-transform ${
                  anual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={anual ? "text-white font-bold" : "text-slate-400"}>
                Anual (20% de Desconto)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/30">
                ECONOMIA
              </span>
            </div>
          </div>
        </div>

        {/* Grid de Planos */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((p) => {
            const price = anual ? p.precoAnual : p.precoMensal;
            return (
              <div
                key={p.id}
                className={`rounded-2xl p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  p.popular
                    ? "bg-[#0E1726] border-2 border-cyan-400 shadow-[0_0_40px_rgba(0,242,254,0.2)] lg:-translate-y-3"
                    : "bg-slate-900/80 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider shadow-md">
                    RECOMENDADO PELO MERCADO
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">{p.name}</h3>
                      <div className="text-xs font-mono font-semibold text-cyan-400 mt-0.5">
                        {p.sub}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed min-h-[40px]">
                    {p.desc}
                  </p>

                  <div className="mt-6 pt-6 border-t border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-400 text-sm font-semibold">R$</span>
                      <span className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                        {price}
                      </span>
                      <span className="text-slate-400 text-xs font-medium">/mês</span>
                    </div>
                    <div className="text-[11px] text-cyan-300 font-mono mt-1 font-semibold">
                      {p.usuarios}
                    </div>
                    {anual && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Faturado anualmente com 20% de desconto
                      </div>
                    )}
                  </div>

                  {/* Lista de Recursos */}
                  <div className="mt-8 space-y-3 border-t border-slate-800/80 pt-6">
                    <div className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                      O que está incluso:
                    </div>
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="size-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão de Contratação */}
                <div className="mt-8 pt-6 border-t border-slate-800/80">
                  <Link
                    to="/site/demo"
                    className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      p.popular
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.4)] hover:opacity-95"
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <span>{p.cta}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selo Oficial de Garantia & Suporte Especializado */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0A1628] to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(0,242,254,0.2)]">
              <ShieldCheck className="size-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-white">
                  Selo de Garantia &amp; Suporte Especializado para o Mercado Publicitário
                </h4>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  SLA 99.9%
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Nossa equipe é formada por especialistas que entendem as particularidades de
                comercialização de mídia (OPEC, BV, P.I., checking, comissões de representação).
                Treinamento incluso e migração assistida de dados em até 7 dias úteis.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/5561984746857"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all shadow-md"
          >
            <PhoneCall className="size-3.5" />
            <span>Tirar Dúvidas com Especialista</span>
          </a>
        </div>
      </div>
    </section>
  );
}
