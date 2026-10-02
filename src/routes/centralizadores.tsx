import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Compass,
  KanbanSquare,
  Users,
  Building2,
  Package,
  Handshake,
  FileText,
  FileSignature,
  Radio,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Layers,
  Activity,
  Send,
  Download,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPainelCentralizadores,
  detectarInconsistenciasSistema,
  validarRegrasCalculoFinanceiro,
} from "@/lib/centralizadores.functions";
import { calcularRepasseParceiro } from "@/lib/calculo-financeiro-midia";
import { PlanejadorEstrategicoIa } from "@/components/centralizadores/PlanejadorEstrategicoIa";
import { ParceirosMetricasManager } from "@/components/centralizadores/ParceirosMetricasManager";

export const Route = createFileRoute("/centralizadores")({
  head: () => ({ meta: [{ title: "Centralizadores e Planejadores — Mídia.OS" }] }),
  component: CentralizadoresPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Erro ao carregar o Centralizador</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {error?.message || "Ocorreu uma instabilidade momentânea ao carregar os indicadores do sistema."}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => reset()} variant="default">Tentar novamente</Button>
          <Button onClick={() => window.location.href = "/"} variant="outline">Voltar ao Início</Button>
        </div>
      </div>
    </AppShell>
  ),
});

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function CentralizadoresPage() {
  const getPainelFn = useServerFn(getPainelCentralizadores);
  const detectarInconsistenciasFn = useServerFn(detectarInconsistenciasSistema);
  const validarCalculoFn = useServerFn(validarRegrasCalculoFinanceiro);

  const [tab, setTab] = useState<
    "planejador_ia" | "metricas_parceiros" | "esteira" | "calculadora" | "inconsistencias" | "modelos"
  >("planejador_ia");

  // Estado da Calculadora Interativa da Regra Fundamental
  const [calcBruto, setCalcBruto] = useState<number>(100000);
  const [calcImpostoPct, setCalcImpostoPct] = useState<number>(10);
  const [calcComissaoPct, setCalcComissaoPct] = useState<number>(30);

  const calcResultado = calcularRepasseParceiro(calcBruto, calcImpostoPct, calcComissaoPct);

  // Queries
  const { data: painel, isLoading: loadingPainel } = useQuery({
    queryKey: ["painel-centralizadores"],
    queryFn: () => getPainelFn(),
  });

  const { data: inconsistencias = [] } = useQuery({
    queryKey: ["inconsistencias-sistema"],
    queryFn: () => detectarInconsistenciasFn(),
  });

  const validarTesteMutation = useMutation({
    mutationFn: () => validarCalculoFn(),
    onSuccess: (res) => {
      if (res.caso1Valido && res.caso2Valido) {
        toast.success("Todos os testes da Regra Fundamental foram validados com 100% de sucesso!");
      } else {
        toast.error("Houve divergência nos testes matemáticos.");
      }
    },
  });

  // Etapas da esteira completa do Centralizador (Prompt Mestre Seção 70)
  const etapasMaster = [
    { id: "prospeccao", label: "Prospecção & CRM", rota: "/crm", count: painel?.funil?.clientes ?? 0, icon: KanbanSquare, cor: "bg-blue-500" },
    { id: "produtos", label: "Catálogo de Produtos", rota: "/produtos", count: painel?.funil?.produtos ?? 0, icon: Package, cor: "bg-indigo-500" },
    { id: "parceiros", label: "Veículos & Parceiros", rota: "/parceiros", count: painel?.funil?.parceiros ?? 0, icon: Handshake, cor: "bg-violet-500" },
    { id: "propostas", label: "Propostas Comerciais", rota: "/propostas", count: painel?.funil?.propostas ?? 0, icon: FileText, cor: "bg-sky-500" },
    { id: "contratos", label: "Contratos de Mídia", rota: "/contratos", count: painel?.funil?.contratos ?? 0, icon: FileSignature, cor: "bg-amber-500" },
    { id: "assinaturas", label: "Módulo de Assinaturas", rota: "/assinaturas", count: "Universal", icon: FileSignature, cor: "bg-emerald-500" },
    { id: "pis", label: "Ordens de Inserção (PI)", rota: "/pi", count: painel?.funil?.pis ?? 0, icon: FileText, cor: "bg-teal-500" },
    { id: "veiculacao", label: "Comprovantes & Veiculação", rota: "/historico-veiculacao", count: painel?.funil?.comprovantes ?? 0, icon: Radio, cor: "bg-orange-500" },
    { id: "financeiro", label: "Financeiro & Repasses", rota: "/financeiro", count: formatBRL(painel?.financeiro?.aRepassar ?? 0), icon: Calculator, cor: "bg-rose-500" },
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Compass className="h-6 w-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Centralizadores e Planejadores
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Plataforma unificada para centralização comercial, planejamento de campanhas, múltiplos parceiros e liquidação financeira.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setTab("planejador_ia")}
              className="text-xs gap-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-primary text-white shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Planejador com IA
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validarTesteMutation.mutate()}
              disabled={validarTesteMutation.isPending}
              className="text-xs gap-1.5"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Auditar Regra Financeira (Seção 83)
            </Button>
          </div>
        </div>

        {/* Abas */}
        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
          <TabsList className="bg-muted/60 p-1 mb-4 flex-wrap h-auto">
            <TabsTrigger
              value="planejador_ia"
              className="gap-1.5 text-xs sm:text-sm font-semibold text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Estratégia de Mídia com IA
            </TabsTrigger>
            <TabsTrigger value="metricas_parceiros" className="gap-1.5 text-xs sm:text-sm">
              <BarChart className="h-4 w-4" />
              Números & Defesa de Mídia dos Parceiros
            </TabsTrigger>
            <TabsTrigger value="esteira" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="h-4 w-4" />
              Esteira Operacional Master
            </TabsTrigger>
            <TabsTrigger value="modelos" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Modelos de Operação
            </TabsTrigger>
            <TabsTrigger value="calculadora" className="gap-1.5 text-xs sm:text-sm">
              <Calculator className="h-4 w-4" />
              Motor de Repasse (Seção 45)
            </TabsTrigger>
            <TabsTrigger value="inconsistencias" className="gap-1.5 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4" />
              Inconsistências ({inconsistencias.length})
            </TabsTrigger>
          </TabsList>

          {/* ABA 0: ESTRATÉGIA DE MÍDIA COM IA */}
          <TabsContent value="planejador_ia" className="space-y-6">
            <PlanejadorEstrategicoIa />
          </TabsContent>

          {/* ABA 0.5: NÚMEROS & DEFESA DE MÍDIA DOS PARCEIROS */}
          <TabsContent value="metricas_parceiros" className="space-y-6">
            <ParceirosMetricasManager />
          </TabsContent>

          {/* ABA 1: ESTEIRA OPERACIONAL MASTER */}
          <TabsContent value="esteira" className="space-y-6">
            {/* Banner do Fluxo Master */}
            <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-primary/20">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Fluxo Integrado Ponta a Ponta
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      Do Lead à Prestação de Contas em um Único Sistema
                    </div>
                    <p className="text-xs text-muted-foreground max-w-2xl">
                      A centralização de mídia permite comercializar espaços próprios ou de múltiplos veículos terceiros,
                      controlando inventário, cotações, geração de PIs, assinaturas e o cálculo rigoroso do repasse líquido.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => (window.location.href = "/propostas")}
                      className="text-xs gap-1"
                    >
                      Nova Proposta <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grid das Etapas do Fluxo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {etapasMaster.map((etapa, idx) => {
                const IconComponent = etapa.icon;
                return (
                  <Card
                    key={etapa.id}
                    className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group"
                    onClick={() => (window.location.href = etapa.rota)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg text-white ${etapa.cor}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ETAPA 0{idx + 1}
                            </span>
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {etapa.label}
                            </h3>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>

                      <div className="border-t pt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Volume no Sistema:</span>
                        <span className="font-bold text-foreground">{etapa.count}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ABA 2: MODELOS DE OPERAÇÃO */}
          <TabsContent value="modelos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Modelo 1 */}
              <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-500/5">
                <CardHeader>
                  <Badge className="w-fit text-[10px] bg-blue-600">MODELO 1</Badge>
                  <CardTitle className="text-base mt-2">Cliente Direto</CardTitle>
                  <CardDescription className="text-xs">
                    Negociação direta entre o anunciante e a centralizadora de mídia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-background rounded border font-mono text-center text-[11px]">
                    CLIENTE → CENTRALIZADOR → PARCEIROS
                  </div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Faturamento direto com o cliente anunciante</li>
                    <li>Sem comissionamento intermediário de agência</li>
                    <li>Repasse direto ao veículo parceiro após abatimento do imposto</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Modelo 2 */}
              <Card className="border-purple-200 dark:border-purple-900/60 bg-purple-500/5">
                <CardHeader>
                  <Badge className="w-fit text-[10px] bg-purple-600">MODELO 2</Badge>
                  <CardTitle className="text-base mt-2">Via Agência</CardTitle>
                  <CardDescription className="text-xs">
                    A agência de publicidade planeja e intermedia a veiculação do anunciante.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-background rounded border font-mono text-center text-[11px]">
                    CLIENTE → AGÊNCIA → CENTRALIZADOR → PARCEIROS
                  </div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Comissão / Bonificação de Agência configurável</li>
                    <li>Emissão de PI em nome da agência ou cliente</li>
                    <li>Rateio detalhado por veículo de mídia</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Modelo 3 */}
              <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-500/5">
                <CardHeader>
                  <Badge className="w-fit text-[10px] bg-emerald-600">MODELO 3</Badge>
                  <CardTitle className="text-base mt-2">Operação Conjunta</CardTitle>
                  <CardDescription className="text-xs">
                    Agência e anunciante participam conjuntamente da aprovação e contratação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-background rounded border font-mono text-center text-[11px]">
                    CLIENTE ↔ AGÊNCIA ↔ CENTRALIZADOR → PARCEIROS
                  </div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Assinaturas híbridas e simultâneas</li>
                    <li>Transparência total dos comprovantes de veiculação</li>
                    <li>Relatório unificado de prestação de contas</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ABA 3: MOTOR DE REPASSE (SEÇÃO 45) */}
          <TabsContent value="calculadora" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Calculadora da Regra Fundamental de Cálculo (Seção 45)
                </CardTitle>
                <CardDescription>
                  1º Abater o Imposto do Bruto → 2º Calcular a Comissão sobre o Líquido → 3º Repasse Final ao Parceiro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border">
                  <div>
                    <Label className="text-xs font-semibold">Valor Bruto Negociado (R$)</Label>
                    <Input
                      type="number"
                      value={calcBruto}
                      onChange={(e) => setCalcBruto(Number(e.target.value))}
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Alíquota de Imposto / Tributo (%)</Label>
                    <Input
                      type="number"
                      value={calcImpostoPct}
                      onChange={(e) => setCalcImpostoPct(Number(e.target.value))}
                      className="mt-1 font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Comissão de Centralização (%)</Label>
                    <Input
                      type="number"
                      value={calcComissaoPct}
                      onChange={(e) => setCalcComissaoPct(Number(e.target.value))}
                      className="mt-1 font-mono"
                    />
                  </div>
                </div>

                {/* Exibição dos Passos Matemáticos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground block">1. Valor do Imposto ({calcImpostoPct}%)</span>
                    <span className="text-base font-bold text-rose-600 font-mono">
                      {formatBRL(calcResultado.valorImposto)}
                    </span>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground block">2. Valor Líquido Base</span>
                    <span className="text-base font-bold text-foreground font-mono">
                      {formatBRL(calcResultado.valorLiquido)}
                    </span>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <span className="text-[11px] text-muted-foreground block">3. Comissão ({calcComissaoPct}% sobre líq.)</span>
                    <span className="text-base font-bold text-primary font-mono">
                      {formatBRL(calcResultado.valorComissao)}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-300">
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-semibold">
                      4. Repasse Final ao Veículo
                    </span>
                    <span className="text-lg font-extrabold text-emerald-600 font-mono">
                      {formatBRL(calcResultado.repasseFinal)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-muted/50 border text-xs text-muted-foreground font-mono">
                  {calcResultado.formulaExplicada}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: INCONSISTÊNCIAS AUTOMÁTICAS */}
          <TabsContent value="inconsistencias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Mídia OS IA — Auditor de Inconsistências Operacionais e Fiscais
                </CardTitle>
                <CardDescription>
                  Varredura contínua de integridade: produtos sem preço, contratos sem assinatura, PIs pendentes e divergências financeiras.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inconsistencias.length === 0 ? (
                  <div className="p-6 text-center text-sm text-emerald-600 flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    Parabéns! Nenhuma inconsistência operacional ou fiscal encontrada no tenant.
                  </div>
                ) : (
                  inconsistencias.map((inc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border bg-background text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              inc.gravidade === "alta" ? "bg-rose-500" : "bg-amber-500"
                            }`}
                          />
                          {inc.titulo}
                        </div>
                        <p className="text-muted-foreground">{inc.descricao}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => (window.location.href = inc.link)}
                        className="text-xs text-primary gap-1"
                      >
                        Corrigir <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
