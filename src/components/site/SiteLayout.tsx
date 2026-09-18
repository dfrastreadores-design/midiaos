import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/site", label: "Início" },
  { to: "/site/recursos", label: "Recursos" },
  { to: "/site/precos", label: "Preços" },
  { to: "/site/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--m-border)] backdrop-blur-xl bg-[#0a0a1a]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        <Link to="/site" className="flex items-center gap-2 font-display font-bold text-lg">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </span>
          <span>mídia<span className="midia-grad-text">.OS</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/site" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  active ? "text-white bg-white/5" : "text-[var(--m-muted)] hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-[var(--m-muted)] hover:text-white transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/site/demo"
            className="px-5 py-2.5 text-sm font-bold rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
          >
            Teste grátis 48h
          </Link>
        </div>
        <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-[var(--m-border)] px-4 sm:px-6 py-4 space-y-2">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm text-[var(--m-muted)] hover:text-white"
            >
              {n.label}
            </Link>
          ))}
          <Link to="/site/demo" className="block py-2 text-sm font-medium text-indigo-300">
            Teste grátis 48h →
          </Link>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--m-border)] mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-lg mb-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            mídia<span className="midia-grad-text">.OS</span>
          </div>
          <p className="text-sm text-[var(--m-muted)] max-w-xs">
            Sistema operacional comercial para veículos de comunicação. Do briefing à PI, em um só lugar.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-white">Produto</h4>
          <ul className="space-y-2 text-sm text-[var(--m-muted)]">
            <li><Link to="/site/recursos" className="hover:text-white">Recursos</Link></li>
            <li><Link to="/site/precos" className="hover:text-white">Preços</Link></li>
            <li><Link to="/login" className="hover:text-white">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-white">Empresa</h4>
          <ul className="space-y-2 text-sm text-[var(--m-muted)]">
            <li><Link to="/site/contato" className="hover:text-white">Contato</Link></li>
            <li><Link to="/site/termos" className="hover:text-white">Termos de Uso</Link></li>
            <li><Link to="/site/privacidade" className="hover:text-white">Privacidade &amp; LGPD</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-white">Contato</h4>
          <ul className="space-y-2 text-sm text-[var(--m-muted)]">
            <li>comercial@midiaos.online</li>
            <li>(61) 9 8474-6857</li>
            <li>Brasília — DF</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--m-border)] py-6 text-center text-xs text-[var(--m-muted)]">
        © {new Date().getFullYear()} mídia.OS — Todos os direitos reservados.
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
