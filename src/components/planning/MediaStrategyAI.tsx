import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listClientes } from "@/lib/clientes.functions";
import {
  gerarEstrategiaComIA,
  listHistoricoEstrategiasIA,
  type EstrategiaIAResposta,
  type EstrategiaIAHistoricoItem,
} from "@/lib/estrategia-ia.functions";
import { formatBRL } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Bot,
  Compass,
  MapPin,
  Target,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaStrategyAIProps {
  campanhaId?: string;
  clienteInicial?: { id?: string; nome: string };
  regiaoInicial?: string;
  orcamentoInicial?: number;
  onApplyStrategy?: (estrategia: EstrategiaIAResposta, dadosEntrada: any) => void;
  className?: string;
}

const SEGMENTOS_SUGERIDOS = [
  "Imobiliário & Construção Civil",
  "Varejo & Shoppings",
  "Saúde, Clínicas & Hospitais",
  "Automotivo & Concessionárias",
  "Educação & Universidades",
  "Gastronomia & Eventos",
  "Tecnologia & Startups",
  "Serviços Financeiros & Seguros",
  "Setor Governamental & Institucional",
];

const OBJETIVOS_SUGERIDOS = [
  "Brand Awareness (Reconhecimento de Marca)",
  "Lançamento de Produto / Empreendimento",
  "Geração de Tráfego e Visitas no Ponto Físico",
  "Sustentação de Marca e Presença Urbana",
  "Conversão Rápida / Ofertas Especiais",
];

