import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Menu,
  X,
  Sparkles,
  LogIn,
  ArrowRight,
  Tv,
  Users2,
  Cpu,
  Layers,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/site#veiculos", label: "Veículos de Mídia", icon: Tv },
  { href: "/site#representacoes", label: "Representações", icon: Users2 },
  { href: "/site#agencias", label: "Para Agências", icon: Building2 },
  { href: "/site#comercial", label: "Gestão do Time", icon: TrendingUp },
  { href: "/site#recursos", label: "Recursos", icon: Cpu },
  { href: "/site#planos", label: "Planos", icon: Layers },
  { href: "/site#faq", label: "Dúvidas", icon: ShieldCheck },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (typeof window !== "undefined" && href.includes("#")) {
      const id = href.split("#")[1];
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      {/* Top Banner de Acesso Rápido ao Sistema e Notificação de Produção */}
      <div className="bg-[#070b12] text-xs py-2 px-4 text-center border-b border-cyan-500/20 flex flex-wrap items-center justify-center gap-2 text-slate-300">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
          <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
          TECNOLOGIA ESPECIALIZADA PARA O MERCADO DE MÍDIA
        </span>
        <span className="text-slate-400 hidden sm:inline">•</span>
        <span className="text-slate-300 hidden md:inline">
          Já é cliente ou usuário parceiro Mídia.OS?
        </span>
        <Link
          to="/login"
          className="font-bold text-cyan-300 hover:text-white underline inline-flex items-center gap-1 transition-colors ml-1"
        >
          Acessar Sistema <ArrowRight className="size-3" />
        </Link>
      </div>

      <header className="sticky top-0 z-50 border-b border-cyan-500/15 backdrop-blur-2xl bg-[#0A0E17]/90 transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Logo MidiaOS com Acabamento Neon */}
          <Link
            to="/site"
            className="flex items-center gap-3 font-display font-bold text-xl group cursor-pointer"
          >
            <div className="relative size-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 p-[1.5px] shadow-[0_0_20px_rgba(0,242,254,0.35)] group-hover:shadow-[0_0_30px_rgba(0,242,254,0.6)] transition-all">
              <div className="w-full h-full rounded-[10px] bg-[#0A0E17] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight text-white font-extrabold text-2xl flex items-center">
                Midia
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  OS
                </span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono -mt-1 font-semibold">
                Intelligence &amp; Operations
              </span>
            </div>
          </Link>

          {/* Menu Desktop */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((n) => {
              return (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={(e) => {
                    if (loc.pathname === "/site") {
                      e.preventDefault();
                      handleNavClick(n.href);
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-xs xl:text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                >
                  {n.label}
                </a>
              );
            })}
          </nav>

          {/* Ações Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-2 hover:border-cyan-500/40"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acessar</span>
            </Link>

            <Link
              to="/site/demo"
              className="px-5 py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-slate-950 hover:text-white transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(0,242,254,0.35)] hover:shadow-[0_0_35px_rgba(0,242,254,0.6)] flex items-center gap-2"
            >
              <span>Testar Agora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Gatilho Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              to="/site/demo"
              className="px-3 py-1.5 text-xs font-extrabold rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm"
            >
              Testar Agora
            </Link>
            <button
              className="text-slate-300 p-2 rounded-xl hover:bg-white/5 border border-slate-800"
              onClick={() => setOpen(!open)}
              aria-label="Abrir Menu"
            >
              {open ? <X className="w-6 h-6 text-cyan-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile Retrátil */}
        {open && (
          <div className="lg:hidden border-t border-cyan-500/20 px-4 sm:px-6 py-6 space-y-4 bg-[#0A0E17]/98 backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-200">
            <Link
              to="/site/demo"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-extrabold rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-slate-950 shadow-[0_0_25px_rgba(0,242,254,0.4)]"
            >
              <Sparkles className="w-4 h-4" />
              <span>SOLICITAR DEMONSTRAÇÃO / TESTAR AGORA</span>
            </Link>

            <div className="pt-2 border-t border-slate-800 space-y-1">
              {navItems.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={(e) => {
                    if (loc.pathname === "/site") {
                      e.preventDefault();
                      handleNavClick(n.href);
                    } else {
                      setOpen(false);
                    }
                  }}
                  className="flex items-center gap-3 py-3 px-3 text-sm text-slate-300 hover:text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-colors"
                >
                  <n.icon className="w-4 h-4 text-cyan-400" />
                  <span>{n.label}</span>
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Já possui conta no MidiaOS?</span>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acessar Login</span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-cyan-500/20 bg-[#070b12] text-slate-300 relative overflow-hidden">
      <div className="absolute inset-0 midia-grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2 space-y-4">
          <Link to="/site" className="flex items-center gap-3 font-display font-bold text-xl">
            <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 p-[1.5px] shadow-[0_0_20px_rgba(0,242,254,0.35)]">
              <div className="w-full h-full rounded-[10px] bg-[#0A0E17] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <span className="tracking-tight text-white font-extrabold text-2xl">
              Midia<span className="text-cyan-400">OS</span>
            </span>
          </Link>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            A infraestrutura SaaS definitiva para Veículos de Comunicação (TV, Rádio, Portais,
            OOH/DOOH, Impresso) e Representações Comerciais de Mídia no Brasil.
          </p>
          <div className="pt-2 flex flex-col gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Validade Jurídica MP 2.200-2/2001 para PIs e Contratos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Conformidade com a LGPD e Criptografia em Nuvem</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>SLA Corporativo 99.9% com Suporte Especializado</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-400 mb-4 font-mono">
            Soluções
          </h4>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li>
              <a href="/site#veiculos" className="hover:text-cyan-300 transition-colors">
                Para Emissoras de TV &amp; Rádio
              </a>
            </li>
            <li>
              <a href="/site#veiculos" className="hover:text-cyan-300 transition-colors">
                Para Painéis OOH &amp; DOOH
              </a>
            </li>
            <li>
              <a href="/site#veiculos" className="hover:text-cyan-300 transition-colors">
                Para Portais &amp; Mídia Digital
              </a>
            </li>
            <li>
              <a href="/site#representacoes" className="hover:text-cyan-300 transition-colors">
                Para Representações Comerciais
              </a>
            </li>
            <li>
              <Link to="/site/inventario" className="hover:text-cyan-300 transition-colors">
                Mapa &amp; Inventário Nacional
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-400 mb-4 font-mono">
            Plataforma
          </h4>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li>
              <a href="/site#recursos" className="hover:text-cyan-300 transition-colors">
                Motor de Propostas &amp; P.I.
              </a>
            </li>
            <li>
              <a href="/site#recursos" className="hover:text-cyan-300 transition-colors">
                Módulo Financeiro &amp; Repasses
              </a>
            </li>
            <li>
              <a href="/site#planos" className="hover:text-cyan-300 transition-colors">
                Tabela de Planos &amp; Preços
              </a>
            </li>
            <li>
              <Link to="/site/demo" className="hover:text-cyan-300 transition-colors">
                Testar 48 Horas Grátis
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-cyan-300 transition-colors">
                Acessar Sistema (Login)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase font-bold tracking-wider text-cyan-400 mb-4 font-mono">
            Contato Oficial
          </h4>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li className="font-semibold text-white">www.midiaos.online</li>
            <li>comercial@midiaos.online</li>
            <li>(61) 9 8474-6857</li>
            <li>Brasília — DF | Atendimento Nacional</li>
            <li className="pt-2">
              <a
                href="https://wa.me/5561984746857"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
              >
                <PhoneCall className="size-3" /> Falar via WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800/80 py-6 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} MidiaOS (www.midiaos.online) — Todos os direitos
            reservados.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/site/termos" className="hover:text-slate-300 transition-colors">
              Termos de Uso
            </Link>
            <Link to="/site/privacidade" className="hover:text-slate-300 transition-colors">
              Privacidade &amp; LGPD
            </Link>
            <a
              href="https://midiaos.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 flex items-center gap-1"
            >
              midiaos.online <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout() {
  return (
    <div className="midia-site min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
