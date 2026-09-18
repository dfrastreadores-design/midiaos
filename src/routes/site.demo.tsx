import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Clock, CheckCircle2, ArrowRight, Loader2, Eye, EyeOff, RefreshCw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { seedDemoData } from "@/lib/demo-seed.functions";
import { fetchCnpj, formatCNPJ, onlyDigits } from "@/lib/cnpj";
import { toast } from "sonner";

export const Route = createFileRoute("/site/demo")({
  head: () => ({
    meta: [
      { title: "Teste grátis 48 horas — mídia.OS sem cartão de crédito" },
      { name: "description", content: "Crie sua conta e teste todos os módulos do mídia.OS por 48 horas, sem cartão e sem compromisso. Comece a vender mais mídia hoje." },
      { property: "og:title", content: "Teste grátis 48h — mídia.OS sem cartão" },
      { property: "og:description", content: "Crie sua conta demo e explore o sistema completo por 2 dias. Sem cartão de crédito." },
      { property: "og:url", content: "https://midiaos.online/site/demo" },
    ],
    links: [
      { rel: "canonical", href: "https://midiaos.online/site/demo" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const seed = useServerFn(seedDemoData);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cnpjData, setCnpjData] = useState<{ razao_social?: string; nome_fantasia?: string; uf?: string; municipio?: string } | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const senhaScore = (() => {
    let s = 0;
    if (senha.length >= 8) s++;
    if (senha.length >= 12) s++;
    if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) s++;
    if (/\d/.test(senha)) s++;
    if (/[^A-Za-z0-9]/.test(senha)) s++;
    return Math.min(s, 4);
  })();
  const senhaLabel = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][senhaScore];
  const senhaColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500"];

  const gerarSenha = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const nums = "23456789";
    const sym = "!@#$%&*?";
    const all = upper + lower + nums + sym;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    const arr = [pick(upper), pick(lower), pick(nums), pick(sym)];
    for (let i = 0; i < 12; i++) arr.push(pick(all));
    const nova = arr.sort(() => Math.random() - 0.5).join("");
    setSenha(nova);
    setShowSenha(true);
    try { navigator.clipboard?.writeText(nova); toast.success("Senha forte gerada e copiada"); }
    catch { toast.success("Senha forte gerada"); }
  };


  const onCnpjBlur = async () => {
    const digits = onlyDigits(cnpj);
    if (digits.length !== 14) return;
    setBuscandoCnpj(true);
    try {
      const d = await fetchCnpj(digits);
      setCnpjData({ razao_social: d.razaoSocial, nome_fantasia: d.nomeFantasia, uf: d.estado, municipio: d.cidade });
      if (!empresa.trim()) setEmpresa(d.nomeFantasia || d.razaoSocial || "");
      setCnpj(formatCNPJ(digits));
      toast.success("Empresa encontrada na Receita Federal");
    } catch (err: any) {
      toast.error("CNPJ não encontrado", { description: err?.message });
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wppDigits = whatsapp.replace(/\D+/g, "");
    const cnpjDigits = onlyDigits(cnpj);
    if (!nome.trim() || !email.trim() || senha.length < 8) {
      toast.error("Preencha todos os campos (senha mínima 8 caracteres, evite senhas óbvias)");
      return;
    }
    if (cnpjDigits.length !== 14) {
      toast.error("Informe um CNPJ válido (14 dígitos)");
      return;
    }
    if (!cnpjData) {
      toast.error("Confirme o CNPJ — saia do campo para buscarmos na Receita");
      return;
    }
    if (wppDigits.length < 10) {
      toast.error("Informe um WhatsApp válido com DDD");
      return;
    }
    if (!consent) {
      toast.error("É necessário aceitar os Termos de Uso e a Política de Privacidade (LGPD).");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nome: nome.trim(), empresa: empresa.trim(), whatsapp: whatsapp.trim(), cnpj: cnpjDigits, is_demo: true },
      },
    });
    if (error) {
      setLoading(false);
      const msg = /weak|pwned|known to be/i.test(error.message)
        ? "Essa senha é muito comum ou já apareceu em vazamentos. Use uma senha mais forte (misture letras maiúsculas, minúsculas, números e símbolos)."
        : error.message;
      toast.error("Não foi possível criar a conta demo", { description: msg });
      return;
    }
    if (!data.session) {
      const r = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (r.error) {
        setLoading(false);
        toast.success("Conta criada! Confirme seu e-mail para acessar.");
        return;
      }
    }
    const { data: udata } = await supabase.auth.getUser();
    if (udata.user) {
      try {
        await supabase.from("profiles").update({
          whatsapp: whatsapp.trim(),
          consentimento_lgpd_at: new Date().toISOString(),
          consentimento_versao: "2026-06-27",
        }).eq("id", udata.user.id);
      } catch { /* noop */ }
    }
    try {
      await seed({ data: {
        cnpj: cnpjDigits,
        razao_social: cnpjData.razao_social || empresa.trim(),
        nome_fantasia: cnpjData.nome_fantasia || empresa.trim(),
        contato_nome: nome.trim(),
        contato_email: email.trim(),
        contato_whatsapp: whatsapp.trim(),
      } } as never);
    } catch (err) {
      console.error("seedDemoData falhou", err);
    }
    if (typeof window !== "undefined") localStorage.removeItem("midiaos:demo_tour_seen");
    setLoading(false);
    toast.success("Bem-vindo! Você tem 48h para explorar todos os módulos.");
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 midia-glow pointer-events-none" />
      <div className="relative mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-indigo-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Versão demonstração
          </span>
          <h1 className="mt-3 text-5xl lg:text-6xl font-bold leading-[1.05]">
            Teste o mídia.OS <span className="midia-grad-text">por 48 horas</span>
          </h1>
          <p className="mt-6 text-lg text-[var(--m-muted)]">
            Acesso completo a todos os módulos. Sem cartão de crédito. Sua conta expira automaticamente em 48 horas.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              "CRM, Propostas, PIs, Briefings, Permuta e Projetos",
              "Dashboards e relatórios completos",
              "Importação por IA e integrações",
              "Suporte por e-mail durante o teste",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 inline-flex items-center gap-2 text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4" />
            Após 48h o acesso é bloqueado — basta contratar um plano para continuar.
          </div>
        </div>

        <form onSubmit={onSubmit} className="midia-card p-8 space-y-4">
          <h2 className="text-2xl font-bold">Criar conta demo</h2>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--m-muted)]">Nome completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-[var(--m-border)] text-white outline-none focus:border-indigo-500/60" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--m-muted)]">CNPJ da empresa *</label>
            <div className="relative">
              <input
                value={cnpj}
                onChange={(e) => { setCnpj(e.target.value); setCnpjData(null); }}
                onBlur={onCnpjBlur}
                required
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-[var(--m-border)] text-white outline-none focus:border-indigo-500/60"
              />
              {buscandoCnpj && (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-indigo-400" />
              )}
            </div>
            {cnpjData && (
              <p className="text-xs text-emerald-400">
                ✓ {cnpjData.razao_social} {cnpjData.municipio ? `— ${cnpjData.municipio}/${cnpjData.uf}` : ""}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--m-muted)]">Empresa / Veículo</label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-[var(--m-border)] text-white outline-none focus:border-indigo-500/60" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--m-muted)]">WhatsApp (com DDD)</label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              placeholder="(11) 99999-9999"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-[var(--m-border)] text-white outline-none focus:border-indigo-500/60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--m-muted)]">E-mail corporativo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-[var(--m-border)] text-white outline-none focus:border-indigo-500/60" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--m-muted)]">Senha (mín. 8, forte)</label>
              <button type="button" onClick={gerarSenha}
                className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">
                <RefreshCw className="w-3 h-3" /> Gerar senha forte
              </button>
            </div>
            <div className="relative">
              <input
                type={showSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required minLength={8}
                className="w-full pl-4 pr-20 py-2.5 rounded-lg bg-white/5 border border-[var(--m-border)] text-white outline-none focus:border-indigo-500/60"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {senha && (
                  <button type="button" title="Copiar"
                    onClick={() => { try { navigator.clipboard?.writeText(senha); toast.success("Senha copiada"); } catch { /* noop */ } }}
                    className="p-1.5 rounded text-[var(--m-muted)] hover:text-white hover:bg-white/5">
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                <button type="button" title={showSenha ? "Ocultar" : "Mostrar"}
                  onClick={() => setShowSenha((v) => !v)}
                  className="p-1.5 rounded text-[var(--m-muted)] hover:text-white hover:bg-white/5">
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {senha && (
              <>
                <div className="flex gap-1 mt-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < senhaScore ? senhaColors[senhaScore] : "bg-white/10"}`} />
                  ))}
                </div>
                <p className={`text-xs ${senhaScore <= 1 ? "text-red-400" : senhaScore === 2 ? "text-yellow-400" : senhaScore === 3 ? "text-lime-400" : "text-emerald-400"}`}>
                  Força: {senhaLabel} · use letras maiúsculas, minúsculas, números e símbolos.
                </p>
              </>
            )}
          </div>
          <label className="flex items-start gap-2 text-xs text-[var(--m-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--m-border)] bg-white/5 accent-indigo-500"
              required
            />
            <span>
              Li e aceito os <Link to="/site/termos" target="_blank" className="text-indigo-300 hover:text-indigo-200 underline">Termos de Uso</Link> e a{" "}
              <Link to="/site/privacidade" target="_blank" className="text-indigo-300 hover:text-indigo-200 underline">Política de Privacidade (LGPD)</Link>, autorizando o tratamento dos meus dados conforme descrito.
            </span>
          </label>
          <button type="submit" disabled={loading || !consent}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-medium bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 disabled:opacity-60">
            {loading ? "Criando..." : <>Começar teste de 48h <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-xs text-[var(--m-muted)] text-center">
            Já tem conta? <Link to="/login" className="text-indigo-300 hover:text-indigo-200">Entrar</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
