import { createFileRoute, Link } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, DollarSign, FileText, Users, ArrowUpRight, ArrowDownRight,
  Activity, PieChart as PieIcon, BarChart3, LineChart as LineIcon,
  Trophy, Building2, Target, ListChecks, Sparkles, Settings2, RotateCcw, ChevronUp, ChevronDown, GripVertical,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useDashboardPrefs, WIDGET_LABELS, ACCENT_PRESETS, type WidgetId } from "@/hooks/use-dashboard-prefs";


import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { WelcomeHero } from "@/components/WelcomeHero";
import { DashboardCalendarWidget } from "@/components/DashboardCalendarWidget";

import { getDashboard, getVendasMes } from "@/lib/dashboard.functions";
import { listUsuarios } from "@/lib/usuarios.functions";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrillDownDialog } from "@/components/DrillDownDialog";
import { setActingAsExecutivo, useActingAsExecutivo } from "@/hooks/use-acting-as";



export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Início — Mídia.OS" }] }),
  component: Dashboard,
});

const formatBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const KPI = ({ label, value, subValue, delta, deltaPositive, icon: Icon, tone = "blue" }: any) => {
  const DeltaIcon = deltaPositive ? ArrowUpRight : ArrowDownRight;
  const tones: Record<string, string> = {
    blue: "bg-[oklch(0.55_0.15_235)] text-white",
    red: "bg-[oklch(0.60_0.20_25)] text-white",
    teal: "bg-[oklch(0.58_0.12_195)] text-white",
    amber: "bg-[oklch(0.68_0.15_65)] text-white",
    green: "bg-[oklch(0.55_0.14_155)] text-white",
    slate: "bg-[oklch(0.35_0.03_240)] text-white",
  };
  return (
    <Card className={`relative overflow-hidden border-0 rounded-xl shadow-md transition-transform hover:-translate-y-0.5 ${tones[tone] ?? tones.blue}`}>
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-4xl font-bold tracking-tight tabular-nums leading-none">
              {value}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider opacity-90">{label}</div>
            {subValue && (
              <div className="mt-1 text-[11px] opacity-80">
                Líquido <span className="font-semibold tabular-nums">{subValue}</span>
              </div>
            )}
            {delta && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                <DeltaIcon className="size-3" /> {delta}
              </div>
            )}
          </div>
          <div className="shrink-0 size-14 rounded-lg bg-white/15 flex items-center justify-center">
            <Icon className="size-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TONE_BG: Record<string, string> = {
  blue: "bg-[oklch(0.55_0.15_235)] text-white",
  red: "bg-[oklch(0.60_0.20_25)] text-white",
  teal: "bg-[oklch(0.58_0.12_195)] text-white",
  amber: "bg-[oklch(0.68_0.15_65)] text-white",
  green: "bg-[oklch(0.55_0.14_155)] text-white",
  slate: "bg-[oklch(0.35_0.03_240)] text-white",
  violet: "bg-[oklch(0.55_0.18_295)] text-white",
  rose: "bg-[oklch(0.62_0.17_10)] text-white",
};

