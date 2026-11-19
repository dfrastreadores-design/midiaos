import React, { useState } from "react";
import { 
  FileText, 
  Presentation, 
  CheckCircle2, 
  Download, 
  Sparkles, 
  MapPin, 
  TrendingUp, 
  Target, 
  ShieldCheck, 
  Layers, 
  BarChart3, 
  Calendar, 
  DollarSign, 
  Users, 
  Eye, 
  Award, 
  HelpCircle, 
  Star, 
  Building,
  Image as ImageIcon,
  Zap,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBRL } from "@/lib/mock-data";
import type { PlanejamentoEstrategicoCompleto } from "@/lib/copiloto-planejamento.types";

interface CopilotoDossieCanvasProps {
  planejamento: PlanejamentoEstrategicoCompleto;
  onExportarPptx: () => void;
  onExportarPdf: () => void;
  onConverterPi: () => void;
  onSelecionarCenario: (cenarioId: "conservador" | "recomendado" | "agressivo") => void;
  onAvaliarAprendizado: (estrelas: number, feedback: string) => void;
  carregandoAcao?: boolean;
}

export const CopilotoDossieCanvas: React.FC<CopilotoDossieCanvasProps> = ({
  planejamento,
  onExportarPptx,
  onExportarPdf,
  onConverterPi,
  onSelecionarCenario,
  onAvaliarAprendizado,
  carregandoAcao = false,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<string>("visao_geral");
  const [modalFeedbackAberto, setModalFeedbackAberto] = useState(false);
  const [estrelasFeedback, setEstrelasFeedback] = useState<number>(5);
  const [textoFeedback, setTextoFeedback] = useState("");

  const { briefing, diagnostico, objetivos, estrategia, plano_midia, distribuicao_investimento, defesa_comercial, cenarios, apresentacao_executiva } = planejamento;

  const handleEnviarFeedback = () => {
    onAvaliarAprendizado(estrelasFeedback, textoFeedback);
    setModalFeedbackAberto(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 overflow-hidden text-slate-100">
      {/* Barra de Ações Superior do Dossiê */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{briefing.cliente_nome}</span>
              <span className="text-slate-500 font-normal">|</span>
              <span className="text-sm font-medium text-blue-400">Planejamento Estratégico de Mídia</span>
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
              v{planejamento.versao}.0 • Ativo
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>Praça: <strong className="text-slate-300">{briefing.praca_alvo}</strong></span>
            <span>•</span>
            <span>Segmento: <strong className="text-slate-300">{briefing.segmento}</strong></span>
            <span>•</span>
            <span>Período: <strong className="text-slate-300">{briefing.duracao_dias} dias</strong></span>
          </p>
        </div>

        {/* Botões de Ação Executiva */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportarPdf}
            disabled={carregandoAcao}
            className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Dossiê PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportarPptx}
            disabled={carregandoAcao}
            className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs gap-1.5"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-400" />
            <span>Apresentação PPTX (16:9)</span>
          </Button>

          <Button
            size="sm"
            onClick={onConverterPi}
            disabled={carregandoAcao}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Gerar Pedido de Inserção (PI)</span>
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setModalFeedbackAberto(!modalFeedbackAberto)}
                  className="h-8 w-8 text-amber-400 hover:bg-amber-400/10"
                >
                  <Star className="w-4 h-4 fill-amber-400/30" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Avaliar IA & Treinar Modelo
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Modal / Banner de Aprendizado Contínuo */}
      {modalFeedbackAberto && (
        <div className="bg-slate-950 border-b border-amber-500/30 p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">Aprendizado Contínuo da IA de Mídia</span>
            </div>
            <button
              onClick={() => setModalFeedbackAberto(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕ Fechar
            </button>
          </div>
          <p className="text-xs text-slate-300">
            Sua avaliação ajuda a IA a aprimorar recomendações de formatos, preços negociados e defesas comerciais em planejamentos futuros:
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((estrela) => (
              <button
                key={estrela}
                type="button"
                onClick={() => setEstrelasFeedback(estrela)}
                className="text-lg transition-transform hover:scale-110"
              >
                <Star
                  className={`w-5 h-5 ${
                    estrela <= estrelasFeedback ? "text-amber-400 fill-amber-400" : "text-slate-600"
                  }`}
                />
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-2">
              {estrelasFeedback === 5 ? "Excelente alinhamento estratégico" : `${estrelasFeedback} de 5 estrelas`}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={textoFeedback}
              onChange={(e) => setTextoFeedback(e.target.value)}
              placeholder="Ex: 'Ótima distribuição de LED, manter essa proporção para clientes automotivos'..."
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 flex-1 focus:outline-none focus:border-amber-400"
            />
            <Button
              size="sm"
              onClick={handleEnviarFeedback}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs"
            >
              Registrar Aprendizado
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal com Tabs de Navegação Estratégica */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex-1 flex flex-col overflow-hidden">
        {/* Barra de Tabs das 9 Seções */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40">
          <TabsList className="bg-transparent h-11 p-0 gap-4 overflow-x-auto justify-start border-none">
            <TabsTrigger
              value="visao_geral"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              1. Visão Geral & KPIs
            </TabsTrigger>
            <TabsTrigger
              value="estrategia"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              2. Tese & 5 Pilares
            </TabsTrigger>
            <TabsTrigger
              value="plano_midia"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              3. Plano de Mídia ({plano_midia.length} pontos)
            </TabsTrigger>
            <TabsTrigger
              value="mix_investimento"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              4. Mix & Investimento
            </TabsTrigger>
            <TabsTrigger
              value="defesa_comercial"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              5. Defesa Comercial
            </TabsTrigger>
            <TabsTrigger
              value="cenarios"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              6. Simulação de Cenários
            </TabsTrigger>
            <TabsTrigger
              value="apresentacao"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-slate-400 text-xs rounded-none py-3 px-1 font-medium transition-all"
            >
              7. Apresentação Executiva
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Área de Scroll das Seções */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================================= */}
          {/* ABA 1: VISÃO GERAL & KPIS (Briefing, Diagnóstico e Objetivos) */}
          {/* ========================================================================= */}
          <TabsContent value="visao_geral" className="m-0 space-y-6">
            {/* Banner da Tese Rápida */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-400">
                  Tese Estratégica Central
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  "{estrategia.tese_central}"
                </p>
                <p className="text-xs text-slate-400 leading-normal">
                  {estrategia.racional_estrategico}
                </p>
              </div>
            </div>

            {/* 4 Cards de Métricas Principais (KPIs Projetados) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-950/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Impactos Visuais Totais</span>
                    <Eye className="w-4 h-4 text-blue-400" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-white tracking-tight">
                    {(objetivos.kpis_projetados.impactos_visuais_totais / 1000000).toFixed(2)}M
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Em {briefing.duracao_dias} dias de campanha contínua
                </CardContent>
              </Card>

              <Card className="bg-slate-950/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Alcance Único Projetado</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-white tracking-tight">
                    {(objetivos.kpis_projetados.alcance_pessoas_unicas / 1000).toFixed(0)} mil
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Pessoas únicas atingidas no território
                </CardContent>
              </Card>

              <Card className="bg-slate-950/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Frequência Média de Impacto</span>
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-white tracking-tight">
                    {objetivos.kpis_projetados.frequencia_media}x
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Repetições por indivíduo na jornada
                </CardContent>
              </Card>

              <Card className="bg-slate-950/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Custo por Mil Impactos (CPM)</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-white tracking-tight">
                    R$ {objetivos.kpis_projetados.cpm_estimado.toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Até 4x menor que leilões digitais
                </CardContent>
              </Card>
            </div>

            {/* Grid 2 Colunas: Briefing & Diagnóstico */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Briefing Detalhado */}
              <Card className="bg-slate-950/60 border-slate-800">
                <CardHeader className="p-4 pb-3 border-b border-slate-800/80">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-400" />
                    <span>Briefing do Cliente & Territorialidade</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Razão Social / Cliente:</span>
                      <strong className="text-white">{briefing.cliente_nome}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Praça Alvo:</span>
                      <strong className="text-white">{briefing.praca_alvo}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Investimento Total:</span>
                      <strong className="text-emerald-400">R$ {formatBRL(briefing.orcamento_total)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Duração da Campanha:</span>
                      <strong className="text-white">{briefing.duracao_dias} dias</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 space-y-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Perfil do Público-Alvo:</span>
                    <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <strong>Perfil:</strong> {briefing.publico_alvo.perfil}<br />
                      <strong>Classe & Idade:</strong> {briefing.publico_alvo.classe_social} • {briefing.publico_alvo.faixa_etaria}<br />
                      <strong>Mobilidade Urbana:</strong> {briefing.publico_alvo.habitos_deslocamento}
                    </p>
                  </div>

                  {briefing.historico_crm && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Histórico & Contexto CRM:</span>
                      <p className="text-slate-400 text-[11px] mt-1">{briefing.historico_crm}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Diagnóstico de Mercado & SWOT */}
              <Card className="bg-slate-950/60 border-slate-800">
                <CardHeader className="p-4 pb-3 border-b border-slate-800/80">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span>Diagnóstico de Mercado & Matriz Estratégica</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Análise Competitiva:</span>
                    <p className="text-slate-300 leading-relaxed mt-0.5">{diagnostico.analise_mercado}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Oportunidade Territorial:</span>
                    <p className="text-slate-300 leading-relaxed mt-0.5">{diagnostico.oportunidades_territoriais}</p>
                  </div>

                  {/* Resumo SWOT */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                    <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Forças & Oportunidades</span>
                      <ul className="text-[11px] text-slate-300 list-disc list-inside mt-1 space-y-0.5">
                        {diagnostico.matriz_swot_resumo.forcas.slice(0, 2).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2 bg-rose-950/20 border border-rose-500/20 rounded">
                      <span className="text-[10px] font-bold text-rose-400 uppercase">Desafios & Barreiras</span>
                      <ul className="text-[11px] text-slate-300 list-disc list-inside mt-1 space-y-0.5">
                        {diagnostico.matriz_swot_resumo.fraquezas.concat(diagnostico.matriz_swot_resumo.ameacas).slice(0, 2).map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: TESE ESTRATÉGICA & OS 5 PILARES */}
          {/* ========================================================================= */}
          <TabsContent value="estrategia" className="m-0 space-y-6">
            <Card className="bg-slate-950/70 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <CardTitle className="text-base text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    Os 5 Pilares do Planejamento Estratégico de Mídia
                  </span>
                  <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-xs">
                    Metodologia Mídia.OS 3.0
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Avaliação ponderada dos vetores de eficácia do plano na praça {briefing.praca_alvo}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {Object.entries(estrategia.pilares).map(([chave, pilar]) => (
                  <div key={chave} className="space-y-1.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {pilar.nome}
                      </span>
                      <span className="font-bold text-blue-400">{pilar.nota.toFixed(1)} / 10.0</span>
                    </div>
                    <Progress value={pilar.nota * 10} className="h-2 bg-slate-800" />
                    <p className="text-xs text-slate-400 pt-1 leading-relaxed">{pilar.descricao}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cronograma em 3 Fases Táticas */}
            <Card className="bg-slate-950/70 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span>Cronograma Tático de Veiculação (3 Fases)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {estrategia.cronograma_fases.map((fase, idx) => (
                    <div key={idx} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px]">
                            {fase.fase} • {fase.dias}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm text-white">{fase.nome}</h4>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                          <strong>Objetivo:</strong> {fase.objetivo}
                        </p>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          <strong>Foco:</strong> {fase.foco_tatico}
                        </p>
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                          Canais de Mídia:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {fase.canais_principais.map((c, i) => (
                            <Badge key={i} className="text-[10px] bg-slate-800 text-slate-300 border-none">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3: PLANO DE MÍDIA (Inventário com Fotos e Detalhes) */}
          {/* ========================================================================= */}
          <TabsContent value="plano_midia" className="m-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Inventário Selecionado para a Campanha</h3>
                <p className="text-xs text-slate-400">
                  {plano_midia.length} pontos de alta visibilidade selecionados do inventário
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Negociado:</span>
                <span className="text-base font-bold text-emerald-400">
                  R$ {formatBRL(distribuicao_investimento.valor_total)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {plano_midia.map((ponto, idx) => (
                <div
                  key={ponto.id || idx}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center gap-4"
                >
                  {/* Foto do Ponto ou Placeholder Elegante */}
                  <div className="w-full md:w-32 h-24 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {ponto.foto_url ? (
                      <img src={ponto.foto_url} alt={ponto.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[10px] font-mono">Ponto {idx + 1}</span>
                      </div>
                    )}
                    <Badge className="absolute top-1 left-1 text-[9px] bg-slate-950/80 text-blue-400 border-none">
                      {ponto.tipo || ponto.midia}
                    </Badge>
                  </div>

                  {/* Informações Centrais do Ponto */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-white truncate">{ponto.nome}</h4>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                        {ponto.formato}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{ponto.endereco} • {ponto.cidade}</span>
                    </p>
                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80 leading-relaxed">
                      <strong className="text-blue-400">Defesa Estratégica:</strong> {ponto.justificativa_estrategica}
                    </p>
                  </div>

                  {/* Valores & Impactos */}
                  <div className="w-full md:w-44 text-left md:text-right border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 shrink-0 space-y-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Impactos / Mês</span>
                      <strong className="text-xs text-white">{(ponto.impactos_mes / 1000).toFixed(0)} mil</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Valor Negociado</span>
                      <div className="flex items-center md:justify-end gap-1.5">
                        <span className="text-sm font-bold text-emerald-400">
                          R$ {formatBRL(ponto.valor_negociado || ponto.valor_tabela)}
                        </span>
                        {ponto.desconto_pct > 0 && (
                          <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-none">
                            -{ponto.desconto_pct}%
                          </Badge>
                        )}
                      </div>
                      {ponto.valor_tabela > ponto.valor_negociado && (
                        <span className="text-[10px] text-slate-500 line-through block">
                          Tab: R$ {formatBRL(ponto.valor_tabela)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4: MIX & DISTRIBUIÇÃO DO INVESTIMENTO */}
          {/* ========================================================================= */}
          <TabsContent value="mix_investimento" className="m-0 space-y-6">
            <Card className="bg-slate-950/70 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <CardTitle className="text-base text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    Distribuição Orçamentária por Canal de Mídia
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    Total: R$ {formatBRL(distribuicao_investimento.valor_total)}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  {distribuicao_investimento.resumo_alocacao}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {distribuicao_investimento.mix_canais.map((canal, idx) => (
                  <div key={idx} className="space-y-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{canal.canal}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{(canal.impactos_estimados / 1000).toFixed(0)}k impactos</span>
                        <strong className="text-emerald-400">R$ {formatBRL(canal.valor)}</strong>
                        <Badge variant="outline" className="border-slate-700 text-white font-bold">
                          {canal.percentual}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={canal.percentual} className="h-2.5 bg-slate-800" />
                    <p className="text-xs text-slate-400 pt-1">
                      <strong className="text-slate-300">Papel Estratégico:</strong> {canal.papel_estrategico}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 5: DEFESA COMERCIAL & QUEBRA DE OBJEÇÕES */}
          {/* ========================================================================= */}
          <TabsContent value="defesa_comercial" className="m-0 space-y-6">
            {/* Racional de Investimento & Blindagem Territorial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-950/70 border-slate-800">
                <CardHeader className="p-4 pb-2 border-b border-slate-800">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Racional Financeiro & Retorno
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-300 leading-relaxed">
                  {defesa_comercial.racional_investimento}
                </CardContent>
              </Card>

              <Card className="bg-slate-950/70 border-slate-800">
                <CardHeader className="p-4 pb-2 border-b border-slate-800">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Blindagem Territorial
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-xs text-slate-300 leading-relaxed">
                  {defesa_comercial.blindagem_territorial}
                </CardContent>
              </Card>
            </div>

            {/* Comparativo Mídia Exterior vs Mídia Digital */}
            <Card className="bg-slate-950/70 border-slate-800">
              <CardHeader className="p-4 pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Comparativo: Por que a Mídia Exterior Vence o Digital Isolado
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  {defesa_comercial.comparativo_contra_digital.argumento_complementaridade}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {defesa_comercial.comparativo_contra_digital.vantagens_midia_fisica_dooh.map((vantagem, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-200">{vantagem}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quebra de Objeções Interativas */}
            <Card className="bg-slate-950/70 border-slate-800">
              <CardHeader className="p-4 pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  Guia do Vendedor: Respostas Prontas para Objeções do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {defesa_comercial.respostas_objecoes.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-300">
                        Objeção do Cliente: "{item.objecao}"
                      </span>
                      <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300">
                        {item.gatilho_mental}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                      <strong className="text-emerald-400">Resposta Estratégica:</strong> {item.resposta_estrategica}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 6: SIMULAÇÃO DE 3 CENÁRIOS */}
          {/* ========================================================================= */}
          <TabsContent value="cenarios" className="m-0 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Simulação Comparativa de Cenários</h3>
              <p className="text-xs text-slate-400">
                Escolha o cenário ideal para apresentar ao cliente com 1 clique:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {cenarios.lista.map((cenario) => {
                const isAtivo = cenarios.ativo === cenario.id;
                return (
                  <div
                    key={cenario.id}
                    className={`rounded-2xl p-5 flex flex-col justify-between border-2 transition-all relative ${
                      isAtivo
                        ? "bg-slate-900/95 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {cenario.destaque && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold py-0.5 px-3 uppercase tracking-wider shadow">
                        Recomendado pela IA
                      </Badge>
                    )}

                    <div>
                      <h4 className="font-bold text-base text-white">{cenario.nome}</h4>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{cenario.descricao}</p>

                      <div className="my-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 uppercase block">Investimento Total</span>
                        <span className="text-2xl font-black text-emerald-400">
                          R$ {formatBRL(cenario.investimento_total)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          CPM Projetado: R$ {cenario.cpm.toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Impactos Totais:</span>
                          <strong>{(cenario.impactos_totais / 1000000).toFixed(1)}M</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Frequência Média:</span>
                          <strong>{cenario.frequencia_media}x</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Alcance Estimado:</span>
                          <strong>{(cenario.alcance_estimado / 1000).toFixed(0)}k pessoas</strong>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Diferenciais:</span>
                        {cenario.diferenciais.map((d, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onSelecionarCenario(cenario.id)}
                      className={`mt-5 w-full text-xs font-semibold ${
                        isAtivo
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {isAtivo ? "Cenário Selecionado" : "Ativar Este Cenário"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 7: APRESENTAÇÃO EXECUTIVA (SÍNTESE DE SLIDES) */}
          {/* ========================================================================= */}
          <TabsContent value="apresentacao" className="m-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{apresentacao_executiva.titulo_apresentacao}</h3>
                <p className="text-xs text-slate-400">{apresentacao_executiva.subtitulo}</p>
              </div>
              <Button
                size="sm"
                onClick={onExportarPptx}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Presentation className="w-4 h-4" />
                Baixar PPTX Widescreen (16:9)
              </Button>
            </div>

            <div className="space-y-4">
              {apresentacao_executiva.slides_estrutura.map((slide) => (
                <Card key={slide.numero} className="bg-slate-950/70 border-slate-800">
                  <CardHeader className="p-4 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs">
                          Slide {slide.numero}
                        </Badge>
                        <span>{slide.titulo}</span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <p className="text-slate-300 leading-relaxed font-medium">{slide.conteudo_principal}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {slide.pontos_chave.map((pt, i) => (
                        <Badge key={i} variant="outline" className="text-[11px] border-slate-700 text-slate-300">
                          • {pt}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border-blue-500/30">
              <CardContent className="p-5 space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Conclusão Executiva</span>
                <p className="text-xs text-slate-200 leading-relaxed">{apresentacao_executiva.conclusao_executiva}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
