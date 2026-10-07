import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Menu, X, Sparkles, LogIn, ArrowRight } from "lucide-react";
import { useState } from "react";

const nav = [
  { to: "/site", label: "Início" },
  { to: "/site/inventario", label: "Inventário OOH" },
  { to: "/site/recursos", label: "Recursos" },
  { to: "/site/precos", label: "Preços" },
  { to: "/site/contato", label: "Contato" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <>
      {/* Top Banner de Acesso Rápido ao Sistema */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 text-white text-xs py-2 px-4 text-center border-b border-indigo-500/20 flex items-center justify-center gap-2">
        <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white/80">Já é cliente ou usuário Mídia.OS?</span>
        <Link
          to="/login"
          className="font-bold text-amber-300 hover:text-white underline inline-flex items-center gap-1 transition-colors"
        >
          Acessar o Sistema (Login) <ArrowRight className="size-3" />
        </Link>
      </div>

      <header className="sticky top-0 z-50 border-b border-[var(--m-border)] backdrop-blur-xl bg-[#0a0a1a]/90">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-18 flex items-center justify-between gap-3">
          <Link to="/site" className="flex items-center gap-2.5 font-display font-bold text-xl">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </span>
            <span className="tracking-tight text-white">
              mídia<span className="midia-grad-text">.OS</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => {
              const active =
                loc.pathname === n.to || (n.to !== "/site" && loc.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "text-white bg-white/10" : "text-[var(--m-muted)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {/* BOTÃO NÍTIDO DE ACESSO AO SISTEMA */}
            <Link
              to="/login"
              className="px-4 py-2 text-xs uppercase tracking-wider font-extrabold rounded-xl border border-indigo-400/50 bg-indigo-500/20 hover:bg-indigo-500/30 text-white transition-all shadow-md flex items-center gap-2 hover:border-indigo-400"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>Acessar Sistema</span>
            </Link>

            <Link
              to="/site/demo"
              className="px-5 py-2 text-xs uppercase tracking-wider font-extrabold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
            >
              Teste Grátis 48h
            </Link>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white flex items-center gap-1 shadow-sm"
            >
              <LogIn className="size-3.5" /> Entrar
            </Link>
            <button
              className="text-white p-1.5 rounded-lg hover:bg-white/10"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-[var(--m-border)] px-4 sm:px-6 py-5 space-y-3 bg-[#0a0a1a]">
            {/* BOTÃO MOBILE DE DESTAQUE MÁXIMO */}
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-extrabold rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white shadow-xl border border-indigo-400/30"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>ACESSAR O SISTEMA (LOGIN)</span>
            </Link>

            <div className="pt-2 border-t border-white/10 space-y-1">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 px-2 text-sm text-[var(--m-muted)] hover:text-white rounded-lg hover:bg-white/5"
                >
                  {n.label}
                </Link>
              ))}
              <Link
                to="/site/demo"
                onClick={() => setOpen(false)}
                className="block py-2.5 px-2 text-sm font-semibold text-indigo-300 hover:text-white"
              >
                Solicitar Demonstração Grátis →
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
            Sistema operacional comercial para veículos de comunicação. Do briefing à PI, em um só
            lugar.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-white">Produto</h4>
          <ul className="space-y-2 text-sm text-[var(--m-muted)]">
            <li>
              <Link to="/site/inventario" className="hover:text-white">
                Inventário &amp; Mapa OOH
              </Link>
            </li>
            <li>
              <Link to="/site/recursos" className="hover:text-white">
                Recursos
              </Link>
            </li>
            <li>
              <Link to="/site/precos" className="hover:text-white">
                Preços
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white">
                Entrar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3 text-white">Empresa</h4>
          <ul className="space-y-2 text-sm text-[var(--m-muted)]">
            <li>
              <Link to="/site/contato" className="hover:text-white">
                Contato
              </Link>
            </li>
            <li>
              <Link to="/site/termos" className="hover:text-white">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link to="/site/privacidade" className="hover:text-white">
                Privacidade &amp; LGPD
              </Link>
            </li>
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
