import { useState } from "react";
import {
  Tv,
  Radio,
  Globe,
  Layers,
  Users2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Camera,
  CalendarDays,
  FileCheck2,
  DollarSign,
  TrendingUp,
  Building,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SegmentationSection() {
  const [activeTab, setActiveTab] = useState<"veiculos" | "representacoes">("veiculos");

  return (
    <section
      id="veiculos"
      className="relative py-24 sm:py-32 border-t border-slate-800/80 bg-[#070b12] overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Sparkles className="size-3" /> QUEM ATENDEMOS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Arquitetado especificamente para a realidade do{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              mercado publicitário
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Seja você um veículo com grade própria de veiculação ou uma empresa de representação
            comercial com carteira multi-emissoras, o MidiaOS resolve seus gargalos operacionais.
          </p>

          {/* Seletor Dinâmico em Abas (Tabs) */}
          <div className="pt-4 flex justify-center">
            <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 inline-flex items-center gap-2 shadow-2xl">
              <button
                type="button"
                onClick={() => setActiveTab("veiculos")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "veiculos"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Tv className="size-4" />
                <span>Para Veículos de Comunicação</span>
              </button>

              <button
                type="button"
                id="representacoes"
                onClick={() => setActiveTab("representacoes")}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "representacoes"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Users2 className="size-4" />
                <span>Para Representações Comerciais</span>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo da Aba 1: Veículos de Comunicação */}
        {activeTab === "veiculos" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            {/* Tag de Tipos Atendidos */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="text-slate-500 uppercase font-mono tracking-wider font-semibold">
                Compatibilidade nativa:
              </span>
              {[
                "Emissoras de TV Aberta & Fechada",
                "Rádios FM, AM & Web Rádios",
                "Portais de Notícias & Jornais Digitais",
                "Circuitos OOH & Painéis DOOH",
                "Mídia Impressa & Revistas",
              ].map((tipo) => (
                <span
                  key={tipo}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                >
                  {tipo}
                </span>
              ))}
            </div>

            {/* Grid de Benefícios Chave para Veículos */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarDays className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Gestão de Inventário &amp; Grade em Tempo Real
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Visão instantânea de espaços vagos, reservados e ocupados por faixa horária,
                  programa ou tela digital. Adeus ao fantasma do overbooking e vendas simultâneas.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Bloqueio automático de conflito de marcas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Tabelas de preços dinâmicas por audiência</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Mapa de calor de ocupação semanal e mensal</span>
                  </li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Controle de Veiculação &amp; Checking Digital
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Centralize os comprovantes de exibição (checking fotográfico OOH, áudio de rádio
                  ou print de portal) com data, hora e geolocalização auditável para agências.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Relatório de veiculação em PDF com 1 clique</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Envio automático de checking para agências</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Histórico auditável de veiculação e trocas</span>
                  </li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCheck2 className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Emissão Rápida de Propostas &amp; P.I.s
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Gere orçamentos e Pedidos de Inserção formais em segundos. Envie link direto para
                  assinatura eletrônica com validade jurídica aceita por agências e órgãos públicos.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Assinatura eletrônica com token e carimbo temporal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Cálculo automático de BV de agência e descontos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Exportação visual em PDF corporativo e PowerPoint</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Chamada para Ação Segmentada */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-base font-bold text-white">
                  Sua emissora ou veículo perde vendas por falta de agilidade no envio de PIs?
                </div>
                <div className="text-xs text-slate-400">
                  Implante o MidiaOS na sua OPEC e equipe comercial em menos de uma semana.
                </div>
              </div>
              <Link
                to="/site/demo"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-cyan-500/20 shrink-0"
              >
                Testar no meu Veículo
              </Link>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba 2: Representações Comerciais */}
        {activeTab === "representacoes" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            {/* Tag de Tipos Atendidos */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="text-slate-500 uppercase font-mono tracking-wider font-semibold">
                Criado para:
              </span>
              {[
                "Empresas de Representação de Mídia Regional & Nacional",
                "Representantes Comerciais Multi-Veículo",
                "Escritórios Comerciais de Redes e Grupos Afiliados",
                "Agenciadores e Brokers de Espaços Publicitários",
              ].map((tipo) => (
                <span
                  key={tipo}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                >
                  {tipo}
                </span>
              ))}
            </div>

            {/* Grid de Benefícios Chave para Representações */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Gestão de Múltiplos Veículos Parceiros
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Gerencie todo o portfólio de emissoras, rádios e painéis representados em uma
                  única plataforma centralizada, com tabelas de preço, formatos e praças isoladas.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                    <span>Controle de propostas multi-praça e pacote combinado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                    <span>Visão de estoque disponível de cada veículo representado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                    <span>Relatórios consolidados de vendas por parceiro</span>
                  </li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Cálculo Automático de Comissões &amp; Repasses
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Elimine semanas de fechamento financeiro em planilhas manuais. O sistema calcula o
                  repasse líquido para o veículo e a comissão de cada representante automaticamente.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Extrato de prestação de contas transparente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Dedução precisa de impostos, BV e agência</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Histórico de liquidação financeira e baixas</span>
                  </li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  CRM Integrado para Agências &amp; Clientes
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Acompanhe contatos, mídias e planejadores das agências de publicidade. Gerencie o
                  funil de oportunidades, briefings e histórico de investimentos por anunciante.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Pipeline visual Kanban de oportunidades comerciais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Alerta automático de renovação de contratos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Metas individuais por executivo e praça atendida</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Chamada para Ação Segmentada */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-base font-bold text-white">
                  Sua representação comercial ainda calcula comissões em planilhas Excel?
                </div>
                <div className="text-xs text-slate-400">
                  Profissionalize seus repasses e passe confiança inquestionável aos seus veículos
                  parceiros.
                </div>
              </div>
              <Link
                to="/site/demo"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-cyan-500/20 shrink-0"
              >
                Testar para Representação
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
