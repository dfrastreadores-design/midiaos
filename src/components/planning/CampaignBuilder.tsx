import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { listClientes } from "@/lib/clientes.functions";
import {
  type CampanhaPlanejamento,
  type PontoMidiaPlanejamento,
  type PilaresEstrategicos,
  PILARES_DEFINICAO,
  saveCampanhaPlanejamento,
  gerarPropostaDoPlanejamento,
} from "@/lib/planejamento-estrategico.functions";
import { TerritorySelector } from "./TerritorySelector";
import { MediaSelector } from "./MediaSelector";
import { formatBRL } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MediaStrategyAI } from "./MediaStrategyAI";
import {
  Compass,
  MapPin,
  Package,
  Layers,
  FileText,
  Save,
  CheckCircle2,
  Calendar,
  DollarSign,
  Target,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sliders,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CampaignBuilderProps {
  campanhaInicial?: CampanhaPlanejamento | null;
  onSuccess?: (campanhaId: string) => void;
  onCancel?: () => void;
}

export function CampaignBuilder({
  campanhaInicial,
  onSuccess,
  onCancel,
}: CampaignBuilderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Abas do Construtor
  const [activeTab, setActiveTab] = useState<string>("briefing");

  // Campos Principais do Cadastro de Campanha
  const [clienteId, setClienteId] = useState<string>(campanhaInicial?.cliente_id || "");
  const [clienteNome, setClienteNome] = useState<string>(campanhaInicial?.cliente_nome || "");
  const [nomeCampanha, setNomeCampanha] = useState<string>(campanhaInicial?.nome_campanha || "");
  const [objetivo, setObjetivo] = useState<string>(campanhaInicial?.objetivo || "");
  const [publicoAlvo, setPublicoAlvo] = useState<string>(campanhaInicial?.publico_alvo || "");
  const [regiaoPrincipal, setRegiaoPrincipal] = useState<string>(campanhaInicial?.regiao || "");
  const [periodoInicio, setPeriodoInicio] = useState<string>(campanhaInicial?.periodo_inicio || "");
  const [periodoFim, setPeriodoFim] = useState<string>(campanhaInicial?.periodo_fim || "");
  const [investimentoPrevisto, setInvestimentoPrevisto] = useState<number>(
    campanhaInicial?.investimento_previsto || 0
  );
  const [estrategia, setEstrategia] = useState<string>(campanhaInicial?.estrategia || "");

  // Pilares Estratégicos (Pesos de 1 a 10)
  const [pilares, setPilares] = useState<PilaresEstrategicos>(
    campanhaInicial?.pilares || {
      afinidade_territorial: 7,
      frequencia: 6,
      visibilidade: 8,
      mobilidade: 7,
      ativacao: 5,
    }
  );

  // Regiões e Territórios Selecionados
  const [regioesSelecionadas, setRegioesSelecionadas] = useState<string[]>(
    campanhaInicial?.regioes_selecionadas || []
  );

  // Pontos de Mídia Vinculados (utiliza tabela produtos existente)
  const [pontosMidia, setPontosMidia] = useState<PontoMidiaPlanejamento[]>(
    campanhaInicial?.pontos_midia || []
  );

  // Status
  const [status, setStatus] = useState<any>(campanhaInicial?.status || "planejamento");

  // Modal de Assistente IA Gemini
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleApplyAiStrategy = (sugestao: {
    estrategiaTexto: string;
    pilares?: Record<string, number>;
    pontosSugeridos?: any[];
    formatos?: any[];
  }) => {
    if (sugestao.estrategiaTexto) {
      setEstrategia((prev) =>
        prev.trim()
          ? `${prev}\n\n[Recomendação da IA]:\n${sugestao.estrategiaTexto}`
          : sugestao.estrategiaTexto
      );
    }

    if (sugestao.pilares) {
      setPilares((prev) => ({
        ...prev,
        afinidade_territorial: Number(sugestao.pilares?.afinidade_territorial) || prev.afinidade_territorial,
        frequencia: Number(sugestao.pilares?.frequencia) || prev.frequencia,
        visibilidade: Number(sugestao.pilares?.visibilidade) || prev.visibilidade,
        mobilidade: Number(sugestao.pilares?.mobilidade) || prev.mobilidade,
        ativacao: Number(sugestao.pilares?.ativacao) || prev.ativacao,
      }));
    }

    if (sugestao.pontosSugeridos && sugestao.pontosSugeridos.length > 0) {
      const novosPontos: PontoMidiaPlanejamento[] = sugestao.pontosSugeridos
        .filter((pt) => pt.produto_id && !pontosMidia.some((p) => p.produto_id === pt.produto_id))
        .map((pt) => ({
          produto_id: pt.produto_id,
          nome_ponto: pt.nome_ponto || "Ponto de Mídia Recomendado",
          codigo: pt.codigo,
          tipo: pt.tipo,
          municipio: pt.municipio || regiaoPrincipal,
          bairro: pt.bairro,
          endereco: pt.endereco,
          valor_tabela: Number(pt.valor_unitario) || 0,
          valor_negociado: Number(pt.valor_unitario) || 0,
          quantidade_insercoes: 1,
          impactos_estimados: Number(pt.impactos_estimados) || 0,
          justificativa: pt.justificativa,
        }));

      if (novosPontos.length > 0) {
        setPontosMidia((prev) => [...prev, ...novosPontos]);
      }
    }

    setIsAiModalOpen(false);
    toast.success("Estratégia recomendada pela IA aplicada com sucesso!");
  };

  // Carregar lista de clientes para seleção rápida
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: () => listClientes(),
    staleTime: 5 * 60_000,
  });

  const handleSelectCliente = (id: string) => {
    setClienteId(id);
    const cli = (clientes as any[]).find((c) => c.id === id);
    if (cli) {
      setClienteNome(cli.nome_fantasia || cli.razao_social);
    }
  };

  // Salvar Campanha de Planejamento
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clienteNome.trim()) throw new Error("Informe o cliente da campanha.");
      if (!nomeCampanha.trim()) throw new Error("Informe o nome da campanha.");

      const payload = {
        id: campanhaInicial?.id,
        cliente_id: clienteId || null,
        cliente_nome: clienteNome,
        nome_campanha: nomeCampanha,
        objetivo,
        publico_alvo: publicoAlvo,
        regiao: regiaoPrincipal || (regioesSelecionadas[0] || ""),
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        investimento_previsto: Number(investimentoPrevisto) || 0,
        estrategia,
        pilares,
        regioes_selecionadas: regioesSelecionadas,
        status,
        proposta_id: campanhaInicial?.proposta_id || null,
        pontos_midia: pontosMidia.map((p) => ({
          produto_id: p.produto_id,
          regiao: p.regiao || null,
          pilar_estrategico: p.pilar_estrategico,
          quantidade_insercoes: p.quantidade_insercoes || 1,
          valor_negociado: p.valor_negociado || 0,
          impactos_estimados: p.impactos_estimados || 0,
          observacoes: p.observacoes || null,
        })),
      };

      return saveCampanhaPlanejamento({ data: payload });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campanhas-planejamento"] });
      toast.success("Planejamento estratégico salvo com sucesso!");
      if (onSuccess) onSuccess(res.id);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar planejamento.");
    },
  });

  // Gerar Proposta Comercial Oficial a partir do Planejamento
  const gerarPropostaMutation = useMutation({
    mutationFn: async () => {
      // Salva antes se necessário
      const saveRes = await saveCampanhaPlanejamento({
        data: {
          id: campanhaInicial?.id,
          cliente_id: clienteId || null,
          cliente_nome: clienteNome,
          nome_campanha: nomeCampanha,
          objetivo,
          publico_alvo: publicoAlvo,
          regiao: regiaoPrincipal || (regioesSelecionadas[0] || ""),
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          investimento_previsto: Number(investimentoPrevisto) || 0,
          estrategia,
          pilares,
          regioes_selecionadas: regioesSelecionadas,
          status,
          pontos_midia: pontosMidia,
        },
      });

      return gerarPropostaDoPlanejamento({
        data: {
          campanha_id: saveRes.id,
          validadeDias: 15,
        },
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campanhas-planejamento"] });
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success(`Proposta nº ${res.proposta_numero || ""} gerada com sucesso!`);
      navigate({ to: "/propostas" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar proposta comercial.");
    },
  });

  // Métricas de Resumo
  const totalAlocado = pontosMidia.reduce(
    (acc, p) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
    0
  );
  const totalImpactos = pontosMidia.reduce(
    (acc, p) => acc + (Number(p.impactos_estimados) || 0) * (Number(p.quantidade_insercoes) || 1),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header do Construtor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5"
            >
              Camada Estratégica 360°
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Campanha → Regiões → Pontos de Mídia → Proposta
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            {campanhaInicial ? `Editar: ${nomeCampanha || "Planejamento"}` : "Novo Planejamento Estratégico"}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAiModalOpen(true)}
            className="rounded-xl h-10 px-4 text-xs font-bold gap-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-xs"
          >
            <Sparkles className="size-4 text-primary" />
            Assistente IA
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-xl h-10 px-4 text-xs font-semibold"
            >
              Cancelar
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-xl h-10 px-5 text-xs font-bold gap-2 shadow-sm"
          >
            <Save className="size-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Planejamento"}
          </Button>

          {pontosMidia.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => gerarPropostaMutation.mutate()}
              disabled={gerarPropostaMutation.isPending}
              className="rounded-xl h-10 px-4 text-xs font-bold gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
            >
              <FileText className="size-4" />
              {gerarPropostaMutation.isPending ? "Gerando..." : "Gerar Proposta Comercial"}
            </Button>
          )}
        </div>
      </div>

      {/* Navegação em Etapas/Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-12 p-1 bg-muted/60 rounded-2xl border border-border/70">
          <TabsTrigger
            value="briefing"
            className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            <Target className="size-3.5" />
            1. Briefing
          </TabsTrigger>

          <TabsTrigger
            value="pilares"
            className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            <Sliders className="size-3.5" />
            2. Pilares
          </TabsTrigger>

          <TabsTrigger
            value="territorios"
            className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            <MapPin className="size-3.5" />
            3. Territórios ({regioesSelecionadas.length})
          </TabsTrigger>

          <TabsTrigger
            value="midias"
            className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            <Package className="size-3.5" />
            4. Mídias ({pontosMidia.length})
          </TabsTrigger>

          <TabsTrigger
            value="resumo"
            className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:shadow-xs"
          >
            <FileText className="size-3.5" />
            5. Resumo
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* ABA 1: BRIEFING & DADOS PRINCIPAIS DA CAMPANHA */}
        {/* ======================================================== */}
        <TabsContent value="briefing" className="space-y-6 m-0">
          {/* Banner Chamativo Assistente IA Gemini */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-gradient-to-r from-primary/10 via-card to-background border border-primary/20 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 text-primary shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  Gerar Estratégia Recomendada com IA (Gemini 2.5 Flash)
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">
                    Apoio Consultivo
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Obtenha sugestões de formatos, pontos do catálogo real, justificativa técnica, combinação de mídias e argumentos de vendas. A IA apenas recomenda — você mantém controle total.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAiModalOpen(true)}
              className="rounded-xl font-bold text-xs gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Sparkles className="size-3.5" />
              Abrir Assistente IA
            </Button>
          </div>

          <Card className="rounded-3xl border border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Dados Principais da Campanha
              </CardTitle>
              <CardDescription className="text-xs">
                Definição do cliente, objetivos mercadológicos, investimento previsto e diretrizes estratégicas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cliente */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Cliente / Anunciante *</label>
                  <div className="space-y-2">
                    <select
                      value={clienteId}
                      onChange={(e) => handleSelectCliente(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecionar cliente cadastrado...</option>
                      {(clientes as any[]).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome_fantasia || c.razao_social}
                        </option>
                      ))}
                    </select>

                    <Input
                      placeholder="Ou digite o nome do cliente / anunciante..."
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Nome da Campanha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nome da Campanha *</label>
                  <Input
                    placeholder="Ex: Lançamento Imobiliário Alto Padrão - Q4"
                    value={nomeCampanha}
                    onChange={(e) => setNomeCampanha(e.target.value)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                  <div className="text-[11px] text-muted-foreground">
                    Identificador utilizado nas propostas, reservas e PIs.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Objetivo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Objetivo da Campanha</label>
                  <Input
                    placeholder="Ex: Brand Awareness, Vendas, Lançamento"
                    value={objetivo}
                    onChange={(e) => setObjetivo(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                {/* Público Alvo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Público-Alvo</label>
                  <Input
                    placeholder="Ex: Homens e Mulheres 25-45, Classe A/B"
                    value={publicoAlvo}
                    onChange={(e) => setPublicoAlvo(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                {/* Investimento Previsto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Investimento Previsto (R$)</label>
                  <Input
                    type="number"
                    step="1000"
                    placeholder="Ex: 50000"
                    value={investimentoPrevisto || ""}
                    onChange={(e) => setInvestimentoPrevisto(parseFloat(e.target.value) || 0)}
                    className="h-10 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Região Principal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Região Principal</label>
                  <Input
                    placeholder="Ex: Brasília e Região Metropolitana"
                    value={regiaoPrincipal}
                    onChange={(e) => setRegiaoPrincipal(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>

                {/* Período Início */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Período de Início</label>
                  <Input
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => setPeriodoInicio(e.target.value)}
                    className="h-10 rounded-xl text-xs font-medium"
                  />
                </div>

                {/* Período Fim */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Período de Término</label>
                  <Input
                    type="date"
                    value={periodoFim}
                    onChange={(e) => setPeriodoFim(e.target.value)}
                    className="h-10 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Estratégia Tática & Criativa */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Diretrizes da Estratégia de Mídia</label>
                <Textarea
                  placeholder="Descreva as diretrizes táticas, rotas estratégicas, sinergia entre telas e objetivos de impacto desta campanha..."
                  rows={4}
                  value={estrategia}
                  onChange={(e) => setEstrategia(e.target.value)}
                  className="rounded-2xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  type="button"
                  onClick={() => setActiveTab("pilares")}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  Próximo: Configurar Pilares
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 2: PILARES ESTRATÉGICOS DA CAMPANHA */}
        {/* ======================================================== */}
        <TabsContent value="pilares" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                Calibração dos 5 Pilares Estratégicos
              </CardTitle>
              <CardDescription className="text-xs">
                Ajuste o peso e a relevância de cada pilar para nortear a distribuição dos pontos de mídia e justificar o plano ao cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PILARES_DEFINICAO.map((pilar) => {
                  const valor = pilares[pilar.key] || 5;
                  return (
                    <Card
                      key={pilar.key}
                      className="border border-border/70 rounded-2xl bg-card shadow-xs overflow-hidden"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={cn("text-xs font-bold", pilar.cor)}>
                            {pilar.nome}
                          </span>
                          <Badge
                            variant="secondary"
                            className="font-extrabold text-xs px-2 py-0.5 rounded-lg"
                          >
                            Peso: {valor}/10
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                          {pilar.descricao}
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>Baixa Relevância</span>
                            <span>Prioridade Máxima</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={valor}
                            onChange={(e) =>
                              setPilares({
                                ...pilares,
                                [pilar.key]: parseInt(e.target.value) || 5,
                              })
                            }
                            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                          />
                        </div>

                        <div className="p-2 rounded-xl bg-muted/40 text-[10px] text-muted-foreground font-medium">
                          💡 {pilar.dica}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("briefing")}
                  className="rounded-xl text-xs font-semibold gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para Briefing
                </Button>

                <Button
                  type="button"
                  onClick={() => setActiveTab("territorios")}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  Próximo: Selecionar Territórios
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 3: SELEÇÃO DE TERRITÓRIOS E REGIÕES */}
        {/* ======================================================== */}
        <TabsContent value="territorios" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Afinidade Territorial & Cobertura Geográfica
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione as regiões e clusters urbanos onde a campanha terá presença prioritária.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <TerritorySelector
                selectedRegions={regioesSelecionadas}
                onChange={setRegioesSelecionadas}
              />

              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("pilares")}
                  className="rounded-xl text-xs font-semibold gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para Pilares
                </Button>

                <Button
                  type="button"
                  onClick={() => setActiveTab("midias")}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  Próximo: Alocar Pontos de Mídia
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 4: SELEÇÃO E ALOCAÇÃO DE PRODUTOS DO INVENTÁRIO */}
        {/* ======================================================== */}
        <TabsContent value="midias" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="size-4 text-primary" />
                Alocação de Pontos de Mídia do Inventário
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione produtos reais existentes no inventário de mídia e vincule-os a territórios e pilares estratégicos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <MediaSelector
                pontosSelecionados={pontosMidia}
                onChange={setPontosMidia}
                regioesCampanha={regioesSelecionadas}
                investimentoPrevisto={investimentoPrevisto}
              />

              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("territorios")}
                  className="rounded-xl text-xs font-semibold gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para Territórios
                </Button>

                <Button
                  type="button"
                  onClick={() => setActiveTab("resumo")}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  Próximo: Resumo & Proposta
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* ABA 5: RESUMO EXECUTIVO E CONVERSÃO EM PROPOSTA */}
        {/* ======================================================== */}
        <TabsContent value="resumo" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Resumo Executivo do Planejamento Estratégico
              </CardTitle>
              <CardDescription className="text-xs">
                Consolidação da estratégia, cobertura territorial, inventário alocado e geração da proposta comercial oficial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visão de Topo */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{clienteNome || "Não definido"}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Campanha</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">{nomeCampanha || "Não definida"}</div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Investimento Previsto</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatBRL(investimentoPrevisto)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Investimento Alocado</div>
                  <div className="text-sm font-bold text-primary mt-0.5">
                    {formatBRL(totalAlocado)}
                  </div>
                </div>
              </div>

              {/* Equilíbrio de Pilares */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Equilíbrio Estratégico dos 5 Pilares
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {PILARES_DEFINICAO.map((p) => {
                    const val = pilares[p.key];
                    return (
                      <div
                        key={p.key}
                        className="p-3 rounded-xl border border-border/60 bg-card text-center space-y-1"
                      >
                        <div className={cn("text-[11px] font-bold", p.cor)}>{p.nome}</div>
                        <div className="text-lg font-black text-foreground">{val}/10</div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${val * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Territórios Selecionados */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Cobertura Territorial ({regioesSelecionadas.length})
                </h4>
                {regioesSelecionadas.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhuma região definida.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {regioesSelecionadas.map((r) => (
                      <Badge key={r} variant="secondary" className="px-3 py-1 rounded-xl text-xs font-semibold">
                        <MapPin className="size-3 mr-1 text-primary" />
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Pontos de Mídia Vinculados */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Inventário de Mídia Alocado ({pontosMidia.length} pontos)
                </h4>
                {pontosMidia.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-2xl text-xs text-muted-foreground text-center">
                    Nenhum ponto de mídia alocado. Volte para a aba &quot;4. Mídias&quot; para adicionar pontos do inventário.
                  </div>
                ) : (
                  <div className="border border-border/80 rounded-2xl overflow-hidden divide-y divide-border/60">
                    {pontosMidia.map((p, idx) => (
                      <div key={p.produto_id} className="p-3 flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-foreground truncate">
                            {idx + 1}. {p.produto?.nome || "Ponto de Mídia"}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {p.produto?.midia} • Pilar: {p.pilar_estrategico} • {p.regiao || "Região geral"}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-foreground">
                            {formatBRL((Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1))}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.quantidade_insercoes} face(s)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ação de Conversão em Proposta Oficial */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-primary/10 via-emerald-500/10 to-indigo-500/10 border border-primary/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="size-4" />
                      Camada de Conversão: Planejamento → Proposta Comercial
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Converte todos os pontos e dados estratégicos em uma Proposta oficial no sistema comercial com um único clique.
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    onClick={() => gerarPropostaMutation.mutate()}
                    disabled={gerarPropostaMutation.isPending || pontosMidia.length === 0}
                    className="rounded-2xl font-bold text-xs gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  >
                    <FileText className="size-4" />
                    {gerarPropostaMutation.isPending ? "Gerando Proposta..." : "Gerar Proposta Comercial Oficial"}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("midias")}
                  className="rounded-xl text-xs font-semibold gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para Mídias
                </Button>

                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  <Save className="size-4" />
                  Salvar Planejamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Assistente IA de Planejamento de Mídia */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader className="space-y-1.5 mb-2">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Assistente IA de Planejamento de Mídia (Gemini 2.5 Flash)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recomendação inteligente de formatos, pontos do catálogo, combinação de mídias e argumentos comerciais. A IA apenas recomenda para apoiar sua decisão.
            </DialogDescription>
          </DialogHeader>

          <MediaStrategyAI
            clienteInicial={clienteNome}
            clienteIdInicial={clienteId}
            publicoInicial={publicoAlvo}
            regiaoInicial={regiaoPrincipal}
            objetivoInicial={objetivo}
            orcamentoInicial={investimentoPrevisto}
            campanhaId={campanhaInicial?.id}
            onApplyStrategy={handleApplyAiStrategy}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
