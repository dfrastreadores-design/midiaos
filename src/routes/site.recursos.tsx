import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  FileText,
  FileSignature,
  Briefcase,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingUp,
  Shield,
  Bell,
  Megaphone,
  Repeat,
  CheckCircle2,
  ArrowRight,
  Rocket,
  History,
  Tv,
} from "lucide-react";

export const Route = createFileRoute("/site/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos do mídia.OS — CRM, PI digital, propostas e financeiro" },
      {
        name: "description",
        content:
          "Conheça todos os módulos do mídia.OS: CRM, propostas, PI digital com assinatura eletrônica, briefings, programação, financeiro, dashboards e BI. Tudo para vender mais mídia.",
      },
      {
        property: "og:title",
        content: "Recursos do mídia.OS — todos os módulos para vender mais mídia",
      },
      {
        property: "og:description",
        content:
          "CRM, propostas, PI digital, briefings, programação, financeiro e dashboards em uma só plataforma.",
      },
      { property: "og:url", content: "https://midiaos.online/site/recursos" },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site/recursos" }],
  }),
  component: Recursos,
});

const modules = [
  {
    icon: Users,
    title: "CRM Comercial",
    desc: "Pipeline visual por estágio, executivo e cliente. Histórico de interações, tarefas automáticas de follow-up e sincronização diária de CNPJ direto da base da Receita Federal.",
    items: [
      "Pipeline Kanban",
      "Atribuição automática",
      "Sincronização diária de CNPJ (Receita Federal)",
      "Tarefas vencendo",
    ],
  },
  {
    icon: FileText,
    title: "Propostas Inteligentes",
    desc: "Construa propostas em minutos com tabela de preços por produto, descontos automáticos e geração de PDF/PPTX da sua marca.",
    items: [
      "Tabela de preços dinâmica",
      "Cálculo de descontos",
      "Layout customizável",
      "Exportação PDF e PPTX",
    ],
  },
  {
    icon: FileSignature,
    title: "PI Digital",
    desc: "Pedidos de inserção gerados, enviados por e-mail e assinados eletronicamente com validade jurídica.",
    items: [
      "Geração automática",
      "Assinatura eletrônica",
      "Aprovação multi-nível",
      "Importação por IA",
    ],
  },
  {
    icon: Briefcase,
    title: "Briefings & Projetos",
    desc: "Captura estruturada de briefing comercial e gestão de projetos especiais por veículo.",
    items: [
      "Formulários customizados",
      "Anexos e mídias",
      "Atribuição por equipe",
      "Status em tempo real",
    ],
  },
  {
    icon: Calendar,
    title: "Programação",
    desc: "Calendário compartilhado, controle de grade e gestão de inserções por veículo.",
    items: ["Calendário visual", "Múltiplos veículos", "Filtros avançados", "Notificações"],
  },
  {
    icon: Repeat,
    title: "Permuta Comercial",
    desc: "Controle completo de operações de permuta — entrada, saída e saldo por parceiro.",
    items: ["Saldo por parceiro", "Histórico", "Vinculação a PIs", "Relatórios fiscais"],
  },
  {
    icon: DollarSign,
    title: "Financeiro",
    desc: "Faturamento, comissionamento de executivos, contas a receber e relatórios consolidados.",
    items: ["Faturamento", "Comissões", "Contas a receber", "Conciliação"],
  },
  {
    icon: TrendingUp,
    title: "Metas & Gamificação",
    desc: "Metas individuais e por equipe, ranking de executivos e acompanhamento mensal em tempo real.",
    items: ["Metas por executivo", "Ranking", "Bonificação", "Histórico de batimento"],
  },
  {
    icon: BarChart3,
    title: "Dashboards & BI",
    desc: "Receita por veículo, cliente, agência e produto. Filtros, drill-down e exportação.",
    items: ["KPIs em tempo real", "Filtros multi-dimensão", "Exportação Excel", "Comparativos"],
  },
  {
    icon: Megaphone,
    title: "Influenciadores",
    desc: "Cadastro e gestão de influenciadores e criadores de conteúdo parceiros do veículo.",
    items: ["Cadastro completo", "Tabela de cachês", "Histórico", "Vinculação a propostas"],
  },
  {
    icon: Rocket,
    title: "Projetos Especiais",
    desc: "Gestão de ações sob medida — naming rights, eventos, patrocínios e merchandising — fora do fluxo padrão de mídia.",
    items: [
      "Cronograma com marcos",
      "Equipe multidisciplinar",
      "Orçamento e despesas",
      "Status e entregáveis",
    ],
  },
  {
    icon: Tv,
    title: "Multi-veículo",
    desc: "Gerencie TV, rádio, portal e OOH/DOOH em uma única conta — com filtros e relatórios consolidados ou por veículo.",
    items: [
      "Multi-tenant",
      "Multi-praça",
      "Identidade visual por veículo",
      "Relatórios consolidados",
    ],
  },
  {
    icon: Shield,
    title: "Permissões Granulares",
    desc: "Perfis Adm, Comercial, Produção, Financeiro — cada um vê e edita apenas o que precisa.",
    items: ["RBAC por módulo", "Auditoria completa", "SSO Google", "Logs de acesso"],
  },
  {
    icon: History,
    title: "Histórico & Auditoria",
    desc: "Trilha completa de quem fez o quê e quando — indispensável para compliance e governança.",
    items: ["Logs por usuário", "Filtros por módulo", "Exportação", "Retenção configurável"],
  },
  {
    icon: Bell,
    title: "Notificações",
    desc: "Alertas inteligentes de tarefas, propostas vencendo, PIs aprovadas e metas atingidas.",
    items: ["E-mail", "Push no app", "Resumo diário", "Personalização"],
  },
];

function Recursos() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 midia-glow pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-12 text-center">
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
            Recursos
          </span>
          <h1 className="mt-3 text-5xl lg:text-6xl font-bold leading-[1.05]">
            Uma plataforma, <br />
            <span className="midia-grad-text">todos os módulos</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--m-muted)] max-w-2xl mx-auto">
            Cada módulo foi desenhado a partir do fluxo real de quem vende mídia. Tudo integrado,
            tudo conectado.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <div key={m.title} className="midia-card p-6 flex flex-col">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                <m.icon className="w-5 h-5 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{m.title}</h3>
              <p className="text-sm text-[var(--m-muted)] leading-relaxed mb-4">{m.desc}</p>
              <ul className="space-y-1.5 mt-auto">
                {m.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--m-text)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="midia-card p-10 lg:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 midia-glow opacity-60" />
          <div className="relative">
            <h2 className="text-3xl lg:text-4xl font-bold">Quer ver tudo isso funcionando?</h2>
            <p className="mt-3 text-[var(--m-muted)]">
              Demonstração ao vivo em 30 minutos com seu time.
            </p>
            <Link
              to="/site/contato"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30"
            >
              Agendar demonstração <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
