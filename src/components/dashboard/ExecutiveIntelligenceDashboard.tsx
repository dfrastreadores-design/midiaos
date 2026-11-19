import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Layers,
  MapPin,
  Target,
  Percent,
  Handshake,
  Activity,
  ArrowUpRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Users,
  Compass,
  CheckCircle2,
  Clock,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatBRL } from "@/lib/mock-data";
import { getDashboardExecutivo } from "@/lib/dashboard-executivo.functions";
import { cn } from "@/lib/utils";

interface ExecutiveIntelligenceDashboardProps {
  className?: string;
  onNavigateToTab?: (tab: string) => void;
}

export function ExecutiveIntelligenceDashboard({ className }: ExecutiveIntelligenceDashboardProps) {
  const [periodo, setPeriodo] = useState<string>("ano_atual");
  const fetchExecutivoFn = useServerFn(getDashboardExecutivo);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-executivo-inteligencia", periodo],
    queryFn: () => fetchExecutivoFn({ data: { periodo } }),
    staleTime: 60_000,
  });

  const ind = data?.indicadores;
  const graf = data?.graficos;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Executivo & Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-card via-card to-primary/5 border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-0.5 px-2.5">
              <Sparkles className="size-3" />
              <span>Painel Executivo C-Level</span>
            </Badge>
            <span className="text-xs text-muted-foreground">• Gestão Estratégica & Inteligência</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Dashboard Executivo de Inteligência
          </h2>
          <p className="text-xs text-muted-foreground">
            Visão consolidada de performance financeira, taxa de ocupação de ativos, pipeline comercial e margens.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl bg-background font-medium">
              <SlidersHorizontal className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Mês Vigente</SelectItem>
              <SelectItem value="trimestre">Trimestre Atual</SelectItem>
              <SelectItem value="ano_atual">Ano Corrente (2026)</SelectItem>
              <SelectItem value="historico">Histórico Consolidado</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9 px-3 rounded-xl text-xs gap-1.5"
            title="Atualizar indicadores em tempo real"
          >
            <RefreshCw className={cn("size-3.5", (isLoading || isRefetching) && "animate-spin")} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Grid de 8 Indicadores Obrigatórios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Faturamento */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Faturamento Total
              </span>
              <div className="size-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : formatBRL(ind?.faturamento_total || 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                {(ind?.faturamento_variacao_pct ?? 0) >= 0 ? (
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <TrendingUp className="size-3.5 mr-0.5" />
                    +{ind?.faturamento_variacao_pct}%
                  </span>
                ) : (
                  <span className="flex items-center text-rose-600 font-bold">
                    <TrendingDown className="size-3.5 mr-0.5" />
                    {ind?.faturamento_variacao_pct}%
                  </span>
                )}
                <span className="text-muted-foreground text-[11px]">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Propostas Abertas */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Propostas Abertas
              </span>
              <div className="size-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FileText className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : ind?.propostas_abertas_qtd ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Pipeline: <strong className="text-foreground">{formatBRL(ind?.propostas_abertas_valor || 0)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. PIs Ativos */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                PIs Ativos (Contratos)
              </span>
              <div className="size-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : ind?.pis_ativos_qtd ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Volume: <strong className="text-foreground">{formatBRL(ind?.pis_ativos_valor || 0)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Campanhas em Andamento */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Campanhas Ativas
              </span>
              <div className="size-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Activity className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : ind?.campanhas_andamento_qtd ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Em veiculação ou planejamento estratégico
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Inventário Disponível */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Inventário Disponível
              </span>
              <div className="size-9 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Layers className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : `${ind?.inventario_disponivel_qtd ?? 0} pts`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                De <strong className="text-foreground">{ind?.inventario_total_qtd ?? 0}</strong> pontos cadastrados
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Taxa de Ocupação dos Pontos */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Ocupação dos Pontos
              </span>
              <div className="size-9 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Target className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : `${ind?.taxa_ocupacao_pontos ?? 0}%`}
              </div>
              <div className="mt-2 space-y-1">
                <Progress value={ind?.taxa_ocupacao_pontos ?? 0} className="h-1.5" />
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>Capacidade total</span>
                  <span>Meta: 85%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7. Margem Média */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Margem Média
              </span>
              <div className="size-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Percent className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : `${ind?.margem_media_pct ?? 0}%`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rentabilidade líquida sobre tabela
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 8. Comissões */}
        <Card className="rounded-3xl border shadow-xs hover:shadow-md transition-all group overflow-hidden">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Comissões
              </span>
              <div className="size-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Handshake className="size-4.5" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {isLoading ? "..." : formatBRL(ind?.comissoes_total || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Pendentes: <strong className="text-foreground">{formatBRL(ind?.comissoes_pendentes || 0)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Obrigatórios: Linha 1 (Receita por Período & Mídias Mais Vendidas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Receita por Período */}
        <Card className="lg:col-span-2 rounded-3xl border shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <span>Receita por Período & Metas</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Evolução do faturamento realizado versus meta e volume de propostas geradas.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Carregando gráfico de receita...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graf?.receita_por_periodo || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                    <XAxis dataKey="periodo" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatBRL(Number(value)), "Valor"]}
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid rgba(0,0,0,0.1)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento"
                      name="Faturamento Realizado"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#corFaturamento)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Mídias Mais Vendidas */}
        <Card className="rounded-3xl border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="size-4 text-primary" />
              <span>Mídias Mais Vendidas</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Mix de canais e participação na receita.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[210px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Carregando mix...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={graf?.midias_mais_vendidas || []}
                      dataKey="valor"
                      nameKey="midia"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {(graf?.midias_mais_vendidas || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#2563EB"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [formatBRL(Number(v)), "Receita"]}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-2 space-y-1.5">
              {(graf?.midias_mais_vendidas || []).slice(0, 3).map((item) => (
                <div key={item.midia} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold">{item.midia}</span>
                  </div>
                  <span className="text-muted-foreground font-medium">
                    {formatBRL(item.valor)} ({item.participacao_pct}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Obrigatórios: Linha 2 (Regiões Mais Utilizadas & Clientes Principais) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Regiões Mais Utilizadas */}
        <Card className="rounded-3xl border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="size-4 text-rose-500" />
              <span>Regiões & Praças Mais Utilizadas</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Concentração territorial de veiculações e investimento por praça.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[250px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Carregando regiões...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={graf?.regioes_mais_utilizadas || []}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                    <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="regiao" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip
                      formatter={(v: any) => [formatBRL(Number(v)), "Investimento"]}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="valor" name="Investimento" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 4: Clientes Principais */}
        <Card className="rounded-3xl border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="size-4 text-emerald-500" />
              <span>Clientes Principais (Top Anunciantes)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ranking de anunciantes com maior volume de faturamento consolidado.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Carregando ranking de clientes...
                </div>
              ) : (graf?.clientes_principais || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum anunciante faturado no período selecionado.
                </div>
              ) : (
                (graf?.clientes_principais || []).map((cliente, index) => (
                  <div
                    key={cliente.cliente_id}
                    className="p-3 rounded-2xl border bg-muted/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">
                          {cliente.cliente_nome}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {cliente.pis_count} PI(s) faturado(s) • {cliente.share_pct}% do share
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-foreground">
                        {formatBRL(cliente.valor_total)}
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                        Top Anunciante
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
