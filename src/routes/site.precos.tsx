import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/site/precos")({
  head: () => ({
    meta: [
      { title: "Preços — mídia.OS | Planos a partir de R$ 250/mês" },
      {
        name: "description",
        content:
          "Planos do mídia.OS para emissoras, rádios e portais a partir de R$ 250/mês. Implantação, treinamento e suporte inclusos. 7 dias para começar.",
      },
      { property: "og:title", content: "Preços do mídia.OS — a partir de R$ 250/mês" },
      {
        property: "og:description",
        content:
          "Planos escaláveis para veículos de comunicação. Sem taxa de setup, com treinamento e suporte.",
      },
      { property: "og:url", content: "https://midiaos.online/site/precos" },
    ],
    links: [{ rel: "canonical", href: "https://midiaos.online/site/precos" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "mídia.OS",
          description:
            "Sistema comercial para veículos de comunicação: CRM, propostas, PI digital, financeiro.",
          brand: { "@type": "Brand", name: "mídia.OS" },
          offers: [
            {
              "@type": "Offer",
              name: "Starter",
              price: "250",
              priceCurrency: "BRL",
              url: "https://midiaos.online/site/precos",
            },
            {
              "@type": "Offer",
              name: "Essencial",
              price: "550",
              priceCurrency: "BRL",
              url: "https://midiaos.online/site/precos",
            },
            {
              "@type": "Offer",
              name: "Profissional",
              price: "1499",
              priceCurrency: "BRL",
              url: "https://midiaos.online/site/precos",
            },
          ],
        }),
      },
    ],
  }),
  component: Precos,
});

const plans = [
  {
    name: "Starter",
    desc: "Para times enxutos que precisam do essencial para 2 usuários.",
    price: "R$ 250",
    period: "/mês",
    features: [
      "Até 2 usuários",
      "CRM completo",
      "Propostas e PI digital",
      "Dashboards básicos",
      "Suporte por e-mail",
      "Treinamento online",
    ],
    cta: "Começar agora",
    highlighted: false,
  },
  {
    name: "Essencial",
    desc: "Para veículos começando a profissionalizar a operação comercial.",
    price: "R$ 550",
    period: "/mês",
    features: [
      "Até 5 usuários",
      "CRM completo",
      "Propostas e PI digital",
      "Dashboards básicos",
      "Suporte por e-mail",
      "Treinamento online",
    ],
    cta: "Começar agora",
    highlighted: false,
  },
  {
    name: "Profissional",
    desc: "Para emissoras com operação consolidada e múltiplos executivos.",
    price: "R$ 1.499",
    period: "/mês",
    features: [
      "Até 20 usuários",
      "Todos os módulos",
      "Briefings, Permuta e Projetos",
      "Dashboards avançados + BI",
      "Importação de PIs por IA",
      "Suporte prioritário",
      "Treinamento presencial",
    ],
    cta: "Falar com vendas",
    highlighted: true,
  },
  {
    name: "Enterprise",
    desc: "Para grupos de mídia com múltiplos veículos e necessidades específicas.",
    price: "Sob consulta",
    period: "",
    features: [
      "Usuários ilimitados",
      "Multi-veículo / multi-praça",
      "SSO corporativo (SAML)",
      "Customizações dedicadas",
      "SLA garantido",
      "Customer Success dedicado",
      "Onboarding white-glove",
    ],
    cta: "Falar com vendas",
    highlighted: false,
  },
];

function Precos() {
  const [annual, setAnnual] = useState(false);
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 midia-glow pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-12 text-center">
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
            Preços
          </span>
          <h1 className="mt-3 text-5xl lg:text-6xl font-bold leading-[1.05]">
            Planos para <span className="midia-grad-text">cada estágio</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--m-muted)] max-w-2xl mx-auto">
            Implantação, treinamento e suporte em português inclusos em todos os planos.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 p-1 rounded-full bg-white/5 border border-[var(--m-border)]">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${!annual ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white" : "text-[var(--m-muted)]"}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${annual ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white" : "text-[var(--m-muted)]"}`}
            >
              Anual <span className="text-xs text-emerald-300 ml-1">-20%</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`midia-card p-8 flex flex-col relative ${
                p.highlighted ? "ring-2 ring-indigo-500/60 shadow-2xl shadow-indigo-500/20" : ""
              }`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-semibold text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Mais escolhido
                </div>
              )}
              <h3 className="text-2xl font-bold">{p.name}</h3>
              <p className="mt-2 text-sm text-[var(--m-muted)] min-h-[3rem]">{p.desc}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold">
                  {p.price === "Sob consulta" ? p.price : annual ? annualize(p.price) : p.price}
                </span>
                {p.period && <span className="text-[var(--m-muted)] ml-1">{p.period}</span>}
              </div>
              <ul className="mt-6 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/site/contato"
                className={`mt-8 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
                  p.highlighted
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 hover:opacity-90"
                    : "border border-[var(--m-border)] text-white hover:bg-white/5"
                }`}
              >
                {p.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">
            FAQ
          </span>
          <h2 className="mt-3 text-4xl font-bold">Perguntas frequentes</h2>
        </div>
        <div className="space-y-3">
          {faq.map((q) => (
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
    </>
  );
}

function annualize(monthly: string) {
  const n = parseInt(monthly.replace(/\D/g, ""), 10);
  if (!n) return monthly;
  const v = Math.round(n * 0.8);
  return "R$ " + v.toLocaleString("pt-BR");
}

const faq = [
  {
    q: "Quanto tempo leva a implantação?",
    a: "A implantação padrão acontece em até 7 dias úteis e inclui configuração inicial, importação de dados básicos e treinamento da equipe.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Toda a infraestrutura roda em nuvem com criptografia em trânsito e em repouso, backups automáticos diários e controle de acesso por perfil.",
  },
  {
    q: "Posso migrar dados de outro sistema?",
    a: "Sim. Suportamos importação por planilha (clientes, agências, executivos) e via integrações específicas combinadas com nossa equipe.",
  },
  {
    q: "Tem fidelidade?",
    a: "Os planos mensais são sem fidelidade. Planos anuais têm 15% de desconto com compromisso de 12 meses.",
  },
  {
    q: "Atende rádios, portais e mídia OOH/DOOH, ou só TV?",
    a: "Atende qualquer veículo de comunicação, incluindo mídia out-of-home (OOH) e digital out-of-home (DOOH). A plataforma foi desenhada para ser configurável por tipo de produto, grade e veículo.",
  },
  {
    q: "Posso testar antes de contratar?",
    a: "Sim. Oferecemos demonstração ao vivo de 30 minutos e, para o plano Profissional, um período de avaliação combinado caso a caso.",
  },
];
