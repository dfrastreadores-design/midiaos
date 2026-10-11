import {
  CalendarDays,
  FileSignature,
  DollarSign,
  ShieldCheck,
  Bot,
  Smartphone,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Lock,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ModulesTechSection() {
  const modulos = [
    {
      badge: "MÓDULO 01",
      icon: CalendarDays,
      title: "Mapa de Ocupação & Inventário",
      desc: "Visão rápida e panorâmica de espaços vagos, reservados e ocupados na grade de veiculação em tempo real.",
      itens: [
        "Controle de grade por programa, faixa horária ou ponto geográfico",
        "Prevenção inteligente de choque de anunciantes concorrentes",
        "Filtro por tipo de mídia: TV, Rádio, Painel LED, Portal e Revista",
        "Disponibilidade atualizada automaticamente a cada proposta aprovada",
      ],
      cor: "from-cyan-400 to-blue-500",
      accent: "text-cyan-400",
      border: "border-cyan-500/30",
    },
    {
      badge: "MÓDULO 02",
      icon: FileSignature,
      title: "Motor de Propostas & P.I. Digital",
      desc: "Modelos padronizados com cálculo de descontos progressivos, tabelas de preços personalizadas e assinatura eletrônica.",
      itens: [
        "Emissão de propostas comerciais de alto padrão em segundos",
        "Geração de P.I. (Pedido de Inserção) com valor jurídico oficial",
        "Link único para assinatura eletrônica via WhatsApp ou e-mail",
        "Exportação personalizada em PDF corporativo e slides PowerPoint",
      ],
      cor: "from-blue-400 to-violet-500",
      accent: "text-blue-400",
      border: "border-blue-500/30",
    },
    {
      badge: "MÓDULO 03",
      icon: DollarSign,
      title: "Módulo Financeiro & Repasses",
      desc: "Conciliação rápida de faturamento, separação de receita bruta/líquida, BV de agência e extrato transparente para representantes.",
      itens: [
        "Cálculo automático de comissões por executivo comercial e meta",
        "Extrato consolidado de repasses para emissoras e veículos parceiros",
        "Dedução automática de BV e alíquotas fiscais configuráveis",
        "Previsibilidade de fluxo de caixa e relatórios de inadimplência",
      ],
      cor: "from-purple-400 to-pink-500",
      accent: "text-purple-400",
      border: "border-purple-500/30",
    },
    {
      badge: "MÓDULO 04",
      icon: ShieldCheck,
      title: "Segurança & Nuvem Corporativa",
      desc: "Acesso de qualquer lugar, múltiplos níveis de permissão para equipe de vendas e infraestrutura com criptografia avançada.",
      itens: [
        "Níveis de acesso restritos: Diretoria, OPEC, Gerência e Executivo",
        "Criptografia de ponta a ponta e auditoria completa de alterações",
        "Backups automáticos diários em servidores de alta disponibilidade",
        "Conformidade total com a Lei Geral de Proteção de Dados (LGPD)",
      ],
      cor: "from-emerald-400 to-cyan-500",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
    },
  ];

  return (
    <section
      id="recursos"
      className="relative py-24 sm:py-32 bg-[#070b12] border-t border-slate-800/80 overflow-hidden"
    >
      {/* Background Cyber Tech Grid */}
      <div className="absolute inset-0 midia-grid-bg opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 right-0 size-96 bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 size-96 bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Cpu className="size-3" /> ARQUITETURA MODULAR
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Módulos tecnológicos integrados em um{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              ecossistema único
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Cada módulo do MidiaOS foi projetado para dialogar perfeitamente com os demais,
            eliminando silos de dados entre Comercial, OPEC e Financeiro.
          </p>
        </div>

        {/* Grid dos 4 Módulos Principais */}
        <div className="grid md:grid-cols-2 gap-8">
          {modulos.map((mod, i) => (
            <div
              key={i}
              className={`midia-card p-8 space-y-6 relative overflow-hidden group hover:${mod.border}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`size-14 rounded-2xl bg-gradient-to-br ${mod.cor} p-[1.5px] shadow-lg`}
                >
                  <div className="w-full h-full rounded-[14px] bg-[#0A0E17] flex items-center justify-center">
                    <mod.icon className={`size-7 ${mod.accent}`} />
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-500 font-bold tracking-widest">
                  {mod.badge}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{mod.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{mod.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                {mod.itens.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className={`size-4 ${mod.accent} shrink-0 mt-0.5`} />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recursos Exclusivos de Vanguarda (Bônus IA e Mobile) */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {/* Card IA */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 flex items-start gap-4">
            <div className="size-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Bot className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">
                  Copiloto Comercial &amp; Extração por IA
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                  NOVIDADE
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recebeu uma PI ou briefing da agência em PDF? A Inteligência Artificial do MidiaOS
                extrai anunciante, produtos, períodos e valores automaticamente sem digitação
                manual.
              </p>
            </div>
          </div>

          {/* Card Mobile App */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-start gap-4">
            <div className="size-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">
                  Aplicativo Nativo Android &amp; iOS
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  MULTIDISPOSITIVO
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Diretores e executivos acompanham metas, consultam a grade e aprovam PIs de qualquer
                lugar direto pelo smartphone com notificações push instantâneas.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/site/demo"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs uppercase tracking-wider transition-all"
          >
            <span>Explorar Todos os Módulos na Demonstração Gratuita</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