export function MediaStrategyAI({
  campanhaId,
  clienteInicial,
  regiaoInicial = "",
  orcamentoInicial = 50000,
  onApplyStrategy,
  className,
}: MediaStrategyAIProps) {
  const queryClient = useQueryClient();

  // Estados dos Campos de Entrada
  const [clienteId, setClienteId] = useState<string>(clienteInicial?.id || "");
  const [clienteNome, setClienteNome] = useState<string>(clienteInicial?.nome || "");
  const [segmento, setSegmento] = useState<string>("Imobiliário & Construção Civil");
  const [publico, setPublico] = useState<string>("Homens e Mulheres 28-55 anos, Classe A/B");
  const [regiao, setRegiao] = useState<string>(regiaoInicial || "Plano Piloto e Águas Claras - DF");
  const [objetivo, setObjetivo] = useState<string>("Brand Awareness (Reconhecimento de Marca)");
  const [orcamento, setOrcamento] = useState<number>(orcamentoInicial || 50000);

  // Resultado da Recomendação Atual
  const [estrategiaAtual, setEstrategiaAtual] = useState<EstrategiaIAResposta | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);

  // Carregar lista de clientes para seleção rápida
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select-ia"],
    queryFn: () => listClientes(),
    staleTime: 5 * 60_000,
  });

  // Carregar histórico de estratégias geradas
  const { data: historico = [] } = useQuery({
    queryKey: ["historico-estrategias-ia", campanhaId, clienteId],
    queryFn: () => listHistoricoEstrategiasIA({ data: { campanha_id: campanhaId, cliente_id: clienteId || undefined } }),
    staleTime: 30_000,
  });

  const handleSelectCliente = (id: string) => {
    setClienteId(id);
    const cli = (clientes as any[]).find((c) => c.id === id);
    if (cli) {
      setClienteNome(cli.nome_fantasia || cli.razao_social);
      if (cli.segmento) setSegmento(cli.segmento);
    }
  };

  // Mutação para Gerar Estratégia com IA Gemini 2.5 Flash
  const gerarMutation = useMutation({
    mutationFn: () =>
      gerarEstrategiaComIA({
        data: {
          cliente_id: clienteId || null,
          cliente_nome: clienteNome,
          campanha_id: campanhaId || null,
          segmento,
          publico,
          regiao,
          objetivo,
          orcamento: Number(orcamento) || 0,
        },
      }),
    onSuccess: (data) => {
      setEstrategiaAtual(data.estrategia);
      queryClient.invalidateQueries({ queryKey: ["historico-estrategias-ia"] });
      toast.success("Estratégia de mídia gerada com sucesso pela IA!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao consultar Assistente IA Gemini.");
    },
  });

  const handleCopyPitch = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success("Argumento copiado para a área de transferência!");
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Banner de Princípio Ético e Decisão Humana */}
      <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
        <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
            Assistente Consultivo de IA (Gemini 2.5 Flash)
          </div>
          <div className="text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
            As sugestões geradas são <strong>recomendações estratégicas e consultivas</strong> que auxiliam a equipe comercial e os planejadores. <strong>A IA não substitui o discernimento humano</strong>; você tem total autonomia para aceitar, calibrar ou descartar os pontos recomendados.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Entrada de Parâmetros da Demanda */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-3xl border border-border shadow-xs bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Bot className="size-4 text-primary" />
                Parâmetros da Demanda Estratégica
              </CardTitle>
              <CardDescription className="text-xs">
                Informe o perfil do anunciante para a IA formular a melhor combinação de mídias e formatos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Cliente / Anunciante *
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => handleSelectCliente(e.target.value)}
                  className="w-full h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecionar cliente existente...</option>
                  {(clientes as any[]).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </option>
                  ))}
                </select>

                <Input
                  placeholder="Ou digite o nome do cliente..."
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="h-9 rounded-xl text-xs mt-1.5"
                />
              </div>

              {/* Segmento */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Segmento de Mercado
                </label>
                <select
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                  className="w-full h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  {SEGMENTOS_SUGERIDOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Público-Alvo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Público-Alvo
                </label>
                <Input
                  placeholder="Ex: Homens e Mulheres 25-45, Classe A/B"
                  value={publico}
                  onChange={(e) => setPublico(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Região / Território */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Região / Praça Alvo
                </label>
                <Input
                  placeholder="Ex: Plano Piloto, Sudoeste e Águas Claras"
                  value={regiao}
                  onChange={(e) => setRegiao(e.target.value)}
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              {/* Objetivo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Objetivo da Campanha
                </label>
                <select
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  className="w-full h-9.5 px-3 rounded-xl bg-background border border-border text-xs font-medium focus:ring-1 focus:ring-primary"
                >
                  {OBJETIVOS_SUGERIDOS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orçamento Previsto */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                  Orçamento Previsto (R$)
                </label>
                <Input
                  type="number"
                  step="1000"
                  value={orcamento || ""}
                  onChange={(e) => setOrcamento(parseFloat(e.target.value) || 0)}
                  className="h-9.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Botão de Geração */}
              <Button
                type="button"
                onClick={() => gerarMutation.mutate()}
                disabled={gerarMutation.isPending || !clienteNome.trim()}
                className="w-full rounded-2xl h-11 text-xs font-bold gap-2 shadow-md bg-gradient-to-r from-primary via-indigo-600 to-primary text-white mt-2"
              >
                <Sparkles className="size-4 animate-spin-slow" />
                {gerarMutation.isPending ? "Processando Gemini 2.5 Flash..." : "Gerar Estratégia com IA"}
              </Button>
            </CardContent>
          </Card>

          {/* Botão de Histórico de Consultas Anteriores */}
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => setShowHistorico(!showHistorico)}
              className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
            >
              <History className="size-3.5" />
              Histórico de Recomendações ({historico.length})
              {showHistorico ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>

          {/* Drawer/Lista do Histórico */}
          {showHistorico && (
            <Card className="rounded-3xl border border-border/80 bg-muted/30 shadow-xs">
              <CardContent className="p-3.5 space-y-2 max-h-72 overflow-y-auto">
                {historico.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Nenhum histórico registrado ainda.
                  </div>
                ) : (
                  historico.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setEstrategiaAtual(item.resposta)}
                      className="p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 cursor-pointer transition-all space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span className="truncate">{item.prompt.cliente_nome}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.prompt.objetivo} • {formatBRL(item.prompt.orcamento)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Painel de Exibição das Recomendações da IA */}
        <div className="lg:col-span-7 space-y-4">
          {!estrategiaAtual ? (
            <Card className="rounded-3xl border border-dashed border-border bg-card/60 text-center py-20 px-6">
              <Sparkles className="size-12 mx-auto text-primary/40 animate-pulse" />
              <h3 className="font-bold text-base text-foreground mt-3">
                Aguardando Geração de Estratégia
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 leading-relaxed">
                Preencha os dados à esquerda e clique em <strong>&quot;Gerar Estratégia com IA&quot;</strong> para o Gemini 2.5 Flash analisar o catálogo de inventário e formular uma recomendação sob medida.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Resumo Executivo & Justificativa */}
              <Card className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background shadow-xs overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="default"
                      className="text-[10px] font-bold uppercase tracking-wider bg-primary text-white"
                    >
                      Recomendação Estratégica IA
                    </Badge>
                    {onApplyStrategy && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          onApplyStrategy(estrategiaAtual, {
                            clienteNome,
                            segmento,
                            publico,
                            regiao,
                            objetivo,
                            orcamento,
                          })
                        }
                        className="rounded-xl h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Aplicar ao Construtor
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold mt-2">
                    {estrategiaAtual.resumo_executivo}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="text-xs text-muted-foreground leading-relaxed bg-background/80 p-3.5 rounded-2xl border border-border/60">
                    <strong className="text-foreground block mb-1">Justificativa Estratégica:</strong>
                    {estrategiaAtual.justificativa_estrategica}
                  </div>
                </CardContent>
              </Card>

              {/* Formatos Recomendados & Combinação de Mídias (Mix) */}
              <Card className="rounded-3xl border border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    Combinação de Mídias (Mix Recomendado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs font-semibold text-foreground">
                    {estrategiaAtual.combinacao_midias.descricao_mix}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {estrategiaAtual.formatos_recomendados.map((fmt, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl border border-border/70 bg-muted/30 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground truncate">
                            {fmt.formato}
                          </span>
                          <Badge variant="secondary" className="font-extrabold text-[10px]">
                            {fmt.percentual_mix}%
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-snug">
                          {fmt.motivo}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15 text-[11px] text-primary/90 leading-relaxed font-medium">
                    ⚡ <strong>Sinergia 360°:</strong> {estrategiaAtual.combinacao_midias.sinergia}
                  </div>
                </CardContent>
              </Card>

              {/* Pontos de Mídia Adequados (Produtos Reais do Inventário) */}
              <Card className="rounded-3xl border border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Package className="size-4 text-emerald-600" />
                    Pontos de Mídia Adequados (Inventário Recomendado)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {estrategiaAtual.pontos_midia_adequados.map((ponto, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-border/70 bg-card hover:border-emerald-500/50 transition-all flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground truncate">{ponto.nome}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold">
                            {ponto.tipo_midia}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-amber-600 shrink-0" />
                          <span>{ponto.regiao}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground/90 leading-relaxed">
                          {ponto.justificativa}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-foreground">
                          {formatBRL(ponto.valor_estimado)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Est. unitário</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Argumentos Comerciais (Pitch para o Cliente) */}
              <Card className="rounded-3xl border border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Target className="size-4 text-purple-600" />
                    Argumentos Comerciais (Defesa para Apresentação)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {estrategiaAtual.argumentos_comerciais.map((arg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-border/70 bg-muted/20 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                          Foco: {arg.foco}
                        </div>
                        <div className="text-foreground leading-relaxed font-medium">
                          &quot;{arg.argumento}&quot;
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyPitch(arg.argumento)}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                        title="Copiar argumento"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Aderência Sugerida para os 5 Pilares */}
              {estrategiaAtual.aderencia_pilares_sugerida && (
                <Card className="rounded-3xl border border-border bg-card shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Sliders className="size-4 text-primary" />
                      Calibração Sugerida dos 5 Pilares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                      {Object.entries(estrategiaAtual.aderencia_pilares_sugerida).map(
                        ([chave, nota]) => (
                          <div
                            key={chave}
                            className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-0.5"
                          >
                            <div className="text-[10px] font-bold uppercase text-muted-foreground truncate">
                              {chave.replace("_", " ")}
                            </div>
                            <div className="text-base font-black text-foreground">{nota}/10</div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
