import { Star, ShieldCheck, TrendingUp, CheckCircle2, Quote, Sparkles } from "lucide-react";

export function SocialProofSection() {
  const metrics = [
    {
      valor: "+80%",
      label: "Mais Agilidade no Envio",
      desc: "Propostas e PIs geradas e enviadas em menos de um minuto",
    },
    {
      valor: "Zero",
      label: "Duplicidade em Reservas",
      desc: "Grade blindada contra overbooking e choques de concorrentes",
    },
    {
      valor: "100%",
      label: "Controle sobre Comissões",
      desc: "Fechamento automático com extratos transparentes de repasse",
    },
    {
      valor: "+R$ 48M",
      label: "Movimentados na Plataforma",
      desc: "Volume financeiro gerenciado com segurança institucional",
    },
  ];

  const testimonials = [
    {
      quote:
        "O MidiaOS transformou a rotina da nossa OPEC e da diretoria comercial. Antes gastávamos dias conferindo planilhas de ocupação e hoje vemos a grade em tempo real, sem nenhum erro de veiculação.",
      author: "Carlos E. Mendonça",
      role: "Diretor Comercial",
      empresa: "Rede de Emissoras Afiliadas (TV & Rádio)",
      cidade: "Brasília — DF",
    },
    {
      quote:
        "Representamos mais de 15 veículos e o cálculo de comissões era um pesadelo todo início de mês. Com o MidiaOS geramos os extratos de repasse em um clique com transparência total para os veículos.",
      author: "Juliana Silveira",
      role: "Sócia-Diretora",
      empresa: "Silveira & Associados Representação de Mídia",
      cidade: "São Paulo — SP",
    },
    {
      quote:
        "A assinatura eletrônica integrada e a geração instantânea de PIs aumentaram nossa taxa de conversão com agências em quase 40%. O cliente aprova a veiculação no WhatsApp em segundos.",
      author: "Rodrigo Fagundes",
      role: "Gerente Geral de Operações",
      empresa: "Circuito Regional de Painéis OOH & DOOH",
      cidade: "Goiânia — GO",
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-[#0A0E17] border-t border-slate-800/80 overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-cyan-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Métricas de Impacto em Grid */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Sparkles className="size-3" /> RESULTADOS COMPROVADOS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Impacto real nos números e na{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              produtividade comercial
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Métricas consolidadas de operações que migraram do modelo manual para a infraestrutura
            inteligente do MidiaOS.
          </p>
        </div>

        {/* 4 Cards de Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((m, i) => (
            <div
              key={i}
              className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center relative overflow-hidden group hover:border-cyan-500/40 transition-all hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
                {m.valor}
              </div>
              <div className="mt-3 text-sm sm:text-base font-bold text-white tracking-tight">
                {m.label}
              </div>
              <div className="mt-1 text-xs text-slate-400 leading-relaxed">{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Depoimentos de Clientes */}
        <div className="mt-20 pt-16 border-t border-slate-800/80">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
              QUEM UTILIZA, ATESTA
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Aprovado por lideranças do mercado publicitário
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="midia-card p-7 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-all"
              >
                <div>
                  <div className="flex gap-1 mb-4 text-cyan-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-4 fill-cyan-400 text-cyan-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{t.author}</div>
                    <div className="text-xs text-cyan-300 font-medium">{t.role}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{t.empresa}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{t.cidade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
