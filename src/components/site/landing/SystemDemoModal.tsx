import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Calendar,
  FileSignature,
  DollarSign,
  Tv,
  Radio,
  Globe,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
  Clock,
  Building2,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface SystemDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemDemoModal({ open, onOpenChange }: SystemDemoModalProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "grade" | "pi" | "repasses">(
    "dashboard",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] bg-[#0A0E17] border border-cyan-500/30 text-slate-100 p-0 overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,242,254,0.25)]">
        {/* Top Header do Modal */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-[#0E1726] to-slate-900 border-b border-cyan-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-mono font-semibold mb-2">
                <Sparkles className="size-3" /> DEMONSTRAÇÃO INTERATIVA DO MIDIAOS
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Experimente a interface de alta performance
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-400 mt-1">
                Conheça os 4 núcleos do sistema operacional de veículos e representações de mídia.
              </DialogDescription>
            </div>

            <Link
              to="/site/demo"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 shadow-md shadow-cyan-500/20 shrink-0 self-start sm:self-auto"
            >
              <span>Testar Conta Completa</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Abas de Navegação no Modal */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-2 border-t border-slate-800 scrollbar-none">
            {[
              { id: "dashboard", label: "Dashboard Executivo", icon: BarChart3 },
              { id: "grade", label: "Mapa de Grade & Ocupação", icon: Calendar },
              { id: "pi", label: "Emissor de P.I. Digital", icon: FileSignature },
              { id: "repasses", label: "Repasses & Comissões", icon: DollarSign },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,254,0.2)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <tab.icon className={`size-3.5 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo Dinâmico do Modal */}
        <div className="p-6 bg-[#070b12] min-h-[380px] max-h-[70vh] overflow-y-auto">
          {activeTab === "dashboard" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* KPIs de Destaque */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Faturamento Bruto
                  </div>
                  <div className="text-xl font-bold text-white mt-1">R$ 1.480.000</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                    <TrendingUp className="size-3" /> +24% vs. mês anterior
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    PIs Ativas na Grade
                  </div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">68 Campanhas</div>
                  <div className="text-[11px] text-cyan-300/80 mt-0.5">
                    100% assinadas via token
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Ocupação Média
                  </div>
                  <div className="text-xl font-bold text-purple-400 mt-1">91.4%</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Sem risco de overbooking</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                    Comissão Executivos
                  </div>
                  <div className="text-xl font-bold text-amber-400 mt-1">R$ 96.200</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Cálculo automatizado</div>
                </div>
              </div>

              {/* Simulação Gráfica do Pipeline */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">
                    Pipeline de Propostas Comerciais por Estágio
                  </span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    Atualização em Tempo Real
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/20">
                    <div className="text-slate-400 text-[10px]">Em Qualificação</div>
                    <div className="font-bold text-white mt-0.5">R$ 380k</div>
                    <div className="text-[10px] text-blue-400">14 agências</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20">
                    <div className="text-slate-400 text-[10px]">Propostas Enviadas</div>
                    <div className="font-bold text-cyan-300 mt-0.5">R$ 520k</div>
                    <div className="text-[10px] text-cyan-400">22 propostas</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/20">
                    <div className="text-slate-400 text-[10px]">PIs em Assinatura</div>
                    <div className="font-bold text-purple-300 mt-0.5">R$ 310k</div>
                    <div className="text-[10px] text-purple-400">9 aguardando cliente</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20">
                    <div className="text-slate-400 text-[10px]">Fechados &amp; Na Grade</div>
                    <div className="font-bold text-emerald-300 mt-0.5">R$ 1.48M</div>
                    <div className="text-[10px] text-emerald-400">68 faturados</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "grade" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Shield className="size-4 shrink-0 text-cyan-400" />
                  <span>
                    <strong>Motor de Proteção de Inventário:</strong> O MidiaOS bloqueia
                    automaticamente conflitos de concorrência na mesma faixa e impede vendas acima
                    da capacidade.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] shrink-0">
                  ANTI-OVERBOOKING
                </span>
              </div>

              {/* Tabela de Ocupação da Grade */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-slate-800/80 p-2.5 font-mono text-[11px] text-slate-300 font-semibold border-b border-slate-700">
                  <div className="col-span-3">Veículo / Formato</div>
                  <div className="col-span-3">Faixa / Localização</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2 text-center">Ocupação</div>
                  <div className="col-span-2 text-right">Anunciante Atual</div>
                </div>

                {[
                  {
                    v: "TV Bandeirantes DF",
                    f: "Break Jornal Local (20:30)",
                    s: "Lotado",
                    o: "100%",
                    c: "bg-red-500/20 text-red-300 border-red-500/30",
                    a: "Banco Regional",
                  },
                  {
                    v: "Rádio Sucesso FM 98.3",
                    f: "Manhã Prime (07:00 - 09:00)",
                    s: "Disponível (2)",
                    o: "80%",
                    c: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    a: "Rede Farmácias",
                  },
                  {
                    v: "Painel Digital LED OOH",
                    f: "Eixo Monumental (DOOH)",
                    s: "Lotado",
                    o: "100%",
                    c: "bg-red-500/20 text-red-300 border-red-500/30",
                    a: "Construtora Alpha",
                  },
                  {
                    v: "Portal Notícias Web",
                    f: "Super Banner Topo Home",
                    s: "Disponível (1)",
                    o: "75%",
                    c: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
                    a: "Faculdade Local",
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-12 p-3 border-b border-slate-800/60 items-center hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="col-span-3 font-semibold text-white flex items-center gap-1.5">
                      <Layers className="size-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{row.v}</span>
                    </div>
                    <div className="col-span-3 text-slate-400 truncate">{row.f}</div>
                    <div className="col-span-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${row.c}`}
                      >
                        {row.s}
                      </span>
                    </div>
                    <div className="col-span-2 text-center font-mono font-bold text-white">
                      {row.o}
                    </div>
                    <div className="col-span-2 text-right text-slate-300 truncate">{row.a}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "pi" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400">
                      PEDIDO DE INSERÇÃO #2026-089
                    </span>
                    <h4 className="text-base font-bold text-white">
                      Campanha Institucional Trimestral
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Assinado Eletronicamente
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">
                      Anunciante
                    </span>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      Grupo Varejista Brasil S.A.
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">Agência</span>
                    <div className="font-semibold text-slate-200 mt-0.5">DM9 Publicidade</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">
                      Valor Bruto / Líquido
                    </span>
                    <div className="font-semibold text-white mt-0.5">
                      R$ 120.000 (Líq. R$ 96.000)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono">
                      BV Agência
                    </span>
                    <div className="font-semibold text-cyan-300 mt-0.5">20% (R$ 24.000)</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
                  <div>• Certificação Digital: MP 2.200-2/2001 (ICP-Brasil compatível)</div>
                  <div>• IP Registrado: 189.40.112.55 | Timestamp: 11/10/2026 10:14:22 GMT-3</div>
                  <div className="text-cyan-400">
                    • Hash Criptográfico: SHA-256 f84c201e9389...a721
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "repasses" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <strong>Para Empresas de Representação Comercial:</strong> O MidiaOS calcula
                automaticamente o repasse líquido para as emissoras representadas e o
                comissionamento da sua equipe.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs text-slate-400">Total Faturado pela Representação</div>
                  <div className="text-2xl font-bold text-white mt-1">R$ 840.000</div>
                  <div className="text-[11px] text-slate-400 mt-1">12 veículos parceiros</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs text-slate-400">Repasse Líquido às Emissoras</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">R$ 672.000</div>
                  <div className="text-[11px] text-slate-400 mt-1">Conciliação automática</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs text-slate-400">Receita da Representação (Comissão)</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">R$ 168.000</div>
                  <div className="text-[11px] text-slate-400 mt-1">Margem retida contratual</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-[#0A0E17] border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            Pronto para colocar sua operação comercial no ar em até 7 dias?
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
            <Link
              to="/site/demo"
              onClick={() => onOpenChange(false)}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold hover:opacity-90 shadow-md shadow-cyan-500/20"
            >
              Iniciar Teste 48h Grátis
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
