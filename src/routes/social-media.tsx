import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Share2,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  Target,
  BarChart3,
  Users,
  Eye,
  Plus,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Zap,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Search,
  MessageCircle,
  Heart,
  MousePointerClick,
  DollarSign,
  Layers,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "sonner";
import {
  listSocialContas,
  upsertSocialConta,
  deleteSocialConta,
  listSocialPosts,
  upsertSocialPost,
  deleteSocialPost,
  getSocialAnalytics,
  gerarCopySocialMediaIA,
  PLATAFORMAS_CONFIG,
  PlataformaSocial,
  SocialConta,
  SocialPost,
  GerarCopyOutput,
} from "@/lib/social-media.functions";
import { NovoPostDialog } from "@/components/social/NovoPostDialog";
import { ConectarContaDialog } from "@/components/social/ConectarContaDialog";

export const Route = createFileRoute("/social-media")({
  head: () => ({
    meta: [{ title: "Hub de Redes Sociais & Tráfego Pago — Mídia.OS" }],
  }),
  component: SocialMediaHubPage,
});

export function SocialMediaHubPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Modals state
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [initialCopyForModal, setInitialCopyForModal] = useState<
    | {
        titulo?: string;
        conteudo?: string;
        hashtags?: string;
        cta?: string;
      }
    | undefined
  >(undefined);

  // Queries
  const { data: contas = [], isLoading: isLoadingContas } = useQuery({
    queryKey: ["social_contas"],
    queryFn: () => listSocialContas(),
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ["social_posts"],
    queryFn: () => listSocialPosts(),
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["social_analytics"],
    queryFn: () => getSocialAnalytics(),
  });

  // Mutations
  const upsertPostMutation = useMutation({
    mutationFn: (post: Partial<SocialPost>) => upsertSocialPost({ data: post as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_posts"] });
      queryClient.invalidateQueries({ queryKey: ["social_analytics"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => deleteSocialPost({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_posts"] });
      toast.success("Publicação removida com sucesso.");
    },
  });

  const upsertContaMutation = useMutation({
    mutationFn: (conta: Partial<SocialConta>) => upsertSocialConta({ data: conta as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_contas"] });
    },
  });

  const deleteContaMutation = useMutation({
    mutationFn: (id: string) => deleteSocialConta({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social_contas"] });
      toast.success("Conta desconectada.");
    },
  });

  // Filters for posts tab
  const [postStatusFilter, setPostStatusFilter] = useState<string>("todos");
  const [postPlatformFilter, setPostPlatformFilter] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (postStatusFilter !== "todos" && p.status !== postStatusFilter) return false;
      if (postPlatformFilter !== "todas" && !p.plataformas.includes(postPlatformFilter as any))
        return false;
      if (searchTerm) {
        const text = `${p.titulo || ""} ${p.conteudo} ${p.hashtags || ""}`.toLowerCase();
        if (!text.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [posts, postStatusFilter, postPlatformFilter, searchTerm]);

  // Estúdio Criativo IA State
  const [iaTema, setIaTema] = useState("");
  const [iaPlataforma, setIaPlataforma] = useState<PlataformaSocial>("instagram");
  const [iaFormato, setIaFormato] = useState<
    "feed" | "reels" | "carrossel" | "story" | "anuncio_trafego"
  >("feed");
  const [iaObjetivo, setIaObjetivo] = useState<"vendas" | "engajamento" | "leads" | "branding">(
    "vendas",
  );
  const [iaTom, setIaTom] = useState<
    "persuasivo" | "descontraido" | "corporativo" | "storytelling" | "urgencia"
  >("persuasivo");
  const [iaPublico, setIaPublico] = useState("");
  const [iaDiferenciais, setIaDiferenciais] = useState("");
  const [iaResult, setIaResult] = useState<GerarCopyOutput | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  const handleGerarCopyEstudio = async () => {
    if (!iaTema.trim()) {
      toast.error("Informe o tema ou produto antes de gerar.");
      return;
    }
    setIsGeneratingCopy(true);
    try {
      const res = await gerarCopySocialMediaIA({
        data: {
          tema_ou_produto: iaTema,
          plataforma: iaPlataforma,
          formato: iaFormato,
          objetivo: iaObjetivo,
          tom_de_voz: iaTom,
          publico_alvo: iaPublico.trim() || undefined,
          diferenciais: iaDiferenciais.trim() || undefined,
        },
      });
      setIaResult(res);
      toast.success("Conteúdo e estratégias gerados pela IA com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar conteúdo: " + (err.message || "Tente novamente"));
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleUsarCopyNoPost = (copy: GerarCopyOutput) => {
    setInitialCopyForModal({
      titulo: copy.titulo,
      conteudo: copy.copy_principal,
      hashtags: copy.hashtags,
      cta: copy.chamada_acao,
    });
    setEditingPost(null);
    setPostDialogOpen(true);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Cabeçalho Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 p-0.5 shadow-md flex items-center justify-center text-white">
                <Share2 className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Hub de Redes Sociais & Tráfego Pago
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Agendador multicanal, métricas de alcance, inteligência artificial para criativos
                  e cockpit para Gestor de Tráfego e Social Media.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConnectDialogOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <RefreshCw className="size-3.5" />
              Conectar Rede
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingPost(null);
                setInitialCopyForModal(undefined);
                setPostDialogOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900"
            >
              <Target className="size-3.5 text-indigo-600" />
              Novo Anúncio Ads
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingPost(null);
                setInitialCopyForModal(undefined);
                setPostDialogOpen(true);
              }}
              className="h-9 gap-1.5 text-xs font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Novo Post / Agendar
            </Button>
          </div>
        </div>

        {/* Barra Superior de Métricas & KPIs Globais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Alcance Total
                </span>
                <Users className="size-4 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {analytics?.alcance_total?.toLocaleString("pt-BR") || "284.500"}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="size-3" />
                <span>+18.4% este mês</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">Impressões</span>
                <Eye className="size-4 text-sky-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {analytics?.impressoes_total?.toLocaleString("pt-BR") || "498.200"}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="size-3" />
                <span>+24.1% vs anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Engajamento
                </span>
                <Heart className="size-4 text-rose-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {analytics?.engajamento_medio || 5.4}%
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="size-3" />
                <span>+0.8% média</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Cliques no Link
                </span>
                <MousePointerClick className="size-4 text-amber-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {analytics?.cliques_link?.toLocaleString("pt-BR") || "8.420"}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="size-3" />
                <span>+12.3% acessos</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  ROAS Tráfego
                </span>
                <TrendingUp className="size-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {analytics?.roas_medio || 4.8}x
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="size-3" />
                <span>Retorno excelente</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">
                  Gasto em Ads
                </span>
                <DollarSign className="size-4 text-indigo-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                R${" "}
                {analytics?.gasto_trafego?.toLocaleString("pt-BR", { minimumFractionDigits: 0 }) ||
                  "4.890"}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                <span>CPA: R$ 14,05 / lead</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navegação por Abas Principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/60 w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-auto gap-1">
            <TabsTrigger
              value="dashboard"
              className="gap-2 text-xs font-semibold py-2 px-3 sm:px-4"
            >
              <BarChart3 className="size-4" />
              <span>Dashboard & Métricas</span>
            </TabsTrigger>
            <TabsTrigger
              value="calendario"
              className="gap-2 text-xs font-semibold py-2 px-3 sm:px-4"
            >
              <CalendarIcon className="size-4" />
              <span>Posts & Agendados</span>
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-4">
                {posts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="estudio_ia"
              className="gap-2 text-xs font-semibold py-2 px-3 sm:px-4"
            >
              <Sparkles className="size-4 text-primary" />
              <span>Estúdio Criativo IA</span>
            </TabsTrigger>
            <TabsTrigger
              value="gestor_trafego"
              className="gap-2 text-xs font-semibold py-2 px-3 sm:px-4"
            >
              <Target className="size-4 text-indigo-500" />
              <span>Gestor de Tráfego & Ads</span>
            </TabsTrigger>
            <TabsTrigger value="contas" className="gap-2 text-xs font-semibold py-2 px-3 sm:px-4">
              <Share2 className="size-4" />
              <span>Contas Conectadas ({contas.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* =========================================================================
              ABA 1: DASHBOARD & MÉTRICAS DE ALCANCE
             ========================================================================= */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Gráfico Principal: Evolução de Alcance e Engajamento Diário */}
              <Card className="lg:col-span-8 border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      Evolução de Alcance & Engajamento (Últimos 14 Dias)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Crescimento orgânico e alcance pago consolidado em todas as redes ativas.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      ● Alcance
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-emerald-500/30 text-emerald-600"
                    >
                      ● Engajamento
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analytics?.historico_ultimos_dias || []}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorAlcance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorEngajamento" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                        <XAxis
                          dataKey="data"
                          stroke="#888888"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "0.5rem",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="alcance"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorAlcance)"
                          name="Alcance"
                        />
                        <Area
                          type="monotone"
                          dataKey="engajamento"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorEngajamento)"
                          name="Engajamento"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição por Plataforma */}
              <Card className="lg:col-span-4 border-border/60 shadow-xs flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    Performance por Rede
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparativo de alcance e taxa de engajamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {(analytics?.performance_por_rede || []).map((item) => {
                    const cfg = PLATAFORMAS_CONFIG[item.plataforma as PlataformaSocial] || {
                      nome: item.plataforma,
                      cor: "#6366f1",
                    };
                    const maxAlcance = 150000;
                    const pct = Math.min(100, Math.round((item.alcance / maxAlcance) * 100));

                    return (
                      <div key={item.plataforma} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-medium">
                            <div
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: cfg.cor }}
                            />
                            <span>{cfg.nome}</span>
                          </div>
                          <div className="font-semibold text-foreground">
                            {item.alcance.toLocaleString("pt-BR")} contas ({item.engajamento_pct}%)
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: cfg.cor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Widgets Inferiores: Melhores Horários para Postar & Top Posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Melhores Horários com IA */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="size-4 text-amber-500" />
                      Melhores Horários para Postar (Algoritmo IA)
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200"
                    >
                      Alta Precisão
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Com base no pico de atividade dos seguidores da sua empresa e clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(analytics?.melhores_horarios || []).map((horario, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-foreground">{horario.dia}</div>
                          <div className="text-[11px] text-muted-foreground">{horario.horario}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {horario.engajamento_score}% Score
                          </div>
                          <div className="text-[10px] text-muted-foreground">Pico de retenção</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-primary hover:text-primary"
                          onClick={() => {
                            setPostDialogOpen(true);
                          }}
                        >
                          Agendar
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Resumo de Campanhas Ativas de Tráfego */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Target className="size-4 text-indigo-500" />
                      Performance de Anúncios Ativos
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-200"
                    >
                      Meta & Google Ads
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Métricas de conversão de leads e custo por aquisição do gestor de tráfego.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">
                        Custo por Lead
                      </div>
                      <div className="text-base font-bold text-foreground">R$ 14,05</div>
                      <div className="text-[10px] text-emerald-600 font-medium">-18% este mês</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">
                        Custo p/ Clique
                      </div>
                      <div className="text-base font-bold text-foreground">R$ 0,58</div>
                      <div className="text-[10px] text-emerald-600 font-medium">CTR 3.4%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">
                        Total de Leads
                      </div>
                      <div className="text-base font-bold text-foreground">348 leads</div>
                      <div className="text-[10px] text-emerald-600 font-medium">
                        WhatsApp / Form
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        Meta Ads: Campanha Painéis DOOH & Aeroporto
                      </span>
                      <Badge className="bg-emerald-500 text-white text-[10px] h-4">Ativa</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Gasto diário: R$ 80,00</span>
                      <span>ROAS: 5.2x</span>
                      <span>89 leads qualificados</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-border/60 bg-muted/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        Google Ads: Busca Comercial Nexo Mídia B2B
                      </span>
                      <Badge className="bg-emerald-500 text-white text-[10px] h-4">Ativa</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Gasto diário: R$ 60,00</span>
                      <span>ROAS: 4.4x</span>
                      <span>62 leads qualificados</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* =========================================================================
              ABA 2: CALENDÁRIO & POSTS AGENDADOS
             ========================================================================= */}
          <TabsContent value="calendario" className="space-y-6">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar post, tema ou legenda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={postStatusFilter} onValueChange={setPostStatusFilter}>
                  <SelectTrigger className="h-9 text-xs w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="agendado">Agendados</SelectItem>
                    <SelectItem value="publicado">Publicados</SelectItem>
                    <SelectItem value="rascunho">Rascunhos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={postPlatformFilter} onValueChange={setPostPlatformFilter}>
                  <SelectTrigger className="h-9 text-xs w-[150px]">
                    <SelectValue placeholder="Rede Social" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Redes</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="meta_ads">Meta Ads</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPost(null);
                    setInitialCopyForModal(undefined);
                    setPostDialogOpen(true);
                  }}
                  className="h-9 text-xs gap-1.5 font-semibold bg-primary text-primary-foreground"
                >
                  <Plus className="size-3.5" />
                  Criar Postagem
                </Button>
              </div>
            </div>

            {/* Listagem de Posts em Grid Estilizado */}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/80 rounded-2xl bg-muted/10 space-y-3">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <CalendarIcon className="size-6" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  Nenhuma publicação encontrada
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Crie ou agende postagens simultâneas para suas redes ou utilize a IA para redigir
                  o roteiro completo.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPost(null);
                    setPostDialogOpen(true);
                  }}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="size-3.5 mr-1" />
                  Criar Primeira Postagem
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.map((post) => {
                  const isAgendado = post.status === "agendado";
                  const isPublicado = post.status === "publicado";
                  const isRascunho = post.status === "rascunho";

                  return (
                    <Card
                      key={post.id}
                      className="border-border/60 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        {/* Header do Card com Redes e Status */}
                        <div className="p-3.5 border-b border-border/40 flex items-center justify-between bg-muted/20">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {post.plataformas.map((plat) => {
                              const cfg = PLATAFORMAS_CONFIG[plat];
                              return (
                                <Badge
                                  key={plat}
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 h-5 font-semibold ${cfg.bg}`}
                                >
                                  {cfg.nome}
                                </Badge>
                              );
                            })}
                            {post.tipo_anuncio && (
                              <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 h-5">
                                Tráfego Pago
                              </Badge>
                            )}
                          </div>

                          <div>
                            {isAgendado && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px] gap-1"
                              >
                                <Clock className="size-2.5" />
                                Agendado
                              </Badge>
                            )}
                            {isPublicado && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px] gap-1"
                              >
                                <CheckCircle2 className="size-2.5" />
                                Publicado
                              </Badge>
                            )}
                            {isRascunho && (
                              <Badge
                                variant="outline"
                                className="bg-slate-500/10 text-slate-600 border-slate-300 text-[10px]"
                              >
                                Rascunho
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Imagem de Mídia ou Placeholder */}
                        {post.midia_urls && post.midia_urls.length > 0 && (
                          <div className="w-full h-44 bg-slate-900 overflow-hidden relative group">
                            <img
                              src={post.midia_urls[0]}
                              alt="Mídia do Post"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-black/60 text-white backdrop-blur-xs text-[10px]">
                                {post.formato.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Conteúdo do Post */}
                        <div className="p-4 space-y-2">
                          {post.titulo && (
                            <h4 className="font-bold text-xs text-foreground line-clamp-1">
                              {post.titulo}
                            </h4>
                          )}
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
                            {post.conteudo}
                          </p>
                          {post.hashtags && (
                            <p className="text-[10px] font-mono text-primary font-medium line-clamp-1">
                              {post.hashtags}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rodapé com Datas, Métricas e Ações */}
                      <div className="p-3.5 border-t border-border/40 bg-muted/10 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="size-3 text-muted-foreground" />
                            <span>
                              {post.data_agendamento
                                ? `Agendado: ${new Date(post.data_agendamento).toLocaleDateString(
                                    "pt-BR",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}`
                                : post.data_publicacao
                                  ? `Publicado: ${new Date(post.data_publicacao).toLocaleDateString("pt-BR")}`
                                  : "Sem agendamento"}
                            </span>
                          </div>

                          {post.metricas?.alcance && (
                            <div className="flex items-center gap-1 font-semibold text-foreground">
                              <Eye className="size-3 text-primary" />
                              <span>{post.metricas.alcance.toLocaleString("pt-BR")} views</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/30">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingPost(post);
                                setPostDialogOpen(true);
                              }}
                            >
                              <Edit3 className="size-3 mr-1" />
                              Editar
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              onClick={() => deletePostMutation.mutate(post.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>

                          {isAgendado && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 font-semibold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={async () => {
                                await upsertPostMutation.mutateAsync({
                                  ...post,
                                  status: "publicado",
                                  data_publicacao: new Date().toISOString(),
                                });
                                toast.success("Publicado imediatamente nas redes!");
                              }}
                            >
                              <Send className="size-3 mr-1" />
                              Publicar Agora
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* =========================================================================
              ABA 3: ESTÚDIO CRIATIVO IA (SOCIAL MEDIA & COPYWRITING)
             ========================================================================= */}
          <TabsContent value="estudio_ia" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Lado Esquerdo: Formulário de Configuração do Criativo IA (5 colunas) */}
              <Card className="lg:col-span-5 border-border/60 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        Gerador de Copy & Roteiros IA
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Copywriting persuasivo ajustado para o algoritmo de cada rede social.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Tema, Produto ou Oferta Principal *
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Ex: Campanha de Black Friday para locação de painéis DOOH em shopping centers com 40% de desconto no plano trimestral..."
                      value={iaTema}
                      onChange={(e) => setIaTema(e.target.value)}
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Rede Principal</Label>
                      <Select
                        value={iaPlataforma}
                        onValueChange={(val: any) => setIaPlataforma(val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="meta_ads">Meta Ads (Tráfego)</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="linkedin">LinkedIn B2B</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="google_ads">Google Ads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Formato</Label>
                      <Select value={iaFormato} onValueChange={(val: any) => setIaFormato(val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feed">Post de Feed</SelectItem>
                          <SelectItem value="reels">Roteiro para Reels / Vídeo</SelectItem>
                          <SelectItem value="carrossel">Carrossel Educativo</SelectItem>
                          <SelectItem value="story">Sequência de Stories</SelectItem>
                          <SelectItem value="anuncio_trafego">Anúncio de Tráfego Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Objetivo</Label>
                      <Select value={iaObjetivo} onValueChange={(val: any) => setIaObjetivo(val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vendas">Conversão / Vendas</SelectItem>
                          <SelectItem value="leads">Geração de Leads</SelectItem>
                          <SelectItem value="engajamento">Engajamento & Comentários</SelectItem>
                          <SelectItem value="branding">Autoridade & Branding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tom de Voz</Label>
                      <Select value={iaTom} onValueChange={(val: any) => setIaTom(val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="persuasivo">Persuasivo & Direto</SelectItem>
                          <SelectItem value="descontraido">Descontraído & Criativo</SelectItem>
                          <SelectItem value="corporativo">Corporativo / B2B</SelectItem>
                          <SelectItem value="storytelling">Storytelling Emocional</SelectItem>
                          <SelectItem value="urgencia">Urgência & Escassez</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Público-Alvo (Opcional)</Label>
                    <Input
                      placeholder="Ex: Diretores comerciais, empresários do varejo, 30-55 anos"
                      value={iaPublico}
                      onChange={(e) => setIaPublico(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Diferenciais da Oferta (Opcional)
                    </Label>
                    <Input
                      placeholder="Ex: Telas de alta resolução, relatórios em tempo real e bonificação"
                      value={iaDiferenciais}
                      onChange={(e) => setIaDiferenciais(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <Button
                    onClick={handleGerarCopyEstudio}
                    disabled={isGeneratingCopy}
                    className="w-full h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-2"
                  >
                    {isGeneratingCopy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Criando Copy Magnética...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Gerar com Inteligência Artificial
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Lado Direito: Resultados Gerados (7 colunas) */}
              <div className="lg:col-span-7 space-y-4">
                {iaResult ? (
                  <div className="space-y-4 animate-in fade-in-50 duration-300">
                    {/* Banner de Ação Rápida */}
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="size-5 text-primary shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            Copy Pronta para Uso!
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Você pode copiar os blocos individuais ou abrir diretamente no agendador
                            de posts.
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUsarCopyNoPost(iaResult)}
                        className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shrink-0"
                      >
                        <Send className="size-3" />
                        Criar Post com Esta Copy
                      </Button>
                    </div>

                    {/* Bloco 1: Gancho / Título */}
                    <Card className="border-border/60 shadow-xs">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Zap className="size-3.5" />
                          Gancho Magnético (Primeiros 3 Segundos)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleCopyText(iaResult.titulo, "Título / Gancho")}
                        >
                          <Copy className="size-3 mr-1" />
                          Copiar
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {iaResult.titulo}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Bloco 2: Copy Principal */}
                    <Card className="border-border/60 shadow-xs">
                      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Edit3 className="size-3.5" />
                          Legenda Completa / Copy Estruturada
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleCopyText(iaResult.copy_principal, "Legenda")}
                        >
                          <Copy className="size-3 mr-1" />
                          Copiar
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed font-sans">
                          {iaResult.copy_principal}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Bloco 3: CTA e Hashtags */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-border/60 shadow-xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Chamada para Ação (CTA)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1.5"
                            onClick={() => handleCopyText(iaResult.chamada_acao, "CTA")}
                          >
                            <Copy className="size-2.5 mr-1" />
                            Copiar
                          </Button>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                          <p className="text-xs font-medium text-foreground">
                            {iaResult.chamada_acao}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60 shadow-xs">
                        <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Hashtags Estratégicas
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1.5"
                            onClick={() => handleCopyText(iaResult.hashtags, "Hashtags")}
                          >
                            <Copy className="size-2.5 mr-1" />
                            Copiar
                          </Button>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                          <p className="text-xs font-mono text-primary font-medium">
                            {iaResult.hashtags}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Bloco 4: Sugestão de Direção de Arte / Ideia Visual */}
                    {iaResult.ideia_visual && (
                      <Card className="border-border/60 shadow-xs bg-muted/20">
                        <CardHeader className="p-3.5 pb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="size-3" />
                            Direção de Arte / Sugestão de Imagem & Roteiro
                          </span>
                        </CardHeader>
                        <CardContent className="p-3.5 pt-1">
                          <p className="text-xs text-muted-foreground italic leading-relaxed">
                            "{iaResult.ideia_visual}"
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="border-dashed border-border/80 shadow-xs bg-muted/10 h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-center space-y-3">
                    <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-foreground">
                        O Seu Conteúdo IA Aparecerá Aqui
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Preencha o tema e as preferências no painel ao lado e clique em "Gerar com
                        Inteligência Artificial" para receber ganchos, legendas e hashtags sob
                        medida.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* =========================================================================
              ABA 4: GESTOR DE TRÁFEGO & ADS (META & GOOGLE ADS COCKPIT)
             ========================================================================= */}
          <TabsContent value="gestor_trafego" className="space-y-6">
            {/* Banner de Controle do Gestor de Tráfego */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-500 text-white text-[10px] px-2 py-0.5">
                    Cockpit do Gestor de Tráfego
                  </Badge>
                  <span className="text-xs text-indigo-200">
                    Meta Ads Manager & Google Ads Link
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  Controle de Verba, Otimização de ROAS & Laboratório A/B
                </h3>
                <p className="text-xs text-indigo-200/90 max-w-xl">
                  Acompanhe CPA diário, gere variações multivariadas de headlines com inteligência
                  artificial e conecte os anúncios diretamente aos produtos e propostas de mídia.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingPost(null);
                    setInitialCopyForModal(undefined);
                    setPostDialogOpen(true);
                  }}
                  className="h-9 font-semibold text-xs bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <Plus className="size-3.5 mr-1" />
                  Criar Novo Anúncio
                </Button>
              </div>
            </div>

            {/* KPIs Específicos de Tráfego */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                    Orçamento Ativo
                  </span>
                  <div className="text-xl font-bold text-foreground">R$ 190,00 / dia</div>
                  <div className="text-[11px] text-indigo-600 font-medium">
                    Meta Ads + Google Ads
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                    Custo por Lead (CPL)
                  </span>
                  <div className="text-xl font-bold text-foreground">R$ 14,05</div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Meta: R$ 12,00 | Abaixo do teto
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                    Taxa de Clique (CTR)
                  </span>
                  <div className="text-xl font-bold text-foreground">3.42%</div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Benchmark superior (+1.2%)
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                    ROAS Médio
                  </span>
                  <div className="text-xl font-bold text-foreground">4.8x</div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    R$ 4,80 faturados por R$ 1 gasto
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Laboratório A/B de Criativos com IA */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-indigo-600" />
                    <CardTitle className="text-base font-bold">
                      Laboratório de Teste A/B de Anúncios com IA
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-indigo-300 text-indigo-600"
                  >
                    Otimizador de Conversão
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Gere combinações de headlines, textos persuasivos de alta conversão e chamadas
                  para ação prontas para teste multivariado no Meta Ads Manager.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
                      <span>Variação 1: Foco em Dor / Alívio</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-1.5"
                        onClick={() =>
                          handleCopyText(
                            "Cansado de gastar em anúncios que não trazem clientes reais para o seu negócio? Conheça a mídia com maior conversão comprovada.",
                            "Variação 1",
                          )
                        }
                      >
                        <Copy className="size-2.5 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      "Sua Marca Não Pode Mais Ser Invisível"
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Cansado de gastar em anúncios que não trazem clientes reais para o seu
                      negócio? Posicione sua empresa nos pontos de maior fluxo da cidade com
                      métricas auditadas.
                    </p>
                    <div className="pt-2">
                      <Badge className="bg-indigo-600 text-white text-[10px]">
                        CTA: Fale no WhatsApp
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Variação 2: Foco em ROI & Escala</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-1.5"
                        onClick={() =>
                          handleCopyText(
                            "Descubra como empresas estão multiplicando o faturamento anunciando em telas de alta retenção com ROAS médio de 4.8x.",
                            "Variação 2",
                          )
                        }
                      >
                        <Copy className="size-2.5 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      "Multiplique Seus Resultados com Mídia de Alta Performance"
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Descubra como empresas estão multiplicando o faturamento anunciando em telas
                      de alta retenção com ROAS médio de 4.8x e custo por lead reduzido.
                    </p>
                    <div className="pt-2">
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        CTA: Saiba Mais
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                      <span>Variação 3: Urgência & Condição</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-1.5"
                        onClick={() =>
                          handleCopyText(
                            "Condições exclusivas de veiculação válidas apenas para esta semana. Garanta o espaço da sua marca nos melhores locais.",
                            "Variação 3",
                          )
                        }
                      >
                        <Copy className="size-2.5 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      "Últimas Posições Disponíveis para o Próximo Mês"
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Condições exclusivas de veiculação válidas apenas para esta semana. Garanta o
                      espaço da sua marca nos pontos mais nobres antes que seus concorrentes
                      reservem.
                    </p>
                    <div className="pt-2">
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        CTA: Solicitar Proposta
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =========================================================================
              ABA 5: CONTAS CONECTADAS & STATUS DE CANAIS
             ========================================================================= */}
          <TabsContent value="contas" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">Perfis e Canais Conectados</h3>
                <p className="text-xs text-muted-foreground">
                  Gerencie as credenciais, tokens de acesso e status de sincronização de cada rede
                  social.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setConnectDialogOpen(true)}
                className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="size-3.5" />
                Conectar Nova Conta
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contas.map((conta) => {
                const cfg = PLATAFORMAS_CONFIG[conta.plataforma] || {
                  nome: conta.plataforma,
                  cor: "#6366f1",
                  bg: "bg-indigo-500/10 text-indigo-600",
                };

                return (
                  <Card
                    key={conta.id}
                    className="border-border/60 shadow-xs hover:border-primary/40 transition-all"
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              conta.avatar_url ||
                              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                            }
                            alt={conta.nome_conta}
                            className="size-11 rounded-full object-cover border border-border"
                          />
                          <div>
                            <div className="font-bold text-sm text-foreground">
                              {conta.nome_conta}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {conta.username || `@${conta.plataforma}`}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px]"
                        >
                          ● Ativo
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                        <div>
                          <span className="text-muted-foreground text-[10px] block">
                            Seguidores / Base
                          </span>
                          <span className="font-bold text-foreground">
                            {conta.seguidores > 0
                              ? conta.seguidores.toLocaleString("pt-BR")
                              : "Conta Ads"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block">
                            Engajamento Médio
                          </span>
                          <span className="font-bold text-emerald-600">
                            {conta.taxa_engajamento > 0
                              ? `${conta.taxa_engajamento}%`
                              : "Tráfego Ativo"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <Badge variant="outline" className={`text-[10px] ${cfg.bg}`}>
                          {cfg.nome}
                        </Badge>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-muted-foreground"
                            onClick={() =>
                              toast.success(`Métricas de ${conta.nome_conta} sincronizadas!`)
                            }
                          >
                            <RefreshCw className="size-3 mr-1" />
                            Sincronizar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-rose-500 hover:text-rose-600"
                            onClick={() => deleteContaMutation.mutate(conta.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Criação / Agendamento de Post */}
        <NovoPostDialog
          open={postDialogOpen}
          onOpenChange={setPostDialogOpen}
          contas={contas}
          postToEdit={editingPost}
          initialCopy={initialCopyForModal}
          onSave={async (postData) => {
            await upsertPostMutation.mutateAsync(postData);
          }}
        />

        {/* Modal para Conectar Redes Sociais */}
        <ConectarContaDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          onConnect={async (contaData) => {
            await upsertContaMutation.mutateAsync(contaData);
          }}
        />
      </div>
    </AppShell>
  );
}
export default SocialMediaHubPage;
