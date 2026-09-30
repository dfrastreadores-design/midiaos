import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTenantModulos } from "@/hooks/use-tenant-modulos";
import { useUserRoles } from "@/hooks/use-roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  FolderOpen,
  ShieldCheck,
  Settings,
  CheckSquare,
  RefreshCw,
  Bell,
  Search,
  Sparkles,
  Megaphone,
  Repeat,
  Target,
  Tv,
  Calendar,
  Paperclip,
  History,
  Briefcase,
  Rocket,
  Lightbulb,
  GitBranch,
  Trash2,
  UserCog,
} from "lucide-react";

export const Route = createFileRoute("/documentacao")({
  component: DocumentacaoPage,
  head: () => ({
    meta: [
      { title: "Documentação do Sistema | mídia.OS" },
      {
        name: "description",
        content:
          "Documentação completa do mídia.OS: módulos, fluxos comerciais, papéis, permissões, integrações e suporte para emissoras, rádios e portais.",
      },
    ],
  }),
});

type ModuloDoc = {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  rota: string;
  resumo: string;
  recursos: string[];
  passos?: string[];
  dica?: string;
  /** Chave de módulo do plano. `null` = sempre disponível para o tenant. */
  modulo?: string | null;
};

// Rotas administrativas visíveis apenas para admin.
const ADMIN_ONLY_ROTAS = new Set([
  "/usuarios",
  "/configuracoes",
  "/relatorio-sincronizacao",
  "/historico",
]);

