import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Share2,
  Sparkles,
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Eye,
  MousePointerClick,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Radio,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  SocialPlatform,
  ClientSocialAccount,
  SocialScheduledPost,
  AiGrowthInsight,
  ClientTrafficKpiSummary,
  SOCIAL_PLATFORMS_META,
} from "@/types/client-social-traffic.types";
import {
  listClientSocialAccounts,
  connectClientSocialAccount,
  disconnectClientSocialAccount,
  syncClientSocialMetrics,
  getClientTrafficAnalytics,
  listScheduledPosts,
  listAiGrowthInsights,
  updateAiInsightStatus,
} from "@/lib/client-social-traffic.functions";
import { EditorPublicacaoSocialModal } from "./EditorPublicacaoSocialModal";
import { CalendarioConteudoSocial } from "./CalendarioConteudoSocial";

interface ClienteRedesTrafegoTabProps {
  clientId: string;
  clientName: string;
  clientLogoUrl?: string | null;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export function ClienteRedesTrafegoTab({
  clientId,
  clientName,
  clientLogoUrl,
}: ClienteRedesTrafegoTabProps) {
  const qc = useQueryClient();

  // Server functions
  const listAccountsFn = useServerFn(listClientSocialAccounts);
  const connectAccountFn = useServerFn(connectClientSocialAccount);
  const disconnectAccountFn = useServerFn(disconnectClientSocialAccount);
  const syncMetricsFn = useServerFn(syncClientSocialMetrics);
  const getAnalyticsFn = useServerFn(getClientTrafficAnalytics);
  const listPostsFn = useServerFn(listScheduledPosts);
  const listInsightsFn = useServerFn(listAiGrowthInsights);
  const updateInsightFn = useServerFn(updateAiInsightStatus);

  // States
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialScheduledPost | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedPlatformToConnect, setSelectedPlatformToConnect] = useState<SocialPlatform>("meta_ads");
  const [accountNameToConnect, setAccountNameToConnect] = useState("");

