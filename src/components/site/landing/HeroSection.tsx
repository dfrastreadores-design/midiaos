import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  Tv,
  Radio,
  Globe,
  Layers,
  TrendingUp,
  ShieldCheck,
  Zap,
  BarChart3,
  Calendar,
  DollarSign,
  FileSignature,
} from "lucide-react";

interface HeroSectionProps {
  onOpenDemoModal: () => void;
}

export function HeroSection({ onOpenDemoModal }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 sm:pt-14 sm:pb-28 lg:pt-20 lg:pb-32">
      {/* Background Glows & Cyber Grid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] midia-glow pointer-events-none" />
      <div className="absolute -top-32 right-1/4 size-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-48 -left-20 size-80 bg-violet-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 midia-grid-bg opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Coluna de Texto e Conversão */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Tag Superior Futurista */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs text-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.15)] backdrop-blur-xl">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-cyan-400" />
              </span>
              <span className="font-mono tracking-wider font-bold uppercase text-[11px]">
                TECNOLOGIA ESPECIALIZADA PARA O MERCADO DE MÍDIA
              </span>
            </div>

            {/* Headline Principal */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
              A Solução Definitiva para a Gestão de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
                Veículos de Comunicação
              </span>{" "}
              e Representações Comerciais.
            </h1>

            {/* Sub-headline Persuasiva */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl leading-relaxed font-normal">
              Elimine planilhas complexas e gargalos operacionais. Centralize reservas de espaço,
              emissão de propostas comerciais (P.I.), controle de grade, comissionamento e
              faturamento em uma única plataforma inteligente.
            </p>

            {/* CTAs de Alta Conversão */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/site/demo"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 text-slate-950 font-extrabold text-sm sm:text-base hover:text-white transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(0,242,254,0.4)] hover:shadow-[0_0_45px_rgba(0,242,254,0.7)] cursor-pointer group"
              >
                <Sparkles className="size-5 text-slate-950 group-hover:text-white transition-colors" />
                <span>Contratar o MidiaOS / Testar Agora</span>
                <ArrowRight className="size-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button
                type="button"
                onClick={onOpenDemoModal}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-sm sm:text-base transition-all hover:border-cyan-500/50 backdrop-blur-xl group cursor-pointer shadow-lg"
              >
                <div className="size-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="size-3.5 fill-cyan-400 text-cyan-400 ml-0.5" />
                </div>
                <span>Ver o Sistema por Dentro</span>
              </button>
            </div>

            {/* Micro-benefícios e Garantias */}
            <div className="pt-4 flex flex-wrap gap-y-2 gap-x-6 text-xs text-slate-400 font-medium border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-cyan-400" />
                <span>Implantação recorde em até 7 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-cyan-400" />
                <span>Zero taxa de setup inicial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-cyan-400" />
                <span>Treinamento completo da equipe</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-cyan-400" />
                <span>Suporte humano em português</span>
              </div>
            </div>
          </div>

          {/* Coluna Visual: Mockup 3D Flutuante do Painel */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Backglow do Mockup */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/30 via-blue-500/20 to-purple-600/30 rounded-3xl blur-2xl opacity-75 animate-pulse-subtle" />

              {/* Card Central Glassmorphism Mockup */}
              <div className="relative rounded-2xl border border-cyan-500/30 bg-[#0F172A]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-float-slow">
                {/* Header Window macOS/Cyber */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-red-500/70" />
                    <div className="size-3 rounded-full bg-yellow-500/70" />
                    <div className="size-3 rounded-full bg-green-500/70" />
                    <span className="ml-2 font-mono text-[11px] text-slate-400">
                      painel.midiaos.online
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TEMPO REAL
                  </span>
                </div>

                {/* Métricas Rápidas do Mockup */}
                <div className="grid grid-cols-3 gap-2.5 my-4">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-mono text-slate-400">
                      Ocupação Grade
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">94.8%</div>
                    <div className="text-[10px] text-cyan-400 mt-0.5">Sem overbooking</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-mono text-slate-400">
                      Faturamento Mês
                    </div>
                    <div className="text-lg font-bold text-cyan-300 mt-0.5">R$ 1.84M</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">+19.2% meta</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] uppercase font-mono text-slate-400">
                      Repasses Mídia
                    </div>
                    <div className="text-lg font-bold text-purple-300 mt-0.5">R$ 284k</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">14 veículos</div>
                  </div>
                </div>

                {/* Gráfico Simulado de Ocupação por Veículo */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <BarChart3 className="size-4 text-cyan-400" /> Ocupação de Inventário por
                      Veículo
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Junho / 2026</span>
                  </div>

                  {/* Barras de Ocupação */}
                  <div className="space-y-2">
                    {[
                      {
                        nome: "Emissora TV (Breaks Prime)",
                        val: 96,
                        cor: "from-cyan-400 to-blue-500",
                      },
                      {
                        nome: "Rede de Rádios FM (Rotativos)",
                        val: 92,
                        cor: "from-blue-500 to-indigo-500",
                      },
                      {
                        nome: "Painéis Digitais LED (OOH)",
                        val: 98,
                        cor: "from-purple-500 to-pink-500",
                      },
                      {
                        nome: "Portal Web (Display & Banners)",
                        val: 84,
                        cor: "from-emerald-400 to-cyan-500",
                      },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span className="truncate">{item.nome}</span>
                          <span className="font-mono font-bold text-cyan-300">{item.val}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.cor} rounded-full`}
                            style={{ width: `${item.val}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pipeline Comercial em Tempo Real */}
                <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <FileSignature className="size-3.5 text-cyan-400" /> PIs Assinadas Recentes
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">100% Digital</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { ag: "Agência WMcCann", cl: "Chevrolet", val: "R$ 145.000", st: "No Ar" },
                      { ag: "Africa Creative", cl: "Ambev", val: "R$ 98.500", st: "Aprovado" },
                      {
                        ag: "Direto Anunciante",
                        cl: "Rede D'Or",
                        val: "R$ 62.000",
                        st: "Assinado",
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 text-[11px]"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-white truncate">{row.cl}</span>
                          <span className="text-[10px] text-slate-400 truncate">{row.ag}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-cyan-300 block">{row.val}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                            {row.st}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badges Flutuantes Exteriores */}
                <div className="absolute -bottom-5 -left-5 p-3 rounded-xl bg-[#070b12]/95 border border-cyan-500/40 shadow-xl backdrop-blur-xl flex items-center gap-3 hidden sm:flex">
                  <div className="size-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Zero Conflito na Grade</div>
                    <div className="text-[10px] text-slate-400">
                      Proteção anti-overbooking ativa
                    </div>
                  </div>
                </div>

                <div className="absolute -top-6 -right-6 p-3 rounded-xl bg-[#070b12]/95 border border-purple-500/40 shadow-xl backdrop-blur-xl flex items-center gap-3 hidden sm:flex">
                  <div className="size-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <DollarSign className="size-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Comissões Automatizadas</div>
                    <div className="text-[10px] text-slate-400">Repasse e extrato em 1 clique</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