const MODULOS: ModuloDoc[] = [
  {
    icon: LayoutDashboard,
    titulo: "Dashboard",
    rota: "/",
    resumo:
      "Visão geral do desempenho comercial em tempo real: receita, pipeline, propostas em andamento, PIs ativas, tarefas e metas.",
    recursos: [
      "KPIs do mês (receita, propostas, PIs, taxa de conversão)",
      "Gráfico de evolução mensal",
      "Top clientes e top executivos",
      "Atalhos para módulos principais e notificações",
    ],
    passos: [
      "Ao entrar no sistema, o Dashboard é exibido automaticamente.",
      "Use os filtros de período no topo para comparar meses.",
      "Clique em qualquer KPI para drill-down até o detalhe.",
    ],
    dica: "Configure metas em Metas para que o Dashboard exiba progresso e ranking automaticamente.",
  },
  {
    icon: KanbanSquare,
    titulo: "Funil CRM",
    rota: "/crm",
    modulo: "crm",
    resumo:
      "Gestão visual do funil comercial em formato Kanban — arraste oportunidades entre etapas e acompanhe o pipeline por executivo.",
    recursos: [
      "Etapas configuráveis (Prospecção → Negociação → Proposta → Fechado)",
      "Drag & drop entre etapas",
      "Filtros por executivo, agência, cliente e período",
      "Histórico completo de movimentações",
      "Conversão direta em proposta ou PI",
    ],
    passos: [
      "Clique em ‘Nova oportunidade’ e selecione cliente/agência (ou cadastre on the fly).",
      "Arraste o card para mover de etapa.",
      "Clique no card para anexar tarefas, notas e converter em proposta.",
    ],
    dica: "Configure tarefas automáticas de follow-up por etapa para que nada esfrie no funil.",
  },
  {
    icon: CheckSquare,
    titulo: "Tarefas",
    rota: "/tarefas",
    resumo:
      "Controle de tarefas comerciais com prazos, responsáveis, prioridades e vinculação a clientes, propostas e PIs.",
    recursos: [
      "Criação e atribuição manual ou automática",
      "Alertas de vencimento por e-mail e notificação no app",
      "Vinculação contextual (cliente, PI, proposta, oportunidade)",
      "Visões: Hoje, Semana, Atrasadas",
    ],
    passos: [
      "Acesse Tarefas e clique em ‘Nova tarefa’.",
      "Defina responsável, prazo e vincule ao registro relacionado.",
      "Marque como concluída ao finalizar — o histórico fica registrado.",
    ],
    dica: "Tarefas vencidas aparecem destacadas no Dashboard e no sino de notificações.",
  },
  {
    icon: Users,
    titulo: "Clientes",
    rota: "/clientes",
    resumo:
      "Cadastro de clientes diretos com sincronização automática de dados cadastrais via CNPJ (base da Receita Federal).",
    recursos: [
      "Busca por CNPJ com preenchimento automático",
      "Sincronização diária dos dados cadastrais",
      "Histórico de propostas, PIs e faturamento por cliente",
      "Importação em lote por planilha",
      "Anexos (contratos, briefings históricos)",
    ],
    passos: [
      "Clique em ‘Novo cliente’ e digite o CNPJ — os campos são preenchidos automaticamente.",
      "Complemente com contatos, segmento e responsável comercial.",
      "Visualize o histórico completo na aba lateral do cliente.",
    ],
    dica: "Use a importação em lote para migrar a base do sistema antigo em minutos.",
  },
  {
    icon: Building2,
    titulo: "Agências",
    rota: "/agencias",
    resumo:
      "Cadastro de agências de publicidade, seus contatos, clientes representados e comissão padrão.",
    recursos: [
      "Sincronização de CNPJ",
      "Vínculo de agência ↔ clientes representados",
      "Comissão padrão configurável (sobrescrevível por proposta)",
      "Histórico de mídia colocada por agência",
    ],
    passos: [
      "Cadastre a agência pelo CNPJ.",
      "Defina comissão padrão (ex: 20%).",
      "Vincule os clientes representados — a comissão é aplicada automaticamente nas propostas.",
    ],
  },
  {
    icon: Tv,
    titulo: "Veículos",
    rota: "/veiculos",
    resumo:
      "Cadastro dos veículos do grupo (TV, rádio, portal, OOH/DOOH) — base para produtos, programação e relatórios.",
    recursos: [
      "Múltiplos veículos por conta",
      "Tipo: TV, Rádio, Portal, OOH, DOOH",
      "Vinculação com produtos e programação",
      "Filtros nos relatórios por veículo",
    ],
    dica: "Grupos multi-praça podem rodar tudo em uma única conta com filtros por veículo.",
  },
  {
    icon: Package,
    titulo: "Produtos",
    rota: "/produtos",
    resumo:
      "Catálogo comercial: programas, faixas horárias, formatos e tabela de preços por segundagem.",
    recursos: [
      "Preços por segundagem (15s, 30s, 45s, 60s)",
      "Descontos por faixa de volume",
      "Categorização por veículo e faixa horária",
      "Histórico de alterações de preço",
    ],
    passos: [
      "Cadastre o produto (ex: ‘Jornal das 12’) e vincule ao veículo.",
      "Defina a tabela de preços por segundagem.",
      "Configure descontos por faixa de volume.",
    ],
  },
  {
    icon: FileSignature,
    titulo: "Propostas",
    rota: "/propostas",
    modulo: "propostas",
    resumo:
      "Construtor de propostas com calculadora de mídia, geração de PDF/PPTX da sua marca e assinatura eletrônica via link público.",
    recursos: [
      "Calculadora de preços por produto e período",
      "Layouts customizáveis (logo, cores, capa)",
      "Exportação PDF e PowerPoint",
      "Assinatura eletrônica via link",
      "Conversão em PI ao ser assinada",
      "Versionamento de propostas",
    ],
    passos: [
      "Crie a proposta vinculando cliente/agência.",
      "Adicione produtos, períodos e segundagens — o cálculo é automático.",
      "Gere o PDF/PPTX, envie por e-mail e acompanhe a abertura.",
      "Ao ser assinada, a proposta vira PI automaticamente.",
    ],
    dica: "Personalize o layout em Configurações → Layout de Proposta para manter a identidade visual.",
  },
  {
    icon: FileText,
    titulo: "Pedidos de Inserção (PI)",
    rota: "/pi",
    modulo: "pi",
    resumo:
      "Emissão, aprovação, envio e arquivamento de PIs — com geração de PDF/Excel, fluxo de aprovação multi-nível e importação por IA.",
    recursos: [
      "Geração automática a partir de proposta assinada",
      "Importação de PI em PDF com extração via IA",
      "Fluxo de aprovação (executivo → gerente → financeiro)",
      "Cancelamento, substituição e re-emissão",
      "Anexos (autorização, material) e envio por e-mail",
      "Exportação PDF e Excel",
    ],
    passos: [
      "PI pode ser criada manualmente, importada por PDF ou gerada a partir de proposta.",
      "Após criada, segue o fluxo de aprovação configurado.",
      "Aprovada, é enviada por e-mail ao cliente/agência e disponibilizada no Financeiro.",
    ],
    dica: "Use a importação por IA para migrar PIs históricas — basta arrastar o PDF.",
  },
  {
    icon: Paperclip,
    titulo: "PI — Anexos",
    rota: "/pi-anexos",
    modulo: "pi",
    resumo:
      "Repositório centralizado dos anexos vinculados às PIs (autorizações, materiais, contratos).",
    recursos: [
      "Upload de múltiplos arquivos por PI",
      "Filtro por cliente, agência e período",
      "Compartilhamento por link",
    ],
  },
  {
    icon: Briefcase,
    titulo: "Briefings",
    rota: "/briefings",
    modulo: "briefings",
    resumo:
      "Recebimento de briefings de parceiros comerciais e agências, com formulário público e devolutiva ao solicitante.",
    recursos: [
      "Formulário público (link compartilhável)",
      "Atribuição a executivo responsável",
      "Anexos, comentários e status",
      "Notificações ao solicitante a cada atualização",
    ],
    passos: [
      "Compartilhe o link do formulário público com parceiros.",
      "Quando um briefing chega, atribua a um executivo.",
      "Use o briefing como base para gerar a proposta em um clique.",
    ],
  },
  {
    icon: Rocket,
    titulo: "Projetos Especiais",
    rota: "/projetos-especiais",
    resumo:
      "Gestão de ações especiais e patrocínios sob medida — diferente do fluxo padrão de mídia.",
    recursos: [
      "Cronograma com marcos",
      "Equipe multidisciplinar",
      "Orçamento e despesas",
      "Status e entregáveis",
    ],
    dica: "Ideal para naming rights, eventos, patrocínios de programação e ações de merchandising.",
  },
  {
    icon: Megaphone,
    titulo: "Influenciadores",
    rota: "/influenciadores",
    modulo: "influenciadores",
    resumo:
      "Cadastro e gestão de influenciadores e criadores parceiros do veículo, com tabela de cachês.",
    recursos: [
      "Cadastro com nichos e métricas",
      "Tabela de cachês por formato (story, post, reels)",
      "Histórico de campanhas",
      "Vinculação a propostas integradas",
    ],
  },
  {
    icon: Repeat,
    titulo: "Permuta Comercial",
    rota: "/permuta",
    resumo: "Controle completo de operações de permuta — entrada, saída e saldo por parceiro.",
    recursos: [
      "Saldo de permuta por parceiro",
      "Movimentações (entrada/saída)",
      "Vinculação a PIs e propostas",
      "Relatórios para apuração fiscal",
    ],
    dica: "O saldo é atualizado automaticamente sempre que uma PI de permuta é aprovada.",
  },
  {
    icon: Calendar,
    titulo: "Calendário",
    rota: "/calendario",
    resumo:
      "Calendário compartilhado com tarefas, vencimentos de propostas, PIs e veiculações programadas.",
    recursos: [
      "Visões diária, semanal e mensal",
      "Filtros por executivo e tipo de evento",
      "Sincronização com Google Calendar (opcional)",
    ],
  },
  {
    icon: Target,
    titulo: "Metas",
    rota: "/metas",
    resumo:
      "Definição de metas individuais e por equipe, com ranking de executivos e acompanhamento em tempo real.",
    recursos: [
      "Metas mensais e trimestrais",
      "Ranking de executivos",
      "Histórico de batimento",
      "Bonificação configurável",
    ],
    passos: [
      "Defina a meta mensal por executivo ou equipe.",
      "O sistema calcula o batimento em tempo real conforme PIs são aprovadas.",
      "Acompanhe o ranking no Dashboard.",
    ],
  },
  {
    icon: Wallet,
    titulo: "Financeiro",
    rota: "/financeiro",
    modulo: "financeiro",
    resumo:
      "Faturamento, contas a receber, comissões de executivos e pagamentos vinculados aos PIs aprovados.",
    recursos: [
      "Geração de faturamento por PI",
      "Comissões por executivo e agência",
      "Contas a receber e status de pagamento",
      "Exportação Excel para o ERP",
      "Conciliação manual",
    ],
    passos: [
      "PIs aprovadas alimentam o Financeiro automaticamente.",
      "Marque pagamentos recebidos para conciliar.",
      "Exporte para Excel para integrar com o ERP/contabilidade.",
    ],
  },
  {
    icon: BarChart3,
    titulo: "Relatórios",
    rota: "/relatorios",
    modulo: "relatorios",
    resumo: "Relatórios consolidados de vendas, performance, metas, mídia colocada e comparativos.",
    recursos: [
      "Filtros por período, executivo, agência, cliente, produto e veículo",
      "Gráficos comparativos (mês a mês, ano a ano)",
      "Exportação Excel, PDF e CSV",
      "Relatórios salvos (favoritos)",
    ],
  },
  {
    icon: FolderOpen,
    titulo: "Material de Apoio",
    rota: "/materiais-apoio",
    resumo:
      "Repositório central de mídias kit, apresentações institucionais e documentos de apoio comercial.",
    recursos: ["Upload com categorização", "Compartilhamento por link público", "Versionamento"],
  },
  {
    icon: History,
    titulo: "Histórico",
    rota: "/historico",
    resumo:
      "Trilha de auditoria de todas as ações relevantes no sistema (criação, edição, exclusão, aprovações).",
    recursos: [
      "Quem fez, o quê e quando",
      "Filtros por usuário, módulo e período",
      "Indispensável para compliance",
    ],
  },
  {
    icon: ShieldCheck,
    titulo: "Usuários & Permissões",
    rota: "/usuarios",
    resumo:
      "Gestão de usuários, papéis (roles) e permissões granulares por módulo. Acesso exclusivo de Administrador.",
    recursos: [
      "Papéis: admin, executivo, parceiro_comercial",
      "Permissões por módulo (role_permissions)",
      "Convite por e-mail",
      "Bloqueio e reativação de contas",
    ],
    dica: "Crie um perfil ‘executivo’ padrão e duplique para novos vendedores — permissões idênticas em segundos.",
  },
  {
    icon: RefreshCw,
    titulo: "Sincronização CNPJ",
    rota: "/relatorio-sincronizacao",
    resumo:
      "Relatório de sincronização automática dos dados cadastrais (CNPJ) de clientes e agências.",
    recursos: [
      "Status da última sincronização",
      "Job agendado via cron (diário)",
      "Log de erros e tentativas",
    ],
  },
  {
    icon: Settings,
    titulo: "Configurações",
    rota: "/configuracoes",
    resumo:
      "Parametrizações gerais: layouts de PI e Proposta, templates de e-mail, integrações e identidade visual. Acesso exclusivo de Administrador.",
    recursos: [
      "Editor de layouts (PI e Proposta) com logo e cores",
      "Templates de e-mail transacional",
      "Configurações de mídia, descontos e comissão padrão",
      "Conexões com Google, WhatsApp, OpenAI",
      "Notificações de atualização do sistema",
    ],
    dica: "A logo configurada aqui aparece automaticamente em todas as PIs, propostas, e-mails e no topo do app.",
  },
  {
    icon: FileSignature,
    titulo: "Landing Pages",
    rota: "/landing-pages",
    resumo:
      "Criação de páginas de captura (Landing Pages) integradas ao CRM para conversão de leads e vitrine de produtos.",
    recursos: [
      "Editor visual de seções (Hero, Features, Formulário)",
      "Geração automática a partir de dados do cliente (Logo + Produtos)",
      "Vitrine de produtos com botão de 'Consultar disponibilidade'",
      "Captura de leads direto para o funil do CRM",
      "Métricas de visualização e conversão",
    ],
    passos: [
      "Crie uma nova landing e defina o título e a URL (slug).",
      "Use 'Gerar do cliente' para criar uma página institucional em segundos.",
      "Personalize as seções no editor e publique a página.",
    ],
    dica: "O link da landing page pode ser enviado diretamente para prospecção fria ou campanhas de tráfego pago.",
  },
  {
    icon: Trash2,
    titulo: "Lixeira do Sistema",
    rota: "/lixeira",
    resumo:
      "Repositório de segurança para itens excluídos, permitindo a restauração de dados em até 45 dias.",
    recursos: [
      "Restauração de clientes, PIs, propostas e outros registros",
      "Contagem regressiva para exclusão definitiva",
      "Auditoria de quem excluiu e quando",
      "Limpeza automática após 45 dias",
    ],
    dica: "Apenas administradores têm acesso à lixeira para restaurar ou expurgar itens.",
  },
  {
    icon: UserCog,
    titulo: "Troca de Perfil (Impersonate)",
    rota: "/usuarios",
    resumo:
      "Recurso para administradores visualizarem e operarem o sistema como se fossem outro usuário.",
    recursos: [
      "Visualização fiel da interface do usuário selecionado",
      "Identificação clara de 'Atuando como'",
      "Logs de auditoria registram ações feitas pelo administrador em nome do usuário",
    ],
    dica: "Use este recurso para prestar suporte a executivos ou validar permissões configuradas.",
  },
];

