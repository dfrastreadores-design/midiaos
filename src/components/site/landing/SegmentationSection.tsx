import { useState } from "react";
import {
  Tv,
  Users2,
  Building2,
  TrendingUp,
  CheckCircle2,
  CalendarDays,
  Camera,
  FileCheck2,
  DollarSign,
  Building,
  Target,
  Trophy,
  Briefcase,
  Layers,
  Sparkles,
  Shield,
  FileText,
  Percent,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SegmentationSection() {
  const [activeTab, setActiveTab] = useState<
    "veiculos" | "representacoes" | "agencias" | "comercial"
  >("veiculos");

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
            Arquitetado para conectar{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              todo o ecossistema de mídia
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Da emissora à agência de publicidade, passando pela representação e pela liderança de
            vendas: o MidiaOS sincroniza todas as pontas da operação comercial.
          </p>

          {/* Seletor Dinâmico em 4 Abas (Tabs) */}
          <div className="pt-4 flex justify-center">
            <div className="p-1.5 rounded-2xl bg-slate-900 border border-slate-800 inline-flex flex-wrap items-center justify-center gap-1.5 shadow-2xl max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab("veiculos")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "veiculos"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Tv className="size-4" />
                <span>Veículos de Comunicação</span>
              </button>

              <button
                type="button"
                id="representacoes"
                onClick={() => setActiveTab("representacoes")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "representacoes"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Users2 className="size-4" />
                <span>Representações de Mídia</span>
              </button>

              <button
                type="button"
                id="agencias"
                onClick={() => setActiveTab("agencias")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "agencias"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Building2 className="size-4" />
                <span>Agências de Publicidade</span>
              </button>

              <button
                type="button"
                id="comercial"
                onClick={() => setActiveTab("comercial")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === "comercial"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <TrendingUp className="size-4" />
                <span>Gestão do Time Comercial</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ABA 1: VEÍCULOS DE COMUNICAÇÃO
        ========================================================================= */}
        {activeTab === "veiculos" && (
          <div className="space-y-10 animate-in fade-in duration-300">
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

            <div className="grid md:grid-cols-3 gap-6">
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

        {/* =========================================================================
            ABA 2: REPRESENTAÇÕES COMERCIAIS
        ========================================================================= */}
        {activeTab === "representacoes" && (
          <div className="space-y-10 animate-in fade-in duration-300">
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

            <div className="grid md:grid-cols-3 gap-6">
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

              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Cálculo Automático de Comissões &amp; Repasses
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Elimine semanas de fechamento financeiro em planilhas manuais. O sistema calcula
                  o repasse líquido para o veículo e a comissão de cada representante automaticamente.
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

              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  CRM Integrado para Agências &amp; Clientes
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Acompanhe contatos, mídias e planejadores das agências de publicidade. Gerencie
                  o funil de oportunidades, briefings e histórico de investimentos por anunciante.
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

            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-base font-bold text-white">
                  Sua representação comercial ainda calcula comissões em planilhas Excel?
                </div>
                <div className="text-xs text-slate-400">
                  Profissionalize seus repasses e passe confiança inquestionável aos seus veículos parceiros.
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

        {/* =========================================================================
            ABA 3: PARA AGÊNCIAS DE PUBLICIDADE
        ========================================================================= */}
        {activeTab === "agencias" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="text-slate-500 uppercase font-mono tracking-wider font-semibold">
                Facilidades para o dia a dia da agência:
              </span>
              {[
                "Diretores de Mídia & Planejadores",
                "Compradores de Mídia (Media Buyers)",
                "Atendimentos de Contas & OPEC",
                "Departamentos Financeiros de Agências",
              ].map((tipo) => (
                <span
                  key={tipo}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                >
                  {tipo}
                </span>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Briefings &amp; P.I.s em Segundos
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Envie briefings estruturados e receba propostas oficiais padronizadas. Aprove e
                  assine Pedidos de Inserção com um toque no celular via assinatura digital.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Assinatura eletrônica sem papel e sem burocracia</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Histórico de versões e aditivos contratuais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Upload direto de arquivos de materiais e artes</span>
                  </li>
                </ul>
              </div>

              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Checking Fotográfico &amp; Comprovação ao Vivo
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  A agência acessa o painel de checking digital para auditar inserções, fotos de
                  painéis OOH e veiculações em tempo real para prestação de contas com o cliente anunciante.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Comprovantes com geolocalização e carimbo temporal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Exportação de relatórios visuais para o cliente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Notificação imediata assim que a campanha vai ao ar</span>
                  </li>
                </ul>
              </div>

              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Percent className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Conciliação de BV &amp; Transparência Financeira
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Controle absoluto sobre Bonificação de Volume (BV), repasses de comissão da agência,
                  datas de vencimento e espelho de faturamento sincronizado com os veículos.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Extratos claros de BV acumulado por período</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Conciliação automática sem desencontro de notas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                    <span>Segurança fiscal e jurídica para agência e anunciante</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-base font-bold text-white">
                  Sua agência precisa de velocidade para aprovar PIs e checar veiculações?
                </div>
                <div className="text-xs text-slate-400">
                  O MidiaOS integra seu time de mídia diretamente com as melhores emissoras e redes do país.
                </div>
              </div>
              <Link
                to="/site/demo"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-cyan-500/20 shrink-0"
              >
                Conectar Minha Agência
              </Link>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 4: GESTÃO DE TIME COMERCIAL & METAS
        ========================================================================= */}
        {activeTab === "comercial" && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="text-slate-500 uppercase font-mono tracking-wider font-semibold">
                Controle de liderança de vendas:
              </span>
              {[
                "Diretores Comerciais & Gerentes de Vendas",
                "Executivos de Contas (Account Executives)",
                "Representantes Comerciais Externos",
                "Coordenadores de OPEC & Inteligência de Mercado",
              ].map((tipo) => (
                <span
                  key={tipo}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                >
                  {tipo}
                </span>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Metas Individuais, Equipes &amp; Gamificação
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Defina metas mensais por vendedor, por veículo e por segmento. Acompanhe o
                  termômetro de atingimento em tempo real e incentive a equipe com rankings dinâmicos.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Ranking comercial e pódio de executivos ao vivo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Previsão de fechamento (forecast) ponderada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Metas por receita bruta, líquida ou quantidade de PIs</span>
                  </li>
                </ul>
              </div>

              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Alçadas de Desconto &amp; Aprovação de Diretoria
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Proteja a rentabilidade da sua grade. Propostas comerciais com descontos acima do
                  limite autorizado disparam solicitação automática para aprovação do Diretor Comercial.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                    <span>Aprovação em 1 clique via push no smartphone</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                    <span>Travas financeiras contra queima indevida de tabela</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                    <span>Registro auditável de quem autorizou a condição</span>
                  </li>
                </ul>
              </div>

              <div className="midia-card p-7 space-y-4 relative overflow-hidden group">
                <div className="size-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Carteira Blindada &amp; Tarefas de Follow-up
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Evite que executivos disputem os mesmos clientes ou deixem contatos esfriarem.
                  Distribua carteiras, organize follow-ups e receba alertas de propostas vencendo.
                </p>
                <ul className="pt-2 space-y-2 text-xs text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Proteção de carteira de clientes e agências</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Alertas automáticos de renovação de contratos anuais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Controle de produtividade e visitas comerciais</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-base font-bold text-white">
                  Deseja dar previsibilidade e alta performance para seu time de vendas?
                </div>
                <div className="text-xs text-slate-400">
                  O MidiaOS equipa seus executivos comerciais com a ferramenta mais rápida do mercado.
                </div>
              </div>
              <Link
                to="/site/demo"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-cyan-500/20 shrink-0"
              >
                Capacitar Meu Time Comercial
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
