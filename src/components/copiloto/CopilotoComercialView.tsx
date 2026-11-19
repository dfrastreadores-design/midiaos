import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Bot,
  Target,
  Users,
  MapPin,
  DollarSign,
  Compass,
  Package,
  Layers,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Building2,
  Calendar,
  Share2,
  Eye,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  History,
  Clock,
  Filter,
  BarChart3,
  Tv,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/clientes.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { formatBRL } from "@/lib/mock-data";
import {
  analisarCopilotoComercial,
  listHistoricoCopiloto,
  converterCopilotoEmProposta,
  vincularCopilotoAoPlanejamento,
  type CopilotoInput,
  type CopilotoComercialResultado,
} from "@/lib/copiloto-comercial.functions";

const SEGMENTOS_RAPIDOS = [
  "Imobiliário & Construção",
  "Varejo & Supermercados",
  "Saúde, Clínicas & Hospitais",
  "Automotivo & Concessionárias",
  "Educação & Faculdades",
  "Gastronomia & Restaurantes",
  "Serviços Financeiros",
  "Moda & Vestuário",
];

const OBJETIVOS_COMERCIAIS = [
  { id: "branding", label: "Branding & Recall de Marca", desc: "Maximização de cobertura e fixação contínua de imagem" },
  { id: "lancamento", label: "Lançamento de Produto / Serviço", desc: "Impacto imediato com alta concentração de impressões" },
  { id: "varejo", label: "Vendas Imediatas & Varejo", desc: "Direcionamento de tráfego rápido para pontos de venda e lojas" },
  { id: "abertura", label: "Inauguração de Loja / Unidade", desc: "Dominação territorial no raio de influência do negócio" },
  { id: "institucional", label: "Institucional & Eventos", desc: "Posicionamento executivo de autoridade e prestígio" },
];

