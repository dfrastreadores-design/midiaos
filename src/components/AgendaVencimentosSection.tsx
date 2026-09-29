import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Wallet,
  Filter,
  Search,
  Plus,
  Pencil,
  Building2,
  Handshake,
  FileText,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { TransacaoFinanceira } from "@/lib/financeiro.functions";

type Props = {
  transacoes: TransacaoFinanceira[];
  onDarBaixa: (transacao: TransacaoFinanceira) => void;
  onEditar: (transacao: TransacaoFinanceira) => void;
  onNovaEntrada: () => void;
  onNovaSaida: () => void;
};

type FiltroPrazo = "todos" | "atrasados" | "hoje" | "7dias" | "30dias";

function formatDateBr(dateStr: string) {
  if (!dateStr) return "—";
  const [ano, mes, dia] = dateStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function AgendaVencimentosSection({
  transacoes,
  onDarBaixa,
  onEditar,
  onNovaEntrada,
  onNovaSaida,
}: Props) {
  const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>("todos");
  const [busca, setBusca] = useState("");

  const hoje = new Date().toISOString().split("T")[0];

  // Cálculo de dias de vencimento para qualquer transação
  const getInfoVencimento = (dataVencimento: string) => {
    if (!dataVencimento) return { statusPrazo: "normal", dias: 0, label: "Sem data" };

    const tHoje = new Date(hoje + "T00:00:00").getTime();
    const tVenc = new Date(dataVencimento + "T00:00:00").getTime();
    const diffDias = Math.round((tVenc - tHoje) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      const diasAtraso = Math.abs(diffDias);
      return {
        statusPrazo: "atrasado" as const,
        dias: diasAtraso,
        label: `Atrasado há ${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"}`,
      };
    }
    if (diffDias === 0) {
      return {
        statusPrazo: "hoje" as const,
        dias: 0,
        label: "Vence Hoje",
      };
    }
    if (diffDias <= 7) {
      return {
        statusPrazo: "urgente" as const,
        dias: diffDias,
        label: `Vence em ${diffDias} ${diffDias === 1 ? "dia" : "dias"}`,
      };
    }
    if (diffDias <= 30) {
      return {
        statusPrazo: "mes" as const,
        dias: diffDias,
        label: `Vence em ${diffDias} dias (${formatDateBr(dataVencimento)})`,
      };
    }
    return {
      statusPrazo: "futuro" as const,
      dias: diffDias,
      label: formatDateBr(dataVencimento),
    };
  };

  // Separação e Filtros
  const { aReceber, aPagar, metricas } = useMemo(() => {
    const pendentes = transacoes.filter((t) => t.status === "pendente" || t.status === "agendado");

    let recAtrasados = 0;
    let recHoje = 0;
    let rec7Dias = 0;
    let recTotal = 0;

    let pagAtrasados = 0;
    let pagHoje = 0;
    let pag7Dias = 0;
    let pagTotal = 0;

    const listaRec: (TransacaoFinanceira & { infoPrazo: ReturnType<typeof getInfoVencimento> })[] =
      [];
    const listaPag: (TransacaoFinanceira & { infoPrazo: ReturnType<typeof getInfoVencimento> })[] =
      [];

    for (const t of pendentes) {
      const valor = Number(t.valor || 0);
      const info = getInfoVencimento(t.data_vencimento);

      if (t.tipo === "entrada") {
        recTotal += valor;
        if (info.statusPrazo === "atrasado") recAtrasados += valor;
        if (info.statusPrazo === "hoje") recHoje += valor;
        if (info.statusPrazo === "urgente" || info.statusPrazo === "hoje") rec7Dias += valor;
        listaRec.push({ ...t, infoPrazo: info });
      } else {
        pagTotal += valor;
        if (info.statusPrazo === "atrasado") pagAtrasados += valor;
        if (info.statusPrazo === "hoje") pagHoje += valor;
        if (info.statusPrazo === "urgente" || info.statusPrazo === "hoje") pag7Dias += valor;
        listaPag.push({ ...t, infoPrazo: info });
      }
    }

    // Ordenação: mais antigos/atrasados no topo
    listaRec.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    listaPag.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));

    // Filtragem por busca e prazo selecionado
    const filtrarItem = (item: (typeof listaRec)[0]) => {
      if (filtroPrazo === "atrasados" && item.infoPrazo.statusPrazo !== "atrasado") return false;
      if (filtroPrazo === "hoje" && item.infoPrazo.statusPrazo !== "hoje") return false;
      if (
        filtroPrazo === "7dias" &&
        item.infoPrazo.statusPrazo !== "hoje" &&
        item.infoPrazo.statusPrazo !== "urgente"
      )
        return false;
      if (filtroPrazo === "30dias" && item.infoPrazo.dias > 30) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        const clienteStr =
          `${item.cliente?.nome_fantasia || ""} ${item.cliente?.razao_social || ""}`.toLowerCase();
        const parceiroStr =
          `${item.parceiro?.nome_fantasia || ""} ${item.parceiro?.razao_social || ""}`.toLowerCase();
        const piStr = `${item.pi?.numero || ""} ${item.pi?.campanha || ""}`.toLowerCase();

        return (
          item.descricao.toLowerCase().includes(q) ||
          item.categoria.toLowerCase().includes(q) ||
          clienteStr.includes(q) ||
          parceiroStr.includes(q) ||
          piStr.includes(q)
        );
      }

      return true;
    };

    return {
      aReceber: listaRec.filter(filtrarItem),
      aPagar: listaPag.filter(filtrarItem),
      metricas: {
        recAtrasados,
        recHoje,
        rec7Dias,
        recTotal,
        pagAtrasados,
        pagHoje,
        pag7Dias,
        pagTotal,
      },
    };
  }, [transacoes, filtroPrazo, busca, hoje]);

  return (
    <div className="space-y-6">
      {/* KPI Cards de Vencimentos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Atrasados / Vencidos */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm bg-card hover:bg-muted/10 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Vencidos & Atrasados</span>
              <AlertTriangle className="size-4 text-rose-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDownLeft className="size-3 text-emerald-600" /> A Receber:
                </span>
                <span className="font-semibold font-mono text-emerald-600">
                  {formatBRL(metricas.recAtrasados)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="size-3 text-rose-600" /> A Pagar:
                </span>
                <span className="font-semibold font-mono text-rose-600">
                  {formatBRL(metricas.pagAtrasados)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground flex justify-between font-medium">
              <span>Saldo em Atraso</span>
              <span
                className={cn(
                  metricas.recAtrasados - metricas.pagAtrasados >= 0
                    ? "text-emerald-600"
                    : "text-rose-600",
                )}
              >
                {formatBRL(metricas.recAtrasados - metricas.pagAtrasados)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Vencendo Hoje */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card hover:bg-muted/10 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Vencendo Hoje ({formatDateBr(hoje)})</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDownLeft className="size-3 text-emerald-600" /> Entradas:
                </span>
                <span className="font-semibold font-mono text-emerald-600">
                  {formatBRL(metricas.recHoje)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="size-3 text-rose-600" /> Saídas:
                </span>
                <span className="font-semibold font-mono text-rose-600">
                  {formatBRL(metricas.pagHoje)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground flex justify-between font-medium">
              <span>Previsão Líquida Hoje</span>
              <span
                className={cn(
                  metricas.recHoje - metricas.pagHoje >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {formatBRL(metricas.recHoje - metricas.pagHoje)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Próximos 7 Dias */}
        <Card className="border-l-4 border-l-indigo-500 shadow-sm bg-card hover:bg-muted/10 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Próximos 7 Dias</span>
              <CalendarDays className="size-4 text-indigo-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDownLeft className="size-3 text-emerald-600" /> A Receber:
                </span>
                <span className="font-semibold font-mono text-emerald-600">
                  {formatBRL(metricas.rec7Dias)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="size-3 text-rose-600" /> A Pagar:
                </span>
                <span className="font-semibold font-mono text-rose-600">
                  {formatBRL(metricas.pag7Dias)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground flex justify-between font-medium">
              <span>Liquidez da Semana</span>
              <span
                className={cn(
                  metricas.rec7Dias - metricas.pag7Dias >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {formatBRL(metricas.rec7Dias - metricas.pag7Dias)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Total Pendente da Carteira */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card hover:bg-muted/10 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Carteira Total em Aberto</span>
              <Wallet className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowDownLeft className="size-3 text-emerald-600" /> Total a Receber:
                </span>
                <span className="font-semibold font-mono text-emerald-600">
                  {formatBRL(metricas.recTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ArrowUpRight className="size-3 text-rose-600" /> Total a Pagar:
                </span>
                <span className="font-semibold font-mono text-rose-600">
                  {formatBRL(metricas.pagTotal)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground flex justify-between font-medium">
              <span>Resultado Futuro</span>
              <span
                className={cn(
                  metricas.recTotal - metricas.pagTotal >= 0
                    ? "text-emerald-600 font-bold"
                    : "text-rose-600 font-bold",
                )}
              >
                {formatBRL(metricas.recTotal - metricas.pagTotal)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros de Vencimento e Busca */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="size-3.5" /> Prazos:
            </span>

            <Button
              type="button"
              variant={filtroPrazo === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPrazo("todos")}
              className="h-8 text-xs rounded-lg"
            >
              Todos os Prazos
            </Button>

            <Button
              type="button"
              variant={filtroPrazo === "atrasados" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFiltroPrazo("atrasados")}
              className={cn(
                "h-8 text-xs rounded-lg gap-1",
                filtroPrazo !== "atrasados" &&
                  (metricas.recAtrasados > 0 || metricas.pagAtrasados > 0) &&
                  "border-rose-400 text-rose-600 dark:text-rose-400",
              )}
            >
              <AlertTriangle className="size-3.5" />
              Vencidos / Atrasados
              {(metricas.recAtrasados > 0 || metricas.pagAtrasados > 0) && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                  !
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant={filtroPrazo === "hoje" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPrazo("hoje")}
              className={cn(
                "h-8 text-xs rounded-lg gap-1",
                filtroPrazo !== "hoje" && "border-amber-400 text-amber-600",
              )}
            >
              <Clock className="size-3.5" />
              Vencem Hoje
            </Button>

            <Button
              type="button"
              variant={filtroPrazo === "7dias" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPrazo("7dias")}
              className="h-8 text-xs rounded-lg gap-1"
            >
              <CalendarDays className="size-3.5" />
              Próximos 7 Dias
            </Button>

            <Button
              type="button"
              variant={filtroPrazo === "30dias" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroPrazo("30dias")}
              className="h-8 text-xs rounded-lg"
            >
              Próximos 30 Dias
            </Button>
          </div>

          <div className="flex items-center gap-2 min-w-[260px]">
            <Input
              placeholder="Buscar por descrição, cliente, parceiro..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid de 2 Colunas: Contas a Receber vs Contas a Pagar */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* COLUNA ESQUERDA: CONTAS A RECEBER (ENTRADAS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <ArrowDownLeft className="size-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  Contas a Receber
                  <Badge
                    variant="outline"
                    className="text-[11px] border-emerald-500/40 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                  >
                    {aReceber.length} pendente{aReceber.length === 1 ? "" : "s"}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Entradas e faturamentos ordenados por data de vencimento
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={onNovaEntrada}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
            >
              <Plus className="size-3.5" />
              Nova Entrada
            </Button>
          </div>

          {aReceber.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500/60" />
                <p className="text-sm font-medium text-foreground">Nenhum recebimento pendente</p>
                <p className="text-xs">
                  Não existem títulos ou entradas a receber com os filtros selecionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {aReceber.map((item) => {
                const isAtrasado = item.infoPrazo.statusPrazo === "atrasado";
                const isHoje = item.infoPrazo.statusPrazo === "hoje";

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "shadow-sm transition-all hover:shadow-md border-l-4",
                      isAtrasado
                        ? "border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10"
                        : isHoje
                          ? "border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
                          : "border-l-emerald-500",
                    )}
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {item.descricao}
                            </span>
                            {item.recorrente && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 text-primary border-primary/40"
                              >
                                Recorrente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.categoria}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold font-mono text-base text-emerald-600 dark:text-emerald-400">
                            +{formatBRL(Number(item.valor))}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {item.forma_pagamento || "PIX"}
                          </span>
                        </div>
                      </div>

                      {/* Vínculo Comercial (Cliente / PI) */}
                      {(item.cliente || item.pi) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-1.5 rounded-md">
                          {item.cliente && (
                            <span className="font-medium text-foreground flex items-center gap-1 truncate">
                              <Building2 className="size-3 text-primary shrink-0" />
                              {item.cliente.nome_fantasia || item.cliente.razao_social}
                            </span>
                          )}
                          {item.pi && (
                            <span className="font-mono text-[11px] text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
                              <FileText className="size-3" />
                              PI {item.pi.numero}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Barra de Status do Vencimento e Ações */}
                      <div className="flex items-center justify-between pt-1 border-t text-xs">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isAtrasado ? "destructive" : isHoje ? "default" : "outline"}
                            className={cn(
                              "text-[10px] font-semibold py-0.5 px-2",
                              isHoje && "bg-amber-500 hover:bg-amber-600 text-white",
                            )}
                          >
                            <Calendar className="size-3 mr-1 inline" />
                            {item.infoPrazo.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Vencimento: {formatDateBr(item.data_vencimento)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditar(item)}
                            className="size-7 p-0"
                            title="Editar lançamento"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => onDarBaixa(item)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 shadow-xs"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Receber
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: CONTAS A PAGAR (SAÍDAS) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                <ArrowUpRight className="size-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  Contas a Pagar
                  <Badge
                    variant="outline"
                    className="text-[11px] border-rose-500/40 text-rose-700 bg-rose-50 dark:bg-rose-950/20"
                  >
                    {aPagar.length} pendente{aPagar.length === 1 ? "" : "s"}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Despesas, comissões, tributos e repasses a vencer
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={onNovaSaida}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1 shadow-sm"
            >
              <Plus className="size-3.5" />
              Nova Saída
            </Button>
          </div>

          {aPagar.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500/60" />
                <p className="text-sm font-medium text-foreground">
                  Nenhuma conta a pagar pendente
                </p>
                <p className="text-xs">
                  Parabéns! Todas as despesas e repasses deste período estão quitados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {aPagar.map((item) => {
                const isAtrasado = item.infoPrazo.statusPrazo === "atrasado";
                const isHoje = item.infoPrazo.statusPrazo === "hoje";

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "shadow-sm transition-all hover:shadow-md border-l-4",
                      isAtrasado
                        ? "border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10"
                        : isHoje
                          ? "border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10"
                          : "border-l-rose-400",
                    )}
                  >
                    <CardContent className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {item.descricao}
                            </span>
                            {item.recorrente && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 text-primary border-primary/40"
                              >
                                Recorrente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.categoria}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold font-mono text-base text-rose-600 dark:text-rose-400">
                            -{formatBRL(Number(item.valor))}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {item.forma_pagamento || "PIX"}
                          </span>
                        </div>
                      </div>

                      {/* Vínculo (Parceiro / Fornecedor / PI) */}
                      {(item.parceiro || item.pi) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-1.5 rounded-md">
                          {item.parceiro && (
                            <span className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-1 truncate">
                              <Handshake className="size-3 shrink-0" />
                              {item.parceiro.nome_fantasia || item.parceiro.razao_social}
                            </span>
                          )}
                          {item.pi && (
                            <span className="font-mono text-[11px] text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
                              <FileText className="size-3" />
                              PI {item.pi.numero}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Barra de Status do Vencimento e Ações */}
                      <div className="flex items-center justify-between pt-1 border-t text-xs">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isAtrasado ? "destructive" : isHoje ? "default" : "outline"}
                            className={cn(
                              "text-[10px] font-semibold py-0.5 px-2",
                              isHoje && "bg-amber-500 hover:bg-amber-600 text-white",
                            )}
                          >
                            <Calendar className="size-3 mr-1 inline" />
                            {item.infoPrazo.label}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Vencimento: {formatDateBr(item.data_vencimento)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditar(item)}
                            className="size-7 p-0"
                            title="Editar lançamento"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => onDarBaixa(item)}
                            className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1 px-2.5 shadow-xs"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Pagar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
