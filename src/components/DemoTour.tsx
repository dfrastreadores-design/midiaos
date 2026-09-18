import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles, Users, FileText, ClipboardList, BarChart3, KanbanSquare,
  ArrowRight, ArrowLeft, X, Rocket,
} from "lucide-react";

const STORAGE_KEY = "midiaos:demo_tour_seen";

type Step = {
  icon: typeof Sparkles;
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

const STEPS: Step[] = [
  {
    icon: Rocket,
    title: "Bem-vindo ao mídia.OS 👋",
    body:
      "Sua conta demo está pronta com dados fictícios já criados (clientes, propostas, briefing e tarefas). Você tem 48 horas para explorar todos os módulos — sem cartão de crédito.",
  },
  {
    icon: Users,
    title: "CRM — Clientes e Agências",
    body:
      "Cadastre clientes e agências, gerencie contatos e acompanhe o relacionamento comercial em um único lugar.",
    href: "/clientes",
    cta: "Abrir CRM",
  },
  {
    icon: FileText,
    title: "Propostas Comerciais",
    body:
      "Monte propostas com desconto, bonificações e validade. Geração automática em PDF/PPTX com o layout da sua marca.",
    href: "/propostas",
    cta: "Ver propostas",
  },
  {
    icon: ClipboardList,
    title: "Briefings & PI",
    body:
      "Centralize briefings de campanha e gere a Proposta de Inserção (PI) com assinatura digital do cliente.",
    href: "/briefings",
    cta: "Ver briefings",
  },
  {
    icon: KanbanSquare,
    title: "Tarefas & Produção",
    body:
      "Quadro Kanban para acompanhar tarefas comerciais, solicitações de produção e prazos da equipe.",
    href: "/tarefas",
    cta: "Abrir tarefas",
  },
  {
    icon: BarChart3,
    title: "Dashboards & Relatórios",
    body:
      "Acompanhe metas, pipeline e desempenho do time em dashboards em tempo real. Tudo pronto para decisão.",
    href: "/relatorios",
    cta: "Ver relatórios",
  },
];

export function DemoTour({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isDemo) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    setOpen(true);
  }, [isDemo]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-[#13132a] to-[#0b0b18] text-white shadow-2xl overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.2),transparent_55%)]" />

        <button
          onClick={close}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative p-7">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] text-indigo-200 mb-5">
            <Sparkles className="w-3 h-3" /> Tour da plataforma · {step + 1}/{STEPS.length}
          </div>

          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-7 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-indigo-400" : "w-4 bg-white/15"
                }`}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-white/70 hover:text-white disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="flex items-center gap-2">
              {s.href && (
                <Link
                  to={s.href}
                  onClick={close}
                  className="text-sm px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5"
                >
                  {s.cta ?? "Abrir"}
                </Link>
              )}
              {isLast ? (
                <button
                  onClick={close}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 hover:opacity-90"
                >
                  Começar a usar <Rocket className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setStep((v) => Math.min(STEPS.length - 1, v + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 hover:opacity-90"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