const SectionHeader = ({
  icon: Icon, title, subtitle, tone = "blue", right,
}: { icon: any; title: string; subtitle?: string; tone?: string; right?: ReactNode }) => (
  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/40 pb-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`shrink-0 size-10 rounded-lg flex items-center justify-center shadow-sm ${TONE_BG[tone] ?? TONE_BG.blue}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <CardTitle className="text-sm font-bold uppercase tracking-wide text-foreground/90">{title}</CardTitle>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {right}
  </CardHeader>
);

const EmptyState = ({
  icon: Icon = Sparkles, title, hint, action,
}: { icon?: any; title: string; hint?: string; action?: { label: string; to: string } }) => (
  <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 text-center p-6">
    <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
      <Icon className="size-5" />
    </div>
    <div className="text-sm font-semibold text-foreground/80">{title}</div>
    {hint && <p className="text-[12px] text-muted-foreground max-w-xs">{hint}</p>}
    {action && (
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    )}
  </div>
);


type MixChartItem = { name: string; value: number };

const useResponsiveChartKey = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setChartKey((key) => key + 1));
    };

    const observer = new ResizeObserver(refresh);
    observer.observe(element);
    window.addEventListener("orientationchange", refresh);
    window.addEventListener("resize", refresh);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("orientationchange", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  return { ref, chartKey };
};

const MixProdutoChart = ({ data, colors }: { data: MixChartItem[]; colors: string[] }) => {
  const { ref, chartKey } = useResponsiveChartKey();

  return (
    <div ref={ref} className="flex h-full min-h-72 flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer key={chartKey} width="100%" height="100%" debounce={80}>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="68%"
              paddingAngle={2}
              minAngle={4}
              isAnimationActive={false}
            >
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatBRL(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid max-h-20 shrink-0 grid-cols-1 gap-x-3 gap-y-1 overflow-y-auto pr-1 text-[11px] leading-tight sm:grid-cols-2">
        {data.map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex min-w-0 items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={item.name}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isParceiroComercial, isAdmin } = useUserRoles();
  const actingAs = useActingAsExecutivo();
  const [execFilter, setExecFilter] = useState<string>(actingAs ?? "all");
  const filterId = isAdmin && execFilter !== "all" ? execFilter : null;
  const { prefs, isVisible, toggle, move, reorder, getOrder, setAccent, reset, all } = useDashboardPrefs();
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [overId, setOverId] = useState<WidgetId | null>(null);


  const [drill, setDrill] = useState<import("@/components/DrillDownDialog").DrillDownState>({
    open: false, title: "", filter: {},
  });
  const openDrill = (title: string, filter: import("@/lib/dashboard.functions").DrillFilter, subtitle?: string) =>
    setDrill({ open: true, title, subtitle, filter: { executivoId: filterId, ...filter } });
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id, filterId],
    queryFn: () => getDashboard({ data: { executivoId: filterId } }),
    enabled: !!user && !authLoading && !isParceiroComercial,
  });
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios-dashboard"],
    queryFn: () => listUsuarios(),
    enabled: isAdmin,
  });


  if (isParceiroComercial) {
    return (
      <AppShell>
        <WelcomeHero />
        <div className="mt-8 text-center p-12 border rounded-xl bg-muted/30">
          <FileText className="size-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Bem-vindo, Parceiro!</h1>
          <p className="text-muted-foreground">Você está no portal de parceiros comerciais.</p>
        </div>
      </AppShell>
    );
  }

  const colors = [
    "oklch(0.38 0.09 165)",
    "oklch(0.62 0.14 155)",
    "oklch(0.78 0.13 85)",
    "oklch(0.55 0.08 195)",
    "oklch(0.70 0.12 50)",
    "oklch(0.50 0.10 25)",
  ];

  const kpis = data?.kpis;
  const deltaFat = kpis?.deltaFat ?? 0;

  return (
    <AppShell>
      <div style={prefs.accent ? ({ ["--primary" as any]: prefs.accent } as React.CSSProperties) : undefined}>
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/[0.08] via-background to-gold/[0.06] p-6 lg:p-8">

        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Painel em tempo real
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Dashboard Executivo
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Visão geral do desempenho comercial e financeiro</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Select value={execFilter} onValueChange={(v) => { setExecFilter(v); setActingAsExecutivo(isAdmin && v !== "all" ? v : null); }}>
                <SelectTrigger className="w-[220px] rounded-full bg-background/70 backdrop-blur"><SelectValue placeholder="Filtrar por executivo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os executivos</SelectItem>
                  {usuarios.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-2 bg-background/70 backdrop-blur">
                  <Settings2 className="size-4" /> Personalizar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personalizar</div>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={reset}>
                    <RotateCcw className="size-3" /> Restaurar
                  </Button>
                </div>
                <div className="border-b p-3">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cor de destaque</div>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_PRESETS.map((c) => {
                      const active = prefs.accent === c.value;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.label}
                          onClick={() => setAccent(c.value)}
                          className={`size-7 rounded-full border-2 transition ${active ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                          style={{ background: c.value ? `hsl(${c.value})` : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--muted)))" }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Widgets e ordem</div>
                  {all.map((id, idx) => (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => { setDragId(id as WidgetId); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overId !== id) setOverId(id as WidgetId); }}
                      onDrop={(e) => { e.preventDefault(); if (dragId) reorder(dragId, id as WidgetId); setDragId(null); setOverId(null); }}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted/60 cursor-grab active:cursor-grabbing transition
                        ${dragId === id ? "opacity-40" : ""}
                        ${overId === id && dragId && dragId !== id ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
                    >
                      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                      <Checkbox checked={isVisible(id as WidgetId)} onCheckedChange={() => toggle(id as WidgetId)} />
                      <span className="flex-1 truncate">{WIDGET_LABELS[id as WidgetId]}</span>
                      <Button variant="ghost" size="icon" className="size-6" disabled={idx === 0} onClick={() => move(id as WidgetId, -1)}>
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" disabled={idx === all.length - 1} onClick={() => move(id as WidgetId, 1)}>
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>
                  ))}

                </div>
              </PopoverContent>

            </Popover>
            <Badge variant="secondary" className="hidden rounded-full px-3 py-1 capitalize md:inline-flex">{data?.periodo ?? "—"}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {isVisible("kpi_faturamento") && (
        <KPI
          label="Faturamento do mês"
          value={isLoading ? "…" : formatBRL(kpis?.faturamentoMes ?? 0)}
          subValue={isLoading ? undefined : formatBRL(kpis?.faturamentoMesLiquido ?? 0)}
          delta={`${deltaFat >= 0 ? "+" : ""}${deltaFat.toFixed(1)}% vs mês anterior`}
          deltaPositive={deltaFat >= 0}
          icon={DollarSign}
          tone="blue"
        />)}
        {isVisible("kpi_propostas") && (
        <KPI
          label="Propostas ativas"
          value={isLoading ? "…" : String(kpis?.propostasAtivas ?? 0)}
          icon={FileText}
          tone="red"
        />)}
        {isVisible("kpi_pipeline") && (
        <KPI
          label="Pipeline aberto"
          value={isLoading ? "…" : formatBRL(kpis?.pipelineAberto ?? 0)}
          subValue={isLoading ? undefined : formatBRL(kpis?.pipelineAbertoLiquido ?? 0)}
          icon={TrendingUp}
          tone="teal"
          deltaPositive
        />)}
        {isVisible("kpi_clientes") && (
        <KPI
          label="Clientes ativos"
          value={isLoading ? "…" : String(kpis?.clientesAtivos ?? 0)}
          icon={Users}
          tone="amber"
          deltaPositive
        />)}
      </div>



      {isVisible("vendas_mes") && <VendasMesCard executivoId={filterId} />}

      {(() => {
        const has = {
          fat: (data?.faturamentoMensal?.length ?? 0) > 0,
          mix: (data?.mixProduto?.length ?? 0) > 0,
          funil: (data?.funil ?? []).length > 0 && !(data?.funil ?? []).every((f) => f.valor === 0),
          topExec: (data?.desempenhoExecutivos ?? []).length > 0,
          desemp: (data?.desempenhoExecutivos?.length ?? 0) > 0,
          comp: (data?.vendasComparativo?.length ?? 0) > 0,
          tcli: (data?.topClientes?.length ?? 0) > 0,
          tag: (data?.topAgencias?.length ?? 0) > 0,
          piSt: (data?.piStatusDist?.length ?? 0) > 0,
          propSt: (data?.propostasStatusDist?.length ?? 0) > 0,
        };
        const ord = (h: boolean, _i: number, id?: WidgetId) => ({ order: h ? (id ? getOrder(id) : _i) : 100 + _i });
        const dim = "opacity-60";
        return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-6">
        <Card style={ord(has.fat, 1, "faturamento_meta")} className={`lg:col-span-4 ${has.fat ? "" : dim} ${isVisible("faturamento_meta") ? "" : "hidden"}`}>
          <SectionHeader icon={LineIcon} tone="blue" title="Faturamento vs Meta" subtitle="Comparativo mensal — bruto, líquido e meta" />
          <CardContent className="h-72 pt-4">
            {!has.fat ? (
              <EmptyState icon={LineIcon} title="Sem faturamento registrado" hint="Emita seu primeiro PI para acompanhar a evolução mês a mês." action={{ label: "Criar PI", to: "/pi" }} />
            ) : (

              <ResponsiveContainer>
                <AreaChart data={data?.faturamentoMensal ?? []}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.38 0.09 165)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="oklch(0.38 0.09 165)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 145)" />
                  <XAxis dataKey="mes" stroke="oklch(0.50 0.03 165)" fontSize={12} />
                  <YAxis stroke="oklch(0.50 0.03 165)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.90 0.01 145)" }} />
                  <Area type="monotone" dataKey="meta" name="Meta" stroke="oklch(0.78 0.13 85)" strokeDasharray="4 4" fill="transparent" />
                  <Area type="monotone" dataKey="valor" name="Bruto" stroke="oklch(0.38 0.09 165)" strokeWidth={2} fill="url(#g1)" />
                  <Area type="monotone" dataKey="liquido" name="Líquido" stroke="oklch(0.62 0.14 155)" strokeWidth={2} fill="transparent" />
                  <Legend iconType="circle" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card style={ord(has.mix, 2, "mix")} className={`lg:col-span-2 ${has.mix ? "" : dim} ${isVisible("mix") ? "" : "hidden"}`}>
          <SectionHeader icon={PieIcon} tone="violet" title="Mix por Tipo" subtitle="Distribuição por categoria de produto" />
          <CardContent className="h-80 pt-4 pb-4">
            {!has.mix ? (
              <EmptyState icon={PieIcon} title="Sem mix de produtos" hint="Cadastre produtos e vincule-os aos PIs para visualizar o mix." action={{ label: "Cadastrar produto", to: "/produtos" }} />
            ) : (
              <MixProdutoChart data={data?.mixProduto ?? []} colors={colors} />
            )}
          </CardContent>
        </Card>


        <Card style={ord(has.funil, 3, "funil")} className={`lg:col-span-4 ${has.funil ? "" : dim} ${isVisible("funil") ? "" : "hidden"}`}>
          <SectionHeader icon={Target} tone="red" title="Funil de PIs" subtitle="Clique em um estágio para ver os PIs" />
          <CardContent className="space-y-3 pt-4">

            {(data?.funil ?? []).map((f) => {
              const max = Math.max(...(data?.funil ?? []).map((x) => x.valor), 1);
              const pct = (f.valor / max) * 100;
              const stageMap: Record<string, string[]> = {
                "Rascunho": ["rascunho"],
                "Enviado": ["enviado", "aguardando_aprovacao", "aguardando_assinatura", "assinado"],
                "Aprovado": ["aprovado", "enviar_opec"],
                "Faturado": ["faturado", "finalizado"],
              };
              return (
                <button
                  key={f.stage}
                  type="button"
                  onClick={() => openDrill(`PIs — ${f.stage}`, { status: stageMap[f.stage] ?? null }, "Ano corrente")}
                  className="w-full text-left rounded-lg p-2 -m-2 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{f.stage}</span>
                    <span className="text-muted-foreground">
                      {formatBRL(f.valor)}
                      <span className="ml-2 text-xs">(líq. {formatBRL((f as any).liquido ?? 0)})</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </button>
              );
            })}
            {!isLoading && !has.funil && (
              <EmptyState icon={Target} title="Funil vazio" hint="Crie um Pedido de Inserção para iniciar o funil comercial." action={{ label: "Criar PI", to: "/pi" }} />
            )}

          </CardContent>
        </Card>


        <Card style={ord(has.topExec, 4, "top_exec")} className={`lg:col-span-2 ${has.topExec ? "" : dim} ${isVisible("top_exec") ? "" : "hidden"}`}>
          <SectionHeader icon={Trophy} tone="amber" title="Top Executivos" subtitle="Ranking do ano" />
          <CardContent className="space-y-2 pt-4">

            {(data?.desempenhoExecutivos ?? []).slice(0, 5).map((e: any) => (
              <button
                key={e.id ?? e.nome}
                type="button"
                onClick={() => openDrill(`PIs — ${e.nome}`, { executivoId: e.id ?? null }, "Faturado no ano")}
                className="w-full flex items-center justify-between rounded-lg p-2 -m-2 transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-left"
              >
                <div>
                  <div className="text-sm font-medium">{e.nome}</div>
                  <div className="text-xs text-muted-foreground">{e.deals} PI{e.deals !== 1 ? "s" : ""} faturado{e.deals !== 1 ? "s" : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{formatBRL(e.vendas)}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">líq. {formatBRL(e.vendasLiq ?? 0)}</div>
                </div>
              </button>
            ))}

            {!isLoading && !has.topExec && (
              <EmptyState icon={Trophy} title="Sem faturamento no ano" hint="Fature um PI para começar a ranquear seus executivos." action={{ label: "Ver PIs", to: "/pi" }} />
            )}

          </CardContent>
        </Card>

        <Card style={ord(has.desemp, 5, "desemp")} className={`lg:col-span-6 ${has.desemp ? "" : dim} ${isVisible("desemp") ? "" : "hidden"}`}>
          <SectionHeader icon={BarChart3} tone="blue" title="Desempenho dos Executivos" subtitle="Comparativo bruto x líquido faturado no ano" />
          <CardContent className="h-64 pt-4">
            {!has.desemp ? (
              <EmptyState icon={BarChart3} title="Sem desempenho para exibir" hint="Assim que houver faturamento no ano, o comparativo aparece aqui." action={{ label: "Ver executivos", to: "/usuarios" }} />
            ) : (

              <ResponsiveContainer>
                <BarChart data={data?.desempenhoExecutivos ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 145)" />
                  <XAxis dataKey="nome" stroke="oklch(0.50 0.03 165)" fontSize={12} />
                  <YAxis stroke="oklch(0.50 0.03 165)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8 }} cursor={{ fill: "oklch(0.95 0.01 145)" }} />
                  <Bar
                    dataKey="vendas" name="Bruto" fill="oklch(0.38 0.09 165)" radius={[6, 6, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(d: any) => openDrill(`PIs — ${d?.nome ?? ""}`, { executivoId: d?.id ?? null }, "Faturado no ano")}
                  />
                  <Bar
                    dataKey="vendasLiq" name="Líquido" fill="oklch(0.62 0.14 155)" radius={[6, 6, 0, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(d: any) => openDrill(`PIs — ${d?.nome ?? ""}`, { executivoId: d?.id ?? null }, "Faturado no ano")}
                  />
                  <Legend iconType="circle" />
                </BarChart>
              </ResponsiveContainer>

            )}
          </CardContent>
        </Card>

        <Card style={ord(has.comp, 6, "comp")} className={`lg:col-span-6 ${has.comp ? "" : dim} ${isVisible("comp") ? "" : "hidden"}`}>
          <SectionHeader icon={Activity} tone="teal" title="Vendas — Ano atual vs Anterior" subtitle="Evolução mensal comparada ao ano passado" />
          <CardContent className="h-72 pt-4">
            {!has.comp ? (
              <EmptyState icon={Activity} title="Sem comparativo anual" hint="Registre vendas para acompanhar a evolução ano a ano." action={{ label: "Nova proposta", to: "/propostas" }} />
            ) : (

              <ResponsiveContainer>
                <LineChart data={data?.vendasComparativo ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 145)" />
                  <XAxis dataKey="mes" stroke="oklch(0.50 0.03 165)" fontSize={12} />
                  <YAxis stroke="oklch(0.50 0.03 165)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8 }} />
                  <Line type="monotone" dataKey="atual" name="Ano atual" stroke="oklch(0.38 0.09 165)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="anterior" name="Ano anterior" stroke="oklch(0.70 0.12 50)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Legend iconType="circle" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card style={ord(has.tcli, 7, "top_cli")} className={`lg:col-span-3 ${has.tcli ? "" : dim} ${isVisible("top_cli") ? "" : "hidden"}`}>
          <SectionHeader icon={Users} tone="green" title="Top Clientes" subtitle="Investimento no ano" />
          <CardContent className="h-72 pt-4">
            {!has.tcli ? (
              <EmptyState icon={Users} title="Sem clientes ainda" hint="Cadastre clientes e vincule PIs para ver o ranking." action={{ label: "Cadastrar cliente", to: "/clientes" }} />
            ) : (

              <ResponsiveContainer>
                <BarChart data={data?.topClientes ?? []} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 145)" />
                  <XAxis type="number" stroke="oklch(0.50 0.03 165)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis dataKey="nome" type="category" stroke="oklch(0.50 0.03 165)" fontSize={11} width={110} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8 }} cursor={{ fill: "oklch(0.95 0.01 145)" }} />
                  <Bar
                    dataKey="valor" name="Investimento" fill="oklch(0.38 0.09 165)" radius={[0, 6, 6, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(d: any) => openDrill(`PIs — ${d?.nome ?? ""}`, { clienteNome: d?.nome ?? null }, "Cliente")}
                  />
                </BarChart>
              </ResponsiveContainer>

            )}
          </CardContent>
        </Card>

        <Card style={ord(has.tag, 8, "top_ag")} className={`lg:col-span-3 ${has.tag ? "" : dim} ${isVisible("top_ag") ? "" : "hidden"}`}>
          <SectionHeader icon={Building2} tone="slate" title="Top Agências" subtitle="Investimento no ano" />
          <CardContent className="h-72 pt-4">
            {!has.tag ? (
              <EmptyState icon={Building2} title="Sem agências ainda" hint="Vincule agências aos seus PIs para gerar o ranking." action={{ label: "Cadastrar agência", to: "/agencias" }} />
            ) : (

              <ResponsiveContainer>
                <BarChart data={data?.topAgencias ?? []} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 145)" />
                  <XAxis type="number" stroke="oklch(0.50 0.03 165)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis dataKey="nome" type="category" stroke="oklch(0.50 0.03 165)" fontSize={11} width={110} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8 }} cursor={{ fill: "oklch(0.95 0.01 145)" }} />
                  <Bar
                    dataKey="valor" name="Investimento" fill="oklch(0.62 0.14 155)" radius={[0, 6, 6, 0]}
                    style={{ cursor: "pointer" }}
                    onClick={(d: any) => openDrill(`PIs — ${d?.nome ?? ""}`, { agenciaNome: d?.nome ?? null }, "Agência")}
                  />
                </BarChart>
              </ResponsiveContainer>

            )}
          </CardContent>
        </Card>

        <Card style={ord(has.piSt, 9, "pi_status")} className={`lg:col-span-3 ${has.piSt ? "" : dim} ${isVisible("pi_status") ? "" : "hidden"}`}>
          <SectionHeader icon={ListChecks} tone="rose" title="PIs por Status" subtitle="Distribuição atual — clique para detalhar" />
          <CardContent className="h-72 pt-4">
            {!has.piSt ? (
              <EmptyState icon={ListChecks} title="Nenhum PI cadastrado" hint="Após emitir PIs, veja aqui a distribuição por status." action={{ label: "Criar PI", to: "/pi" }} />
            ) : (

              <ResponsiveContainer>
                <PieChart margin={{ top: 8, right: 8, bottom: 32, left: 8 }}>
                  <Pie
                    data={data?.piStatusDist ?? []} dataKey="value" nameKey="name"
                    cx="50%" cy="45%" innerRadius="35%" outerRadius="65%" paddingAngle={2} minAngle={4}
                    style={{ cursor: "pointer" }}
                    onClick={(d: any) => openDrill(`PIs — ${d?.name ?? ""}`, { status: d?.name ?? null }, "Distribuição por status")}
                  >
                    {(data?.piStatusDist ?? []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11, lineHeight: '14px' }} />
                </PieChart>
              </ResponsiveContainer>

            )}
          </CardContent>
        </Card>

        <Card style={ord(has.propSt, 10, "prop_status")} className={`lg:col-span-3 ${has.propSt ? "" : dim} ${isVisible("prop_status") ? "" : "hidden"}`}>
          <SectionHeader icon={FileText} tone="violet" title="Propostas por Status" subtitle="Como está seu pipeline de propostas" />
          <CardContent className="h-72 pt-4">
            {!has.propSt ? (
              <EmptyState icon={FileText} title="Nenhuma proposta ainda" hint="Envie propostas comerciais para visualizar a distribuição." action={{ label: "Nova proposta", to: "/propostas" }} />
            ) : (

              <ResponsiveContainer>
                <PieChart margin={{ top: 8, right: 8, bottom: 32, left: 8 }}>
                  <Pie data={data?.propostasStatusDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius="35%" outerRadius="65%" paddingAngle={2} minAngle={4}>
                    {(data?.propostasStatusDist ?? []).map((_, i) => <Cell key={i} fill={colors[(i + 2) % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11, lineHeight: '14px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
        );
      })()}

      {isVisible("calendario") && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-6 gap-4" style={{ order: getOrder("calendario") }}>
          <DashboardCalendarWidget />
        </div>
      )}

      {isVisible("welcome_hero") && (
        <div className="mt-6" style={{ order: getOrder("welcome_hero") }}>
          <WelcomeHero />
        </div>
      )}


      <DrillDownDialog state={drill} onOpenChange={(open) => setDrill((s) => ({ ...s, open }))} />
      </div>
    </AppShell>


  );
}

const MESES_NOMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function VendasMesCard({ executivoId }: { executivoId: string | null }) {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const { data, isLoading } = useQuery({
    queryKey: ["vendas-mes", ano, mes, executivoId],
    queryFn: () => getVendasMes({ data: { ano, mes, executivoId } }),
  });
  const anos = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const total = data?.total ?? 0;
  const meta = data?.meta ?? 0;
  const pct = meta > 0 ? Math.min(100, (total / meta) * 100) : 0;

  return (
    <Card className="mb-6">
      <SectionHeader
        icon={DollarSign}
        tone="green"
        title="Vendas alcançadas no mês"
        subtitle={
          meta > 0
            ? `Total ${formatBRL(total)} · Meta ${formatBRL(meta)} (${pct.toFixed(0)}%)`
            : `Total ${formatBRL(total)}`
        }
        right={
          <div className="flex gap-2">
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES_NOMES.map((n, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <CardContent className="h-72 pt-4">
        {isLoading ? (
          <EmptyState icon={Activity} title="Carregando vendas do mês…" />
        ) : (data?.porDia ?? []).every((d) => d.valor === 0) ? (
          <EmptyState icon={DollarSign} title="Sem vendas neste mês" hint="Envie propostas ou emita PIs para começar a registrar vendas." action={{ label: "Criar PI", to: "/pi" }} />
        ) : (

          <ResponsiveContainer>
            <BarChart data={data?.porDia ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 145)" />
              <XAxis dataKey="dia" stroke="oklch(0.50 0.03 165)" fontSize={11} />
              <YAxis stroke="oklch(0.50 0.03 165)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} labelFormatter={(l) => `Dia ${l}`} contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="valor" name="Vendas" fill="oklch(0.38 0.09 165)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
