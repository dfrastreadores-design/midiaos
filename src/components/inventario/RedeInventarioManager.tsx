import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Network,
  Plus,
  Search,
  Building,
  Handshake,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Layers,
  Edit2,
  Trash2,
  ShieldAlert,
  Link as LinkIcon,
  X,
  FileText,
  Phone,
  Building2,
  AlertCircle,
  ExternalLink,
  Lock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { fetchCpfCnpj, formatCpfCnpj } from "@/lib/cnpj";
import {
  listarOrigensInventario,
  obterOrigemInventario,
  salvarOrigemInventario,
  vincularProdutosOrigem,
  desvincularProdutoOrigem,
  listarProdutosParaVinculo,
  excluirOrigemInventario,
  sincronizarParceirosComRedeInventario,
  type OrigemInventario,
  type OrigemInventarioTipo,
  type OrigemInventarioStatus,
  type ProdutoVinculadoRede,
} from "@/lib/rede-inventario.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function RedeInventarioManager() {
  const queryClient = useQueryClient();

  // Estados de Filtro
  const [tabTipo, setTabTipo] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  // Estados de Modais
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [editandoOrigem, setEditandoOrigem] = useState<OrigemInventario | null>(null);

  const [modalProdutosOpen, setModalProdutosOpen] = useState(false);
  const [origemSelecionadaParaProdutos, setOrigemSelecionadaParaProdutos] = useState<OrigemInventario | null>(null);
  const [modalAdicionarProdutosOpen, setModalAdicionarProdutosOpen] = useState(false);
  const [buscaProdutosDisponiveis, setBuscaProdutosDisponiveis] = useState("");
  const [produtosSelecionadosParaVincular, setProdutosSelecionadosParaVincular] = useState<string[]>([]);

  // Form State
  const [formTipo, setFormTipo] = useState<OrigemInventarioTipo>("REPRESENTADO");
  const [formNomeInterno, setFormNomeInterno] = useState("");
  const [formNomeComercial, setFormNomeComercial] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formCnpj, setFormCnpj] = useState("");
  const [formContato, setFormContato] = useState("");
  const [formContrato, setFormContrato] = useState("");
  const [formComissao, setFormComissao] = useState("20");
  const [formStatus, setFormStatus] = useState<OrigemInventarioStatus>("ativo");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  const handleBuscarCnpj = async () => {
    const digits = (formCnpj || "").replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      toast.error("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) para consulta.");
      return;
    }
    setSearchingCnpj(true);
    try {
      const data = await fetchCpfCnpj(digits);
      if (data.tipo === "PJ") {
        setFormCnpj(data.cnpj);
        if (!formNomeInterno.trim()) setFormNomeInterno(data.razaoSocial);
        if (!formNomeComercial.trim()) setFormNomeComercial(data.nomeFantasia || data.razaoSocial);
        if (!formEmpresa.trim()) setFormEmpresa(data.razaoSocial);
        const contato = [data.telefone, data.email].filter(Boolean).join(" • ");
        if (contato && !formContato.trim()) setFormContato(contato);
        toast.success("Dados preenchidos pela Receita Federal!");
      } else {
        setFormCnpj(data.cpf || digits);
        toast.success("CPF validado na Receita Federal!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar Receita Federal.");
    } finally {
      setSearchingCnpj(false);
    }
  };

  // Query: Lista de Origens
  const { data: origens = [], isLoading, refetch } = useQuery({
    queryKey: ["rede-inventario", tabTipo, statusFiltro, busca],
    queryFn: () =>
      listarOrigensInventario({
        data: {
          tipo_origem: tabTipo,
          status: statusFiltro,
          busca,
        },
      }),
  });

  // Query: Produtos Vinculados da Origem Selecionada
  const { data: detalheOrigem, isLoading: loadingDetalhe } = useQuery({
    queryKey: ["rede-inventario-detalhe", origemSelecionadaParaProdutos?.id],
    queryFn: () =>
      origemSelecionadaParaProdutos?.id
        ? obterOrigemInventario({ data: { id: origemSelecionadaParaProdutos.id } })
        : null,
    enabled: !!origemSelecionadaParaProdutos?.id,
  });

  // Query: Produtos Disponíveis no Catálogo
  const { data: produtosDisponiveis = [], isLoading: loadingDisponiveis } = useQuery({
    queryKey: ["produtos-para-vinculo", origemSelecionadaParaProdutos?.id, buscaProdutosDisponiveis],
    queryFn: () =>
      listarProdutosParaVinculo({
        data: {
          origem_id: origemSelecionadaParaProdutos?.id,
          busca: buscaProdutosDisponiveis,
        },
      }),
    enabled: modalAdicionarProdutosOpen,
  });

  // Mutações
  const mutationSalvar = useMutation({
    mutationFn: salvarOrigemInventario,
    onSuccess: () => {
      toast.success(editandoOrigem ? "Origem atualizada com sucesso!" : "Nova origem cadastrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["rede-inventario"] });
      setModalFormOpen(false);
      limparFormulario();
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao salvar origem.");
    },
  });

  const mutationVincular = useMutation({
    mutationFn: vincularProdutosOrigem,
    onSuccess: (res) => {
      toast.success(`${res.count} produto(s) vinculado(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["rede-inventario"] });
      queryClient.invalidateQueries({ queryKey: ["rede-inventario-detalhe"] });
      setModalAdicionarProdutosOpen(false);
      setProdutosSelecionadosParaVincular([]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao vincular produtos.");
    },
  });

  const mutationDesvincular = useMutation({
    mutationFn: desvincularProdutoOrigem,
    onSuccess: () => {
      toast.success("Produto desvinculado com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["rede-inventario"] });
      queryClient.invalidateQueries({ queryKey: ["rede-inventario-detalhe"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desvincular produto.");
    },
  });

  const mutationExcluir = useMutation({
    mutationFn: excluirOrigemInventario,
    onSuccess: () => {
      toast.success("Origem de inventário removida com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["rede-inventario"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir origem.");
    },
  });

  const mutationSincronizar = useMutation({
    mutationFn: sincronizarParceirosComRedeInventario,
    onSuccess: (res) => {
      toast.success(
        `Sincronização concluída! ${res.parceirosSincronizados} parceiro(s) atualizado(s) e ${res.produtosVinculados} produto(s) conectado(s).`
      );
      queryClient.invalidateQueries({ queryKey: ["rede-inventario"] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao sincronizar parceiros.");
    },
  });

  // Métricas Consolidadas
  const totalOrigens = origens.length;
  const totalProprio = origens.filter((o) => o.tipo_origem === "PROPRIO").length;
  const totalRepresentado = origens.filter((o) => o.tipo_origem === "REPRESENTADO").length;
  const totalProdutosGeral = origens.reduce((acc, curr) => acc + (curr.total_produtos || 0), 0);
  const mediaComissao =
    totalOrigens > 0
      ? (origens.reduce((acc, curr) => acc + curr.comissao, 0) / totalOrigens).toFixed(1)
      : "0.0";

  function limparFormulario() {
    setEditandoOrigem(null);
    setFormTipo("REPRESENTADO");
    setFormNomeInterno("");
    setFormNomeComercial("");
    setFormEmpresa("");
    setFormCnpj("");
    setFormContato("");
    setFormContrato("");
    setFormComissao("20");
    setFormStatus("ativo");
    setFormObservacoes("");
  }

  function abrirEdicao(origem: OrigemInventario) {
    setEditandoOrigem(origem);
    setFormTipo(origem.tipo_origem);
    setFormNomeInterno(origem.nome_interno);
    setFormNomeComercial(origem.nome_comercial);
    setFormEmpresa(origem.empresa || "");
    setFormCnpj(origem.cnpj || "");
    setFormContato(origem.contato || "");
    setFormContrato(origem.contrato || "");
    setFormComissao(String(origem.comissao || 20));
    setFormStatus(origem.status);
    setFormObservacoes(origem.observacoes || "");
    setModalFormOpen(true);
  }

  function handleSalvar() {
    if (!formNomeInterno.trim()) {
      toast.error("Preencha o nome interno da origem.");
      return;
    }
    if (!formNomeComercial.trim()) {
      toast.error("Preencha o nome comercial.");
      return;
    }

    const comissaoNum = parseFloat(formComissao.replace(",", ".")) || 0;

    mutationSalvar.mutate({
      data: {
        id: editandoOrigem?.id,
        tipo_origem: formTipo,
        nome_interno: formNomeInterno,
        nome_comercial: formNomeComercial,
        empresa: formEmpresa || null,
        cnpj: formCnpj || null,
        contato: formContato || null,
        contrato: formContrato || null,
        comissao: comissaoNum,
        status: formStatus,
        observacoes: formObservacoes || null,
      },
    });
  }

  function abrirGestaoProdutos(origem: OrigemInventario) {
    setOrigemSelecionadaParaProdutos(origem);
    setModalProdutosOpen(true);
  }

  function toggleSelecionarProduto(id: string) {
    setProdutosSelecionadosParaVincular((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function confirmarVinculoProdutos() {
    if (!origemSelecionadaParaProdutos) return;
    if (produtosSelecionadosParaVincular.length === 0) {
      toast.error("Selecione pelo menos um produto para vincular.");
      return;
    }

    mutationVincular.mutate({
      data: {
        origem_id: origemSelecionadaParaProdutos.id,
        produto_ids: produtosSelecionadosParaVincular,
        tipo_origem: origemSelecionadaParaProdutos.tipo_origem,
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Network className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Rede de Inventário
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão unificada de origens de mídia: <strong>Inventário Próprio</strong> e{" "}
            <strong>Inventário Representado</strong> (Veículos Parceiros, Exibidoras e Fornecedores).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => mutationSincronizar.mutate()}
            disabled={mutationSincronizar.isPending}
            className="gap-2 shadow-sm border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs sm:text-sm"
            title="Sincroniza todos os parceiros cadastrados na base para a Rede de Inventário"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${mutationSincronizar.isPending ? "animate-spin" : ""}`} />
            {mutationSincronizar.isPending ? "Sincronizando Parceiros..." : "Sincronizar Parceiros"}
          </Button>

          <Button
            onClick={() => {
              limparFormulario();
              setModalFormOpen(true);
            }}
            className="gap-2 shadow-sm text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Origem de Inventário
          </Button>
        </div>
      </div>

      {/* 2. KPIs de Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total de Origens
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalOrigens}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{totalProdutosGeral} produtos vinculados</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-primary">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Inventário Próprio
              </p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {totalProprio}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ativos diretos da sua empresa</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Veículos Representados (Parceiros)
              </p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                {totalRepresentado}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Veículos & parceiros de mídia homologados</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Handshake className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Comissão Média Pactuada
              </p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                {mediaComissao}%
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Remuneração média de repasse</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Percent className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filtros & Barra de Busca */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-4 rounded-xl border border-border/60">
        <Tabs value={tabTipo} onValueChange={setTabTipo} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="todos" className="gap-1.5 text-xs sm:text-sm">
              Todas <span className="opacity-70">({totalOrigens})</span>
            </TabsTrigger>
            <TabsTrigger value="PROPRIO" className="gap-1.5 text-xs sm:text-sm text-emerald-600 font-semibold">
              Próprio <span className="opacity-70">({totalProprio})</span>
            </TabsTrigger>
            <TabsTrigger value="REPRESENTADO" className="gap-1.5 text-xs sm:text-sm text-blue-600 font-semibold">
              Representado <span className="opacity-70">({totalRepresentado})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="h-9 px-3 text-xs sm:text-sm rounded-md border border-input bg-background w-full sm:w-auto"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="em_negociacao">Em negociação</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* 4. Listagem das Origens de Inventário */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando Rede de Inventário...</p>
        </div>
      ) : origens.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <Network className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground">Nenhuma origem de inventário encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            {busca || statusFiltro !== "todos" || tabTipo !== "todos"
              ? "Nenhum resultado corresponde aos filtros aplicados. Tente limpar os filtros."
              : "Cadastre as origens de mídia da sua empresa (inventário próprio) e os parceiros representados (exibidoras, rádios, TVs e fornecedores)."}
          </p>
          <Button
            onClick={() => {
              limparFormulario();
              setModalFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Primeira Origem
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {origens.map((origem) => {
            const isProprio = origem.tipo_origem === "PROPRIO";

            return (
              <Card
                key={origem.id}
                className="border-border/70 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Faixa superior com badges */}
                  <div className="p-4 border-b bg-muted/20 flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 font-semibold text-xs px-2.5 py-0.5 ${
                        isProprio
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {isProprio ? <Building className="w-3.5 h-3.5" /> : <Handshake className="w-3.5 h-3.5" />}
                      {isProprio ? "Inventário Próprio" : "Inventário Representado"}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {origem.status === "ativo" && (
                        <Badge className="bg-emerald-600/90 text-white text-[11px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </Badge>
                      )}
                      {origem.status === "em_negociacao" && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] gap-1 border-amber-500/30">
                          <Clock className="w-3 h-3" /> Negociação
                        </Badge>
                      )}
                      {origem.status === "inativo" && (
                        <Badge variant="outline" className="text-muted-foreground text-[11px] gap-1">
                          <XCircle className="w-3 h-3" /> Inativo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3.5">
                    {/* Títulos Comerciais e Internos */}
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-tight">
                        {origem.nome_comercial}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Lock className="w-3 h-3 text-amber-500" title="Identificador interno blindado" />
                        <span className="font-medium">Interno:</span> {origem.nome_interno}
                      </div>
                    </div>

                    {/* Detalhes Fiscais e Contratuais */}
                    <div className="text-xs space-y-1.5 text-muted-foreground pt-1 border-t border-border/50">
                      {origem.empresa && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{origem.empresa}</span>
                        </div>
                      )}
                      {origem.cnpj && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">CNPJ:</span> {origem.cnpj}
                        </div>
                      )}
                      {origem.contato && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{origem.contato}</span>
                        </div>
                      )}
                      {origem.contrato && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{origem.contrato}</span>
                        </div>
                      )}
                    </div>

                    {/* Bloco de Comissão e Produtos */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <div className="bg-muted/40 p-2.5 rounded-lg">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Comissão Repasse
                        </span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {origem.comissao}%
                        </span>
                      </div>
                      <div className="bg-muted/40 p-2.5 rounded-lg flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Produtos Ativos
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {origem.total_produtos || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Rodapé de Ações */}
                <div className="p-3 bg-muted/10 border-t flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 w-full justify-center"
                    onClick={() => abrirGestaoProdutos(origem)}
                  >
                    <Package className="w-3.5 h-3.5 text-primary" />
                    Produtos ({origem.total_produtos || 0})
                  </Button>

                  <div className="flex items-center gap-1">
                    <a
                      href={isProprio ? "/produtos" : `/produtos?parceiro_id=${origem.id}&parceiro=${encodeURIComponent(origem.nome_comercial)}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
                      title="Abrir produtos no catálogo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => abrirEdicao(origem)}
                      title="Editar Origem"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Deseja realmente remover a origem "${origem.nome_comercial}"? Os produtos vinculados serão mantidos.`)) {
                          mutationExcluir.mutate({ data: { id: origem.id } });
                        }
                      }}
                      title="Excluir Origem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Modal de Cadastro / Edição de Origem */}
      <Dialog open={modalFormOpen} onOpenChange={setModalFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              {editandoOrigem ? "Editar Origem de Inventário" : "Nova Origem de Inventário"}
            </DialogTitle>
            <DialogDescription>
              Configure o tipo de ativo, dados comerciais e condições de repasse para a rede.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Seletor de Tipo (Próprio vs Representado) */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">
                Tipo de Origem *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormTipo("PROPRIO")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    formTipo === "PROPRIO"
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    <Building className="w-4 h-4" /> Inventário Próprio
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Ativos de propriedade direta da empresa (painéis, outdoors ou veículos próprios).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormTipo("REPRESENTADO")}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    formTipo === "REPRESENTADO"
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-sm text-blue-700 dark:text-blue-400">
                    <Handshake className="w-4 h-4" /> Veículo Representado (Parceiro de Mídia)
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Veículos de comunicação parceiros, exibidoras e fornecedores homologados na rede.
                  </span>
                </button>
              </div>
            </div>

            {/* Nomes: Interno e Comercial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Nome Interno (Operacional / Blindado) *</Label>
                <Input
                  placeholder="Ex: Exibidora Alpha SP - Painéis Rodovia"
                  value={formNomeInterno}
                  onChange={(e) => setFormNomeInterno(e.target.value)}
                  className="mt-1"
                />
                <span className="text-[10px] text-muted-foreground">Visível apenas internamente.</span>
              </div>

              <div>
                <Label className="text-xs font-medium">Nome Comercial (Para Clientes) *</Label>
                <Input
                  placeholder="Ex: Circuito Rodovias Premium"
                  value={formNomeComercial}
                  onChange={(e) => setFormNomeComercial(e.target.value)}
                  className="mt-1"
                />
                <span className="text-[10px] text-muted-foreground">Nome exportado em propostas e PIs.</span>
              </div>
            </div>

            {/* Empresa e CNPJ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Razão Social / Empresa</Label>
                <Input
                  placeholder="Ex: Alpha Comunicação Visual Ltda"
                  value={formEmpresa}
                  onChange={(e) => setFormEmpresa(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">CNPJ / CPF</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={formCnpj}
                    onChange={(e) => setFormCnpj(formatCpfCnpj(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBuscarCnpj();
                      }
                    }}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                    disabled={searchingCnpj}
                    onClick={handleBuscarCnpj}
                    title="Puxar dados da Receita Federal e preencher automaticamente"
                  >
                    {searchingCnpj ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar Receita</span>
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Digite e clique em Buscar Receita para preencher nome e contato automaticamente.
                </span>
              </div>
            </div>

            {/* Contato e Contrato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Contato (Nome, WhatsApp, E-mail)</Label>
                <Input
                  placeholder="Ex: Carlos - (11) 98765-4321 - contato@alpha.com"
                  value={formContato}
                  onChange={(e) => setFormContato(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Contrato / Vigência</Label>
                <Input
                  placeholder="Ex: CTR-2026/04 - Vigência até Dez/2027"
                  value={formContrato}
                  onChange={(e) => setFormContrato(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Comissão e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Comissão Acordada (%)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="20.0"
                    value={formComissao}
                    onChange={(e) => setFormComissao(e.target.value)}
                    className="pr-8"
                  />
                  <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-muted-foreground">Percentual de remuneração de representação.</span>
              </div>

              <div>
                <Label className="text-xs font-medium">Status Operacional</Label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as OrigemInventarioStatus)}
                  className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="ativo">Ativo (Liberado para propostas)</option>
                  <option value="em_negociacao">Em Negociação</option>
                  <option value="inativo">Inativo (Bloqueado)</option>
                </select>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-xs font-medium">Observações Internas</Label>
              <Textarea
                placeholder="Detalhes adicionais de negociação, prazos de envio de material de checking ou alçadas..."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={mutationSalvar.isPending}>
              {mutationSalvar.isPending ? "Salvando..." : editandoOrigem ? "Atualizar Origem" : "Cadastrar Origem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Modal de Gestão de Produtos Vinculados */}
      <Dialog open={modalProdutosOpen} onOpenChange={setModalProdutosOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produtos Vinculados: {origemSelecionadaParaProdutos?.nome_comercial}
            </DialogTitle>
            <DialogDescription>
              {origemSelecionadaParaProdutos?.tipo_origem === "PROPRIO"
                ? "Pontos sob propriedade e gestão direta desta origem."
                : `Pontos comercializados através da representação de "${origemSelecionadaParaProdutos?.nome_interno}".`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-2 border-b pb-3">
              <div>
                <p className="text-sm font-semibold">
                  Total de Ativos: {detalheOrigem?.produtos?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estes produtos herdam a comissão pactuada de {origemSelecionadaParaProdutos?.comissao}%
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={origemSelecionadaParaProdutos?.tipo_origem === "PROPRIO" ? "/produtos" : `/produtos?parceiro_id=${origemSelecionadaParaProdutos?.id}&parceiro=${encodeURIComponent(origemSelecionadaParaProdutos?.nome_comercial || "")}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium border border-primary/20 px-2.5 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver no Catálogo
                </a>

                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setProdutosSelecionadosParaVincular([]);
                    setModalAdicionarProdutosOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Vincular Produtos do Catálogo
                </Button>
              </div>
            </div>

            {loadingDetalhe ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Carregando produtos vinculados...
              </div>
            ) : !detalheOrigem?.produtos || detalheOrigem.produtos.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <h4 className="font-semibold text-sm">Nenhum produto vinculado ainda</h4>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Associe produtos existentes do inventário a esta origem para cálculo automático de repasse.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalAdicionarProdutosOpen(true)}
                  className="gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Vincular Agora
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {detalheOrigem.produtos.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border bg-card flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.foto_principal ? (
                        <img
                          src={p.foto_principal}
                          alt={p.nome}
                          className="w-12 h-12 object-cover rounded-md border shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center shrink-0 text-muted-foreground">
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">{p.nome}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {p.midia || p.tipo}
                          </Badge>
                          {p.praca && <span>{p.praca}</span>}
                          <span className="font-medium text-foreground">
                            R$ {(p.valor_unit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1 shrink-0"
                      onClick={() => {
                        if (confirm(`Desvincular o produto "${p.nome}" desta origem?`)) {
                          mutationDesvincular.mutate({ data: { produto_id: p.id } });
                        }
                      }}
                    >
                      <X className="w-3.5 h-3.5" /> Desvincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalProdutosOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Modal Secundário: Adicionar Produtos do Catálogo */}
      <Dialog open={modalAdicionarProdutosOpen} onOpenChange={setModalAdicionarProdutosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Selecionar Produtos do Catálogo Existente
            </DialogTitle>
            <DialogDescription>
              Marque os produtos que pertencem a esta origem de inventário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar produtos por nome, tipo ou praça..."
                value={buscaProdutosDisponiveis}
                onChange={(e) => setBuscaProdutosDisponiveis(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {loadingDisponiveis ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Carregando catálogo...
              </div>
            ) : produtosDisponiveis.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
                {produtosDisponiveis.map((prod: any) => {
                  const isJaVinculado = prod.vinculado_nesta_origem;
                  const isMarcado = produtosSelecionadosParaVincular.includes(prod.id);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isJaVinculado && toggleSelecionarProduto(prod.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isJaVinculado
                          ? "opacity-50 bg-muted/40 cursor-not-allowed"
                          : isMarcado
                          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={isJaVinculado || isMarcado}
                          disabled={isJaVinculado}
                          onCheckedChange={() => !isJaVinculado && toggleSelecionarProduto(prod.id)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{prod.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{prod.midia || prod.tipo}</span>
                            {prod.praca && <span>• {prod.praca}</span>}
                            <span>• R$ {(prod.valor_unit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {isJaVinculado ? (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                          Já Vinculado
                        </Badge>
                      ) : (
                        isMarcado && (
                          <Badge className="bg-primary text-[10px] shrink-0">
                            Selecionado
                          </Badge>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalAdicionarProdutosOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarVinculoProdutos}
              disabled={produtosSelecionadosParaVincular.length === 0 || mutationVincular.isPending}
            >
              {mutationVincular.isPending
                ? "Vinculando..."
                : `Vincular Selecionados (${produtosSelecionadosParaVincular.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
