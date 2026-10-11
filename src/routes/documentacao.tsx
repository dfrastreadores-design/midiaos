import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTenantModulos } from "@/hooks/use-tenant-modulos";
import { useUserRoles } from "@/hooks/use-roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemPresentationDeck } from "@/components/documentation/SystemPresentationDeck";
import {
  exportarApresentacaoSistemaPPTX,
  exportarManualSistemaPDF,
} from "@/lib/sistema-presentation.service";
import {
  BookOpen,
  Mail,
  Phone,
  User,
  LayoutDashboard,
  KanbanSquare,
  Users,
  Building2,
  Package,
  FileText,
  FileSignature,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  CheckSquare,
  Search,
  Sparkles,
  Target,
  Calendar,
  Briefcase,
  GitBranch,
  Trash2,
  Compass,
  MapPin,
  Layers,
  FileCheck,
  Share2,
  Download,
  Presentation,
  Bot,
  Network,
  Palette,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/documentacao")({
  component: DocumentacaoPage,
  head: () => ({
    meta: [
      { title: "Manual do Usuário & Apresentação do Sistema | Mídia.OS" },
      {
        name: "description",
        content:
          "Manual completo e apresentação interativa do Mídia.OS 3.0: planejamento estratégico, copiloto comercial Gemini, catálogo blindado, PIs e financeiro.",
      },
    ],
  }),
});

type CategoriaModulo =
  | "Todos"
  | "Comercial"
  | "Planejamento & IA"
  | "Inventário"
  | "Operação"
  | "Financeiro"
  | "Administração";

type ModuloDoc = {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  rota: string;
  categoria: CategoriaModulo;
  resumo: string;
  recursos: string[];
  passos?: string[];
  dica?: string;
  modulo?: string | null;
  novo30?: boolean;
};

