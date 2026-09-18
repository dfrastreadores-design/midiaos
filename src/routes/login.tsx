import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Zap, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { translateError } from "@/lib/translate-error";
import logoMidiaOS from "@/assets/logo-midiaos.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Mídia.OS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/" });
    });
  }, [nav]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: translateError(error) });
      return;
    }
    toast.success("Login realizado");
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#0b0b18] text-white overflow-hidden">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.22),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao site
          </Link>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70 mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Plataforma segura — acesso restrito
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight">
            O sistema operacional <br />
            <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              dos veículos de mídia
            </span>
          </h1>
          <p className="mt-5 text-white/60 max-w-md leading-relaxed">
            CRM, propostas, PI, briefings, programação, financeiro e dashboards — em uma única plataforma.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-3 max-w-md">
            {[
              { icon: Zap, label: "Propostas e PI em minutos" },
              { icon: BarChart3, label: "Dashboards comerciais em tempo real" },
              { icon: ShieldCheck, label: "Permissões e auditoria por perfil" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-white/75">
                <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-indigo-300" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} mídia.OS · Todos os direitos reservados
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center p-6 sm:p-10 bg-[#0b0b18] lg:bg-white lg:text-slate-900">
        <Link
          to="/"
          className="lg:hidden absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>

        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <img src={logoMidiaOS} alt="mídia.OS" className="h-12 w-auto object-contain mb-5" />
            <h2 className="text-2xl font-semibold tracking-tight lg:text-slate-900">
              Bem-vindo de volta
            </h2>
            <p className="mt-1.5 text-sm text-white/60 lg:text-slate-500">
              Entre na sua conta para continuar
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm shadow-2xl lg:border-slate-200 lg:bg-white lg:shadow-[0_20px_60px_-20px_rgba(79,70,229,0.25)]"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-white/70 lg:text-slate-700">
                E-mail corporativo
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 lg:text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500 lg:bg-white lg:text-slate-900 lg:border-slate-200 lg:placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-white/70 lg:text-slate-700">
                  Senha
                </Label>
                <Link
                  to="/login"
                  className="text-xs text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-700"
                >
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 lg:text-slate-400" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500 lg:bg-white lg:text-slate-900 lg:border-slate-200 lg:placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/5 lg:text-slate-400 lg:hover:text-slate-700 lg:hover:bg-slate-100"
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:opacity-90 shadow-lg shadow-indigo-500/30 border-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <p className="text-[11px] text-center text-white/40 lg:text-slate-400">
              Ao entrar você concorda com nossos termos de uso e política de privacidade.
            </p>
          </form>

          <p className="mt-6 text-xs text-center text-white/50 lg:text-slate-500">
            Ainda não tem acesso?{" "}
            <Link
              to="/site/demo"
              className="font-medium text-indigo-300 hover:text-indigo-200 lg:text-indigo-600 lg:hover:text-indigo-700"
            >
              Teste grátis por 48h
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