export function CopilotoComercialView() {
  const queryClient = useQueryClient();

  // Estados do formulário
  const [form, setForm] = useState<CopilotoInput>({
    cliente_id: null,
    cliente_nome: "",
    segmento: "Imobiliário & Construção",
    regiao: "Brasília - DF (Eixo Monumental e Asa Sul/Norte)",
    orcamento: 65000,
    objetivo: "Branding & Recall de Marca",
    duracao_dias: 30,
  });

  const [copilotoResultado, setCopilotoResultado] = useState<CopilotoComercialResultado | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<"resultado" | "historico">("resultado");
  const [copiado, setCopiado] = useState(false);

  // Queries
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-copiloto"],
    queryFn: () => listClientes(),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-copiloto"],
    queryFn: () => listProdutos(),
  });

  const { data: historicoSessoes = [] } = useQuery({
    queryKey: ["historico-copiloto"],
    queryFn: () => listHistoricoCopiloto(),
  });

  // Server functions
  const analisarFn = useServerFn(analisarCopilotoComercial);
  const converterPropostaFn = useServerFn(converterCopilotoEmProposta);
  const vincularPlanejamentoFn = useServerFn(vincularCopilotoAoPlanejamento);

  // Mutações
  const mutationAnalisar = useMutation({
    mutationFn: async () => {
      if (!form.cliente_nome.trim()) throw new Error("Informe o nome do cliente");
      if (!form.regiao.trim()) throw new Error("Informe a região da campanha");
      if (form.orcamento <= 0) throw new Error("Informe um orçamento válido");

      return await analisarFn({ data: form });
    },
    onSuccess: (data) => {
      setCopilotoResultado(data as CopilotoComercialResultado);
      setAbaAtiva("resultado");
      queryClient.invalidateQueries({ queryKey: ["historico-copiloto"] });
      toast.success("Estratégia e plano comercial gerados pelo Copiloto Gemini!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao consultar o Copiloto Comercial.");
    },
  });

  const mutationCriarProposta = useMutation({
    mutationFn: async () => {
      if (!copilotoResultado) throw new Error("Nenhum plano ativo para converter.");
      const pontos = copilotoResultado.recomendacao_midia.pontos_inventario.map((p) => ({
        produto_id: p.produto_id,
        nome: p.nome,
        midia: p.midia,
        tipo: p.tipo || null,
        formato: p.formato || null,
        endereco_ponto: p.endereco_ponto || null,
        valor_unit: p.valor_unit,
      }));

      return await converterPropostaFn({
        data: {
          copiloto_id: copilotoResultado.id || null,
          cliente_id: copilotoResultado.cliente.id || null,
          cliente_nome: copilotoResultado.cliente.nome,
          campanha_nome: copilotoResultado.plano_estrategico.titulo,
          pontos,
          observacao: `Tese Comercial: ${copilotoResultado.plano_estrategico.tese_estrategica}`,
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success(`Proposta nº ${res.numero || ""} gerada com sucesso a partir do Copiloto!`);
      if (res.proposta_id) {
        window.location.href = `/propostas?id=${res.proposta_id}`;
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar proposta comercial.");
    },
  });

  const mutationVincularPlanejamento = useMutation({
    mutationFn: async () => {
      if (!copilotoResultado) throw new Error("Nenhum plano ativo para vincular.");
      return await vincularPlanejamentoFn({
        data: {
          copiloto_id: copilotoResultado.id || null,
          cliente_id: copilotoResultado.cliente.id || null,
          nome_campanha: copilotoResultado.plano_estrategico.titulo,
          orcamento: copilotoResultado.parametros.orcamento,
          objetivo: copilotoResultado.parametros.objetivo,
          praca_principal: copilotoResultado.parametros.regiao,
          pilares: copilotoResultado.plano_estrategico.pilares,
        },
      });
    },
    onSuccess: (res: any) => {
      toast.success("Campanha criada e vinculada com sucesso ao Planejamento 360!");
      if (res.campanha_id) {
        window.location.href = `/planejamento?campanha=${res.campanha_id}`;
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao vincular ao planejamento.");
    },
  });

  // Copiar Pitch de Vendas completo
  const copiarPitchVendas = () => {
    if (!copilotoResultado) return;
    const { cliente, parametros, recomendacao_midia, plano_estrategico, justificativa_comercial, argumentos_venda } = copilotoResultado;

    const texto = `🚀 PROPOSTA & ESTRATÉGIA COMERCIAL — MÍDIA.OS
--------------------------------------------------
🎯 CLIENTE: ${cliente.nome} (${cliente.segmento})
📍 REGIÃO/PRAÇA: ${parametros.regiao}
💰 ORÇAMENTO: ${formatBRL(parametros.orcamento)} (${parametros.duracao_dias} dias)
🎯 OBJETIVO: ${parametros.objetivo}

📊 MÉTRICAS PROJETADAS:
• Alcance: ${plano_estrategico.metricas_projetadas.alcance_estimado}
• Impactos Totais: ${plano_estrategico.metricas_projetadas.impactos_totais}
• Frequência Média: ${plano_estrategico.metricas_projetadas.frequencia_media}
• Custo por Mil (CPM): ${plano_estrategico.metricas_projetadas.cpm_estimado}

💡 RACIONAL & JUSTIFICATIVA COMERCIAL:
${justificativa_comercial.racional_investimento}

🎯 ARGUMENTOS DE VENDA PARA O DECISOR:
${argumentos_venda.argumentos_principais.map((a, i) => `${i + 1}. [${a.foco}] ${a.argumento}`).join("\n")}

🛡️ TRATAMENTO DE OBJEÇÕES:
${argumentos_venda.respostas_objecoes.map((o) => `• P: "${o.objecao}"\n  R: ${o.resposta}`).join("\n\n")}

✨ PONTOS DE MÍDIA RECOMENDADOS:
${recomendacao_midia.pontos_inventario.map((p) => `• ${p.nome} (${p.midia}) - ${formatBRL(p.valor_unit)}`).join("\n")}
`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success("Pitch comercial e argumentos copiados para a área de transferência!");
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-violet-950/40 via-background to-blue-950/30 border border-violet-500/20 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Bot className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Copiloto Comercial Gemini</h1>
            <Badge variant="outline" className="border-violet-500/40 text-violet-400 bg-violet-500/10">
              IA 2.5 Flash
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Inteligência analítica que analisa cliente, segmento, região, orçamento e objetivo para gerar recomendação de mídia, plano estratégico, justificativa e argumentos de fechamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={abaAtiva === "resultado" ? "default" : "outline"}
            size="sm"
            onClick={() => setAbaAtiva("resultado")}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Análise & Copiloto
          </Button>
          <Button
            variant={abaAtiva === "historico" ? "default" : "outline"}
            size="sm"
            onClick={() => setAbaAtiva("historico")}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            Histórico ({historicoSessoes.length})
          </Button>
        </div>
      </div>

      {abaAtiva === "resultado" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulário dos 5 Parâmetros de Análise */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Parâmetros de Análise da Demanda
                </CardTitle>
                <CardDescription className="text-xs">
                  Forneça os 5 dados essenciais para que o Copiloto configure a melhor estratégia de venda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs">
                {/* 1. Cliente */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>1. Cliente / Anunciante</span>
                    <span className="text-[10px] text-muted-foreground">Obrigatório</span>
                  </Label>
                  <Select
                    value={form.cliente_id || "manual"}
                    onValueChange={(val) => {
                      if (val === "manual") {
                        setForm((prev) => ({ ...prev, cliente_id: null }));
                      } else {
                        const c = clientes.find((item: any) => item.id === val);
                        if (c) {
                          setForm((prev) => ({
                            ...prev,
                            cliente_id: c.id,
                            cliente_nome: c.nome_fantasia || c.razao_social,
                            segmento: c.segmento || prev.segmento,
                          }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione um cliente da base..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Digitar nome avulso...</SelectItem>
                      {clientes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_fantasia || c.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Nome da empresa / anunciante..."
                    value={form.cliente_nome}
                    onChange={(e) => setForm((prev) => ({ ...prev, cliente_nome: e.target.value }))}
                    className="text-xs mt-1"
                  />
                </div>

                {/* 2. Segmento */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">2. Segmento de Mercado</Label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {SEGMENTOS_RAPIDOS.slice(0, 4).map((seg) => (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, segmento: seg }))}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          form.segmento === seg
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {seg}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Ex: Concessionária de Veículos Seminovos..."
                    value={form.segmento}
                    onChange={(e) => setForm((prev) => ({ ...prev, segmento: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                {/* 3. Região */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    3. Região / Praças Prioritárias
                  </Label>
                  <Input
                    placeholder="Ex: Brasília - DF, Taguatinga e Águas Claras..."
                    value={form.regiao}
                    onChange={(e) => setForm((prev) => ({ ...prev, regiao: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                {/* 4. Orçamento */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      4. Orçamento Previsto
                    </Label>
                    <span className="text-xs font-bold text-emerald-500">
                      {formatBRL(form.orcamento)}
                    </span>
                  </div>
                  <Input
                    type="number"
                    step="1000"
                    min="1000"
                    value={form.orcamento}
                    onChange={(e) => setForm((prev) => ({ ...prev, orcamento: Number(e.target.value) || 0 }))}
                    className="text-xs font-mono"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[30000, 50000, 80000, 120000].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, orcamento: valor }))}
                        className="px-2 py-0.5 rounded border text-[10px] bg-muted/30 hover:bg-muted"
                      >
                        {valor / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Objetivo Comercial */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">5. Objetivo Principal da Venda</Label>
                  <Select
                    value={form.objetivo}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, objetivo: val }))}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione o objetivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJETIVOS_COMERCIAIS.map((obj) => (
                        <SelectItem key={obj.id} value={obj.label}>
                          {obj.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão de Disparo */}
                <Button
                  onClick={() => mutationAnalisar.mutate()}
                  disabled={mutationAnalisar.isPending}
                  className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 py-2.5"
                >
                  {mutationAnalisar.isPending ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      Processando com Copiloto Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analisar Demanda & Gerar Plano de Venda
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Ações de Integração Rápida quando houver resultado */}
            {copilotoResultado && (
              <Card className="border-violet-500/30 bg-violet-950/10 p-4 space-y-3">
                <div className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ações Imediatas de Fechamento
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={() => mutationCriarProposta.mutate()}
                    disabled={mutationCriarProposta.isPending}
                    size="sm"
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {mutationCriarProposta.isPending
                      ? "Gerando Proposta..."
                      : "Gerar Proposta Comercial com estes Pontos"}
                  </Button>
                  <Button
                    onClick={() => mutationVincularPlanejamento.mutate()}
                    disabled={mutationVincularPlanejamento.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    {mutationVincularPlanejamento.isPending
                      ? "Vinculando..."
                      : "Vincular ao Planejamento 360"}
                  </Button>
                  <Button
                    onClick={copiarPitchVendas}
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 text-xs"
                  >
                    {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiado ? "Copiado!" : "Copiar Pitch Comercial Completo"}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Coluna Direita: Os 4 Blocos Estruturados da Resposta */}
          <div className="lg:col-span-7 space-y-4">
            {!copilotoResultado ? (
              <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center min-h-[460px]">
                <div className="p-4 rounded-full bg-violet-500/10 text-violet-400 mb-4 border border-violet-500/20">
                  <Bot className="h-10 w-10" />
                </div>
                <h3 className="text-base font-semibold mb-1">Copiloto Comercial Pronto</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-6">
                  Preencha os dados do cliente à esquerda e clique em <strong>Analisar Demanda</strong> para receber o plano de mídia, pontos do inventário, justificativa e argumentos de fechamento.
                </p>
                <div className="grid grid-cols-2 gap-2 text-left max-w-sm w-full text-xs text-muted-foreground">
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="font-semibold text-foreground block">🎯 1. Recomendação</span>
                    Mix tático e pontos reais
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="font-semibold text-foreground block">📈 2. Plano Estratégico</span>
                    Fases, alcance e métricas
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="font-semibold text-foreground block">💡 3. Justificativa</span>
                    Defesa de ROI e território
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="font-semibold text-foreground block">🗣️ 4. Argumentos</span>
                    Pitch e objeções
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* 1. Recomendação de Mídia & Inventário */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-violet-500" />
                        1. Recomendação de Mídia & Inventário Selecionado
                      </CardTitle>
                      <Badge variant="outline" className="text-xs font-mono">
                        {copilotoResultado.recomendacao_midia.pontos_inventario.length} pontos
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <p className="text-muted-foreground">
                      {copilotoResultado.recomendacao_midia.resumo_mix}
                    </p>

                    {/* Mix de Canais com barra de distribuição */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Mix de Canais & Distribuição do Orçamento
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {copilotoResultado.recomendacao_midia.mix_canais.map((c, i) => (
                          <div key={i} className="p-2.5 rounded-lg border bg-card/60 space-y-1">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="truncate">{c.canal}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {c.percentual}%
                              </Badge>
                            </div>
                            <div className="text-[11px] font-bold text-emerald-500">
                              {formatBRL(c.valor_alocado)}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {c.papel_tatico}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pontos do Inventário Selecionados */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Pontos do Inventário Vinculados
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {copilotoResultado.recomendacao_midia.pontos_inventario.map((p, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border bg-card hover:border-violet-500/40 transition-colors flex gap-3"
                          >
                            {p.foto_comercial ? (
                              <img
                                src={p.foto_comercial}
                                alt={p.nome}
                                className="w-16 h-16 rounded object-cover border shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
                                <Tv className="h-6 w-6" />
                              </div>
                            )}
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate">{p.nome}</div>
                              <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {p.endereco_ponto || p.cidade || "Ponto Estratégico"}
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <Badge variant="outline" className="text-[9px]">
                                  {p.midia}
                                </Badge>
                                <span className="font-bold text-emerald-500 text-[11px]">
                                  {formatBRL(p.valor_unit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Plano Estratégico */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      2. Plano Estratégico & Métricas Projetadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 text-blue-200">
                      <strong>Tese Estratégica:</strong> {copilotoResultado.plano_estrategico.tese_estrategica}
                    </div>

                    {/* Projeção de Métricas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-lg border bg-card">
                        <span className="text-[10px] text-muted-foreground block">Alcance Estimado</span>
                        <span className="font-bold text-sm text-foreground">
                          {copilotoResultado.plano_estrategico.metricas_projetadas.alcance_estimado}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-card">
                        <span className="text-[10px] text-muted-foreground block">Impactos Totais</span>
                        <span className="font-bold text-sm text-foreground">
                          {copilotoResultado.plano_estrategico.metricas_projetadas.impactos_totais}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-card">
                        <span className="text-[10px] text-muted-foreground block">Frequência Média</span>
                        <span className="font-bold text-sm text-foreground">
                          {copilotoResultado.plano_estrategico.metricas_projetadas.frequencia_media}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-card">
                        <span className="text-[10px] text-muted-foreground block">CPM Estimado</span>
                        <span className="font-bold text-sm text-emerald-500">
                          {copilotoResultado.plano_estrategico.metricas_projetadas.cpm_estimado}
                        </span>
                      </div>
                    </div>

                    {/* Cronograma em Fases */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Cronograma de Implementação
                      </Label>
                      <div className="space-y-1.5">
                        {copilotoResultado.plano_estrategico.cronograma_fases.map((f, i) => (
                          <div key={i} className="p-2.5 rounded border bg-card/60 flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                              {f.duracao_estimada}
                            </Badge>
                            <div>
                              <div className="font-semibold text-foreground">{f.fase}</div>
                              <p className="text-[11px] text-muted-foreground">{f.objetivo}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Justificativa Comercial */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      3. Justificativa Comercial & Defesa de ROI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs leading-relaxed">
                    <div>
                      <span className="font-bold text-foreground">Racional de Investimento: </span>
                      <span className="text-muted-foreground">
                        {copilotoResultado.justificativa_comercial.racional_investimento}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-foreground">Defesa Territorial: </span>
                      <span className="text-muted-foreground">
                        {copilotoResultado.justificativa_comercial.defesa_territorial}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-foreground">Previsão de Retorno (ROI): </span>
                      <span className="text-muted-foreground">
                        {copilotoResultado.justificativa_comercial.previsao_roi}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Argumentos de Venda & Fechamento */}
                <Card className="border-border/60">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                        4. Argumentos de Venda & Superação de Objeções
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copiarPitchVendas}
                        className="h-7 text-xs gap-1"
                      >
                        {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiado ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    {/* Principais Argumentos */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Argumentos Chave para o Decisor
                      </Label>
                      <div className="space-y-1.5">
                        {copilotoResultado.argumentos_venda.argumentos_principais.map((arg, i) => (
                          <div key={i} className="p-2.5 rounded-lg border bg-amber-500/5 border-amber-500/20 space-y-0.5">
                            <div className="font-semibold text-amber-400 text-[11px]">
                              [{arg.foco}]
                            </div>
                            <p className="text-foreground">{arg.argumento}</p>
                            <span className="text-[10px] text-muted-foreground block">{arg.impacto}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Respostas a Objeções */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Como Responder Objeções Frequentes
                      </Label>
                      <div className="space-y-2">
                        {copilotoResultado.argumentos_venda.respostas_objecoes.map((o, idx) => (
                          <div key={idx} className="p-2.5 rounded border bg-card/60 space-y-1">
                            <div className="font-semibold text-destructive/90 flex items-center gap-1.5">
                              <HelpCircle className="h-3.5 w-3.5" />
                              "{o.objecao}"
                            </div>
                            <p className="text-muted-foreground text-[11px] pl-5 border-l-2 border-primary/40">
                              {o.resposta}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gatilhos de Fechamento */}
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 space-y-1 text-emerald-200">
                      <div className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Gatilhos de Fechamento Comercial
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 pt-1">
                        {copilotoResultado.argumentos_venda.gatilhos_fechamento.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === "historico" && (
        <Card className="border-border/60">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Sessões do Copiloto Comercial
            </CardTitle>
            <CardDescription className="text-xs">
              Todas as estratégias geradas pelo Gemini ficam salvas e auditadas no sistema para consulta e reutilização.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-xs">
            {historicoSessoes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma sessão registrada até o momento.
              </div>
            ) : (
              <div className="divide-y">
                {historicoSessoes.map((item: any) => {
                  const p = item.prompt || {};
                  const r = item.resposta || {};
                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {p.cliente_nome || "Cliente"}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {p.segmento || "Geral"}
                          </Badge>
                          {item.proposta_id && (
                            <Badge className="bg-emerald-600 text-white text-[9px]">
                              Proposta Vinculada
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-[11px] flex items-center gap-3">
                          <span>📍 {p.regiao || "Praça"}</span>
                          <span>💰 {formatBRL(p.orcamento || 0)}</span>
                          <span>🎯 {p.objetivo || "Objetivo"}</span>
                          <span>🕒 {new Date(item.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setForm({
                              cliente_id: p.cliente_id || null,
                              cliente_nome: p.cliente_nome || "",
                              segmento: p.segmento || "Geral",
                              regiao: p.regiao || "",
                              orcamento: p.orcamento || 50000,
                              objetivo: p.objetivo || "Branding",
                              duracao_dias: p.duracao_dias || 30,
                            });
                            setCopilotoResultado({
                              id: item.id,
                              cliente: {
                                id: p.cliente_id || null,
                                nome: p.cliente_nome,
                                segmento: p.segmento,
                              },
                              parametros: {
                                regiao: p.regiao,
                                orcamento: p.orcamento,
                                objetivo: p.objetivo,
                                duracao_dias: p.duracao_dias || 30,
                              },
                              recomendacao_midia: r.recomendacao_midia,
                              plano_estrategico: r.plano_estrategico,
                              justificativa_comercial: r.justificativa_comercial,
                              argumentos_venda: r.argumentos_venda,
                              created_at: item.created_at,
                            });
                            setAbaAtiva("resultado");
                            toast.success("Sessão do copiloto restaurada!");
                          }}
                          className="text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Análise
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
