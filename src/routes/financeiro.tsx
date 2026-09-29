import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listPis } from "@/lib/pi.functions";
import {
  listTransacoesFinanceiras,
  upsertTransacaoFinanceira,
  deleteTransacaoFinanceira,
  CATEGORIAS_ENTRADA,
  CATEGORIAS_SAIDA,
  type TransacaoFinanceira,
  type TipoTransacao,
} from "@/lib/financeiro.functions";
import { TransacaoFormDialog } from "@/components/TransacaoFormDialog";
import { DicasFinanceirasSection } from "@/components/DicasFinanceirasSection";
import { AgendaVencimentosSection } from "@/components/AgendaVencimentosSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  DollarSign,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro & Fluxo de Caixa — Mídia.OS" }] }),
  component: Financeiro,
});

const BUCKET = "financeiro-docs";

type Fin = {
  id: string;
  pi_id: string;
  nota_fiscal_numero: string | null;
  nota_fiscal_path: string | null;
  boleto_path: string | null;
  vencimento_boleto: string | null;
  valor: number | null;
  status_pagamento: string;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

function Financeiro() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const fetchTransacoesFn = useServerFn(listTransacoesFinanceiras);
  const upsertTransacaoFn = useServerFn(upsertTransacaoFinanceira);
  const deleteTransacaoFn = useServerFn(deleteTransacaoFinanceira);

  // Estados principais
  const [tabAtiva, setTabAtiva] = useState<"fluxo" | "vencimentos" | "dicas" | "pis">(
    "vencimentos",
  );

  // Filtros de Transações (Entradas/Saídas)
  const [buscaTransacao, setBuscaTransacao] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "entrada" | "saida">("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todos");

  // Diálogo de Nova/Edição de Transação
  const [transacaoModalOpen, setTransacaoModalOpen] = useState(false);
  const [transacaoEditing, setTransacaoEditing] = useState<TransacaoFinanceira | null>(null);
  const [transacaoTipoPadrao, setTransacaoTipoPadrao] = useState<TipoTransacao>("entrada");

  // Filtro e Edição de PIs
  const [searchPi, setSearchPi] = useState("");
  const [editingPi, setEditingPi] = useState<{ pi: any; fin: Fin | null } | null>(null);

  // Queries
  const { data: transacoes = [], isLoading: loadingTransacoes } = useQuery<TransacaoFinanceira[]>({
    queryKey: ["transacoes_financeiras"],
    queryFn: () => fetchTransacoesFn(),
  });

  const { data: pis = [], isLoading: loadingPis } = useQuery({
    queryKey: ["pis-financeiro"],
    queryFn: () => listPis(),
  });

  const { data: financeiros = [] } = useQuery({
    queryKey: ["pi_financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pi_financeiro")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fin[];
    },
  });

  // Mapeamentos e Totais de PIs
  const finByPi = useMemo(() => {
    const m = new Map<string, Fin>();
    for (const f of financeiros) if (!m.has(f.pi_id)) m.set(f.pi_id, f);
    return m;
  }, [financeiros]);

  const rowsPi = useMemo(() => {
    return pis.filter((p: any) => {
      if (p.status === "cancelado" || p.status === "substituido") return false;
      if (!searchPi) return true;
      const s = searchPi.toLowerCase();
      return (
        p.numero?.toLowerCase().includes(s) ||
        p.campanha?.toLowerCase().includes(s) ||
        p.cliente?.razao_social?.toLowerCase().includes(s) ||
        p.cliente?.nome_fantasia?.toLowerCase().includes(s) ||
        p.agencia?.razao_social?.toLowerCase().includes(s)
      );
    });
  }, [pis, searchPi]);

  const totalsPi = useMemo(() => {
    let aRec = 0,
      pago = 0,
      vencido = 0,
      pend = 0;
    const today = new Date().toISOString().split("T")[0];
    for (const pi of rowsPi) {
      const f = finByPi.get(pi.id);
      const v = (f?.valor ?? pi.valor_negociado) || 0;
      aRec += v;
      if (f?.status_pagamento === "pago") pago += v;
      else if (f?.vencimento_boleto && f.vencimento_boleto < today) vencido += v;
      else pend += v;
    }
    return { aRec, pago, vencido, pend };
  }, [rowsPi, finByPi]);

  // Transações Filtradas (Fluxo de Caixa)
  const transacoesFiltradas = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const mesAtual = hoje.slice(0, 7);

    return transacoes.filter((t) => {
      if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;

      if (filtroStatus !== "todos") {
        if (filtroStatus === "vencido") {
          if (t.status === "pago" || t.status === "cancelado") return false;
          if (t.data_vencimento >= hoje) return false;
        } else if (t.status !== filtroStatus) {
          return false;
        }
      }

      if (filtroCategoria !== "todas" && t.categoria !== filtroCategoria) {
        return false;
      }

      if (filtroPeriodo === "mes_atual") {
        if (!t.data_vencimento.startsWith(mesAtual)) return false;
      } else if (filtroPeriodo === "hoje") {
        if (t.data_vencimento !== hoje) return false;
      } else if (filtroPeriodo === "proximos_7_dias") {
        const d7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
        if (t.data_vencimento < hoje || t.data_vencimento > d7) return false;
      }

      if (buscaTransacao.trim()) {
        const q = buscaTransacao.toLowerCase();
        const clienteStr =
          `${t.cliente?.nome_fantasia || ""} ${t.cliente?.razao_social || ""}`.toLowerCase();
        const parceiroStr =
          `${t.parceiro?.nome_fantasia || ""} ${t.parceiro?.razao_social || ""}`.toLowerCase();
        const piStr = `${t.pi?.numero || ""} ${t.pi?.campanha || ""}`.toLowerCase();

        return (
          t.descricao.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q) ||
          clienteStr.includes(q) ||
          parceiroStr.includes(q) ||
          piStr.includes(q)
        );
      }

      return true;
    });
  }, [transacoes, filtroTipo, filtroStatus, filtroCategoria, filtroPeriodo, buscaTransacao]);

  // Totais de Fluxo de Caixa (Base Geral / Mês)
  const metricasFluxo = useMemo(() => {
    let entradasTotal = 0;
    let entradasPagas = 0;
    let saidasTotal = 0;
    let saidasPagas = 0;
    let aVencer7Dias = 0;
    let vencidas = 0;

    const hoje = new Date().toISOString().split("T")[0];
    const em7Dias = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    for (const t of transacoes) {
      const v = Number(t.valor || 0);
      if (t.tipo === "entrada") {
        entradasTotal += v;
        if (t.status === "pago") entradasPagas += v;
      } else if (t.tipo === "saida") {
        saidasTotal += v;
        if (t.status === "pago") saidasPagas += v;

        if (t.status !== "pago" && t.status !== "cancelado") {
          if (t.data_vencimento < hoje) {
            vencidas += v;
          } else if (t.data_vencimento <= em7Dias) {
            aVencer7Dias += v;
          }
        }
      }
    }

    const saldoRealizado = entradasPagas - saidasPagas;
    const saldoProjetado = entradasTotal - saidasTotal;

    return {
      saldoRealizado,
      saldoProjetado,
      entradasTotal,
      entradasPagas,
      entradasPendentes: entradasTotal - entradasPagas,
      saidasTotal,
      saidasPagas,
      saidasPendentes: saidasTotal - saidasPagas,
      aVencer7Dias,
      vencidas,
    };
  }, [transacoes]);

  // Mutações de Transação
  const darBaixaMut = useMutation({
    mutationFn: async (t: TransacaoFinanceira) => {
      const hoje = new Date().toISOString().split("T")[0];
      return upsertTransacaoFn({
        data: {
          id: t.id,
          tipo: t.tipo,
          descricao: t.descricao,
          categoria: t.categoria,
          valor: Number(t.valor),
          data_competencia: t.data_competencia,
          data_vencimento: t.data_vencimento,
          data_pagamento: hoje,
          status: "pago",
          forma_pagamento: t.forma_pagamento || "PIX",
          cliente_id: t.cliente_id || null,
          parceiro_id: t.parceiro_id || null,
          pi_id: t.pi_id || null,
          recorrente: !!t.recorrente,
          observacoes: t.observacoes || null,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["dicas_financeiras"] });
      toast.success("Lançamento marcado como pago/recebido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delTransacaoMut = useMutation({
    mutationFn: (id: string) => deleteTransacaoFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["dicas_financeiras"] });
      toast.success("Lançamento excluído com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação do PI Financeiro
  const delPiFinMut = useMutation({
    mutationFn: async (f: Fin) => {
      const paths = [f.nota_fiscal_path, f.boleto_path].filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      const { error } = await supabase.from("pi_financeiro").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido");
      qc.invalidateQueries({ queryKey: ["pi_financeiro"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleDownload(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link para download");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  // Exportação CSV de Transações
  function exportarCsvTransacoes() {
    if (transacoesFiltradas.length === 0) {
      toast.error("Nenhuma transação para exportar com os filtros atuais.");
      return;
    }

    const headers = [
      "Tipo",
      "Descrição",
      "Categoria",
      "Valor (R$)",
      "Data Competência",
      "Data Vencimento",
      "Data Pagamento",
      "Status",
      "Forma de Pagamento",
      "Cliente/Parceiro",
      "PI Vinculado",
      "Recorrente",
    ];

    const rows = transacoesFiltradas.map((t) => [
      t.tipo === "entrada" ? "Entrada" : "Saída",
      `"${(t.descricao || "").replace(/"/g, '""')}"`,
      `"${(t.categoria || "").replace(/"/g, '""')}"`,
      Number(t.valor || 0).toFixed(2),
      t.data_competencia,
      t.data_vencimento,
      t.data_pagamento || "",
      t.status,
      t.forma_pagamento || "",
      `"${(t.cliente?.nome_fantasia || t.cliente?.razao_social || t.parceiro?.nome_fantasia || t.parceiro?.razao_social || "").replace(/"/g, '""')}"`,
      `"${(t.pi?.numero || "").replace(/"/g, '""')}"`,
      t.recorrente ? "Sim" : "Não",
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fluxo_de_caixa_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório CSV gerado com sucesso!");
  }

  return (
    <AppShell>
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight">
                Gestão Financeira & Caixa
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Controle integral de entradas e saídas, faturamento de PIs e consultoria com dicas
                inteligentes.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setTransacaoEditing(null);
              setTransacaoTipoPadrao("entrada");
              setTransacaoModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
          >
            <ArrowDownLeft className="size-4" />
            <span>Nova Entrada</span>
          </Button>

          <Button
            onClick={() => {
              setTransacaoEditing(null);
              setTransacaoTipoPadrao("saida");
              setTransacaoModalOpen(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
          >
            <ArrowUpRight className="size-4" />
            <span>Nova Saída</span>
          </Button>
        </div>
      </div>

      {/* Tabs Principais do Módulo Financeiro */}
      <Tabs value={tabAtiva} onValueChange={(v) => setTabAtiva(v as any)} className="space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-xl h-auto border flex-wrap">
          <TabsTrigger
            value="vencimentos"
            className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Calendar className="size-4 text-amber-500" />
            <span className="font-medium">Agenda de Vencimentos (A Pagar & A Receber)</span>
          </TabsTrigger>
          <TabsTrigger
            value="fluxo"
            className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ArrowUpDown className="size-4 text-primary" />
            <span className="font-medium">Fluxo de Caixa Geral</span>
          </TabsTrigger>
          <TabsTrigger
            value="dicas"
            className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Sparkles className="size-4 text-purple-500" />
            <span className="font-medium">Dicas Financeiras Inteligentes</span>
          </TabsTrigger>
          <TabsTrigger
            value="pis"
            className="gap-2 py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="size-4 text-indigo-500" />
            <span className="font-medium">Faturamento de PIs & Boletos</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FLUXO DE CAIXA (ENTRADAS & SAÍDAS) */}
        <TabsContent value="fluxo" className="space-y-6 m-0 focus-visible:outline-none">
          {/* KPI Summary Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Saldo em Caixa (Realizado)</span>
                  <Wallet className="size-4 text-primary" />
                </div>
                <div
                  className={cn(
                    "text-2xl font-display font-semibold mt-1",
                    metricasFluxo.saldoRealizado >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {formatBRL(metricasFluxo.saldoRealizado)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Previsto final:{" "}
                  <span className="font-semibold text-foreground">
                    {formatBRL(metricasFluxo.saldoProjetado)}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Total de Entradas</span>
                  <TrendingUp className="size-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-display font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatBRL(metricasFluxo.entradasTotal)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex justify-between">
                  <span>Recebido: {formatBRL(metricasFluxo.entradasPagas)}</span>
                  <span>A receber: {formatBRL(metricasFluxo.entradasPendentes)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>Total de Saídas</span>
                  <TrendingDown className="size-4 text-rose-600" />
                </div>
                <div className="text-2xl font-display font-semibold mt-1 text-rose-600 dark:text-rose-400">
                  {formatBRL(metricasFluxo.saidasTotal)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex justify-between">
                  <span>Pago: {formatBRL(metricasFluxo.saidasPagas)}</span>
                  <span>A pagar: {formatBRL(metricasFluxo.saidasPendentes)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>A Pagar (Próx. 7 Dias)</span>
                  <AlertTriangle className="size-4 text-amber-500" />
                </div>
                <div className="text-2xl font-display font-semibold mt-1 text-amber-600 dark:text-amber-400">
                  {formatBRL(metricasFluxo.aVencer7Dias)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vencidas pendentes:{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      metricasFluxo.vencidas > 0 ? "text-rose-600 font-bold" : "text-foreground",
                    )}
                  >
                    {formatBRL(metricasFluxo.vencidas)}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros e Barra de Ações */}
          <Card className="shadow-sm">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <Input
                  placeholder="Pesquisar por descrição, cliente, parceiro ou PI..."
                  value={buscaTransacao}
                  onChange={(e) => setBuscaTransacao(e.target.value)}
                  className="max-w-sm h-9"
                />

                <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    <SelectItem value="entrada">🟢 Entradas</SelectItem>
                    <SelectItem value="saida">🔴 Saídas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Status</SelectItem>
                    <SelectItem value="pago">Pago / Recebido</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="vencido">⚠️ Vencido</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="w-[190px] h-9">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas Categorias</SelectItem>
                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                      Receitas
                    </div>
                    {CATEGORIAS_ENTRADA.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase border-t mt-1 pt-1">
                      Despesas
                    </div>
                    {CATEGORIAS_SAIDA.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo o Histórico</SelectItem>
                    <SelectItem value="mes_atual">Mês Atual</SelectItem>
                    <SelectItem value="hoje">Vence Hoje</SelectItem>
                    <SelectItem value="proximos_7_dias">Próximos 7 Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarCsvTransacoes}
                  className="h-9 gap-1.5 text-xs"
                >
                  <FileSpreadsheet className="size-3.5 text-emerald-600" />
                  Exportar CSV
                </Button>
                <div className="text-xs text-muted-foreground font-medium pl-2">
                  {transacoesFiltradas.length} lançamento
                  {transacoesFiltradas.length === 1 ? "" : "s"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Transações de Entrada e Saída */}
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[110px]">Tipo</TableHead>
                    <TableHead>Descrição & Categoria</TableHead>
                    <TableHead>Vínculo Comercial</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTransacoes ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                        Carregando fluxo de caixa...
                      </TableCell>
                    </TableRow>
                  ) : transacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Wallet className="size-10 text-muted-foreground/40 mx-auto" />
                          <p className="font-medium text-foreground">
                            Nenhum lançamento financeiro encontrado
                          </p>
                          <p className="text-xs">
                            Crie sua primeira receita ou despesa clicando nos botões acima para
                            controlar seu fluxo de caixa.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesFiltradas.map((t) => {
                      const hoje = new Date().toISOString().split("T")[0];
                      const isVencido =
                        t.data_vencimento < hoje && t.status !== "pago" && t.status !== "cancelado";
                      const isEntrada = t.tipo === "entrada";

                      return (
                        <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                          {/* Tipo */}
                          <TableCell>
                            {isEntrada ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 gap-1 text-[11px]">
                                <ArrowDownLeft className="size-3 text-emerald-600" />
                                Entrada
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 gap-1 text-[11px]">
                                <ArrowUpRight className="size-3 text-rose-600" />
                                Saída
                              </Badge>
                            )}
                          </TableCell>

                          {/* Descrição & Categoria */}
                          <TableCell>
                            <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                              {t.descricao}
                              {t.recorrente && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1 border-primary/40 text-primary"
                                >
                                  Recorrente
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{t.categoria}</div>
                          </TableCell>

                          {/* Vínculo Comercial */}
                          <TableCell className="text-xs">
                            {t.cliente ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  🏢 {t.cliente.nome_fantasia || t.cliente.razao_social}
                                </span>
                                {t.pi && (
                                  <span className="text-[11px] text-muted-foreground">
                                    PI {t.pi.numero}
                                  </span>
                                )}
                              </div>
                            ) : t.parceiro ? (
                              <span className="font-medium text-purple-700 dark:text-purple-400">
                                🤝 {t.parceiro.nome_fantasia || t.parceiro.razao_social}
                              </span>
                            ) : t.pi ? (
                              <span className="text-muted-foreground font-mono">
                                PI {t.pi.numero}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Vencimento */}
                          <TableCell
                            className={cn(
                              "text-xs font-mono",
                              isVencido && "text-destructive font-bold",
                            )}
                          >
                            {formatDate(t.data_vencimento)}
                          </TableCell>

                          {/* Pagamento */}
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {formatDate(t.data_pagamento)}
                          </TableCell>

                          {/* Forma de Pagamento */}
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {t.forma_pagamento || "PIX"}
                          </TableCell>

                          {/* Valor */}
                          <TableCell
                            className={cn(
                              "text-right font-semibold text-sm font-mono",
                              isEntrada
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            {isEntrada ? "+" : "-"} {formatBRL(Number(t.valor))}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              variant={
                                t.status === "pago"
                                  ? "default"
                                  : isVencido
                                    ? "destructive"
                                    : t.status === "agendado"
                                      ? "outline"
                                      : "secondary"
                              }
                              className="text-[11px]"
                            >
                              {t.status === "pago"
                                ? isEntrada
                                  ? "Recebido"
                                  : "Pago"
                                : isVencido
                                  ? "Vencido"
                                  : t.status === "agendado"
                                    ? "Agendado"
                                    : t.status === "cancelado"
                                      ? "Cancelado"
                                      : "Pendente"}
                            </Badge>
                          </TableCell>

                          {/* Ações */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {t.status !== "pago" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  title={isEntrada ? "Marcar como Recebido" : "Marcar como Pago"}
                                  onClick={() => darBaixaMut.mutate(t)}
                                  disabled={darBaixaMut.isPending}
                                >
                                  <CheckCircle2 className="size-3.5 mr-1" />
                                  Baixar
                                </Button>
                              )}

                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                title="Editar"
                                onClick={() => {
                                  setTransacaoEditing(t);
                                  setTransacaoTipoPadrao(t.tipo);
                                  setTransacaoModalOpen(true);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-destructive hover:bg-destructive/10"
                                title="Excluir"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Deseja realmente excluir a transação "${t.descricao}"?`,
                                    )
                                  ) {
                                    delTransacaoMut.mutate(t.id);
                                  }
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
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
        </TabsContent>

        {/* TAB 2: AGENDA DE VENCIMENTOS (A PAGAR & A RECEBER) */}
        <TabsContent value="vencimentos" className="space-y-6 m-0 focus-visible:outline-none">
          <AgendaVencimentosSection
            transacoes={transacoes}
            onDarBaixa={(t) => darBaixaMut.mutate(t)}
            onEditar={(t) => {
              setTransacaoEditing(t);
              setTransacaoTipoPadrao(t.tipo);
              setTransacaoModalOpen(true);
            }}
            onNovaEntrada={() => {
              setTransacaoEditing(null);
              setTransacaoTipoPadrao("entrada");
              setTransacaoModalOpen(true);
            }}
            onNovaSaida={() => {
              setTransacaoEditing(null);
              setTransacaoTipoPadrao("saida");
              setTransacaoModalOpen(true);
            }}
          />
        </TabsContent>

        {/* TAB 2: DICAS FINANCEIRAS INTELIGENTES */}
        <TabsContent value="dicas" className="m-0 focus-visible:outline-none">
          <DicasFinanceirasSection />
        </TabsContent>

        {/* TAB 3: FATURAMENTO DE PIS & BOLETOS */}
        <TabsContent value="pis" className="space-y-6 m-0 focus-visible:outline-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Contas a Receber dos Pedidos de Inserção (PIs)
              </h2>
              <p className="text-xs text-muted-foreground">
                Anexe notas fiscais, emita boletos de veiculação e acompanhe os recebimentos
                contratuais de campanhas.
              </p>
            </div>
            <Input
              placeholder="Buscar por PI, campanha, cliente…"
              value={searchPi}
              onChange={(e) => setSearchPi(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">
                  Total de PIs Faturados
                </div>
                <div className="text-2xl font-display font-semibold mt-1">
                  {formatBRL(totalsPi.aRec)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">PIs Pagos</div>
                <div className="text-2xl font-display font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
                  {formatBRL(totalsPi.pago)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">PIs Pendentes</div>
                <div className="text-2xl font-display font-semibold mt-1 text-amber-600 dark:text-amber-400">
                  {formatBRL(totalsPi.pend)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground font-medium">PIs Vencidos</div>
                <div className="text-2xl font-display font-semibold mt-1 text-rose-600 dark:text-rose-400">
                  {formatBRL(totalsPi.vencido)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/40 border-b">
              <CardTitle className="text-sm font-semibold">
                Tabela de Cobrança por Pedido de Inserção
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PI</TableHead>
                    <TableHead>Cliente / Campanha</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Boleto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsPi.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground text-sm"
                      >
                        Nenhum PI encontrado para os filtros informados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rowsPi.map((pi: any) => {
                      const f = finByPi.get(pi.id);
                      const today = new Date().toISOString().split("T")[0];
                      const isVencido =
                        f?.vencimento_boleto &&
                        f.vencimento_boleto < today &&
                        f.status_pagamento !== "pago";
                      const valor = (f?.valor ?? pi.valor_negociado) || 0;
                      return (
                        <TableRow key={pi.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold">
                            {pi.numero}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="font-medium text-foreground">
                              {pi.cliente?.nome_fantasia || pi.cliente?.razao_social || "—"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{pi.campanha}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {f?.nota_fiscal_numero ? (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{f.nota_fiscal_numero}</span>
                                {f.nota_fiscal_path && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-6 text-primary"
                                    onClick={() => handleDownload(f.nota_fiscal_path!)}
                                    title="Baixar NF"
                                  >
                                    <FileText className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-xs font-mono",
                              isVencido && "text-rose-600 font-bold",
                            )}
                          >
                            {formatDate(f?.vencimento_boleto ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs font-mono">
                            {formatBRL(valor)}
                          </TableCell>
                          <TableCell>
                            {f?.boleto_path ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleDownload(f.boleto_path!)}
                              >
                                <Download className="size-3 mr-1" /> Boleto
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                f?.status_pagamento === "pago"
                                  ? "default"
                                  : isVencido
                                    ? "destructive"
                                    : f?.status_pagamento === "parcial"
                                      ? "outline"
                                      : "secondary"
                              }
                              className="text-[11px]"
                            >
                              {f?.status_pagamento === "pago"
                                ? "Pago"
                                : isVencido
                                  ? "Vencido"
                                  : f?.status_pagamento === "parcial"
                                    ? "Parcial"
                                    : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => setEditingPi({ pi, fin: f ?? null })}
                                title="Editar Financeiro do PI"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              {f && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm("Remover registro financeiro deste PI?"))
                                      delPiFinMut.mutate(f);
                                  }}
                                  title="Excluir Financeiro do PI"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
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
        </TabsContent>
      </Tabs>

      {/* Modal de Transação (Nova Entrada / Nova Saída / Edição) */}
      <TransacaoFormDialog
        open={transacaoModalOpen}
        onOpenChange={setTransacaoModalOpen}
        initial={transacaoEditing}
        tipoPadrao={transacaoTipoPadrao}
      />

      {/* Modal de Financeiro do PI (NF / Boleto) */}
      {editingPi && (
        <FinanceiroDialog
          open={!!editingPi}
          onClose={() => setEditingPi(null)}
          pi={editingPi.pi}
          fin={editingPi.fin}
          userId={user?.id ?? null}
          onSaved={() => qc.invalidateQueries({ queryKey: ["pi_financeiro"] })}
        />
      )}
    </AppShell>
  );
}

function FinanceiroDialog({
  open,
  onClose,
  pi,
  fin,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  pi: any;
  fin: Fin | null;
  userId: string | null;
  onSaved: () => void;
}) {
  const nfRef = useRef<HTMLInputElement>(null);
  const boletoRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nota_fiscal_numero: fin?.nota_fiscal_numero ?? "",
    vencimento_boleto: fin?.vencimento_boleto ?? "",
    valor: String(fin?.valor ?? pi.valor_negociado ?? ""),
    status_pagamento: fin?.status_pagamento ?? "pendente",
    data_pagamento: fin?.data_pagamento ?? "",
    observacoes: fin?.observacoes ?? "",
  });
  const [nfFile, setNfFile] = useState<File | null>(null);
  const [boletoFile, setBoletoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function uploadFile(file: File, kind: "nf" | "boleto") {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `pi/${pi.id}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (up.error) throw up.error;
    return path;
  }

  async function save() {
    if (!userId) {
      toast.error("Usuário não autenticado");
      return;
    }
    setSaving(true);
    try {
      let nf_path = fin?.nota_fiscal_path ?? null;
      let bol_path = fin?.boleto_path ?? null;
      if (nfFile) {
        if (nf_path) await supabase.storage.from(BUCKET).remove([nf_path]);
        nf_path = await uploadFile(nfFile, "nf");
      }
      if (boletoFile) {
        if (bol_path) await supabase.storage.from(BUCKET).remove([bol_path]);
        bol_path = await uploadFile(boletoFile, "boleto");
      }
      const payload = {
        pi_id: pi.id,
        nota_fiscal_numero: form.nota_fiscal_numero.trim() || null,
        nota_fiscal_path: nf_path,
        boleto_path: bol_path,
        vencimento_boleto: form.vencimento_boleto || null,
        valor: form.valor ? Number(form.valor) : null,
        status_pagamento: form.status_pagamento,
        data_pagamento: form.data_pagamento || null,
        observacoes: form.observacoes.trim() || null,
      };
      if (fin) {
        const { error } = await supabase.from("pi_financeiro").update(payload).eq("id", fin.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pi_financeiro")
          .insert({ ...payload, criado_por: userId });
        if (error) throw error;
      }
      toast.success("Registro salvo");
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Financeiro do Pedido — {pi.numero}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {pi.cliente?.nome_fantasia || pi.cliente?.razao_social} · {pi.campanha}
          </p>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Número da Nota Fiscal</Label>
              <Input
                value={form.nota_fiscal_numero}
                onChange={(e) => setForm({ ...form, nota_fiscal_numero: e.target.value })}
                placeholder="Ex.: 000123"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vencimento do Boleto</Label>
              <Input
                type="date"
                value={form.vencimento_boleto}
                onChange={(e) => setForm({ ...form, vencimento_boleto: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status do Pagamento</Label>
              <Select
                value={form.status_pagamento}
                onValueChange={(v) => setForm({ ...form, status_pagamento: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status_pagamento === "pago" && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Data do Pagamento</Label>
                <Input
                  type="date"
                  value={form.data_pagamento}
                  onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1 rounded-lg border p-3 bg-muted/30">
              <Label className="text-xs font-semibold">Nota Fiscal (PDF/Imagem)</Label>
              <Input
                ref={nfRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setNfFile(e.target.files?.[0] ?? null)}
              />
              {fin?.nota_fiscal_path && !nfFile && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="size-3 text-emerald-600" /> Arquivo já anexado
                </p>
              )}
            </div>
            <div className="space-y-1 rounded-lg border p-3 bg-muted/30">
              <Label className="text-xs font-semibold">Boleto (PDF/Imagem)</Label>
              <Input
                ref={boletoRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setBoletoFile(e.target.files?.[0] ?? null)}
              />
              {fin?.boleto_path && !boletoFile && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="size-3 text-emerald-600" /> Arquivo já anexado
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Upload className="size-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
