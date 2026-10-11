import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Target,
  MapPin,
  Package,
  FileCheck2,
  Send,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  Sparkles,
  Calendar,
  DollarSign,
  Layers,
  FileText,
  Download,
  Share2,
  Copy,
  ExternalLink,
  Building,
  Check,
  AlertCircle,
  Eye,
  FileSignature,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { listClientes } from "@/lib/clientes.functions";
import { listProdutos, type Produto } from "@/lib/produtos.functions";
import { saveProposta, converterPropostaEmPi } from "@/lib/propostas.functions";
import { gerarApresentacaoEstrategicaPdf } from "@/lib/proposta-estrategica";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Definição dos 7 passos guiados
const PASSOS_VENDA = [
  { id: 1, label: "Cliente", icon: Users, desc: "Selecionar anunciante" },
  { id: 2, label: "Objetivo", icon: Target, desc: "Definir metas e budget" },
  { id: 3, label: "Regiões", icon: MapPin, desc: "Praças prioritárias" },
  { id: 4, label: "Mídias", icon: Package, desc: "Escolher pontos" },
  { id: 5, label: "Apresentação", icon: FileCheck2, desc: "Gerar deck visual" },
  { id: 6, label: "Proposta", icon: Send, desc: "Enviar ao cliente" },
  { id: 7, label: "Converter em PI", icon: CheckCircle, desc: "Formalizar venda" },
];

const OBJETIVOS_COMERCIAIS = [
  { id: "branding", label: "Branding & Recall de Marca", desc: "Maximizar cobertura e fixação visual contínua" },
  { id: "lancamento", label: "Lançamento de Produto / Serviço", desc: "Impacto concentrado de alta frequência em praças-chave" },
  { id: "varejo", label: "Varejo & Promoção Imediata", desc: "Direcionamento de fluxo para lojas e pontos de venda" },
  { id: "abertura", label: "Inauguração de Filial / Loja", desc: "Concentração geográfica em raio de influência da unidade" },
  { id: "institucional", label: "Institucional / Eventos", desc: "Posicionamento estratégico e prestígio corporativo" },
];