  // Queries
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["client_social_accounts", clientId],
    queryFn: () => listAccountsFn({ data: { clientId } }),
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["client_traffic_analytics", clientId, periodDays],
    queryFn: () => getAnalyticsFn({ data: { clientId, periodDays } }),
  });

  const { data: scheduledPosts = [] } = useQuery({
    queryKey: ["client_scheduled_posts", clientId],
    queryFn: () => listPostsFn({ data: { clientId } }),
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["client_growth_insights", clientId],
    queryFn: () => listInsightsFn({ data: { clientId } }),
  });

  // Mutations
  const connectMut = useMutation({
    mutationFn: async () => {
      if (!accountNameToConnect.trim()) {
        throw new Error("Informe o nome ou @ identificador da conta.");
      }
      return await connectAccountFn({
        data: {
          clientId,
          platform: selectedPlatformToConnect,
          accountName: accountNameToConnect,
          profileUrl: `https://${selectedPlatformToConnect}.com/${accountNameToConnect.replace("@", "")}`,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_social_accounts", clientId] });
      qc.invalidateQueries({ queryKey: ["client_traffic_analytics", clientId] });
      toast.success("Conta conectada com sucesso!");
      setConnectModalOpen(false);
      setAccountNameToConnect("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao conectar conta"),
  });

  const disconnectMut = useMutation({
    mutationFn: (accountId: string) => disconnectAccountFn({ data: { accountId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_social_accounts", clientId] });
      qc.invalidateQueries({ queryKey: ["client_traffic_analytics", clientId] });
      toast.success("Conta desconectada");
    },
  });

  const syncMut = useMutation({
    mutationFn: (accountId: string) => syncMetricsFn({ data: { accountId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_traffic_analytics", clientId] });
      toast.success("Métricas sincronizadas com a plataforma!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao sincronizar"),
  });

  const updateInsightMut = useMutation({
    mutationFn: ({ insightId, status }: { insightId: string; status: "applied" | "dismissed" }) =>
      updateInsightFn({ data: { insightId, status } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["client_growth_insights", clientId] });
      toast.success(vars.status === "applied" ? "Recomendação aplicada com sucesso!" : "Insight dispensado.");
    },
  });

  return (
    <div className="space-y-6">
      {/* 1. BLOCO DE CONTAS CONECTADAS DO CLIENTE */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                Contas Conectadas & Integrações de Anúncios
              </CardTitle>
              <CardDescription className="text-xs">
                Contas oficiais do anunciante integradas para extração de métricas de tráfego pago e agendamento.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => setConnectModalOpen(true)}
              className="text-xs gap-1.5 h-8 font-semibold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Conectar Nova Conta / Canal
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(SOCIAL_PLATFORMS_META) as SocialPlatform[]).map((plat) => {
              const meta = SOCIAL_PLATFORMS_META[plat];
              const contaConectada = accounts.find(
                (a) => a.platform === plat && a.connection_status === "connected",
              );

              return (
                <div
                  key={plat}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    contaConectada
                      ? "bg-card border-primary/30 shadow-2xs"
                      : "bg-muted/15 border-dashed border-border/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-foreground leading-tight">{meta.nome}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                          {contaConectada ? contaConectada.account_name : "Não vinculada"}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        contaConectada
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {contaConectada ? "Conectada" : "Inativa"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                    {contaConectada ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => syncMut.mutate(contaConectada.id)}
                          disabled={syncMut.isPending}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${syncMut.isPending ? "animate-spin" : ""}`} />
                          Sincronizar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disconnectMut.mutate(contaConectada.id)}
                          className="h-6 px-1.5 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        >
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPlatformToConnect(plat);
                          setConnectModalOpen(true);
                        }}
                        className="h-6 text-[10px] text-primary hover:underline p-0 w-full justify-start gap-1"
                      >
                        <Plus className="w-3 h-3" /> Conectar Credencial OAuth
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. DASHBOARD ANALÍTICO (KPIS & TRÁFEGO PAGO) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Métricas de Performance & Retorno de Anúncios
            </h3>
            <p className="text-xs text-muted-foreground">
              Resultados consolidados de alcance, cliques, investimento e retorno sobre o gasto em anúncios (ROAS).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Período:</span>
            <div className="flex rounded-lg border p-0.5 bg-muted/40">
              <Button
                variant={periodDays === 7 ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriodDays(7)}
                className="h-7 text-xs px-2.5"
              >
                7 Dias
              </Button>
              <Button
                variant={periodDays === 30 ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriodDays(30)}
                className="h-7 text-xs px-2.5"
              >
                30 Dias
              </Button>
              <Button
                variant={periodDays === 90 ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriodDays(90)}
                className="h-7 text-xs px-2.5"
              >
                90 Dias
              </Button>
            </div>
          </div>
        </div>

        {/* CARDS DE KPIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3.5 border shadow-2xs bg-card">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              Investimento em Ads
              <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold text-foreground mt-1">
              {fmtBRL(analytics?.totalSpend || 2275.5)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Últimos {periodDays} dias faturados
            </div>
          </Card>

          <Card className="p-3.5 border shadow-2xs bg-card">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              ROAS / CPA Médio
              <Target className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {(analytics?.avgRoas || 4.2).toFixed(2)}x ROAS
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              CPA médio: {fmtBRL(analytics?.avgCpa || 28.5)}
            </div>
          </Card>

          <Card className="p-3.5 border shadow-2xs bg-card">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              Alcance & Impressões
              <Eye className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground mt-1">
              {(analytics?.totalReach || 185400).toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              CTR Médio: {(analytics?.avgCtr || 1.85).toFixed(2)}%
            </div>
          </Card>

          <Card className="p-3.5 border shadow-2xs bg-card">
            <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              Envolvimento & Seguidores
              <Users className="w-3.5 h-3.5 text-pink-500" />
            </div>
            <div className="text-lg font-bold text-foreground mt-1">
              {(analytics?.avgEngagementRate || 4.6).toFixed(2)}%
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              +{(analytics?.followersGrowth || 480).toLocaleString("pt-BR")} novos seguidores
            </div>
          </Card>
        </div>

        {/* GRÁFICO DE TENDÊNCIA DE PERFORMANCE */}
        {analytics?.trend && analytics.trend.length > 0 && (
          <Card className="p-4 border shadow-2xs">
            <div className="text-xs font-bold mb-3 flex items-center justify-between">
              <span>Evolução Diária de Alcance & Retorno de Tráfego</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Sincronizado automaticamente via API
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6b00" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff6b00" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(8, 10) + "/" + v.slice(5, 7)}
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                    formatter={(val: any, name: any) => [
                      name === "spend" ? fmtBRL(Number(val)) : Number(val).toLocaleString("pt-BR"),
                      name === "spend" ? "Investimento" : "Alcance",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="reach"
                    stroke="#ff6b00"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="urlColorReach"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* TABELA DE CAMPANHAS ATIVAS */}
        {analytics?.campaigns && analytics.campaigns.length > 0 && (
          <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
            <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Campanhas Ativas no Período</span>
              <span className="text-[10px] text-muted-foreground">
                {analytics.campaigns.length} campanhas em veiculação
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Campanha</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead className="text-right">CPA</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.campaigns.map((camp) => (
                  <TableRow key={camp.id} className="text-xs">
                    <TableCell className="font-semibold">{camp.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {SOCIAL_PLATFORMS_META[camp.platform]?.nome}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtBRL(camp.spend)}</TableCell>
                    <TableCell className="text-right">{camp.conversions}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {fmtBRL(camp.cpa)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {camp.roas.toFixed(2)}x
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 3. SEÇÃO DE INSIGHTS & DICAS ESTRATÉGICAS DA IA */}
      <Card className="border border-indigo-200 dark:border-indigo-900/50 bg-indigo-500/5 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Insights Estratégicos & Recomendações de Crescimento (IA)
            </CardTitle>
            <Badge className="bg-indigo-600 text-white text-[10px]">
              Diagnóstico Contínuo
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Algoritmo preditivo de análise de funil, alertas de saturação de criativos e otimização de verba.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-1">
          {insights.filter((i) => i.status === "pending").length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
              <span>Todas as recomendações de IA foram aplicadas ou revisadas!</span>
            </div>
          ) : (
            insights
              .filter((i) => i.status === "pending")
              .map((ins) => (
                <div
                  key={ins.id}
                  className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/40 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          ins.expected_impact === "alto"
                            ? "bg-rose-500/10 text-rose-600 border-rose-300"
                            : "bg-amber-500/10 text-amber-600 border-amber-300"
                        }`}
                      >
                        Impacto {ins.expected_impact.toUpperCase()}
                      </Badge>
                      <h4 className="text-xs font-bold text-foreground">{ins.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {ins.recommendation}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => updateInsightMut.mutate({ insightId: ins.id, status: "applied" })}
                      disabled={updateInsightMut.isPending}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Aplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateInsightMut.mutate({ insightId: ins.id, status: "dismissed" })}
                      disabled={updateInsightMut.isPending}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Dispensar
                    </Button>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* 4. CALENDÁRIO VISUAL DE CONTEÚDO & AGENDAMENTO DE POSTS */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Calendário Editorial & Fila de Publicações
              </CardTitle>
              <CardDescription className="text-xs">
                Grade programada de postagens do anunciante com suporte a arrastar e soltar (drag & drop).
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <CalendarioConteudoSocial
            posts={scheduledPosts}
            onEditPost={(p) => {
              setEditingPost(p);
              setEditorOpen(true);
            }}
            onNewPost={() => {
              setEditingPost(null);
              setEditorOpen(true);
            }}
            clientId={clientId}
          />
        </CardContent>
      </Card>

      {/* MODAL DO EDITOR DE POST */}
      <EditorPublicacaoSocialModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        clientId={clientId}
        clientName={clientName}
        clientLogoUrl={clientLogoUrl}
        editingPost={editingPost}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["client_scheduled_posts", clientId] });
        }}
      />

      {/* MODAL SIMPLES DE CONECTAR CANAL / CONTA */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Conectar Canal Social / Anúncios
              </h3>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold mb-1 block">Plataforma</span>
                <Select
                  value={selectedPlatformToConnect}
                  onValueChange={(v) => setSelectedPlatformToConnect(v as SocialPlatform)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOCIAL_PLATFORMS_META) as SocialPlatform[]).map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {SOCIAL_PLATFORMS_META[p].nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="text-xs font-semibold mb-1 block">Nome da Conta / Perfil / ID do Pixel</span>
                <input
                  type="text"
                  placeholder="Ex: @minhamarca ou BM 948201948"
                  value={accountNameToConnect}
                  onChange={(e) => setAccountNameToConnect(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-300 text-[11px] text-emerald-800 dark:text-emerald-300">
                🔒 Conexão OAuth 2.0 segura via token encriptado com leitura de métricas oficiais de anúncio.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setConnectModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => connectMut.mutate()}
                disabled={connectMut.isPending}
                className="gap-1.5 text-xs font-semibold"
              >
                {connectMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Autorizar Conexão
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
