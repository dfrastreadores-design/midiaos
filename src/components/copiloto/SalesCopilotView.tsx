import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { 
  Briefcase, 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  BarChart3, 
  Zap, 
  Building2, 
  Users, 
  ArrowRight,
  Sliders,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/mock-data";
import { listClientes } from "@/lib/clientes.functions";
import { 
  analisarClienteDiretorComercial, 
  gerarRespostaComercialRapida, 
  calcularNegociacaoInteligente, 
  gerarLinkPropostaInterativa, 
  executarIaChecking, 
  obterDashboardInteligenciaComercial4 
} from "@/lib/sales-copilot.functions";
import type { 
  AnaliseDiretorComercialIa, 
  RespostaComercialRapida, 
  NegociacaoInteligenteIa, 
  PropostaInterativaOnline, 
  IaCheckingResultado, 
  MetricasDashboardComercial4 
} from "@/lib/sales-copilot.types";

export const SalesCopilotView: React.FC = () => {
  const [abaAtiva, setAbaAtiva] = useState<string>("diretor");
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>("");
  const [nomeCliente, setNomeCliente] = useState<string>("Rede de Supermercados Alvorada");
  const [valorProposta, setValorProposta] = useState<number>(45000);
  const [descontoDesejado, setDescontoDesejado] = useState<number>(15);
  const [textoCopiado, setTextoCopiado] = useState(false);

  // Server functions
  const analisarClienteFn = useServerFn(analisarClienteDiretorComercial);
  const gerarRespostaFn = useServerFn(gerarRespostaComercialRapida);
  const calcularNegociacaoFn = useServerFn(calcularNegociacaoInteligente);
  const gerarLinkFn = useServerFn(gerarLinkPropostaInterativa);
  const checkingFn = useServerFn(executarIaChecking);
  const dashboardFn = useServerFn(obterDashboardInteligenciaComercial4);

  // Queries
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-sales-copilot"],
    queryFn: () => listClientes(),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-comercial-4"],
    queryFn: () => dashboardFn(),
  });

  const dashboard: MetricasDashboardComercial4 | undefined = dashboardData?.dashboard;

  // Estados dos resultados
  const [analise, setAnalise] = useState<AnaliseDiretorComercialIa | null>(null);
  const [respostaRapida, setRespostaRapida] = useState<RespostaComercialRapida | null>(null);
  const [negociacao, setNegociacao] = useState<NegociacaoInteligenteIa | null>(null);
  const [propostaOnline, setPropostaOnline] = useState<PropostaInterativaOnline | null>(null);
  const [checkingResult, setCheckingResult] = useState<IaCheckingResultado | null>(null);

  // Mutações
  const mutationAnalisar = useMutation({
    mutationFn: async () => {
      return await analisarClienteFn({
        data: {
          cliente_id: clienteSelecionadoId || null,
          cliente_nome: nomeCliente,
          segmento: "Varejo & Serviços",
          valor_pretendido: valorProposta,
        },
      });
    },
    onSuccess: (res: any) => {
      setAnalise(res.analise);
      toast.success("Diagnóstico do Diretor Comercial IA gerado!");
    },
  });

  const mutationResposta = useMutation({
    mutationFn: async (tipo: RespostaComercialRapida["tipo"]) => {
      return await gerarRespostaFn({
        data: {
          tipo,
          cliente_nome: nomeCliente,
          valor_proposta: valorProposta,
          segmento: "Varejo",
        },
      });
    },
    onSuccess: (res: any) => {
      setRespostaRapida(res.resposta);
      toast.success("Script de resposta e WhatsApp preparado!");
    },
  });

  const mutationNegociar = useMutation({
    mutationFn: async (desc: number) => {
      return await calcularNegociacaoFn({
        data: {
          valor_tabela: valorProposta,
          desconto_desejado_pct: desc,
        },
      });
    },
    onSuccess: (res: any) => {
      setNegociacao(res.negociacao);
    },
  });

  const mutationGerarLink = useMutation({
    mutationFn: async () => {
      return await gerarLinkFn({
        data: {
          cliente_nome: nomeCliente,
          valor_total: valorProposta,
          duracao_dias: 30,
        },
      });
    },
    onSuccess: (res: any) => {
      setPropostaOnline(res.proposta_online);
      toast.success("Link da Proposta Interativa Online gerado com sucesso!");
    },
  });

  const mutationChecking = useMutation({
    mutationFn: async () => {
      return await checkingFn({
        data: {
          ponto_nome: "Painel LED Avenida Central",
        },
      });
    },
    onSuccess: (res: any) => {
      setCheckingResult(res.checking);
      toast.success("Auditoria IA de Checking concluída!");
    },
  });

  const copiarTexto = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setTextoCopiado(true);
    toast.success("Texto copiado para a área de transferência!");
    setTimeout(() => setTextoCopiado(false), 2500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header do MÍDIA.OS 4.0 — SALES COPILOT */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                MÍDIA.OS SALES COPILOT
              </h1>
              <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px]">
                4.0 Director
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Diretor Comercial IA, Negociação Inteligente, IA Checking e Fechamento
            </p>
          </div>
        </div>

        {/* Parâmetros Rápidos de Trabalho */}
        <div className="flex items-center gap-3">
          <select
            value={clienteSelecionadoId}
            onChange={(e) => {
              setClienteSelecionadoId(e.target.value);
              const cli = clientes.find((c: any) => c.id === e.target.value);
              if (cli) setNomeCliente(cli.nome);
            }}
            className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">Cliente: {nomeCliente}</option>
            {clientes.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={() => mutationAnalisar.mutate()}
            disabled={mutationAnalisar.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {mutationAnalisar.isPending ? "Analisando..." : "Analisar Cliente"}
          </Button>
        </div>
      </div>

      {/* Tabs Principais do Sales Copilot */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 border-b border-slate-800 bg-slate-950/40">
          <TabsList className="bg-transparent h-10 p-0 gap-4 justify-start border-none">
            <TabsTrigger
              value="diretor"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              1. Diretor Comercial IA
            </TabsTrigger>
            <TabsTrigger
              value="respostas"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              2. Respostas Rápidas & WhatsApp
            </TabsTrigger>
            <TabsTrigger
              value="negociacao"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              3. Negociação & Alçadas
            </TabsTrigger>
            <TabsTrigger
              value="proposta_online"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              4. Proposta Interativa Online
            </TabsTrigger>
            <TabsTrigger
              value="ia_checking"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              5. IA Checking (Auditoria)
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-500 data-[state=active]:text-purple-400 text-slate-400 text-xs rounded-none py-2 px-1 font-medium"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              6. Dashboard 4.0 & Memória
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ========================================================================= */}
          {/* ABA 1: DIRETOR COMERCIAL IA */}
          {/* ========================================================================= */}
          <TabsContent value="diretor" className="m-0 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400">Probabilidade de Fechamento</CardDescription>
                  <CardTitle className="text-3xl font-bold text-emerald-400">
                    {analise ? `${analise.probabilidade_fechamento_pct}%` : "82%"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Lead com temperatura: <strong className="text-emerald-400 uppercase">Quente / Fechamento</strong>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400">Ticket Médio Estimado</CardDescription>
                  <CardTitle className="text-3xl font-bold text-white">
                    R$ {formatBRL(analise ? analise.ticket_medio_historico : valorProposta)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Baseado no histórico do segmento de Varejo
                </CardContent>
              </Card>

              <Card className="bg-slate-900/70 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs text-slate-400">Potencial de Expansão</CardDescription>
                  <CardTitle className="text-3xl font-bold text-purple-400">
                    Alto (Q4)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                  Afinidade com datas de grande fluxo comercial
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader className="p-4 pb-3 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Diretrizes Estratégicas do Diretor Comercial para a Negociação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  {analise?.historico_resumo || "Cliente com alto interesse em cercamento da praça central e forte apetite para formatos de grande impacto. Não negocie preço sem antes ancorar o custo por mil impactos frente aos leilões digitais."}
                </p>
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Argumentos Decisivos:</span>
                  {(analise?.argumentos_chave || [
                    "Blindagem territorial contra concorrentes diretos",
                    "CPM até 4x mais econômico que feeds de redes sociais",
                    "Validação de marca que impulsiona o tráfego das lojas físicas",
                  ]).map((arg, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{arg}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: RESPOSTAS RÁPIDAS & WHATSAPP */}
          {/* ========================================================================= */}
          <TabsContent value="respostas" className="m-0 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Comandos Comerciais Imediatos</h2>
              <p className="text-xs text-slate-400">
                Gere respostas periciais para quebrar objeções e scripts prontos para envio:
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutationResposta.mutate("cliente_achou_caro")}
                className="border-slate-800 hover:border-purple-500 bg-slate-900 text-xs text-slate-200"
              >
                "Cliente achou caro"
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutationResposta.mutate("como_defender")}
                className="border-slate-800 hover:border-purple-500 bg-slate-900 text-xs text-slate-200"
              >
                "Como defender a proposta?"
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutationResposta.mutate("whatsapp_fechamento")}
                className="border-slate-800 hover:border-purple-500 bg-slate-900 text-xs text-slate-200"
              >
                "Criar mensagem de WhatsApp"
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutationResposta.mutate("roteiro_reuniao_diretoria")}
                className="border-slate-800 hover:border-purple-500 bg-slate-900 text-xs text-slate-200"
              >
                "Roteiro de Reunião com Diretoria"
              </Button>
            </div>

            {respostaRapida && (
              <Card className="bg-slate-900 border-purple-500/30">
                <CardHeader className="p-4 pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white">
                      {respostaRapida.titulo}
                    </CardTitle>
                    <div className="flex gap-1.5">
                      {respostaRapida.gatilhos_usados.map((g, i) => (
                        <Badge key={i} className="text-[10px] bg-purple-500/10 text-purple-300 border-none">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {respostaRapida.texto_resposta}
                  </p>

                  {respostaRapida.copia_whatsapp && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400">Texto Formatado para WhatsApp:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copiarTexto(respostaRapida.copia_whatsapp!)}
                          className="h-7 text-xs text-slate-300 hover:text-white"
                        >
                          {textoCopiado ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          {textoCopiado ? "Copiado!" : "Copiar"}
                        </Button>
                      </div>
                      <pre className="text-slate-200 font-sans whitespace-pre-wrap text-xs">
                        {respostaRapida.copia_whatsapp}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3: NEGOCIAÇÃO INTELIGENTE & ALÇADAS */}
          {/* ========================================================================= */}
          <TabsContent value="negociacao" className="m-0 space-y-5">
            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-teal-400" />
                    Simulador de Alçada & Margem Financeira Protegida
                  </span>
                  <span className="text-xs text-slate-400">
                    Valor de Tabela: <strong>R$ {formatBRL(valorProposta)}</strong>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-6 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">Desconto Solicitado pelo Cliente:</span>
                    <strong className="text-base text-amber-400 font-bold">{descontoDesejado}%</strong>
                  </div>
                  <Slider
                    value={[descontoDesejado]}
                    min={0}
                    max={40}
                    step={1}
                    onValueChange={(vals) => {
                      setDescontoDesejado(vals[0]);
                      mutationNegociar.mutate(vals[0]);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                    <span>0% (Sem desconto)</span>
                    <span>12% (Alçada Executivo)</span>
                    <span>22% (Alçada Gerente)</span>
                    <span>30%+ (Alçada Diretoria)</span>
                  </div>
                </div>

                {/* Resumo da Alçada */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Valor Final Proposto</span>
                    <strong className="text-lg font-bold text-emerald-400">
                      R$ {formatBRL(Math.round(valorProposta * (1 - descontoDesejado / 100)))}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Alçada Exigida</span>
                    <Badge className={`mt-1 text-xs uppercase ${
                      descontoDesejado <= 12 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                      descontoDesejado <= 22 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                      "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}>
                      {descontoDesejado <= 12 ? "Executivo Comercial" : descontoDesejado <= 22 ? "Gerência Comercial" : "Aprovação Diretoria"}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Margem de Contribuição</span>
                    <strong className="text-lg font-bold text-blue-400">
                      {Math.max(15, Math.round(45 - descontoDesejado * 0.8))}%
                    </strong>
                  </div>
                </div>

                {/* Contraproposta Inteligente */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-teal-500/30 space-y-2">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">
                    Contraproposta Sugerida pelo Diretor de IA (Proteção de Margem):
                  </span>
                  <p className="text-slate-300">
                    <strong>Benefício em Inventário:</strong> Bonificação de veiculação em horários nobres de final de semana em painéis digitais de LED, em vez de conceder desconto em dinheiro.
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    <strong>Argumento:</strong> "Entregamos +15% de impactos reais sem corroer a margem líquida da empresa."
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4: PROPOSTA INTERATIVA ONLINE */}
          {/* ========================================================================= */}
          <TabsContent value="proposta_online" className="m-0 space-y-5">
            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    Link Compartilhável da Proposta Interativa (Aprovação do Cliente)
                  </span>
                  <Button
                    size="sm"
                    onClick={() => mutationGerarLink.mutate()}
                    disabled={mutationGerarLink.isPending}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                  >
                    Gerar Novo Link
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  O cliente acessa um link exclusivo, visualiza o planejamento, fotos, mapa e pode aprovar diretamente pelo navegador.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {propostaOnline ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Link Ativo da Proposta:</span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-none text-[10px]">
                        Expira em: {propostaOnline.data_expiracao}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={propostaOnline.url_compartilhavel}
                        className="bg-slate-900 border-slate-800 text-xs text-blue-400 font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={() => copiarTexto(propostaOnline.url_compartilhavel)}
                        className="bg-slate-800 hover:bg-slate-700 text-xs"
                      >
                        Copiar
                      </Button>
                      <a href={propostaOnline.url_compartilhavel} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" className="text-slate-300">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Clique em "Gerar Novo Link" para criar uma URL interativa para este cliente.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 5: IA CHECKING (AUDITORIA VISUAL) */}
          {/* ========================================================================= */}
          <TabsContent value="ia_checking" className="m-0 space-y-5">
            <Card className="bg-slate-900/70 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                <CardTitle className="text-sm font-semibold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Auditoria Pericial de Instalação com IA Checking
                  </span>
                  <Button
                    size="sm"
                    onClick={() => mutationChecking.mutate()}
                    disabled={mutationChecking.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    Executar Auditoria IA
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Verificação automática de enquadramento, data/hora, iluminação noturna e conformidade técnica do checking fotográfico.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {checkingResult ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <strong className="text-white text-sm">Status: 100% Conforme e Validado</strong>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Confiança da IA: {checkingResult.confianca_ia_pct}%
                      </Badge>
                    </div>
                    <p className="text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                      {checkingResult.analise_imagem}
                    </p>
                    <div className="flex gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Geolocalização: <strong className="text-emerald-400">Validada</strong></span>
                      <span>•</span>
                      <span>Qualidade da Instalação: <strong className="text-emerald-400">{checkingResult.qualidade_instalacao_nota}/10</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Nenhuma foto em auditoria no momento. Clique em "Executar Auditoria IA" para auditar a veiculação mais recente.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 6: DASHBOARD 4.0 & MEMÓRIA DE APRENDIZADO */}
          {/* ========================================================================= */}
          <TabsContent value="dashboard" className="m-0 space-y-5">
            {dashboard && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-900/70 border-slate-800">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs text-slate-400">Previsão Comercial Ponderada</CardDescription>
                      <CardTitle className="text-2xl font-bold text-emerald-400">
                        R$ {formatBRL(dashboard.previsao_receita_ponderada)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                      Pipeline total: R$ {formatBRL(dashboard.total_em_negociacao)}
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/70 border-slate-800">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs text-slate-400">Taxa de Conversão do Funil</CardDescription>
                      <CardTitle className="text-2xl font-bold text-white">
                        {dashboard.taxa_conversao_pct}%
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                      Propostas convertidas em Pedidos de Inserção (PI)
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/70 border-slate-800">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs text-slate-400">Segmento Mais Rentável</CardDescription>
                      <CardTitle className="text-2xl font-bold text-purple-400">
                        Automotivo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-slate-400">
                      R$ 185.000 em volume no trimestre
                    </CardContent>
                  </Card>
                </div>

                {/* Memória e Aprendizado Contínuo da IA */}
                <Card className="bg-slate-900/70 border-slate-800">
                  <CardHeader className="p-4 pb-3 border-b border-slate-800">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Memória e Aprendizado Contínuo: O que a IA aprendeu com campanhas ganhas e perdidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs">
                    {dashboard.insights_memoria_ia.map((insight, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200">{insight}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