export function AssistenteCriarCampanha() {
  const queryClient = useQueryClient();

  // Estado do Stepper
  const [passoAtual, setPassoAtual] = useState<number>(1);

  // Passo 1: Cliente
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);

  // Passo 2: Objetivo
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [objetivoSelecionado, setObjetivoSelecionado] = useState("branding");
  const [publicoAlvo, setPublicoAlvo] = useState("Público geral, classes A/B/C em circulação diária");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [dataFim, setDataFim] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [budgetPrevisto, setBudgetPrevisto] = useState<number>(25000);

  // Passo 3: Regiões
  const [regioesSelecionadas, setRegioesSelecionadas] = useState<string[]>([]);

  // Passo 4: Mídias
  const [buscaMidia, setBuscaMidia] = useState("");
  const [pontosSelecionados, setPontosSelecionados] = useState<Produto[]>([]);

  // Passo 5: Apresentação
  const [templateApresentacao, setTemplateApresentacao] = useState<"corporativo" | "ooh" | "dooh" | "digital">("ooh");
  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Passo 6: Proposta
  const [propostaCriada, setPropostaCriada] = useState<any | null>(null);
  const [linkProposta, setLinkProposta] = useState<string>("");

  // Passo 7: PI
  const [piCriado, setPiCriado] = useState<any | null>(null);

  // Queries
  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ["clientes-assistente"],
    queryFn: () => listClientes(),
  });

  const { data: produtos = [], isLoading: loadingProdutos } = useQuery({
    queryKey: ["produtos-assistente"],
    queryFn: () => listProdutos(),
  });

  // Mutações
  const savePropostaFn = useServerFn(saveProposta);
  const converterPiFn = useServerFn(converterPropostaEmPi);

  const mutationCriarProposta = useMutation({
    mutationFn: async () => {
      if (!clienteSelecionado) throw new Error("Selecione um cliente.");
      if (pontosSelecionados.length === 0) throw new Error("Selecione ao menos um ponto de mídia.");

      const valorTotal = pontosSelecionados.reduce((acc, p) => acc + (p.valor_negociado || p.valor_unit || 0), 0);

      const itensPayload = pontosSelecionados.map((p) => ({
        tipo: p.midia || p.tipo || "Mídia OOH",
        programa: p.programa || null,
        horario: p.faixa || null,
        formato: p.formato || p.dimensao || "Padrão",
        insercoes_dia: p.insercoes_padrao || 1,
        dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
        dias_mes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        desconto: 0,
        valor_unit: p.valor_unit || 0,
        valor_tabela: p.valor_unit || 0,
        valor_negociado: p.valor_negociado || p.valor_unit || 0,
        total_insercoes: (p.insercoes_padrao || 1) * 30,
        endereco_ponto: p.endereco_ponto || null,
        ponto_referencia: p.ponto_referencia || null,
        sentido_via: p.sentido_via || null,
        produto_id: p.id,
        parceiro_id: p.parceiro_id || null,
        parceiro_nome: p.parceiro_nome || null,
      }));

      const res = await savePropostaFn({
        data: {
          cliente_id: clienteSelecionado.id,
          campanha: nomeCampanha || `Campanha ${clienteSelecionado.nome_fantasia || clienteSelecionado.razao_social}`,
          status: "enviada",
          valor_tabela: valorTotal,
          valor_desconto: 0,
          valor_negociado: valorTotal,
          total_insercoes: itensPayload.reduce((a, b) => a + b.total_insercoes, 0),
          comissao_pct: 0,
          itens: itensPayload,
        },
      });

      return res;
    },
    onSuccess: (res: any) => {
      setPropostaCriada(res);
      const urlBase = typeof window !== "undefined" ? window.location.origin : "";
      setLinkProposta(`${urlBase}/propostas?id=${res.id}`);
      toast.success("Proposta comercial criada e registrada no funil de vendas!");
      setPassoAtual(6);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar proposta.");
    },
  });

  const mutationConverterPi = useMutation({
    mutationFn: async () => {
      if (!propostaCriada?.id) throw new Error("Proposta não identificada.");
      const now = new Date();
      const res = await converterPiFn({
        data: {
          proposta_id: propostaCriada.id,
          mes_veiculacao: now.getMonth() + 1,
          ano_veiculacao: now.getFullYear(),
        },
      });
      return res;
    },
    onSuccess: (res: any) => {
      setPiCriado(res);
      toast.success("Campanha convertida em Pedido de Inserção (PI) com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pedidos-insercao"] });
      setPassoAtual(7);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao converter proposta em PI.");
    },
  });

  // Clientes filtrados
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes.slice(0, 8);
    const termo = buscaCliente.toLowerCase();
    return clientes.filter(
      (c: any) =>
        c.razao_social?.toLowerCase().includes(termo) ||
        c.nome_fantasia?.toLowerCase().includes(termo) ||
        c.cnpj?.includes(termo)
    );
  }, [clientes, buscaCliente]);

  // Lista de todas as regiões únicas disponíveis nos produtos
  const regioesDisponiveis = useMemo(() => {
    const setR = new Set<string>();
    produtos.forEach((p: any) => {
      if (p.praca) setR.add(p.praca);
      if (p.cidade) setR.add(p.cidade);
      if (p.endereco_ponto) {
        const partes = p.endereco_ponto.split("-");
        if (partes.length > 1) setR.add(partes[0].trim());
      }
    });
    return Array.from(setR).filter(Boolean).slice(0, 16);
  }, [produtos]);

  // Produtos filtrados por região e busca
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p: any) => {
      const matchBusca =
        !buscaMidia.trim() ||
        p.nome?.toLowerCase().includes(buscaMidia.toLowerCase()) ||
        p.midia?.toLowerCase().includes(buscaMidia.toLowerCase());

      const matchRegiao =
        regioesSelecionadas.length === 0 ||
        regioesSelecionadas.some(
          (r) =>
            p.praca?.toLowerCase().includes(r.toLowerCase()) ||
            p.cidade?.toLowerCase().includes(r.toLowerCase()) ||
            p.endereco_ponto?.toLowerCase().includes(r.toLowerCase())
        );

      return matchBusca && matchRegiao;
    });
  }, [produtos, buscaMidia, regioesSelecionadas]);

  // Cálculos financeiros da cesta
  const totalInvestimentoSelecionado = useMemo(() => {
    return pontosSelecionados.reduce((acc, p) => acc + (p.valor_negociado || p.valor_unit || 0), 0);
  }, [pontosSelecionados]);

  const saldoBudget = budgetPrevisto - totalInvestimentoSelecionado;

  function toggleRegiao(regiao: string) {
    setRegioesSelecionadas((prev) =>
      prev.includes(regiao) ? prev.filter((r) => r !== regiao) : [...prev, regiao]
    );
  }

  function togglePonto(ponto: Produto) {
    setPontosSelecionados((prev) =>
      prev.some((p) => p.id === ponto.id) ? prev.filter((p) => p.id !== ponto.id) : [...prev, ponto]
    );
  }

  async function handleBaixarApresentacao() {
    setGerandoPdf(true);
    try {
      const propostaMock: any = {
        numero: "PROP-" + Math.floor(1000 + Math.random() * 9000),
        cliente: clienteSelecionado,
        valor_negociado: totalInvestimentoSelecionado,
        valor_tabela: totalInvestimentoSelecionado,
        valor_desconto: 0,
        campanha: nomeCampanha,
        organizacao: { nome: "Mídia.OS Publicidade" },
        itens: pontosSelecionados.map((p) => ({
          tipo: p.midia || p.tipo,
          formato: p.formato || p.dimensao,
          endereco_ponto: p.endereco_ponto,
          ponto_referencia: p.ponto_referencia,
          sentido_via: p.sentido_via,
          cidade: p.praca || "Brasília - DF",
          valor_negociado: p.valor_negociado || p.valor_unit,
          imagem_comercial: p.imagem_comercial || p.foto_principal,
        })),
      };

      await gerarApresentacaoEstrategicaPdf(propostaMock, {
        customizados: {
          template: templateApresentacao,
          objetivo: `Campanha focada em ${OBJETIVOS_COMERCIAIS.find((o) => o.id === objetivoSelecionado)?.label}`,
          resumoExecutivo: `Plano estratégico estruturado para ${clienteSelecionado?.nome_fantasia || clienteSelecionado?.razao_social} com ${pontosSelecionados.length} pontos de alto impacto.`,
        },
      });
      toast.success("Apresentação executiva gerada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar apresentação: " + err.message);
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Header do Assistente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Assistente de Vendas — Criar Campanha
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fluxo guiado simplificado para o executivo de vendas: do cliente ao Pedido de Inserção em 7 passos.
          </p>
        </div>

        {/* Badge do Passo Atual */}
        <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Passo</span>
          <span className="text-sm font-bold text-primary">{passoAtual} de 7</span>
        </div>
      </div>

      {/* 2. Stepper Visual Horizontal */}
      <div className="bg-card border rounded-xl p-3 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] gap-2">
          {PASSOS_VENDA.map((p) => {
            const Icon = p.icon;
            const isAtivo = passoAtual === p.id;
            const isConcluido = passoAtual > p.id;

            return (
              <div
                key={p.id}
                onClick={() => isConcluido && setPassoAtual(p.id)}
                className={`flex items-center gap-2 cursor-pointer transition-all ${
                  isAtivo
                    ? "text-primary font-bold"
                    : isConcluido
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground/60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isAtivo
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isConcluido
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isConcluido ? <Check className="w-4 h-4" /> : p.id}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs leading-none">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Conteúdo Dinâmico por Passo */}
      <Card className="border-border/80 shadow-sm min-h-[420px] flex flex-col justify-between">
        <CardContent className="p-6">
          {/* ============================================================== */}
          {/* PASSO 1: SELECIONAR CLIENTE */}
          {/* ============================================================== */}
          {passoAtual === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Passo 1: Selecionar o Cliente</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha o anunciante que receberá a campanha comercial.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por razão social, nome fantasia ou CNPJ..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>

              {loadingClientes ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Carregando carteira de clientes...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {clientesFiltrados.map((c: any) => {
                    const isSelected = clienteSelecionado?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClienteSelecionado(c);
                          if (!nomeCampanha) {
                            setNomeCampanha(`Campanha ${c.nome_fantasia || c.razao_social}`);
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "hover:bg-muted/40 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">
                            {c.cidade || "DF"}
                          </Badge>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <h4 className="font-bold text-sm text-foreground mt-2 truncate">
                          {c.nome_fantasia || c.razao_social}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">{c.razao_social}</p>
                        {c.cnpj && <p className="text-[11px] text-muted-foreground mt-1">CNPJ: {c.cnpj}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 2: DEFINIR OBJETIVO */}
          {/* ============================================================== */}
          {passoAtual === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Passo 2: Definir Objetivo e Metas</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure a tese da campanha e a expectativa orçamentária do anunciante.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Nome Comercial da Campanha *</Label>
                  <Input
                    placeholder="Ex: Lançamento Imobiliário - Verão 2027"
                    value={nomeCampanha}
                    onChange={(e) => setNomeCampanha(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Investimento Previsto (Budget R$) *</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      value={budgetPrevisto}
                      onChange={(e) => setBudgetPrevisto(Number(e.target.value))}
                      className="pl-8"
                    />
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold block mb-1.5">Objetivo Estratégico da Mídia</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {OBJETIVOS_COMERCIAIS.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => setObjetivoSelecionado(obj.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        objetivoSelecionado === obj.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                          : "hover:bg-muted/30 border-border"
                      }`}
                    >
                      <h4 className="text-xs font-bold text-foreground">{obj.label}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{obj.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <Label className="text-xs font-semibold">Público-Alvo Prioritário</Label>
                  <Input
                    value={publicoAlvo}
                    onChange={(e) => setPublicoAlvo(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Início Previsto</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Término Previsto</Label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 3: ESCOLHER REGIÕES */}
          {/* ============================================================== */}
          {passoAtual === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Passo 3: Escolher Regiões e Praças</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecione as praças onde o anunciante deseja marcar presença.
                </p>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {regioesSelecionadas.length === 0
                    ? "Nenhuma região restrita (todas as praças serão exibidas)"
                    : `${regioesSelecionadas.length} região(ões) selecionada(s)`}
                </span>
                {regioesSelecionadas.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setRegioesSelecionadas([])}
                  >
                    Limpar Seleção
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {regioesDisponiveis.map((reg) => {
                  const isSel = regioesSelecionadas.includes(reg);
                  return (
                    <div
                      key={reg}
                      onClick={() => toggleRegiao(reg)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                        isSel
                          ? "border-primary bg-primary/10 ring-1 ring-primary/20 text-primary font-bold"
                          : "hover:bg-muted/30 border-border text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs truncate">{reg}</span>
                      </div>
                      {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 4: SELECIONAR MÍDIAS */}
          {/* ============================================================== */}
          {passoAtual === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Passo 4: Selecionar os Pontos de Mídia</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Escolha os pontos para compor o circuito da campanha.
                  </p>
                </div>

                {/* Termômetro de Budget */}
                <div className="bg-muted/60 p-2.5 rounded-lg border flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Selecionado</span>
                    <span className="font-bold text-foreground">
                      R$ {totalInvestimentoSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Saldo Budget</span>
                    <span
                      className={`font-bold ${
                        saldoBudget >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                      }`}
                    >
                      R$ {saldoBudget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pontos por nome, avenida ou formato..."
                  value={buscaMidia}
                  onChange={(e) => setBuscaMidia(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {loadingProdutos ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Carregando catálogo de pontos...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {produtosFiltrados.map((prod: any) => {
                    const isMarcado = pontosSelecionados.some((p) => p.id === prod.id);

                    return (
                      <div
                        key={prod.id}
                        onClick={() => togglePonto(prod)}
                        className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                          isMarcado
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "hover:bg-muted/30 border-border"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <Badge variant="outline" className="text-[10px]">
                              {prod.midia || prod.tipo}
                            </Badge>
                            {isMarcado && (
                              <Badge className="bg-primary text-white text-[10px]">Selecionado</Badge>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-foreground line-clamp-1">{prod.nome}</h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {prod.endereco_ponto || prod.ponto_referencia || "Endereço cadastrado"}
                          </p>
                        </div>

                        <div className="pt-2 border-t mt-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            R${" "}
                            {(prod.valor_negociado || prod.valor_unit || 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <Button size="sm" variant={isMarcado ? "default" : "outline"} className="h-6 text-[10px] px-2">
                            {isMarcado ? "Remover" : "+ Adicionar"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 5: GERAR APRESENTAÇÃO */}
          {/* ============================================================== */}
          {passoAtual === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Passo 5: Gerar Apresentação Executiva</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Crie o deck visual de apresentação sob medida com fotos comerciais dos pontos selecionados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { id: "ooh", label: "Template OOH", desc: "Outdoors, Frontlights e Vias Expressas" },
                  { id: "dooh", label: "Template DOOH", desc: "Painéis de LED e Mídia Digital Urbana" },
                  { id: "corporativo", label: "Template Corporativo", desc: "Deck sóbrio executivo multi-formato" },
                  { id: "digital", label: "Template Digital", desc: "Mídias conectadas e telas indoor" },
                ].map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setTemplateApresentacao(tpl.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      templateApresentacao === tpl.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-bold"
                        : "hover:bg-muted/30 border-border"
                    }`}
                  >
                    <h4 className="text-xs font-bold">{tpl.label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{tpl.desc}</p>
                  </div>
                ))}
              </div>

              {/* Resumo da Apresentação */}
              <div className="bg-muted/40 p-4 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      Deck Estratégico: {nomeCampanha}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {pontosSelecionados.length} ativos selecionados • Investimento: R${" "}
                      {totalInvestimentoSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <Button
                    onClick={handleBaixarApresentacao}
                    disabled={gerandoPdf}
                    className="gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    {gerandoPdf ? "Gerando PDF..." : "Baixar Apresentação (PDF)"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 6: ENVIAR PROPOSTA */}
          {/* ============================================================== */}
          {passoAtual === 6 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-foreground">Passo 6: Formalizar e Enviar a Proposta</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A proposta foi registrada no CRM comercial. Envie o link interativo ao cliente.
                </p>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <CheckCircle className="w-4 h-4" /> Proposta Registrada no Sistema
                </div>
                <p className="text-xs text-muted-foreground">
                  Número: <strong>{propostaCriada?.numero || "PROP-NOVA"}</strong> • Valor: R${" "}
                  {totalInvestimentoSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <Input value={linkProposta} readOnly className="text-xs h-9 bg-background" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-9 shrink-0 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(linkProposta);
                      toast.success("Link copiado para a área de transferência!");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Link
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="gap-2 justify-center h-10"
                  onClick={() => {
                    const texto = encodeURIComponent(
                      `Olá! Segue a proposta da campanha "${nomeCampanha}": ${linkProposta}`
                    );
                    window.open(`https://wa.me/?text=${texto}`, "_blank");
                  }}
                >
                  <Share2 className="w-4 h-4 text-emerald-600" /> Enviar via WhatsApp
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 justify-center h-10"
                  onClick={() => {
                    window.open(linkProposta, "_blank");
                  }}
                >
                  <Eye className="w-4 h-4 text-blue-600" /> Visualizar Proposta
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PASSO 7: CONVERTER EM PI */}
          {/* ============================================================== */}
          {passoAtual === 7 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <PartyPopper className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-foreground">Venda Concluída com Sucesso!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  A campanha foi formalizada e convertida em Pedido de Inserção (PI). A esteira operacional e de veiculação foi acionada.
                </p>
              </div>

              {piCriado && (
                <div className="bg-muted/50 p-4 rounded-xl border max-w-md mx-auto text-left space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Número do PI: <strong className="text-foreground">{piCriado?.numero || "PI Emitido"}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cliente: <strong className="text-foreground">{clienteSelecionado?.nome_fantasia || clienteSelecionado?.razao_social}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor Total: <strong className="text-foreground">R$ {totalInvestimentoSelecionado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    // Reiniciar fluxo
                    setPassoAtual(1);
                    setClienteSelecionado(null);
                    setPontosSelecionados([]);
                    setNomeCampanha("");
                  }}
                  className="gap-2"
                >
                  Iniciar Nova Venda
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.href = "/pi";
                  }}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" /> Acompanhar no Módulo de PI
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* 4. Rodapé de Navegação do Stepper */}
        {passoAtual < 7 && (
          <div className="p-4 bg-muted/20 border-t flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={passoAtual === 1}
              onClick={() => setPassoAtual((prev) => Math.max(1, prev - 1))}
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </Button>

            <div className="flex items-center gap-2">
              {passoAtual === 1 && (
                <Button
                  size="sm"
                  disabled={!clienteSelecionado}
                  onClick={() => setPassoAtual(2)}
                  className="gap-1.5 text-xs"
                >
                  Definir Objetivo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {passoAtual === 2 && (
                <Button
                  size="sm"
                  disabled={!nomeCampanha.trim()}
                  onClick={() => setPassoAtual(3)}
                  className="gap-1.5 text-xs"
                >
                  Escolher Regiões <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {passoAtual === 3 && (
                <Button
                  size="sm"
                  onClick={() => setPassoAtual(4)}
                  className="gap-1.5 text-xs"
                >
                  Selecionar Mídias <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {passoAtual === 4 && (
                <Button
                  size="sm"
                  disabled={pontosSelecionados.length === 0}
                  onClick={() => setPassoAtual(5)}
                  className="gap-1.5 text-xs"
                >
                  Gerar Apresentação ({pontosSelecionados.length} pontos) <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {passoAtual === 5 && (
                <Button
                  size="sm"
                  disabled={mutationCriarProposta.isPending}
                  onClick={() => mutationCriarProposta.mutate()}
                  className="gap-1.5 text-xs"
                >
                  {mutationCriarProposta.isPending ? "Criando Proposta..." : "Salvar & Enviar Proposta"} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}

              {passoAtual === 6 && (
                <Button
                  size="sm"
                  disabled={mutationConverterPi.isPending}
                  onClick={() => mutationConverterPi.mutate()}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {mutationConverterPi.isPending ? "Convertendo..." : "Converter em PI (Fechar Venda)"} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
