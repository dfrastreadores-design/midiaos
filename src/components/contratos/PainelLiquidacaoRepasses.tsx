import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  Search,
  Plus,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Receipt,
  Landmark,
  Calculator,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  listPedidosFaturamentoIntermediados,
  upsertPedidoFaturamentoIntermediado,
  liquidarRepassePedido,
  listContratosRepresentacao,
} from "@/lib/representacao-contratos.functions";
import {
  PedidoFaturamentoIntermediado,
  ModeloFaturamento,
  StatusPagamentoCliente,
  StatusRepasseParceiro,
} from "@/types/representacao-contratos.types";
import {
  calculateSplitFinancials,
  fmtBRL,
} from "@/lib/representacao-contratos";
import { SimuladorLiquidacaoWidget } from "./SimuladorLiquidacaoWidget";

interface PainelLiquidacaoRepassesProps {
  tenantCnpj?: string;
}

export function PainelLiquidacaoRepasses({
  tenantCnpj = "68.279.031/0001-67",
}: PainelLiquidacaoRepassesProps) {
  const qc = useQueryClient();

  // Server functions
  const listPedidosFn = useServerFn(listPedidosFaturamentoIntermediados);
  const upsertPedidoFn = useServerFn(upsertPedidoFaturamentoIntermediado);
  const liquidarRepasseFn = useServerFn(liquidarRepassePedido);
  const listContratosFn = useServerFn(listContratosRepresentacao);

  // Queries
  const { data: pedidos = [], isLoading: isLoadingPedidos } = useQuery({
    queryKey: ["pedidos_faturamento_intermediados", tenantCnpj],
    queryFn: () => listPedidosFn({ data: { tenantCnpj } }),
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos_representacao", tenantCnpj],
    queryFn: () => listContratosFn({ data: { tenantCnpj } }),
  });

  // State
  const [search, setSearch] = useState("");
  const [filtroStatusRepasse, setFiltroStatusRepasse] = useState<string>("todos");
  const [filtroModelo, setFiltroModelo] = useState<string>("todos");
  const [showSimulador, setShowSimulador] = useState(false);

  // Modals state
  const [isNewPedidoModalOpen, setIsNewPedidoModalOpen] = useState(false);
  const [modalRecebimentoOpen, setModalRecebimentoOpen] = useState(false);
  const [modalLiquidarOpen, setModalLiquidarOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoFaturamentoIntermediado | null>(null);

  // Form state for new / edit order
  const [novoPedidoForm, setNovoPedidoForm] = useState<{
    contrato_representacao_id: string;
    cliente_nome: string;
    cliente_cnpj: string;
    modelo_faturamento: ModeloFaturamento;
    valor_bruto: number;
    aliquota_imposto_aplicada: number;
    percentual_comissao_aplicado: number;
  }>({
    contrato_representacao_id: "",
    cliente_nome: "",
    cliente_cnpj: "",
    modelo_faturamento: "centralizado_nexo",
    valor_bruto: 10000,
    aliquota_imposto_aplicada: 6.0,
    percentual_comissao_aplicado: 35.0,
  });

  // Action modal form states
  const [dataRecebimentoInput, setDataRecebimentoInput] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [chavePixInput, setChavePixInput] = useState("");
  const [copiedPix, setCopiedPix] = useState(false);

  // Mutations
  const upsertMutation = useMutation({
    mutationFn: (data: Partial<PedidoFaturamentoIntermediado>) =>
      upsertPedidoFn({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_faturamento_intermediados"] });
      toast.success("Pedido de faturamento salvo com sucesso!");
      setIsNewPedidoModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar pedido: ${err.message || "Erro desconhecido"}`);
    },
  });

  const liquidarMutation = useMutation({
    mutationFn: (args: { pedidoId: string; chavePixComprovante: string; dataRepasse?: string }) =>
      liquidarRepasseFn({ data: args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos_faturamento_intermediados"] });
      toast.success("Repasse ao parceiro liquidado com sucesso!");
      setModalLiquidarOpen(false);
      setSelectedPedido(null);
    },
    onError: (err: any) => {
      toast.error(`Erro ao liquidar repasse: ${err.message || "Erro desconhecido"}`);
    },
  });

  // Filtered orders
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const matchSearch =
        search === "" ||
        p.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.cliente_cnpj && p.cliente_cnpj.includes(search)) ||
        (p.contrato?.numero_contrato &&
          p.contrato.numero_contrato.toLowerCase().includes(search.toLowerCase())) ||
        (p.contrato?.parceiro?.nome &&
          p.contrato.parceiro.nome.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        filtroStatusRepasse === "todos" || p.status_repasse === filtroStatusRepasse;

      const matchModelo =
        filtroModelo === "todos" || p.modelo_faturamento === filtroModelo;

      return matchSearch && matchStatus && matchModelo;
    });
  }, [pedidos, search, filtroStatusRepasse, filtroModelo]);

  // Aggregate Metrics
  const metricas = useMemo(() => {
    let totalBruto = 0;
    let totalComissao = 0;
    let totalImposto = 0;
    let totalPendenteRepasse = 0;
    let totalLiquidadoRepasse = 0;
    let qtdProntosParaRepasse = 0;

    pedidos.forEach((p) => {
      totalBruto += Number(p.valor_bruto) || 0;
      totalComissao += Number(p.valor_comissao_nexo) || 0;
      totalImposto += Number(p.valor_imposto_retido) || 0;

      if (p.status_repasse === "liquidado") {
        totalLiquidadoRepasse += Number(p.valor_liquido_repasse_parceiro) || 0;
      } else {
        totalPendenteRepasse += Number(p.valor_liquido_repasse_parceiro) || 0;
      }

      if (p.status_repasse === "pronto_para_repasse") {
        qtdProntosParaRepasse += 1;
      }
    });

    return {
      totalBruto,
      totalComissao,
      totalImposto,
      totalPendenteRepasse,
      totalLiquidadoRepasse,
      qtdProntosParaRepasse,
    };
  }, [pedidos]);

  // Auto-calculated preview for creation form
  const splitNovoPedido = useMemo(() => {
    return calculateSplitFinancials(
      novoPedidoForm.valor_bruto,
      novoPedidoForm.percentual_comissao_aplicado,
      novoPedidoForm.aliquota_imposto_aplicada,
      novoPedidoForm.modelo_faturamento
    );
  }, [novoPedidoForm]);

  // Handler when selecting contract in form
  const handleContratoSelect = (contratoId: string) => {
    const c = contratos.find((item) => item.id === contratoId);
    if (!c) {
      setNovoPedidoForm((prev) => ({ ...prev, contrato_representacao_id: contratoId }));
      return;
    }

    const aliquota = Number(c.aliquota_imposto_nexo_percentual) || 6.0;
    const comissao =
      c.tipo_comissao === "fixa" && c.comissao_fixa_percentual
        ? Number(c.comissao_fixa_percentual)
        : 35.0;

    const modeloPadrao: ModeloFaturamento = c.permite_faturamento_centralizado_nexo
      ? "centralizado_nexo"
      : "direto_parceiro";

    setNovoPedidoForm((prev) => ({
      ...prev,
      contrato_representacao_id: contratoId,
      aliquota_imposto_aplicada: aliquota,
      percentual_comissao_aplicado: comissao,
      modelo_faturamento: modeloPadrao,
    }));
  };

  const handleSalvarNovoPedido = () => {
    if (!novoPedidoForm.contrato_representacao_id) {
      toast.error("Selecione um contrato de representação.");
      return;
    }
    if (!novoPedidoForm.cliente_nome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (novoPedidoForm.valor_bruto <= 0) {
      toast.error("O valor bruto deve ser maior que zero.");
      return;
    }

    upsertMutation.mutate({
      contrato_representacao_id: novoPedidoForm.contrato_representacao_id,
      cliente_nome: novoPedidoForm.cliente_nome,
      cliente_cnpj: novoPedidoForm.cliente_cnpj || undefined,
      modelo_faturamento: novoPedidoForm.modelo_faturamento,
      valor_bruto: splitNovoPedido.valorBruto,
      aliquota_imposto_aplicada: splitNovoPedido.aliquotaImposto,
      valor_imposto_retido: splitNovoPedido.valorImposto,
      percentual_comissao_aplicado: splitNovoPedido.percentualComissao,
      valor_comissao_nexo: splitNovoPedido.valorComissao,
      valor_liquido_repasse_parceiro: splitNovoPedido.valorRepasseParceiro,
      status_pagamento_cliente: "pendente",
      status_repasse: "aguardando_cliente",
    });
  };

  const handleMarcarRecebidoCliente = () => {
    if (!selectedPedido) return;

    upsertMutation.mutate({
      id: selectedPedido.id,
      status_pagamento_cliente: "pago",
      data_recebimento_cliente: dataRecebimentoInput,
      status_repasse: "pronto_para_repasse",
    });

    setModalRecebimentoOpen(false);
    setSelectedPedido(null);
  };

  const handleConfirmarRepasseLiquidar = () => {
    if (!selectedPedido) return;
    if (!chavePixInput.trim()) {
      toast.error("Informe a chave PIX ou comprovante bancário da liquidação.");
      return;
    }

    liquidarMutation.mutate({
      pedidoId: selectedPedido.id,
      chavePixComprovante: chavePixInput,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPix(true);
    toast.success("Chave PIX copiada para a área de transferência!");
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Intermediado */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              Total Faturado
              <TrendingUp className="size-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono">
              {fmtBRL(metricas.totalBruto)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            {pedidos.length} operações registradas
          </CardContent>
        </Card>

        {/* Comissão Nexo */}
        <Card className="border-border/60 bg-gradient-to-br from-blue-500/5 to-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              Comissão Nexo
              <Receipt className="size-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {fmtBRL(metricas.totalComissao)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Receita comercial bruta
          </CardContent>
        </Card>

        {/* Impostos Retidos */}
        <Card className="border-border/60 bg-gradient-to-br from-amber-500/5 to-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              Impostos Retidos (NFS-e)
              <Percent className="size-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {fmtBRL(metricas.totalImposto)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Faturamento centralizado
          </CardContent>
        </Card>

        {/* Repasses Prontos / Pendentes */}
        <Card className={`border-border/60 ${metricas.qtdProntosParaRepasse > 0 ? "border-amber-500/40 bg-amber-500/5" : "bg-card"}`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              Repasses a Executar
              <Clock className="size-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {fmtBRL(metricas.totalPendenteRepasse)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] flex items-center justify-between">
            <span className="text-muted-foreground">Líquido parceiros</span>
            {metricas.qtdProntosParaRepasse > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                {metricas.qtdProntosParaRepasse} liberado(s)
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Repasses Liquidados */}
        <Card className="border-border/60 bg-gradient-to-br from-emerald-500/5 to-card">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              Repasses Liquidados
              <CheckCircle2 className="size-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {fmtBRL(metricas.totalLiquidadoRepasse)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Comprovantes e PIX baixados
          </CardContent>
        </Card>
      </div>

      {/* Simulator Toggle Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/60">
        <div className="flex items-center gap-2">
          <Calculator className="size-4 text-primary" />
          <span className="text-sm font-medium">
            Simulador Rápido de Split & Faturamento
          </span>
          <span className="text-xs text-muted-foreground hidden md:inline">
            — Simule a retenção de tributos e o repasse antes de emitir a proposta
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSimulador(!showSimulador)}
          className="text-xs gap-1.5"
        >
          {showSimulador ? "Ocultar Simulador" : "Abrir Simulador Interativo"}
        </Button>
      </div>

      {/* Embedded Simulator */}
      {showSimulador && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <SimuladorLiquidacaoWidget
            defaultValor={15000}
            defaultComissaoPercentual={35}
            defaultAliquotaImposto={6}
          />
        </div>
      )}

      {/* Action Bar & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, CNPJ, parceiro ou contrato..."
              className="pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Repasse Filter */}
          <Select
            value={filtroStatusRepasse}
            onValueChange={setFiltroStatusRepasse}
          >
            <SelectTrigger className="w-full sm:w-48 text-xs">
              <SelectValue placeholder="Status Repasse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Repasses</SelectItem>
              <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
              <SelectItem value="pronto_para_repasse">Pronto p/ Repasse</SelectItem>
              <SelectItem value="liquidado">Liquidado</SelectItem>
            </SelectContent>
          </Select>

          {/* Modelo Filter */}
          <Select value={filtroModelo} onValueChange={setFiltroModelo}>
            <SelectTrigger className="w-full sm:w-44 text-xs">
              <SelectValue placeholder="Modelo Faturamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Modelos</SelectItem>
              <SelectItem value="centralizado_nexo">Centralizado (Nexo)</SelectItem>
              <SelectItem value="direto_parceiro">Direto Parceiro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            if (contratos.length > 0 && !novoPedidoForm.contrato_representacao_id) {
              handleContratoSelect(contratos[0].id);
            }
            setIsNewPedidoModalOpen(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="size-4" />
          Novo Lançamento Comercial
        </Button>
      </div>

      {/* Main Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Contrato / Parceiro</TableHead>
                <TableHead>Cliente Anunciante</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">Comissão Nexo</TableHead>
                <TableHead className="text-right">Imposto Nexo</TableHead>
                <TableHead className="text-right">Líquido Parceiro</TableHead>
                <TableHead>Pagamento Cliente</TableHead>
                <TableHead>Status Repasse</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPedidos ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    Carregando lançamentos de faturamento intermediado...
                  </TableCell>
                </TableRow>
              ) : pedidosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <Receipt className="size-8 mx-auto mb-2 opacity-30" />
                    Nenhum pedido de faturamento intermediado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const parceiroNome =
                    pedido.contrato?.parceiro?.nome || "Parceiro de Mídia";
                  const parceiroPix =
                    pedido.contrato?.parceiro?.pix || "";
                  const numeroContrato =
                    pedido.contrato?.numero_contrato || "CONTRATO-S/N";
                  const prazoRepasseDias =
                    pedido.contrato?.prazo_repasse_dias || 3;

                  const isCentralizado =
                    pedido.modelo_faturamento === "centralizado_nexo";

                  return (
                    <TableRow key={pedido.id} className="text-xs">
                      {/* Contrato e Parceiro */}
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {parceiroNome}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {numeroContrato}
                        </div>
                      </TableCell>

                      {/* Cliente */}
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {pedido.cliente_nome}
                        </div>
                        {pedido.cliente_cnpj && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {pedido.cliente_cnpj}
                          </div>
                        )}
                      </TableCell>

                      {/* Modelo */}
                      <TableCell>
                        {isCentralizado ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                            Centralizado Nexo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                            Direto Parceiro
                          </Badge>
                        )}
                      </TableCell>

                      {/* Bruto */}
                      <TableCell className="text-right font-mono font-medium">
                        {fmtBRL(Number(pedido.valor_bruto))}
                      </TableCell>

                      {/* Comissão Nexo */}
                      <TableCell className="text-right font-mono font-medium text-blue-600 dark:text-blue-400">
                        {fmtBRL(Number(pedido.valor_comissao_nexo))}
                        <div className="text-[10px] text-muted-foreground">
                          ({Number(pedido.percentual_comissao_aplicado)}%)
                        </div>
                      </TableCell>

                      {/* Imposto */}
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {isCentralizado ? (
                          <>
                            {fmtBRL(Number(pedido.valor_imposto_retido))}
                            <div className="text-[10px]">
                              ({Number(pedido.aliquota_imposto_aplicada)}%)
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Isento na Nexo</span>
                        )}
                      </TableCell>

                      {/* Líquido Parceiro */}
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtBRL(Number(pedido.valor_liquido_repasse_parceiro))}
                      </TableCell>

                      {/* Status Pagamento Cliente */}
                      <TableCell>
                        {pedido.status_pagamento_cliente === "pago" ? (
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            <CheckCircle2 className="size-3 mr-1" />
                            Pago em {pedido.data_recebimento_cliente || "—"}
                          </Badge>
                        ) : pedido.status_pagamento_cliente === "atrasado" ? (
                          <Badge className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                            <AlertTriangle className="size-3 mr-1" />
                            Atrasado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            <Clock className="size-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status Repasse */}
                      <TableCell>
                        {pedido.status_repasse === "liquidado" ? (
                          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            <Check className="size-3 mr-1" />
                            Liquidado {pedido.data_repasse_efetuado ? `(${pedido.data_repasse_efetuado})` : ""}
                          </Badge>
                        ) : pedido.status_repasse === "pronto_para_repasse" ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse">
                              <AlertTriangle className="size-3 mr-1" />
                              Repassar em até {prazoRepasseDias} dias
                            </Badge>
                            {parceiroPix && (
                              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                                PIX: {parceiroPix}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Aguardando cliente
                          </Badge>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Registrar Recebimento do Cliente */}
                          {pedido.status_pagamento_cliente !== "pago" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                                    onClick={() => {
                                      setSelectedPedido(pedido);
                                      setModalRecebimentoOpen(true);
                                    }}
                                  >
                                    <ArrowDownLeft className="size-3" />
                                    Cliente Pagou
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Confirmar recebimento do anunciante para liberar o repasse
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Botão Liquidar Repasse ao Parceiro */}
                          {pedido.status_repasse === "pronto_para_repasse" && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              onClick={() => {
                                setSelectedPedido(pedido);
                                setChavePixInput(pedido.chave_pix_comprovante || parceiroPix || "");
                                setModalLiquidarOpen(true);
                              }}
                            >
                              <ArrowUpRight className="size-3" />
                              Liquidar Repasse
                            </Button>
                          )}

                          {/* Botão Ver Comprovante se já liquidado */}
                          {pedido.status_repasse === "liquidado" && pedido.chave_pix_comprovante && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] text-muted-foreground hover:text-foreground font-mono"
                                    onClick={() => {
                                      copyToClipboard(pedido.chave_pix_comprovante || "");
                                    }}
                                  >
                                    <Copy className="size-3 mr-1" />
                                    Comprovante
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Chave / Comprovante: {pedido.chave_pix_comprovante}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG: NOVO PEDIDO DE FATURAMENTO INTERMEDIADO */}
      <Dialog open={isNewPedidoModalOpen} onOpenChange={setIsNewPedidoModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Lançar Pedido de Faturamento Intermediado
            </DialogTitle>
            <DialogDescription>
              Registre uma veiculação comercial vinculada ao contrato de representação para cálculo automático do split financeiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Contrato de Representação */}
            <div>
              <Label className="text-xs font-semibold">Contrato de Representação / Veículo *</Label>
              <Select
                value={novoPedidoForm.contrato_representacao_id}
                onValueChange={handleContratoSelect}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Selecione o contrato de representação" />
                </SelectTrigger>
                <SelectContent>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.parceiro?.nome || "Veículo"} — Contrato {c.numero_contrato} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dados do Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Nome do Cliente Anunciante *</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="Ex: Banco de Brasília, Governo do DF..."
                  value={novoPedidoForm.cliente_nome}
                  onChange={(e) =>
                    setNovoPedidoForm({ ...novoPedidoForm, cliente_nome: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">CNPJ do Cliente (Opcional)</Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="00.000.000/0000-00"
                  value={novoPedidoForm.cliente_cnpj}
                  onChange={(e) =>
                    setNovoPedidoForm({ ...novoPedidoForm, cliente_cnpj: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Modelo de Faturamento & Valores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold">Modelo de Faturamento</Label>
                <Select
                  value={novoPedidoForm.modelo_faturamento}
                  onValueChange={(v: ModeloFaturamento) =>
                    setNovoPedidoForm({ ...novoPedidoForm, modelo_faturamento: v })
                  }
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centralizado_nexo" className="text-xs">
                      Cenário 1: Centralizado na Nexo (NFS-e Única ao Cliente)
                    </SelectItem>
                    <SelectItem value="direto_parceiro" className="text-xs">
                      Cenário 2: Direto pelo Parceiro (Nexo cobra comissão)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Valor Bruto da Venda (R$) *</Label>
                <Input
                  type="number"
                  className="mt-1 text-xs font-mono"
                  value={novoPedidoForm.valor_bruto}
                  onChange={(e) =>
                    setNovoPedidoForm({
                      ...novoPedidoForm,
                      valor_bruto: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Percentual de Comissão da Nexo (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="mt-1 text-xs font-mono"
                  value={novoPedidoForm.percentual_comissao_aplicado}
                  onChange={(e) =>
                    setNovoPedidoForm({
                      ...novoPedidoForm,
                      percentual_comissao_aplicado: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Alíquota Imposto NFS-e Nexo (%) {novoPedidoForm.modelo_faturamento === "direto_parceiro" && "(N/A)"}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  disabled={novoPedidoForm.modelo_faturamento === "direto_parceiro"}
                  className="mt-1 text-xs font-mono disabled:opacity-50"
                  value={novoPedidoForm.aliquota_imposto_aplicada}
                  onChange={(e) =>
                    setNovoPedidoForm({
                      ...novoPedidoForm,
                      aliquota_imposto_aplicada: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Split Preview Card */}
            <div className="bg-muted/40 p-3.5 rounded-lg border border-border/60 space-y-2 mt-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calculator className="size-3.5 text-primary" />
                Resumo do Split a ser gravado:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-card p-2 rounded border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Bruto Faturado</span>
                  <span className="font-mono font-bold">{fmtBRL(splitNovoPedido.valorBruto)}</span>
                </div>
                <div className="bg-card p-2 rounded border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Comissão Nexo</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {fmtBRL(splitNovoPedido.valorComissao)}
                  </span>
                </div>
                <div className="bg-card p-2 rounded border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Imposto NF Nexo</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {fmtBRL(splitNovoPedido.valorImposto)}
                  </span>
                </div>
                <div className="bg-card p-2 rounded border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Líquido Parceiro</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {fmtBRL(splitNovoPedido.valorRepasseParceiro)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewPedidoModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarNovoPedido}
              disabled={upsertMutation.isPending}
              className="text-xs gap-1.5"
            >
              {upsertMutation.isPending ? "Gravando..." : "Confirmar Lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: REGISTRAR RECEBIMENTO DO CLIENTE */}
      <Dialog open={modalRecebimentoOpen} onOpenChange={setModalRecebimentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-5 text-emerald-500" />
              Confirmar Recebimento do Cliente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a data em que o cliente efetuou a liquidação da fatura.
              Isso alterará o status do repasse para <strong>"Pronto para Repasse"</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedPedido && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-muted/40 p-3 rounded border border-border/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-semibold">{selectedPedido.cliente_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Bruto:</span>
                  <span className="font-mono font-semibold">{fmtBRL(Number(selectedPedido.valor_bruto))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repasse Líquido ao Parceiro:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {fmtBRL(Number(selectedPedido.valor_liquido_repasse_parceiro))}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Data do Recebimento *</Label>
                <Input
                  type="date"
                  className="mt-1 text-xs"
                  value={dataRecebimentoInput}
                  onChange={(e) => setDataRecebimentoInput(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalRecebimentoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleMarcarRecebidoCliente}
              disabled={upsertMutation.isPending}
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: LIQUIDAR REPASSE AO PARCEIRO COM PIX */}
      <Dialog open={modalLiquidarOpen} onOpenChange={setModalLiquidarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Landmark className="size-5 text-emerald-600" />
              Executar Repasse Financeiro ao Parceiro
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirme a transferência bancária / PIX do valor líquido retido ao veículo de comunicação.
            </DialogDescription>
          </DialogHeader>

          {selectedPedido && (
            <div className="space-y-4 py-2 text-xs">
              {/* Partner and amount details */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Veículo / Parceiro:</span>
                  <span className="font-semibold text-foreground">
                    {selectedPedido.contrato?.parceiro?.nome || "Veículo"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor a Transferir:</span>
                  <span className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-300">
                    {fmtBRL(Number(selectedPedido.valor_liquido_repasse_parceiro))}
                  </span>
                </div>

                {selectedPedido.contrato?.parceiro?.pix && (
                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Chave PIX Cadastrada:</span>
                      <span className="font-mono font-semibold text-xs">
                        {selectedPedido.contrato.parceiro.pix}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] gap-1"
                      onClick={() =>
                        copyToClipboard(selectedPedido.contrato?.parceiro?.pix || "")
                      }
                    >
                      {copiedPix ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      Copiar PIX
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Chave PIX / Comprovante de Pagamento *
                </Label>
                <Input
                  className="mt-1 text-xs font-mono"
                  placeholder="ID da transação, End-to-End ou Chave PIX utilizada"
                  value={chavePixInput}
                  onChange={(e) => setChavePixInput(e.target.value)}
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Gravado no registro de liquidação para auditoria contábil.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalLiquidarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleConfirmarRepasseLiquidar}
              disabled={liquidarMutation.isPending}
            >
              {liquidarMutation.isPending ? "Processando..." : "Confirmar Liquidação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