const MODULOS: ModuloDoc[] = [
  // 1. Core & IA v3.0
  {
    icon: Sparkles,
    titulo: "Nova Campanha (Venda em 7 Passos)",
    rota: "/nova-campanha",
    categoria: "Comercial",
    novo30: true,
    resumo:
      "Fluxo de vendas integrado em esteira ágil que guia o vendedor do cliente à proposta comercial e conversão direta em Pedido de Inserção sem trocar de tela.",
    recursos: [
      "Passo a passo com 7 etapas comerciais estruturadas",
      "Seleção dinâmica de anunciante e metas orçamentárias",
      "Escolha de praças prioritárias e pontos no mapa interativo",
      "Controle contínuo do investimento e saldo do budget",
      "Aplicação de templates executivos (OOH, DOOH, Corporativo)",
      "Formalização instantânea com link seguro e conversão em PI",
    ],
    passos: [
      "Acesse 'Criar Campanha' no menu lateral.",
      "Selecione o Cliente, objetivo e orçamento da campanha.",
      "Escolha as praças e adicione os pontos de mídia desejados.",
      "Selecione o template visual e clique em 'Gerar Proposta' e 'Converter em PI'.",
    ],
    dica: "Reduz o tempo de emissão de propostas de 2 horas para menos de 5 minutos.",
  },
  {
    icon: Bot,
    titulo: "Copiloto Comercial IA (Gemini)",
    rota: "/copiloto-comercial",
    categoria: "Planejamento & IA",
    novo30: true,
    resumo:
      "Assistente inteligente integrado que monta recomendações de mix de mídia, plano estratégico em 3 fases, defesas de investimento e argumentos de fechamento.",
    recursos: [
      "Análise multimodal de cliente, segmento, público, região e budget",
      "Mix recomendado proporcional a 100% com pontos reais do catálogo",
      "Tese estratégica com cronograma de sustentação em 3 fases",
      "Defesa de investimento e respostas para quebrar objeções comerciais",
      "Geração de argumentos persuasivos e gatilhos éticos de venda",
      "Exportação direta para o Planejamento e Proposta Comercial",
    ],
    passos: [
      "Informe os dados básicos da oportunidade ou briefing.",
      "Clique em 'Gerar Análise Estratégica com Gemini'.",
      "Revise os blocos de recomendação, defesa e argumentos.",
      "Clique em 'Criar Proposta a partir do Copiloto' para formalizar.",
    ],
    dica: "A IA apenas recomenda e sugere — o executivo humano mantém 100% do controle da decisão final.",
  },
  {
    icon: Compass,
    titulo: "Planejamento Estratégico & 5 Pilares",
    rota: "/planejamento",
    categoria: "Planejamento & IA",
    novo30: true,
    resumo:
      "Camada de inteligência estratégica baseada nos 5 pilares fundamentais da publicidade: Afinidade Territorial, Frequência, Visibilidade, Mobilidade e Ativação.",
    recursos: [
      "Parametrização ponderada dos 5 pilares para a marca",
      "Seleção de pontos com amarração a produtos reais do inventário",
      "Cálculo automático de saldo e alocação orçamentária monetária",
      "Cadeia relacional íntegra: Campanha → Regiões → Pontos → Proposta",
      "Apresentação estratégica estruturada com métricas de impacto",
    ],
    passos: [
      "Crie um novo planejamento informando cliente e investimento previsto.",
      "Ajuste os pesos dos pilares estratégicos da campanha.",
      "Adicione os pontos de mídia alinhados a cada pilar.",
      "Gere a proposta comercial com as lâminas de estratégia integradas.",
    ],
    dica: "Mostre os pilares ao cliente para justificar o valor e a técnica por trás da escolha dos pontos.",
  },
  {
    icon: Network,
    titulo: "Rede de Inventário (Próprio vs Representado)",
    rota: "/rede-inventario",
    categoria: "Inventário",
    novo30: true,
    resumo:
      "Gestão profissional de veículos parceiros e representação comercial com blindagem do nome do fornecedor e controle contratual de comissões.",
    recursos: [
      "Classificação estrita entre pontos 'PROPRIO' e 'REPRESENTADO'",
      "Segregação de Nome Interno (sigiloso) e Nome Comercial (público)",
      "Controle de CNPJs, dados de contato, contratos e comissões (0% a 100%)",
      "Vínculo e desvinculação em massa de produtos na rede",
      "Blindagem contra desintermediação nas propostas e vitrines",
    ],
    passos: [
      "Cadastre o parceiro ou veículo na Rede de Inventário.",
      "Defina o Nome Interno operacional e o Nome Comercial para o anunciante.",
      "Vincule os produtos do inventário à respectiva origem.",
    ],
    dica: "O cliente final recebe o nome comercial blindado, protegendo sua carteira de representação.",
  },
  {
    icon: Palette,
    titulo: "Identidade Visual Comercial & Marca d'Água",
    rota: "/configuracoes?tab=branding",
    categoria: "Administração",
    novo30: true,
    resumo:
      "Blindagem automática de fotos de pontos de mídia com logotipo do inquilino e marca d'água comercial, prevenindo vazamentos de fornecedores.",
    recursos: [
      "Geração dual automática: imagem_original e imagem_comercial",
      "Aplicação de marca d'água com posição e opacidade configuráveis",
      "Exibição estrita da imagem blindada em propostas, vitrine e PPTX",
      "Acesso restrito à imagem original apenas para usuários internos autorizados",
    ],
    passos: [
      "Acesse Configurações → White Label & Branding.",
      "Envie o logotipo e defina a posição da marca d'água.",
      "Ao cadastrar ou atualizar fotos de pontos, a blindagem é aplicada instantaneamente.",
    ],
  },
  {
    icon: LayoutDashboard,
    titulo: "Dashboard Executivo & Inteligência",
    rota: "/",
    categoria: "Comercial",
    novo30: true,
    resumo:
      "Painel executivo em tempo real com 8 indicadores vitais, evolução temporal de faturamento vs meta, mídias mais vendidas e top anunciantes.",
    recursos: [
      "KPIs executivos: Receita, Faturamento vs Meta, Taxa de Conversão e PIs",
      "Gráfico contínuo de receita e acompanhamento de metas",
      "Share percentual das mídias mais comercializadas",
      "Distribuição geográfica por praças e regiões mais utilizadas",
      "Ranking de clientes principais por volume financeiro",
    ],
    passos: [
      "Acesse a página inicial para visualizar os dados atualizados.",
      "Filtre por período (mês, trimestre ou ano).",
      "Clique nos gráficos para explorar os detalhes de cada segmento.",
    ],
  },

  // 2. Módulos Tradicionais Consolidados
  {
    icon: Package,
    titulo: "Catálogo de Produtos & Inventário OOH",
    rota: "/produtos",
    categoria: "Inventário",
    resumo:
      "Cadastro e controle de todos os espaços de mídia: painéis de LED, outdoors, frontlights, rádio, TV e digital com coordenadas e galeria de fotos.",
    recursos: [
      "Atributos completos: formato, medidas, fluxo estimado e público-alvo",
      "Geolocalização com coordenadas e link para Google Maps / Street View",
      "Galeria de até 15 fotos de alta resolução com definição de foto principal",
      "Visualização em Mapa Interativo, Cards Visuais ou Lista",
      "Status operacional em tempo real (Disponível, Reservado, Ocupado)",
    ],
  },
  {
    icon: FileText,
    titulo: "Propostas Comerciais & Apresentações",
    rota: "/propostas",
    categoria: "Comercial",
    resumo:
      "Gerador de propostas com calculadora de descontos, alçada de rentabilidade e exportação em PowerPoint (.PPTX) e PDF diagramado.",
    recursos: [
      "Cálculo automático de valor de tabela, descontos e valor negociado",
      "Simulador de comissões de agência (BV) e margens líquidas",
      "Exportação nativa de slides executivos em PPTX widescreen",
      "Geração de link de assinatura eletrônica com validade jurídica",
      "Conversão direta em Pedido de Inserção com um clique",
    ],
  },
  {
    icon: KanbanSquare,
    titulo: "CRM & Funil de Oportunidades",
    rota: "/crm",
    categoria: "Comercial",
    modulo: "crm",
    resumo:
      "Pipeline visual no formato Kanban para acompanhamento de leads comerciais, reuniões agendadas e propostas em negociação.",
    recursos: [
      "Colunas de funil personalizáveis com arrastar e soltar (drag & drop)",
      "Controle de datas de retorno e histórico de interações",
      "Vinculação direta com cadastros de clientes e agências",
      "Alertas de estagnação de negócios no funil",
    ],
  },
  {
    icon: Users,
    titulo: "Clientes & Agências de Publicidade",
    rota: "/clientes",
    categoria: "Comercial",
    resumo:
      "Base unificada de anunciantes e agências com sincronização automática de dados cadastrais e histórico de campanhas.",
    recursos: [
      "Sincronização diária de dados via CNPJ (Receita Federal)",
      "Histórico de todos os PIs e propostas já veiculadas pelo cliente",
      "Contatos comerciais, financeiros e executivo de conta responsável",
    ],
  },
  {
    icon: FileText,
    titulo: "Pedidos de Inserção (PI) & OPEC",
    rota: "/pi",
    categoria: "Operação",
    modulo: "pi",
    resumo:
      "Controle operacional integral de contratos de veiculação, esteira de aprovação de crédito, materiais de veiculação e checking.",
    recursos: [
      "Duplo fluxo: aprovação comercial e liberação técnica de OPEC",
      "Importação inteligente de PIs em PDF com extração por IA",
      "Geração automática de número sequencial único e histórico de revisões",
      "Módulo de checking fotográfico com comprovantes de exibição",
    ],
  },
  {
    icon: FileSignature,
    titulo: "Central de Assinaturas Eletrônicas",
    rota: "/assinaturas",
    categoria: "Operação",
    modulo: "assinaturas",
    resumo:
      "Plataforma nativa de formalização jurídica de propostas e contratos digitais sem necessidade de serviços externos.",
    recursos: [
      "Assinatura por link público seguro via WhatsApp ou e-mail",
      "Validade jurídica conforme MP 2.200-2/2001 e Código Civil",
      "Registro de Hash SHA-256, endereço IP, carimbo temporal e User-Agent",
      "Download do documento assinado com certificado de autenticidade",
    ],
  },
  {
    icon: Wallet,
    titulo: "Faturamento & Conciliação Financeira",
    rota: "/financeiro",
    categoria: "Financeiro",
    modulo: "financeiro",
    resumo:
      "Gestão de contas a receber e pagar com precisão estrita de centavos, controle de repasses a veículos e relatórios de DRE.",
    recursos: [
      "Geração de parcelas a partir do faturamento de PIs aprovados",
      "Controle de pagamentos, inadimplência e conciliação bancária",
      "Repasses automáticos para parceiros da rede de inventário",
      "Visão demonstrativa de receitas, custos e margem operacional",
    ],
  },
  {
    icon: ShieldCheck,
    titulo: "Governança, Permissões RBAC & Lixeira",
    rota: "/usuarios",
    categoria: "Administração",
    resumo:
      "Segurança corporativa em múltiplas camadas com isolamento estrito de inquilino (RLS) e política de zero perda de dados.",
    recursos: [
      "Papéis nativos: Admin, Executivo, OPEC, Financeiro, Diretoria, Parceiro",
      "Gatilho de auditoria integral (`auditoria_alteracoes`)",
      "Lixeira automática com snapshot JSONB (`trash_items`) para restauração",
      "Isolamento criptográfico por tenant em todas as tabelas",
    ],
  },
];