function DocumentacaoPage() {
  const { hasModulo, plano } = useTenantModulos();
  const { isAdmin } = useUserRoles();
  const modulosVisiveis = MODULOS.filter((m) => {
    if (ADMIN_ONLY_ROTAS.has(m.rota) && !isAdmin) return false;
    if (!m.modulo) return true;
    return hasModulo(m.modulo);
  });
  return (
    <AppShell>
      <div className="container mx-auto max-w-5xl py-8 space-y-8">
        {/* Cabeçalho */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Documentação do Sistema</h1>
          </div>
          <p className="text-muted-foreground">
            Guia completo dos módulos, fluxos comerciais, papéis e permissões da plataforma
            mídia.OS.
          </p>
        </div>

        {/* Visão Geral */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed">
            <p>
              O <strong>mídia.OS</strong> é a plataforma de gestão comercial para veículos de
              comunicação — emissoras de TV, rádios, portais e mídia OOH/DOOH. Cobre todo o ciclo:
              prospecção (CRM) → briefing → proposta → assinatura eletrônica → Pedido de Inserção
              (PI) → faturamento → relatórios.
            </p>
            <p>
              É multiusuário, multi-veículo, com controle granular de papéis e permissões. Possui
              geração automática de PDFs/PPTX, importação de PI via IA, assinatura eletrônica,
              sincronização diária de CNPJ e dashboards em tempo real.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">Multi-veículo</Badge>
              <Badge variant="secondary">Multi-tenant</Badge>
              <Badge variant="secondary">SaaS na nuvem</Badge>
              <Badge variant="secondary">IA integrada</Badge>
              <Badge variant="secondary">Assinatura eletrônica</Badge>
              <Badge variant="secondary">RBAC granular</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Fluxo Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Fluxo Comercial Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm list-decimal list-inside">
              <li>
                <strong>Prospecção (CRM)</strong> — oportunidade criada e movida entre etapas do
                funil.
              </li>
              <li>
                <strong>Briefing</strong> — parceiro/agência registra a demanda via formulário
                público.
              </li>
              <li>
                <strong>Proposta</strong> — montagem com calculadora de mídia + apresentação
                PDF/PPTX.
              </li>
              <li>
                <strong>Envio e assinatura</strong> — link de assinatura eletrônica com validade
                jurídica.
              </li>
              <li>
                <strong>Conversão em PI</strong> — proposta assinada vira PI automaticamente.
              </li>
              <li>
                <strong>Aprovação interna</strong> — fluxo executivo → gerência → financeiro.
              </li>
              <li>
                <strong>Faturamento e comissão</strong> — alimenta contas a receber e
                comissionamento.
              </li>
              <li>
                <strong>Relatórios e metas</strong> — consolidação de resultados e batimento.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Módulos */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Módulos do Sistema</h2>
          <p className="text-sm text-muted-foreground">
            {modulosVisiveis.length} de {MODULOS.length} módulos disponíveis
            {plano?.nome ? ` no seu plano (${plano.nome})` : ""}.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {modulosVisiveis.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.rota} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{m.titulo}</CardTitle>
                        <code className="text-xs text-muted-foreground">{m.rota}</code>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm flex-1">
                    <p className="text-muted-foreground">{m.resumo}</p>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Recursos
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {m.recursos.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                    {m.passos && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Passo a passo
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-xs">
                          {m.passos.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {m.dica && (
                      <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs">
                          <span className="font-semibold">Dica:</span> {m.dica}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Permissões */}
        <Card>
          <CardHeader>
            <CardTitle>Papéis e Permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge variant="default">admin</Badge>
              <p className="text-muted-foreground">
                Acesso total — incluindo Usuários, Configurações, Sincronização CNPJ e gestão de
                tenants.
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Badge variant="secondary">executivo</Badge>
              <p className="text-muted-foreground">
                Acesso aos módulos comerciais (CRM, Clientes, Agências, PIs, Propostas, Briefings,
                Relatórios) conforme permissões atribuídas pelo Administrador.
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Badge variant="outline">parceiro_comercial</Badge>
              <p className="text-muted-foreground">
                Acesso restrito a Dashboard, Minha Conta e Briefings (solicitar proposta, receber
                retorno).
              </p>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Permissões adicionais por módulo podem ser refinadas em{" "}
              <code>Usuários → Permissões</code>.
            </p>
          </CardContent>
        </Card>

        {/* Recursos Transversais */}
        <Card>
          <CardHeader>
            <CardTitle>Recursos Transversais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Notificações em tempo real</p>
                <p className="text-muted-foreground text-xs">
                  Sino no topo com alertas (PI aprovado, tarefa vencendo, briefing novo, atualização
                  do sistema).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Search className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Busca Global</p>
                <p className="text-muted-foreground text-xs">
                  Pesquisa unificada por clientes, agências, PIs e propostas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">IA integrada</p>
                <p className="text-muted-foreground text-xs">
                  Extração automática de dados ao importar PIs em PDF — sem retrabalho.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Sincronização CNPJ</p>
                <p className="text-muted-foreground text-xs">
                  Atualização automática dos dados cadastrais via job agendado diário.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Segurança</p>
                <p className="text-muted-foreground text-xs">
                  Criptografia em trânsito e em repouso, backups diários, RBAC granular e auditoria
                  completa.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileSignature className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Assinatura eletrônica</p>
                <p className="text-muted-foreground text-xs">
                  Propostas assinadas via link público com validade jurídica (MP 2.200-2/2001).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suporte / Contato do Desenvolvedor */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Suporte e Desenvolvimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Para suporte técnico, dúvidas, sugestões de melhorias ou novas implementações, entre
              em contato com o desenvolvedor responsável:
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <User className="h-4 w-4 text-primary" />
                Rafael Rodrigo
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href="mailto:Rafaelrodrigo.as@gmail.com"
                  className="text-primary hover:underline"
                >
                  Rafaelrodrigo.as@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href="tel:+5561984746857" className="text-primary hover:underline">
                  (61) 98474-6857
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-4">
          mídia.OS · Desenvolvido por Rafael Rodrigo · Documentação atualizada em{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>
    </AppShell>
  );
}
