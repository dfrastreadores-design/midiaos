import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Bot,
  TrendingUp,
  Target,
  Users,
  Tv,
  Radio,
  Share2,
  Calendar,
  CheckCircle2,
  Copy,
  ArrowRight,
  Printer,
  ChevronRight,
  Layers,
  Building2,
  PieChart,
  Lightbulb,
  MessageSquareText,
  DollarSign,
  Loader2,
  ShieldCheck,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import {
  gerarEstrategiaMidiaIA,
  type EstrategiaMidiaInput,
  type EstrategiaMidiaOutput,
} from "@/lib/centralizadores.functions";
import { listClientes } from "@/lib/clientes.functions";
import { listParceirosMetricas } from "@/lib/parceiros-metricas.functions";
import { UniversalAnexosModal } from "@/components/anexos/UniversalAnexosModal";

const PRESETS_CENARIOS = [
  {
    label: "🛒 Varejo: Vendas Rápidas & Fim de Semana",
    segmento: "Varejo & Comércio",
    objetivo: "Vendas Rápidas & Conversão Imediata",
    cenario: "Acelerar fluxo de clientes nas lojas físicas e no e-commerce, liquidando estoque e combatendo promoções agressivas da concorrência local.",
    publico: "Famílias e decisores de compra das classes B e C",
    diferenciais: "Melhor preço da praça, pronta entrega e parcelamento em até 10x sem juros",
    budget: 65000,
    duracao: 30,
    tom: "Promocional de Alta Urgência",
  },
  {
    label: "🏢 Imobiliário: Lançamento de Alto Padrão",
    segmento: "Imobiliário & Construção",
    objetivo: "Lançamento & Posicionamento de Marca",
    cenario: "Lançamento de empreendimento residencial premium no DF buscando investidores e compradores qualificados antes da abertura do decorado.",
    publico: "Profissionais liberais, empresários e servidores públicos (Classes A e B1)",
    diferenciais: "Localização nobre, arquitetura premiada e condições exclusivas de pré-lançamento",
    budget: 120000,
    duracao: 45,
    tom: "Sofisticado, Inspirador e Confiável",
  },
  {
    label: "🏥 Saúde: Autoridade & Crescimento de Pacientes",
    segmento: "Saúde & Clínicas",
    objetivo: "Autoridade & Atração de Novos Pacientes",
    cenario: "Clínica médica moderna expandindo atendimentos e precisando construir reputação e confiança inquestionáveis frente aos concorrentes tradicionais.",
    publico: "Adultos de 30 a 65 anos com foco em qualidade de vida e prevenção",
    diferenciais: "Equipe com títulos internacionais, tecnologia de ponta e atendimento humanizado",
    budget: 45000,
    duracao: 30,
    tom: "Institucional, Acolhedor e Especialista",
  },
  {
    label: "💼 B2B: Geração de Leads Corporativos",
    segmento: "Tecnologia & Serviços B2B",
    objetivo: "Geração de Oportunidades Qualificadas",
    cenario: "Empresa de soluções empresariais buscando atrair diretores e tomadores de decisão de médias e grandes empresas da região.",
    publico: "CEOs, Diretores Financeiros, Gerentes de TI e RH",
    diferenciais: "Redução comprovada de 30% em custos operacionais e suporte dedicado 24/7",
    budget: 50000,
    duracao: 30,
    tom: "Técnico, Executivo e Estruturado",
  },
  {
    label: "🍔 Gastronomia: Atração Local & Casa Cheia",
    segmento: "Gastronomia & Entretenimento",
    objetivo: "Tráfego para Restaurante & Reconhecimento",
    cenario: "Restaurante conceituado lançando novo cardápio executivo e festival noturno, buscando atrair novos clientes de quinta a domingo.",
    publico: "Jovens e casais de 25 a 55 anos que valorizam experiências gastronômicas",
    diferenciais: "Ambiente instagramável, chef renomado e carta de vinhos selecionada",
    budget: 30000,
    duracao: 20,
    tom: "Sensorial, Convidativo e Envolvente",
  },
];

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function PlanejadorEstrategicoIa() {
  const gerarEstrategiaFn = useServerFn(gerarEstrategiaMidiaIA);
  const listClientesFn = useServerFn(listClientes);
  const listMetricasFn = useServerFn(listParceirosMetricas);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-lista-planejador"],
    queryFn: () => listClientesFn(),
  });

  const { data: parceirosMetricas = [] } = useQuery({
    queryKey: ["parceiros-metricas-planejador"],
    queryFn: () => listMetricasFn(),
  });

  const [form, setForm] = useState<EstrategiaMidiaInput>({
    cliente_id: null,
    cliente_nome: "",
    segmento: "Varejo & Comércio",
    cenario_atual: "O cliente busca expansão de mercado frente a forte concorrência, precisando de impacto imediato e autoridade.",
    objetivo_principal: "Vendas Rápidas & Conversão Imediata",
    publico_alvo: "Consumidores locais e tomadores de decisão no DF",
    pracas: ["Brasília - DF", "Águas Claras / Taguatinga", "Plano Piloto"],
    budget_estimado: 60000,
    duracao_dias: 30,
    veiculos_preferenciais: ["TV Aberta", "Painéis DOOH", "Rádio FM", "Digital / Redes"],
    diferenciais_cliente: "Tradição de mercado, excelência no atendimento e facilidade de pagamento",
    tom_comunicacao: "Persuasivo & Confiável",
  });

  const [resultado, setResultado] = useState<EstrategiaMidiaOutput | null>(null);
  const [modalAnexoClienteAberto, setModalAnexoClienteAberto] = useState(false);

  const gerarMutation = useMutation({
    mutationFn: (input: EstrategiaMidiaInput) => gerarEstrategiaFn({ data: input }),
    onSuccess: (data) => {
      setResultado(data);
      toast.success("Estratégia de mídia criada com inteligência artificial!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Falha ao gerar estratégia");
    },
  });

  const aplicarPreset = (p: (typeof PRESETS_CENARIOS)[0]) => {
    setForm((prev) => ({
      ...prev,
      segmento: p.segmento,
      objetivo_principal: p.objetivo,
      cenario_atual: p.cenario,
      publico_alvo: p.publico,
      diferenciais_cliente: p.diferenciais,
      budget_estimado: p.budget,
      duracao_dias: p.duracao,
      tom_comunicacao: p.tom,
    }));
    toast.info(`Cenário carregado: ${p.segmento}`);
  };

  const selecionarClienteExistente = (clienteId: string) => {
    if (clienteId === "novo") {
      setForm((prev) => ({ ...prev, cliente_id: null, cliente_nome: "" }));
      return;
    }
    const c = clientes.find((item: any) => item.id === clienteId);
    if (c) {
      setForm((prev) => ({
        ...prev,
        cliente_id: c.id,
        cliente_nome: c.nome_fantasia || c.razao_social,
        segmento: c.segmento || prev.segmento,
      }));
      toast.success(`Cliente "${c.nome_fantasia || c.razao_social}" vinculado ao planejador!`);
    }
  };

  const toggleVeiculo = (veiculo: string) => {
    setForm((prev) => {
      const current = prev.veiculos_preferenciais || [];
      const exists = current.includes(veiculo);
      const next = exists ? current.filter((v) => v !== veiculo) : [...current, veiculo];
      return { ...prev, veiculos_preferenciais: next };
    });
  };

  const copiarEstrategiaCompleta = () => {
    if (!resultado) return;

    const texto = `🌟 PLANEJAMENTO ESTRATÉGICO DE MÍDIA — MÍDIA.OS IA
--------------------------------------------------------
📌 PROJETO: ${resultado.titulo_estrategia}
🎯 CLIENTE: ${form.cliente_nome} | SEGMENTO: ${form.segmento}
💰 INVESTIMENTO PREVISTO: ${formatBRL(form.budget_estimado)} (${form.duracao_dias} dias)

📊 METAS E IMPACTO ESTIMADO:
• Alcance Projetado: ${resultado.metricas_projetadas.alcance_estimado}
• Impactos Totais: ${resultado.metricas_projetadas.impactos_totais}
• Frequência Média: ${resultado.metricas_projetadas.frequencia_media}
• Custo por Mil (CPM): ${resultado.metricas_projetadas.cpm_estimado || "N/A"}

🎯 DIAGNÓSTICO DO CENÁRIO:
${resultado.diagnostico_cenario}

💡 RACIONAL ESTRATÉGICO:
${resultado.racional_estrategico}

📈 MIX DE MÍDIA SUGERIDO:
${resultado.mix_recomendado
  .map(
    (m) =>
      `• ${m.canal}: ${m.percentual}% (${formatBRL(m.valor_alocado)})\n  Papel: ${m.papel_tatico}\n  Frequência: ${m.frequencia_sugerida}`,
  )
  .join("\n\n")}

⏱️ CRONOGRAMA EM FASES:
${resultado.cronograma_fases
  .map(
    (f) =>
      `• ${f.fase} (${f.periodo})\n  Foco: ${f.foco}\n  Canais: ${f.canais_ativos.join(", ")}`,
  )
  .join("\n\n")}

🤝 ARGUMENTOS CHAVE PARA O DECISOR:
${resultado.argumentos_venda_decisor.map((a, i) => `${i + 1}. ${a}`).join("\n")}

--------------------------------------------------------
Plano desenvolvido pela Inteligência de Mídia do Mídia.OS`;

    navigator.clipboard.writeText(texto);
    toast.success("Estratégia completa copiada para a área de transferência!");
  };

  return (
    <div className="space-y-6">
      {/* Banner de Apresentação da IA */}
      <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                <Sparkles className="size-3.5" />
                Motor de Inteligência Artificial de Mídia
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Planejador Estratégico Adaptativo por Cliente e Cenário
              </h2>
              <p className="text-xs text-muted-foreground max-w-3xl">
                Cada cliente possui desafios, orçamentos e comportamentos de consumo únicos.
                Nossa IA analisa o momento da empresa, o público e o orçamento, calculando o melhor mix cross-media (TV, DOOH, Rádio e Digital), 
                com cronograma em fases, métricas projetadas e argumentos comerciais persuasivos.
              </p>
            </div>
            {resultado && (
              <Button
                variant="outline"
                size="sm"
                onClick={copiarEstrategiaCompleta}
                className="gap-1.5 text-xs bg-background shrink-0"
              >
                <Copy className="size-3.5" />
                Copiar Estratégia
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Configuração do Cenário */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Definição do Cliente e Cenário
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione o cliente ou use um modelo de cenário para preenchimento rápido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Presets Rápidos */}
              <div>
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Modelos de Cenário (Preenchimento Rápido)
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS_CENARIOS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => aplicarPreset(p)}
                      className="px-2.5 py-1 rounded-md border text-[11px] bg-background hover:bg-muted/70 hover:border-primary/40 transition-colors text-left"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Cliente com botão de Anexar Documento */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold">Cliente Cadastrado no Sistema</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!form.cliente_nome.trim()) {
                        toast.error("Informe ou selecione o cliente antes de anexar");
                        return;
                      }
                      setModalAnexoClienteAberto(true);
                    }}
                    className="h-6 text-[11px] gap-1 text-primary hover:bg-primary/10 px-2"
                    title="Anexar documentos, briefings ou pesquisas deste cliente"
                  >
                    <Paperclip className="size-3" />
                    Anexar Documento
                  </Button>
                </div>
                <Select
                  value={form.cliente_id || "novo"}
                  onValueChange={selecionarClienteExistente}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente ou digite novo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">+ Cliente Novo / Prospect Avulso</SelectItem>
                    {clientes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_fantasia || c.razao_social} {c.segmento ? `(${c.segmento})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nome do Cliente e Segmento */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Nome da Empresa / Marca *</Label>
                  <Input
                    value={form.cliente_nome}
                    onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                    placeholder="Ex: Grupo SuperVarejo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Segmento de Mercado</Label>
                  <Input
                    value={form.segmento}
                    onChange={(e) => setForm({ ...form, segmento: e.target.value })}
                    placeholder="Ex: Varejo, Imobiliário..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Objetivo Principal */}
              <div>
                <Label className="text-xs font-semibold">Objetivo Principal da Campanha *</Label>
                <Input
                  value={form.objetivo_principal}
                  onChange={(e) => setForm({ ...form, objetivo_principal: e.target.value })}
                  placeholder="Ex: Vendas Rápidas, Lançamento de Produto, Branding..."
                  className="mt-1 font-medium"
                />
              </div>

              {/* Cenário e Momento Atual */}
              <div>
                <Label className="text-xs font-semibold">Momento e Desafio do Cliente *</Label>
                <Textarea
                  rows={3}
                  value={form.cenario_atual}
                  onChange={(e) => setForm({ ...form, cenario_atual: e.target.value })}
                  placeholder="Qual o momento do cliente? Ex: Concorrência acirrada, queima de estoque, inauguração de nova filial..."
                  className="mt-1 text-xs"
                />
              </div>

              {/* Orçamento e Duração */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Orçamento Previsto (R$)</Label>
                  <Input
                    type="number"
                    step={1000}
                    value={form.budget_estimado}
                    onChange={(e) => setForm({ ...form, budget_estimado: Number(e.target.value) })}
                    className="mt-1 font-mono font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Duração da Campanha</Label>
                  <Input
                    type="number"
                    value={form.duracao_dias}
                    onChange={(e) => setForm({ ...form, duracao_dias: Number(e.target.value) })}
                    placeholder="Dias"
                    className="mt-1 font-mono"
                  />
                </div>
              </div>

              {/* Mídias de Interesse */}
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Canais & Veículos Disponíveis</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["TV Aberta", "Painéis DOOH", "Rádio FM", "Digital / Redes", "Portais Web"].map((v) => {
                    const isSelected = (form.veiculos_preferenciais || []).includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggleVeiculo(v)}
                        className={`p-2 rounded border text-xs flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{v}</span>
                        {isSelected && <CheckCircle2 className="size-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diferenciais e Tom */}
              <div>
                <Label className="text-xs font-semibold">Diferenciais e Vantagens Competitivas</Label>
                <Input
                  value={form.diferenciais_cliente}
                  onChange={(e) => setForm({ ...form, diferenciais_cliente: e.target.value })}
                  placeholder="Ex: Melhor localização, preço imbatível, parcelamento..."
                  className="mt-1"
                />
              </div>

              {/* Botão de Disparo da IA */}
              <Button
                onClick={() => {
                  if (!form.cliente_nome.trim()) {
                    toast.error("Informe o nome do cliente");
                    return;
                  }
                  gerarMutation.mutate(form);
                }}
                disabled={gerarMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-primary text-white hover:opacity-95 shadow-md py-5 font-semibold text-sm gap-2"
              >
                {gerarMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Gerando Estratégia de Mídia com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Gerar Estratégia com IA para este Cliente
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Resultados da Estratégia */}
        <div className="lg:col-span-7 space-y-4">
          {!resultado && !gerarMutation.isPending && (
            <Card className="h-full flex flex-col items-center justify-center p-12 text-center border-dashed">
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Bot className="size-8" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Nenhuma estratégia gerada ainda
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
                Preencha os dados do cliente e clique em <strong>"Gerar Estratégia com IA"</strong>.
                O sistema criará automaticamente a divisão de verba entre canais, o cronograma em fases, métricas projetadas e o script comercial de fechamento.
              </p>
              <div className="grid grid-cols-2 gap-3 text-left max-w-sm w-full text-xs">
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <div className="font-semibold flex items-center gap-1.5 text-primary">
                    <PieChart className="size-3.5" />
                    Mix Proporcional
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Cálculo exato de verba por canal
                  </span>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border">
                  <div className="font-semibold flex items-center gap-1.5 text-indigo-600">
                    <TrendingUp className="size-3.5" />
                    Métricas de Impacto
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Alcance, frequência e CPM
                  </span>
                </div>
              </div>
            </Card>
          )}

          {gerarMutation.isPending && (
            <Card className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="size-16 rounded-full bg-primary/10 animate-ping absolute inset-0" />
                <div className="size-16 rounded-full bg-primary text-white flex items-center justify-center relative">
                  <Sparkles className="size-8 animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold">Inteligência Artificial Analisando o Cenário</h4>
                <p className="text-xs text-muted-foreground max-w-md">
                  Calculando sinergia cross-media para {form.cliente_nome || "o cliente"}, cruzando produtos do catálogo e otimizando a distribuição de investimento...
                </p>
              </div>
            </Card>
          )}

          {resultado && !gerarMutation.isPending && (
            <div className="space-y-4">
              {/* Header do Resultado */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge variant="outline" className="bg-background text-primary border-primary/40 font-semibold">
                      Plano Personalizado IA
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={copiarEstrategiaCompleta}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Copy className="size-3" /> Copiar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.href = `/propostas?cliente=${encodeURIComponent(
                            form.cliente_nome,
                          )}&valor=${form.budget_estimado}&campanha=${encodeURIComponent(
                            resultado.titulo_estrategia,
                          )}`;
                        }}
                        className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                      >
                        Gerar Proposta Comercial <ArrowRight className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground mt-2">
                    {resultado.titulo_estrategia}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Investimento sugerido: <strong>{formatBRL(form.budget_estimado)}</strong> para <strong>{form.duracao_dias} dias</strong> de campanha.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Cards de Métricas Projetadas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border bg-card text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Alcance Único</span>
                  <div className="text-sm sm:text-base font-bold text-foreground">
                    {resultado.metricas_projetadas.alcance_estimado}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Impactos Totais</span>
                  <div className="text-sm sm:text-base font-bold text-indigo-600">
                    {resultado.metricas_projetadas.impactos_totais}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Frequência Média</span>
                  <div className="text-sm sm:text-base font-bold text-primary">
                    {resultado.metricas_projetadas.frequencia_media}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">CPM Estimado</span>
                  <div className="text-sm sm:text-base font-bold text-emerald-600">
                    {resultado.metricas_projetadas.cpm_estimado || "R$ 15,00"}
                  </div>
                </div>
              </div>

              {/* Mix de Mídia Recomendado */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <PieChart className="size-4 text-primary" />
                      Mix de Mídia Recomendado (Rateio de Verba)
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Total: {formatBRL(form.budget_estimado)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {resultado.mix_recomendado.map((mix, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-primary" />
                            <span>{mix.canal}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <Badge variant="secondary" className="text-[10px]">
                              {mix.percentual}%
                            </Badge>
                            <span className="text-primary font-bold">
                              {formatBRL(mix.valor_alocado)}
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Visual */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${mix.percentual}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                          <div>
                            <span className="font-medium text-foreground">Papel Tático: </span>
                            {mix.papel_tatico}
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Frequência: </span>
                            {mix.frequencia_sugerida}
                          </div>
                        </div>

                        {mix.formatos_indicados?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {mix.formatos_indicados.map((fmt, fIdx) => (
                              <span
                                key={fIdx}
                                className="px-1.5 py-0.5 rounded bg-background border text-[10px] text-muted-foreground"
                              >
                                {fmt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Diagnóstico & Racional Estratégico */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="size-4 text-amber-500" />
                    Diagnóstico do Cenário & Racional da Estratégia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <span className="font-semibold text-foreground block mb-1">
                      Diagnóstico do Momento do Cliente:
                    </span>
                    <p>{resultado.diagnostico_cenario}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <span className="font-semibold text-foreground block mb-1">
                      Racional Tático de Veiculação:
                    </span>
                    <p>{resultado.racional_estrategico}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Cronograma em Fases */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="size-4 text-indigo-500" />
                    Cronograma de Execução em Fases
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resultado.cronograma_fases.map((fase, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-background text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>{fase.fase}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {fase.periodo}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{fase.foco}</p>
                      <div className="text-[11px] text-muted-foreground pt-1">
                        <strong>Canais Ativos: </strong>
                        {fase.canais_ativos.join(", ")}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Argumentos para o Decisor */}
              <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <MessageSquareText className="size-4" />
                    Argumentos Comerciais para o Executivo Fechar a Venda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {resultado.argumentos_venda_decisor.map((arg, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{arg}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Defesa Técnica de Veiculação & Números dos Parceiros */}
              <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                      <ShieldCheck className="size-4 text-indigo-600" />
                      Defesa de Veiculação — Números & Provas dos Parceiros de Mídia
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-background text-indigo-700">
                      Auditado
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Dados de audiência, alcance e fluxo viário que justificam formalmente a contratação deste mix.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs pt-1">
                  {parceirosMetricas.slice(0, 3).map((metrica, idx) => (
                    <div
                      key={metrica.id || idx}
                      className="p-3 rounded-lg border bg-background/80 space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-indigo-500" />
                          {metrica.parceiro_nome} ({metrica.tipo_midia})
                        </span>
                        <span className="text-[11px] font-mono text-indigo-600 font-bold">
                          {metrica.alcance_estimado || metrica.impactos_mes}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        "{metrica.defesa_tecnica}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                        <span>Fonte: {metrica.fonte_dados}</span>
                        <span>Praça: {metrica.praca}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modal Universal de Anexos do Cliente */}
      <UniversalAnexosModal
        isOpen={modalAnexoClienteAberto}
        onClose={() => setModalAnexoClienteAberto(false)}
        entidadeTipo="cliente"
        entidadeId={form.cliente_id || "prospect"}
        entidadeNome={form.cliente_nome || "Cliente"}
        tituloCustomizado={`Documentos & Briefing — ${form.cliente_nome || "Cliente"}`}
      />
    </div>
  );
}