function DocumentacaoPage() {
  const { hasModulo, plano } = useTenantModulos();
  const { isAdmin } = useUserRoles();
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaModulo>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const modulosFiltrados = useMemo(() => {
    return MODULOS.filter((m) => {
      // Regra de módulos ativos no plano
      if (m.modulo && !hasModulo(m.modulo)) return false;

      // Filtro de categoria
      if (selectedCategoria !== "Todos" && m.categoria !== selectedCategoria) {
        return false;
      }

      // Filtro de busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = m.titulo.toLowerCase().includes(query);
        const matchResumo = m.resumo.toLowerCase().includes(query);
        const matchRecursos = m.recursos.some((r) => r.toLowerCase().includes(query));
        const matchRota = m.rota.toLowerCase().includes(query);
        return matchTitle || matchResumo || matchRecursos || matchRota;
      }

      return true;
    });
  }, [selectedCategoria, searchQuery, hasModulo]);

  const handleDownloadPPTX = async () => {
    try {
      setIsExportingPptx(true);
      toast.info("Compilando apresentação executiva em PowerPoint (.PPTX)...");
      await exportarApresentacaoSistemaPPTX("Mídia.OS");
      toast.success("Apresentação PPTX gerada e baixada com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar apresentação: " + (err?.message || "Tente novamente."));
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPdf(true);
      toast.info("Compilando Manual do Usuário diagramado em PDF...");
      await exportarManualSistemaPDF("Mídia.OS");
      toast.success("Manual do Usuário em PDF baixado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar manual em PDF: " + (err?.message || "Tente novamente."));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <AppShell>
      <div className="container mx-auto max-w-6xl py-6 sm:py-8 space-y-6 sm:space-y-8 px-4 sm:px-6">
        {/* Banner Superior com Título e Ações Rápidas de Download */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500 text-white font-bold px-2.5 py-0.5 text-xs">
                Mídia.OS 3.0
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                Homologado em Produção
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <BookOpen className="h-7 w-7 text-primary shrink-0" />
              Central de Treinamento & Manual do Usuário
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Apresentação interativa do sistema, playbooks operacionais de venda, manual completo de módulos e documentação para toda a equipe.
            </p>
          </div>

          {/* Botões de Ação para Download Imediato */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPPTX}
              disabled={isExportingPptx}
              className="h-9 gap-1.5 border-orange-500/30 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold"
            >
              <Presentation className="h-4 w-4" />
              <span>Baixar Slides PPTX</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              className="h-9 gap-1.5 font-semibold shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Manual PDF</span>
            </Button>
          </div>
        </div>

        {/* Abas Principais de Navegação */}
        <Tabs defaultValue="apresentacao" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/80 rounded-xl gap-1">
            <TabsTrigger value="apresentacao" className="py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <Presentation className="h-4 w-4 text-primary" />
              <span>Apresentação (Deck)</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Manual do Usuário</span>
            </TabsTrigger>
            <TabsTrigger value="playbooks" className="py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <GitBranch className="h-4 w-4 text-primary" />
              <span>Playbooks de Venda</span>
            </TabsTrigger>
            <TabsTrigger value="suporte" className="py-2.5 gap-2 text-xs sm:text-sm font-semibold">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>FAQ & Suporte</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: APRESENTAÇÃO EXECUTIVA (SLIDE DECK) */}
          <TabsContent value="apresentacao" className="space-y-6">
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-500" />
                <h2 className="text-lg font-bold text-foreground">
                  Apresentação Executiva Interativa
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Navegue pelos slides abaixo para conhecer a visão geral, diferenciais competitivos e a arquitetura completa da plataforma. Você também pode exportar em formato PowerPoint (.PPTX) para reuniões comerciais e alinhamentos de equipe.
              </p>
            </div>

            <SystemPresentationDeck nomeEmpresa="Mídia.OS" />
          </TabsContent>

          {/* ABA 2: MANUAL COMPLETO DO USUÁRIO */}
          <TabsContent value="manual" className="space-y-6">
            {/* Filtros e Busca */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-xl p-4 shadow-sm">
              {/* Barra de Pesquisa */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar módulo, recurso ou funcionalidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs sm:text-sm"
                />
              </div>

              {/* Categorias */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {(
                  [
                    "Todos",
                    "Comercial",
                    "Planejamento & IA",
                    "Inventário",
                    "Operação",
                    "Financeiro",
                    "Administração",
                  ] as CategoriaModulo[]
                ).map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategoria === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategoria(cat)}
                    className="h-8 text-xs shrink-0"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Contador de Módulos */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Exibindo <strong>{modulosFiltrados.length}</strong> de {MODULOS.length} módulos disponíveis
              </span>
              {selectedCategoria !== "Todos" && (
                <span className="font-medium text-primary">Filtrado por: {selectedCategoria}</span>
              )}
            </div>

            {/* Grid de Módulos */}
            <div className="grid gap-4 md:grid-cols-2">
              {modulosFiltrados.map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.rota} className="flex flex-col border hover:border-primary/40 transition-all shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-bold text-foreground">
                                {m.titulo}
                              </CardTitle>
                              {m.novo30 && (
                                <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-bold py-0">
                                  NOVO 3.0
                                </Badge>
                              )}
                            </div>
                            <code className="text-[11px] text-muted-foreground font-mono">{m.rota}</code>
                          </div>
                        </div>

                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold shrink-0">
                          {m.categoria}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3.5 text-xs sm:text-sm flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <p className="text-muted-foreground leading-relaxed">{m.resumo}</p>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Principais Recursos:
                          </p>
                          <ul className="grid gap-1 text-xs text-foreground/80 list-disc list-inside">
                            {m.recursos.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        {m.passos && (
                          <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1">
                            <p className="text-[11px] font-bold uppercase text-foreground">
                              Como Operar:
                            </p>
                            <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                              {m.passos.map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>

                      {m.dica && (
                        <div className="pt-2 border-t text-xs text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />
                          <span>Dica: {m.dica}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ABA 3: PLAYBOOKS DE VENDA E OPERAÇÃO */}
          <TabsContent value="playbooks" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Playbook 1 */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <Badge className="w-fit mb-2 bg-emerald-500 text-white text-[10px]">
                    PLAYBOOK COMERCIAL #1
                  </Badge>
                  <CardTitle className="text-lg font-bold">
                    Como Montar e Fechar uma Proposta em Menos de 5 Minutos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                  <p className="text-muted-foreground">
                    Utilize o fluxo unificado em <strong>/nova-campanha</strong> para acelerar a negociação:
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">1</span>
                      <p><strong>Identifique o Cliente</strong>: Selecione o anunciante cadastrado ou informe dados rápidos de oportunidade.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">2</span>
                      <p><strong>Defina o Budget</strong>: Insira o orçamento máximo planejado para que o sistema monitore o saldo em tempo real.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">3</span>
                      <p><strong>Selecione os Pontos</strong>: Escolha no mapa interativo com base no fluxo e visibilidade das vias.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">4</span>
                      <p><strong>Envie para Assinatura</strong>: Gere o link de assinatura eletrônica e dispare via WhatsApp do decisor.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Playbook 2 */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <Badge className="w-fit mb-2 bg-indigo-500 text-white text-[10px]">
                    PLAYBOOK ESTRATÉGICO #2
                  </Badge>
                  <CardTitle className="text-lg font-bold">
                    Como Defender uma Campanha com o Copiloto Comercial Gemini
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                  <p className="text-muted-foreground">
                    Munir seu executivo de vendas com teses robustas e quebra de objeções em <strong>/copiloto-comercial</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                      <p><strong>Informe o Cenário</strong>: Coloque o segmento do cliente, desafio comercial e o público prioritário.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                      <p><strong>Gere a Recomendação</strong>: A IA monta a proporção ideal do mix de mídia com base nos produtos reais do catálogo.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                      <p><strong>Copie os Argumentos</strong>: Utilize a seção de respostas a objeções na reunião presencial ou de videoconferência.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">4</span>
                      <p><strong>Apresente o Deck</strong>: Exporte o slide deck em PowerPoint (.PPTX) para uma apresentação executiva impactante.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Playbook 3 */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <Badge className="w-fit mb-2 bg-amber-500 text-white text-[10px]">
                    PLAYBOOK DE INVENTÁRIO #3
                  </Badge>
                  <CardTitle className="text-lg font-bold">
                    Blindagem Comercial de Representados & Vitrine Pública
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                  <p className="text-muted-foreground">
                    Proteja suas parcerias e evite a desintermediação de veículos parceiros em <strong>/rede-inventario</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                      <p><strong>Cadastre a Origem</strong>: Registre a Razão Social real como 'Nome Interno' e o nome fantasia blindado como 'Nome Comercial'.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                      <p><strong>Ative a Marca d'Água</strong>: Em Configurações, habilite o branding para estampar seu logotipo nas fotos dos pontos.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                      <p><strong>Compartilhe a Vitrine</strong>: Envie o link <code>/site/inventario</code> para prospecção aberta sem expor os fornecedores.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Playbook 4 */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <Badge className="w-fit mb-2 bg-purple-500 text-white text-[10px]">
                    PLAYBOOK OPERACIONAL #4
                  </Badge>
                  <CardTitle className="text-lg font-bold">
                    Da Aprovação do PI ao Checking e Faturamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs sm:text-sm">
                  <p className="text-muted-foreground">
                    Segurança operacional de veiculação e repasses financeiros em <strong>/pi</strong> e <strong>/financeiro</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                      <p><strong>Liberação de OPEC</strong>: O departamento operacional valida o material criativo e aloca as inserções no circuito.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                      <p><strong>Checking Fotográfico</strong>: A equipe de campo anexa fotos da veiculação comprovando a exibição para o anunciante.</p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                      <p><strong>Faturamento Automático</strong>: O PI aprovado gera contas a receber e calcula os repasses de comissão dos parceiros.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ABA 4: FAQ & SUPORTE */}
          <TabsContent value="suporte" className="space-y-6">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Perguntas Frequentes (FAQ)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                <div className="space-y-1.5 border-b pb-3">
                  <h3 className="font-bold text-foreground">
                    1. A assinatura eletrônica tem validade jurídica comprovada?
                  </h3>
                  <p className="text-muted-foreground">
                    Sim. O Mídia.OS gera assinaturas eletrônicas com base na Medida Provisória nº 2.200-2/2001 e no Código Civil Brasileiro. Cada assinatura armazena o Hash criptográfico SHA-256 do documento, endereço IP, carimbo de tempo UTC e navegador do signatário.
                  </p>
                </div>

                <div className="space-y-1.5 border-b pb-3">
                  <h3 className="font-bold text-foreground">
                    2. Como o sistema garante que meus dados não vazem para outros clientes (multi-tenant)?
                  </h3>
                  <p className="text-muted-foreground">
                    Todas as tabelas do banco de dados utilizam políticas de Row Level Security (RLS) a nível de banco no PostgreSQL do Supabase. Um inquilino nunca consegue visualizar, alterar ou excluir dados de outra organização, mesmo em caso de requisição direta.
                  </p>
                </div>

                <div className="space-y-1.5 border-b pb-3">
                  <h3 className="font-bold text-foreground">
                    3. O que acontece se alguém excluir um cliente ou proposta por engano?
                  </h3>
                  <p className="text-muted-foreground">
                    O sistema opera sob Política de Zero Perda de Dados. Todas as exclusões de negócio acionam a lixeira com snapshot JSONB integral (tabela <code>trash_items</code>). Um administrador pode restaurar o registro com todos os seus atributos a qualquer momento no módulo Lixeira.
                  </p>
                </div>

                <div className="space-y-1.5 pb-1">
                  <h3 className="font-bold text-foreground">
                    4. Posso exportar as propostas para editar no PowerPoint (.PPTX)?
                  </h3>
                  <p className="text-muted-foreground">
                    Sim! O gerador de apresentações exporta arquivos nativos do PowerPoint em formato widescreen 16:9, permitindo que sua equipe ajuste textos, fontes ou imagens antes de reuniões com clientes.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Suporte Técnico / Contato do Desenvolvedor */}
            <Card className="border-primary/40 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-5 w-5 text-primary" />
                  Canais de Suporte & Atendimento ao Desenvolvedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs sm:text-sm">
                <p className="text-muted-foreground">
                  Precisa de treinamento dedicado, customizações adicionais ou suporte técnico prioritário? Entre em contato diretamente com o engenheiro responsável pela plataforma:
                </p>

                <div className="rounded-xl border bg-card p-4 grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <User className="h-4 w-4 text-primary" />
                      Rafael Rodrigo
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Engenheiro de Software & Arquiteto de Sistemas Mídia.OS
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href="mailto:rafaelrodrigo.as@gmail.com"
                        className="text-primary hover:underline font-semibold"
                      >
                        rafaelrodrigo.as@gmail.com
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href="tel:+5561984746857" className="text-primary hover:underline font-semibold">
                        (61) 98474-6857 (WhatsApp)
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
