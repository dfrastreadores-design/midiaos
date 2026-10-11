import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  listCampanhasPlanejamento,
  deleteCampanhaPlanejamento,
  gerarPropostaDoPlanejamento,
  type CampanhaPlanejamento,
  PILARES_DEFINICAO,
} from "@/lib/planejamento-estrategico.functions";
import { CampaignBuilder } from "./CampaignBuilder";
import { formatBRL } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Compass,
  Plus,
  Search,
  Filter,
  DollarSign,
  Package,
  Layers,
  MapPin,
  Calendar,
  Sparkles,
  FileText,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { MediaStrategyAI } from "./MediaStrategyAI";

export function StrategicPlanning() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isCreatingOrEditing, setIsCreatingOrEditing] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [campanhaEditing, setCampanhaEditing] = useState<CampanhaPlanejamento | null>(null);

  // Consulta lista de campanhas
  const { data: campanhas = [], isLoading, refetch } = useQuery({
    queryKey: ["campanhas-planejamento"],
    queryFn: () => listCampanhasPlanejamento(),
    staleTime: 30_000,
  });

  // Mutação para excluir campanha
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCampanhaPlanejamento({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campanhas-planejamento"] });
      toast.success("Planejamento excluído com sucesso.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir campanha.");
    },
  });

  // Mutação para gerar proposta direto da listagem
  const gerarPropostaMutation = useMutation({
    mutationFn: (campanhaId: string) =>
      gerarPropostaDoPlanejamento({ data: { campanha_id: campanhaId } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campanhas-planejamento"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success(`Proposta nº ${res.proposta_numero || ""} gerada com sucesso!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar proposta comercial.");
    },
  });

  // Filtragem
  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter((c) => {
      const matchSearch =
        !search ||
        c.nome_campanha.toLowerCase().includes(search.toLowerCase()) ||
        c.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
        (c.objetivo && c.objetivo.toLowerCase().includes(search.toLowerCase())) ||
        (c.regiao && c.regiao.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === "todos" || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [campanhas, search, statusFilter]);

  // Indicadores de Alto Nível
  const totalCampanhas = campanhas.length;
  const totalInvestimentoPrevisto = campanhas.reduce(
    (acc, c) => acc + (Number(c.investimento_previsto) || 0),
    0
  );
  const totalPontosAlocados = campanhas.reduce(
    (acc, c) => acc + (c.metricas_consolidadas?.total_pontos || 0),
    0
  );
  const propostasGeradas = campanhas.filter((c) => c.status === "proposta_gerada" || c.proposta_id).length;

  const handleEdit = (campanha: CampanhaPlanejamento) => {
    setCampanhaEditing(campanha);
    setIsCreatingOrEditing(true);
    setShowAiAssistant(false);
  };

  const handleCreateNew = () => {
    setCampanhaEditing(null);
    setIsCreatingOrEditing(true);
    setShowAiAssistant(false);
  };

  const handleApplyAiStrategy = (estrategia: any, dados: any) => {
    const novaCampanha: Partial<CampanhaPlanejamento> = {
      cliente_nome: dados.clienteNome,
      nome_campanha: `Campanha Estratégica: ${dados.clienteNome}`,
      objetivo: dados.objetivo,
      publico_alvo: dados.publico,
      regiao: dados.regiao,
      investimento_previsto: dados.orcamento,
      estrategia: estrategia.justificativa_estrategica,
      pilares: estrategia.aderencia_pilares_sugerida || {
        afinidade_territorial: 8,
        frequencia: 7,
        visibilidade: 9,
        mobilidade: 8,
        ativacao: 6,
      },
      regioes_selecionadas: [dados.regiao],
      pontos_midia: (estrategia.pontos_midia_adequados || []).map((p: any) => ({
        produto_id: p.produto_id || "prod-sugerido",
        regiao: p.regiao,
        pilar_estrategico: "visibilidade",
        quantidade_insercoes: 1,
        valor_negociado: p.valor_estimado || 0,
        impactos_estimados: 100000,
        observacoes: p.justificativa,
      })),
      status: "planejamento",
    };

    setCampanhaEditing(novaCampanha as CampanhaPlanejamento);
    setShowAiAssistant(false);
    setIsCreatingOrEditing(true);
  };

  if (showAiAssistant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-3xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiAssistant(false)}
              className="rounded-xl h-9"
            >
              ← Voltar ao Planejamento
            </Button>
            <span className="text-xs font-bold text-foreground">
              Assistente IA de Planejamento de Mídia (Gemini 2.5 Flash)
            </span>
          </div>
        </div>
        <MediaStrategyAI onApplyStrategy={handleApplyAiStrategy} />
      </div>
    );
  }

  if (isCreatingOrEditing) {
    return (
      <CampaignBuilder
        campanhaInicial={campanhaEditing}
        onSuccess={() => {
          setIsCreatingOrEditing(false);
          setCampanhaEditing(null);
          refetch();
        }}
        onCancel={() => {
          setIsCreatingOrEditing(false);
          setCampanhaEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5"
            >
              Camada Estratégica de Mídia
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Inteligência 360° & Alocação de Inventário
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <Compass className="size-6 text-primary" />
            Planejamento Estratégico de Campanhas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Estruturação tática de campanhas antes da geração de propostas e PIs: conecte objetivos de clientes,
            afinidade territorial e os 5 pilares estratégicos diretamente ao inventário de produtos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAiAssistant(true)}
            className="rounded-2xl h-11 px-4 text-xs font-bold gap-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 shadow-xs"
          >
            <Sparkles className="size-4" />
            Assistente IA (Gemini)
          </Button>

          <Button
            type="button"
            onClick={handleCreateNew}
            className="rounded-2xl h-11 px-5 text-xs font-bold gap-2 shadow-md bg-primary hover:bg-primary/95 text-primary-foreground"
          >
            <Plus className="size-4" />
            Nova Campanha Estratégica
          </Button>
        </div>
      </div>

      {/* KPIs no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-3xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Campanhas Ativas</span>
              <Target className="size-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">{totalCampanhas}</div>
            <div className="text-[10px] text-muted-foreground">Em estruturação tática</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Investimento Previsto</span>
              <DollarSign className="size-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatBRL(totalInvestimentoPrevisto)}
            </div>
            <div className="text-[10px] text-muted-foreground">Pipeline orçamentário</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Mídias Alocadas</span>
              <Package className="size-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {totalPontosAlocados}
            </div>
            <div className="text-[10px] text-muted-foreground">Pontos do inventário</div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Propostas Geradas</span>
              <FileText className="size-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {propostasGeradas}
            </div>
            <div className="text-[10px] text-muted-foreground">Convertidas para comercial</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por campanha, cliente, objetivo ou região..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "todos", label: "Todos os Status" },
            { id: "planejamento", label: "Em Planejamento" },
            { id: "proposta_gerada", label: "Proposta Gerada" },
            { id: "ativa", label: "Ativa" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/60 text-muted-foreground hover:bg-accent border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Campanhas Estratégicas */}
      {isLoading ? (
        <div className="text-center py-16 text-xs text-muted-foreground">
          Carregando planejamentos estratégicos...
        </div>
      ) : campanhasFiltradas.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
          <Compass className="size-10 mx-auto text-muted-foreground/40" />
          <div className="text-sm font-bold text-foreground">Nenhuma campanha encontrada</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Crie sua primeira campanha para definir pilares estratégicos, cobertura territorial e alocar pontos do inventário.
          </p>
          <Button
            type="button"
            onClick={handleCreateNew}
            className="rounded-xl text-xs font-bold gap-2 mt-2"
          >
            <Plus className="size-4" />
            Criar Planejamento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campanhasFiltradas.map((campanha) => {
            const alocado = campanha.metricas_consolidadas?.investimento_alocado || 0;
            const previsto = Number(campanha.investimento_previsto) || 0;
            const qtdPontos = campanha.metricas_consolidadas?.total_pontos || 0;
            const regioes = campanha.regioes_selecionadas || [];

            return (
              <Card
                key={campanha.id}
                className="rounded-3xl border border-border/80 bg-card hover:border-primary/50 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {campanha.cliente_nome}
                      </div>
                      <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 mt-0.5">
                        {campanha.nome_campanha}
                      </h3>
                    </div>

                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg shrink-0",
                        campanha.status === "proposta_gerada"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                          : campanha.status === "ativa"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                      )}
                    >
                      {campanha.status === "proposta_gerada"
                        ? "Proposta Gerada"
                        : campanha.status === "ativa"
                        ? "Ativa"
                        : "Planejamento"}
                    </Badge>
                  </div>

                  {/* Objetivo & Região */}
                  <div className="space-y-1 text-xs">
                    {campanha.objetivo && (
                      <div className="text-muted-foreground flex items-center gap-1.5 truncate">
                        <Target className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">{campanha.objetivo}</span>
                      </div>
                    )}
                    {campanha.regiao && (
                      <div className="text-muted-foreground flex items-center gap-1.5 truncate">
                        <MapPin className="size-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{campanha.regiao}</span>
                      </div>
                    )}
                  </div>

                  {/* 5 Pilares Estratégicos (Mini Chips) */}
                  <div className="pt-2 border-t border-border/50 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Pilares Estratégicos
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PILARES_DEFINICAO.map((p) => {
                        const val = campanha.pilares ? campanha.pilares[p.key] : 5;
                        return (
                          <span
                            key={p.key}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-foreground/80"
                            title={`${p.nome}: ${val}/10`}
                          >
                            <span className={cn("size-1.5 rounded-full", p.cor.replace("text-", "bg-"))} />
                            {p.nome.split(" ")[0]}: {val}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Métricas de Investimento & Pontos */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Previsto</div>
                      <div className="font-extrabold text-foreground mt-0.5">
                        {formatBRL(previsto)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Alocado</div>
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatBRL(alocado)} ({qtdPontos} pts)
                      </div>
                    </div>
                  </div>
                </CardContent>

                {/* Rodapé com Ações */}
                <div className="p-3.5 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(campanha)}
                      className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5"
                    >
                      <Edit className="size-3.5 text-primary" />
                      Editar
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Excluir planejamento da campanha "${campanha.nome_campanha}"?`)) {
                          deleteMutation.mutate(campanha.id);
                        }
                      }}
                      className="size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {campanha.proposta_id ? (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20"
                    >
                      <Link to="/propostas">
                        <FileText className="size-3.5" />
                        Ver Proposta
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => gerarPropostaMutation.mutate(campanha.id)}
                      disabled={gerarPropostaMutation.isPending || qtdPontos === 0}
                      className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <Sparkles className="size-3.5" />
                      Gerar Proposta
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
