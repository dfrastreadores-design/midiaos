import { Sparkles, ArrowRight, ShieldCheck, PhoneCall, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FinalCtaSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[#070b12] border-t border-slate-800/80 overflow-hidden">
      {/* Background Radiance */}
      <div className="absolute inset-0 midia-glow opacity-80 pointer-events-none" />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 bg-gradient-to-t from-cyan-500/15 via-blue-500/10 to-transparent blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-[#0C1524] to-slate-900 border border-cyan-500/40 p-8 sm:p-14 lg:p-20 text-center shadow-[0_0_80px_rgba(0,242,254,0.15)] overflow-hidden">
          {/* Subtle Cyber Grid */}
          <div className="absolute inset-0 midia-grid-bg opacity-30 pointer-events-none" />

          {/* Badge */}
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-6">
            <Sparkles className="size-3.5" /> O FUTURO DA VENDA DE MÍDIA É AGORA
          </div>

          {/* Chamada Final */}
          <h2 className="relative text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-[1.15]">
            Modernize a operação comercial da sua empresa de mídia{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              hoje mesmo.
            </span>
          </h2>

          <p className="relative mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Elimine o gargalo das planilhas, acelere em 80% o tempo de envio de propostas e garanta
            uma grade 100% livre de overbooking com o MidiaOS.
          </p>

          {/* Ações de Conversão */}
          <div className="relative mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/site/demo"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-slate-950 font-extrabold text-sm sm:text-base hover:text-white transition-all hover:scale-[1.02] shadow-[0_0_35px_rgba(0,242,254,0.45)] cursor-pointer"
            >
              <Sparkles className="size-5" />
              <span>Começar Teste Grátis de 48 Horas</span>
              <ArrowRight className="size-4 ml-0.5" />
            </Link>

            <a
              href="https://wa.me/5561984746857"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-sm sm:text-base transition-all shadow-md"
            >
              <PhoneCall className="size-4" />
              <span>Falar com Especialista de Mídia</span>
            </a>
          </div>

          {/* Trust Guarantees */}
          <div className="relative mt-10 pt-8 border-t border-slate-800/80 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-cyan-400" />
              <span>Sem necessidade de cartão de crédito para testar</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-cyan-400" />
              <span>Ativação imediata em 2 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-cyan-400" />
              <span>Domínio oficial: www.midiaos.online</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
