import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  FileSignature,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  Shield,
  Zap,
  CheckCircle2,
  Radio,
  Tv,
  Globe,
  Newspaper,
  TrendingUp,
  FileText,
  Bell,
  Star,
  LogIn,
  Smartphone,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/site/")({
  head: () => ({
    meta: [
      { title: "Mídia.OS — Aumente o Faturamento do seu Veículo de Comunicação" },
      {
        name: "description",
        content:
          "Sistema comercial completo para TVs, rádios, portais e OOH. CRM, Proposta Automática e PI Digital. Teste grátis por 48h e profissionalize sua venda de mídia.",
      },
      {
        property: "og:title",
        content: "mídia.OS — Sistema comercial para veículos de comunicação",
      },
      {
        property: "og:description",
        content:
          "Do primeiro contato à PI assinada — tudo em uma só plataforma feita para veículos de mídia. Demonstração gratuita.",
      },
      { property: "og:url", content: "https://midiaos.online/site" },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "mídia.OS",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "Plataforma SaaS de gestão comercial para veículos de comunicação: CRM, propostas, PI digital, briefings e financeiro.",
          url: "https://midiaos.online/site",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: "250",
            highPrice: "1499",
            offerCount: "4",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "27",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqData.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Home,
});

const faqData = [
  {
    q: "O mídia.OS atende emissoras de TV, rádios e portais?",
    a: "Sim. A plataforma foi desenhada para qualquer veículo de comunicação — TVs, rádios, portais web e mídia OOH/DOOH — com configuração por tipo de produto, grade e veículo.",
  },
  {
    q: "Quanto tempo leva para começar a usar?",
    a: "A implantação padrão acontece em até 7 dias úteis e inclui configuração inicial, importação de dados básicos e treinamento da equipe.",
  },
  {
    q: "Posso migrar PIs antigas em PDF?",
    a: "Sim. Basta arrastar o PDF para o módulo de PI — a inteligência artificial extrai cliente, produtos, períodos e valores automaticamente.",
  },
  {
    q: "A assinatura eletrônica das propostas tem validade jurídica?",
    a: "Sim. Toda proposta enviada gera link de assinatura eletrônica com timestamp, IP e log de acesso, válido conforme a MP 2.200-2/2001.",
  },
  {
    q: "Quanto custa o mídia.OS?",
    a: "Os planos começam em R$ 250/mês (até 2 usuários) e vão até planos Enterprise sob consulta para grupos de mídia multi-veículo. Veja todos os planos na página de Preços.",
  },
  {
    q: "Funciona para grupos com vários veículos?",
    a: "Sim. O sistema é multi-veículo e multi-tenant — você roda TV, rádio e portal na mesma conta, com identidade visual e relatórios separados ou consolidados.",
  },
];

function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 midia-glow pointer-events-none" />
        <div className="absolute inset-0 midia-grid-bg opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 lg:pt-32 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 mb-6">
                <Zap className="w-3.5 h-3.5" />
                Validado em operação real
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                Venda mais mídia, <br />
                <span className="midia-grad-text">em menos tempo.</span>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-[var(--m-muted)] max-w-2xl leading-relaxed">
                A plataforma tudo-em-um para veículos de comunicação que querem escalar o
                faturamento. CRM, propostas automáticas, PI digital e dashboards financeiros feitos
                sob medida.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {/* BOTÃO ULTRA NÍTIDO DE ACESSO AO SISTEMA */}
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 text-white font-extrabold text-base shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/70 transition-all hover:-translate-y-0.5 border border-indigo-300/40"
                >
                  <LogIn className="w-5 h-5 text-amber-300" />
                  <span>Acessar o Sistema (Login)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <a
                  href="https://wa.me/5561984746857"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold hover:bg-emerald-500/20 transition-all"
                >
                  Falar no WhatsApp
                </a>
              </div>

              {/* CARD DESTAQUE: APP DISPONÍVEL NO ANDROID E IOS */}
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>App Mobile Mídia.OS</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        Android & iOS
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--m-muted)] mt-0.5">
                      Instale no seu smartphone para aprovar PIs e receber alertas instantâneos.
                    </div>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="shrink-0 text-xs font-bold text-indigo-300 hover:text-white underline"
                >
                  Acessar App →
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[var(--m-muted)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Implantação em até 7 dias
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Treinamento incluso
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Suporte em português
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY / SEGMENTOS */}
      <section className="border-y border-[var(--m-border)] bg-[#0d0d24]/50">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-center text-xs uppercase tracking-widest text-[var(--m-muted)] mb-8">
            Feito para todo tipo de veículo de comunicação
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Tv, label: "Emissoras de TV" },
              { icon: Radio, label: "Rádios" },
              { icon: Globe, label: "Portais Web" },
              { icon: Newspaper, label: "Grupos de Mídia" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2 text-[var(--m-muted)]">
                <s.icon className="w-7 h-7 text-indigo-400" />
                <span className="text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold">Aumente sua produtividade comercial</h2>
          <p className="mt-4 text-lg text-[var(--m-muted)]">
            Elimine processos manuais e foque no que importa: fechar negócios. O Mídia.OS organiza
            toda sua jornada de venda.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="midia-card p-6 transition-all hover:-translate-y-1">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--m-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMONSTRAÇÃO / SCREENSHOTS */}
      <section className="bg-gradient-to-b from-transparent via-[#0d0d24] to-transparent py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
              Demonstração
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-3">Veja a plataforma em ação</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <ScreenshotCard
              title="Dashboard comercial"
              desc="Receita, pipeline e ranking de executivos em tempo real."
              variant="dashboard"
            />
            <ScreenshotCard
              title="Construtor de propostas"
              desc="Monte propostas em minutos com tabela de preços inteligente."
              variant="proposta"
            />
            <ScreenshotCard
              title="PI digital com assinatura"
              desc="Pedidos de inserção gerados e assinados eletronicamente."
              variant="pi"
            />
          </div>
        </div>
      </section>

      {/* INTEGRAÇÕES */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
              Integrações
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-3">
              Conectado ao seu <span className="midia-grad-text">ecossistema</span>
            </h2>
            <p className="mt-4 text-lg text-[var(--m-muted)]">
              O mídia.OS se conecta às ferramentas que sua emissora já usa — sem fricção, sem
              retrabalho.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Sincronização diária de CNPJ direto da base da Receita Federal",
                "Importação de PIs em PDF com extração via IA",
                "Envio de e-mails transacionais para clientes e agências",
                "Exportação de propostas em PDF e PPTX personalizados",
                "Notificações em tempo real para a equipe",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3 text-[var(--m-muted)]">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "Receita Federal",
              "Google",
              "Stripe",
              "OpenAI",
              "Resend",
              "WhatsApp",
              "PowerPoint",
              "Excel",
              "PDF",
            ].map((n) => (
              <div
                key={n}
                className="midia-card aspect-square flex items-center justify-center p-4 text-center text-sm text-[var(--m-muted)]"
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-[#0d0d24]/50 border-y border-[var(--m-border)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
              Depoimentos
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold mt-3">Quem usa, recomenda</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.author} className="midia-card p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-indigo-400 text-indigo-400" />
                  ))}
                </div>
                <p className="text-[var(--m-text)] leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-6 pt-4 border-t border-[var(--m-border)]">
                  <div className="font-semibold">{t.author}</div>
                  <div className="text-sm text-[var(--m-muted)]">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "5x mais rápido", l: "para gerar e assinar uma PI Digital" },
            { n: "Zero papel", l: "processo 100% digital e sustentável" },
            { n: "7 dias", l: "implantação recorde com suporte total" },
            { n: "+30%", l: "de aumento médio na produtividade da equipe" },
          ].map((s) => (
            <div key={s.l} className="midia-card p-6 text-center">
              <div className="text-4xl lg:text-5xl font-bold midia-grad-text">{s.n}</div>
              <div className="mt-2 text-sm text-[var(--m-muted)]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
            FAQ
          </span>
          <h2 className="mt-3 text-4xl lg:text-5xl font-bold">Perguntas frequentes</h2>
          <p className="mt-4 text-[var(--m-muted)]">As dúvidas que ouvimos antes de toda demo.</p>
        </div>
        <div className="space-y-3">
          {faqData.map((q) => (
            <details key={q.q} className="midia-card p-5 group">
              <summary className="cursor-pointer font-medium flex items-center justify-between list-none">
                {q.q}
                <span className="text-indigo-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-[var(--m-muted)] leading-relaxed">{q.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden midia-card p-12 lg:p-16 text-center">
          <div className="absolute inset-0 midia-glow opacity-60" />
          <div className="relative">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Pronto para profissionalizar <br />
              sua operação comercial?
            </h2>
            <p className="mt-4 text-lg text-[var(--m-muted)] max-w-xl mx-auto">
              Agende uma demonstração de 30 minutos e veja como o mídia.OS encaixa na sua emissora.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="https://wa.me/5561984746857"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-opacity"
              >
                Falar no WhatsApp <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/site/precos"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-[var(--m-border)] text-white hover:bg-white/5 transition-colors"
              >
                Ver planos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const features = [
  {
    icon: Users,
    title: "CRM com pipeline visual",
    desc: "Acompanhe oportunidades por estágio, executivo e cliente, com automações de follow-up.",
  },
  {
    icon: FileText,
    title: "Propostas em minutos",
    desc: "Tabela de preços por produto, descontos automáticos e exportação em PDF/PPTX da sua marca.",
  },
  {
    icon: FileSignature,
    title: "PI digital com assinatura",
    desc: "Gere pedidos de inserção, envie por e-mail e colete assinatura eletrônica em um clique.",
  },
  {
    icon: Briefcase,
    title: "Briefings & Projetos",
    desc: "Captura de briefing comercial estruturado e gestão de projetos especiais por veículo.",
  },
  {
    icon: Calendar,
    title: "Programação & Permuta",
    desc: "Controle de grade, permutas comerciais e calendário compartilhado da equipe.",
  },
  {
    icon: DollarSign,
    title: "Financeiro & Comissões",
    desc: "Faturamento, comissionamento de executivos, metas e relatórios mensais consolidados.",
  },
  {
    icon: BarChart3,
    title: "Dashboards e Relatórios",
    desc: "Receita por veículo, cliente, agência e produto — com filtros e exportação.",
  },
  {
    icon: TrendingUp,
    title: "Metas & Gamificação",
    desc: "Metas individuais e por equipe, ranking e acompanhamento em tempo real.",
  },
  {
    icon: Shield,
    title: "Permissões por perfil",
    desc: "Adm, comercial, produção, financeiro — cada perfil vê só o que precisa.",
  },
  {
    icon: Bell,
    title: "Notificações inteligentes",
    desc: "Alertas de tarefas, propostas vencendo e novas PIs aprovadas.",
  },
  {
    icon: Zap,
    title: "Importação por IA",
    desc: "Recebeu uma PI em PDF? A plataforma extrai os dados automaticamente.",
  },
  {
    icon: Globe,
    title: "100% nuvem",
    desc: "Acesse de qualquer lugar, em qualquer dispositivo, com segurança corporativa.",
  },
];

const testimonials = [
  {
    quote:
      "O Mídia.OS revolucionou nossa OPEC. O que levava horas para conferir e emitir agora é feito em minutos com total segurança.",
    author: "Diretoria Comercial",
    role: "Rede de Emissoras Afiliadas",
  },
  {
    quote:
      "Pela primeira vez consigo ver o pipeline inteiro em um único lugar. Os dashboards mudaram a forma como decidimos.",
    author: "Diretor de Vendas",
    role: "Grupo de Mídia Regional",
  },
  {
    quote:
      "Implantação rápida e suporte que entende o negócio de mídia. Não é mais um CRM genérico — é feito pra gente.",
    author: "Coordenadora Comercial",
    role: "Emissora Afiliada",
  },
];

function HeroMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-3xl" />
      <div className="relative midia-card p-5 shadow-2xl shadow-indigo-500/20">
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--m-muted)]">
            <span className="font-medium text-white">Dashboard — Junho 2026</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              +18%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Receita", v: "R$ 1,2M" },
              { l: "Propostas", v: "47" },
              { l: "PIs Ativas", v: "23" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg bg-white/5 border border-[var(--m-border)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-[var(--m-muted)]">
                  {k.l}
                </div>
                <div className="mt-1 text-base font-semibold">{k.v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-white/5 border border-[var(--m-border)] p-4 h-40 flex items-end gap-1.5">
            {[40, 55, 35, 70, 50, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-indigo-500 to-violet-400"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {[
              { c: "Banco do Brasil", v: "R$ 145k", s: "Em negociação" },
              { c: "Caixa Econômica", v: "R$ 92k", s: "Proposta enviada" },
              { c: "Sebrae DF", v: "R$ 68k", s: "PI assinada" },
            ].map((r) => (
              <div
                key={r.c}
                className="flex items-center justify-between text-xs p-2 rounded-md bg-white/5"
              >
                <span className="font-medium">{r.c}</span>
                <span className="text-[var(--m-muted)]">{r.s}</span>
                <span className="font-semibold text-indigo-300">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenshotCard({
  title,
  desc,
  variant,
}: {
  title: string;
  desc: string;
  variant: "dashboard" | "proposta" | "pi";
}) {
  return (
    <div className="midia-card overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-[#1e1e5a] to-[#0a0a1a] relative overflow-hidden">
        <div className="absolute inset-0 midia-grid-bg opacity-50" />
        <div className="absolute inset-4 rounded-lg bg-[#0a0a1a]/80 border border-[var(--m-border)] p-3">
          {variant === "dashboard" && (
            <div className="space-y-2">
              <div className="h-2 w-20 rounded bg-indigo-500/40" />
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 rounded bg-white/5" />
                ))}
              </div>
              <div className="h-16 rounded bg-gradient-to-t from-indigo-500/30 to-violet-500/10" />
            </div>
          )}
          {variant === "proposta" && (
            <div className="space-y-1.5">
              <div className="h-2 w-24 rounded bg-indigo-500/40" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="h-3 flex-1 rounded bg-white/5" />
                  <div className="h-3 w-10 rounded bg-white/5" />
                  <div className="h-3 w-12 rounded bg-indigo-500/30" />
                </div>
              ))}
            </div>
          )}
          {variant === "pi" && (
            <div className="space-y-2">
              <div className="h-2 w-28 rounded bg-indigo-500/40" />
              <div className="h-1.5 w-full rounded bg-white/5" />
              <div className="h-1.5 w-5/6 rounded bg-white/5" />
              <div className="h-1.5 w-4/6 rounded bg-white/5" />
              <div className="mt-3 h-10 rounded-md border border-dashed border-indigo-400/40 flex items-center justify-center text-[10px] text-indigo-300">
                ✍ Assinatura digital
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-[var(--m-muted)]">{desc}</p>
      </div>
    </div>
  );
}
