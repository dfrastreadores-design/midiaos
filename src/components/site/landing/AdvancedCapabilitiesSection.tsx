import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Presentation,
  Compass,
  Sparkles,
  Camera,
  Search,
  RefreshCw,
  Video,
  MapPin,
  FolderSync,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  Flame,
  Award,
} from "lucide-react";

export function AdvancedCapabilitiesSection() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const capabilities = [
    {
      id: "pptx",
      badge: "EXCLUSIVIDADE MERCADOLÓGICA",
      icon: Presentation,
      title: "Gerador Automático de PPTX em 1 Clique",
      headline: "De proposta na tela a deck PowerPoint comercial 16:9 em segundos",
      desc: "Nenhum executivo perde mais horas montando apresentações no PowerPoint. O MidiaOS gera slides profissionais editáveis com layout impecável da sua marca, fotos em alta resolução dos pontos, mapa geográfico, dados de audiência e condições comerciais estruturadas.",
      highlights: [
        "Apresentações 16:9 widescreen prontas para projeção e envio a agências",
        "Layout profissional com a sua paleta de cores e identidade visual",
        "Fotos reais dos pontos (outdoors, painéis LED, estúdios de rádio e TV)",
        "Tabela de preços, prazos de veiculação e condições de pagamento calculadas",
      ],
      cor: "from-orange-500 to-amber-400",
      accent: "text-amber-400",
      tag: "PowerPoint Nativo",
    },
    {
      id: "ia-gemini",
      badge: "INTELIGÊNCIA ARTIFICIAL MULTIMODAL",
      icon: Sparkles,
      title: "Ingestão de Mídia Kits por IA & Google Drive",
      headline: "Google Gemini 2.5 Flash lê PDFs despadronizados e popula o sistema",
      desc: "Recebeu um Mídia Kit de 50 páginas em PDF de uma emissora ou planilha com formatos confusos? A IA do MidiaOS lê, interpreta e cadastra parceiros, produtos, formatos e preços automaticamente. Conta ainda com sincronização de pastas do Google Drive.",
      highlights: [
        "Extração instantânea em menos de 8 segundos por arquivo",
        "Reconhece tabelas despadronizadas, fotos de pontos e formatos técnicos",
        "Sincronização periódica com pastas compartilhadas do Google Drive",
        "Reduz em 95% o tempo de cadastro de novos inventários e parceiros",
      ],
      cor: "from-cyan-400 to-blue-500",
      accent: "text-cyan-400",
      tag: "Gemini 2.5 Flash",
    },
    {
      id: "checking-posvenda",
      badge: "COMPROVAÇÃO & AUDITORIA",
      icon: Camera,
      title: "Portal de Pós-Venda & Checking ao Vivo",
      headline: "Transparência total para agências e anunciantes com link exclusivo",
      desc: "Acabe com as cobranças diárias de checking por WhatsApp. O anunciante e a agência recebem um link seguro tokenizado onde acompanham as fotos reais da veiculação com carimbo de data/hora, geolocalização e relatórios operacionais em tempo real.",
      highlights: [
        "Link público exclusivo por campanha sem necessidade de login",
        "Galeria de fotos de checking em alta definição com coordenadas GPS",
        "Relatório de veiculação exportável em PDF para prestação de contas",
        "Aumento imediato da confiança de agências e fidelização de anunciantes",
      ],
      cor: "from-emerald-400 to-teal-500",
      accent: "text-emerald-400",
      tag: "Checking Auditado",
    },
    {
      id: "radar-360",
      badge: "INTELIGÊNCIA GEOGRÁFICA",
      icon: Compass,
      title: "Planejamento 360° & Centralizadores de Mídia",
      headline: "Radar de mídia territorial: domine praças, bairros e regiões metropolitanas",
      desc: "Estruture pacotes integrados de mídia combinada (ex: TV regional + Rádio local + Painéis Digitais de LED) com inteligência territorial e cálculo de cobertura demográfica. Visualize a presença da marca do cliente em mapas interativos com filtros por perfil socioeconômico.",
      highlights: [
        "Pacotes multiformato com cross-media comercial integrado",
        "Mapeamento geográfico de impacto por corredores de fluxo",
        "Análise de concorrência e blindagem de categorias na praça",
        "Catálogo estratégico de soluções de mídia pronta para vendas",
      ],
      cor: "from-purple-400 to-pink-500",
      accent: "text-purple-400",
      tag: "Radar 360°",
    },
    {
      id: "cnpj-brasilapi",
      badge: "AUTOMAÇÃO CADASTRAL",
      icon: Search,
      title: "Consulta Instantânea de CNPJ na Receita Federal",
      headline: "Cadastro comercial concluído em 1 segundo apenas com o número do CNPJ",
      desc: "Elimine cadastros manuais e erros fiscais. Ao digitar o CNPJ do anunciante ou agência, o MidiaOS consulta a base oficial da Receita Federal em tempo real via BrasilAPI, preenchendo Razão Social, Nome Fantasia, CNAE de atividade, endereço completo e situação cadastral.",
      highlights: [
        "Enriquecimento cadastral automático em tempo real",
        "Validação de situação cadastral ativa junto ao fisco",
        "Prevenção de notas fiscais emitidas com endereços defasados",
        "Histórico e relatório de auditoria de consultas da equipe",
      ],
      cor: "from-blue-400 to-indigo-500",
      accent: "text-blue-400",
      tag: "BrasilAPI Oficial",
    },
    {
      id: "permutas-especiais",
      badge: "FLEXIBILIDADE COMERCIAL",
      icon: RefreshCw,
      title: "Módulo de Permutas & Projetos Especiais",
      headline: "Gestão profissional de permutas comerciais, patrocínios e naming rights",
      desc: "Trate permutas e projetos especiais com a seriedade financeira que merecem. Controle saldo de permutas por parceiro, vinculação a Pedidos de Inserção, compensação de notas fiscais, além de gerenciar cotas de eventos, transmissões e merchandising com marcos e entregáveis.",
      highlights: [
        "Extrato de conta-corrente de permuta comercial (entrada, saída e saldo)",
        "Vinculação direta de saldo de permuta aos PIs emitidos",
        "Projetos especiais: naming rights, camarotes, eventos e merchandising",
        "Cronograma com marcos de entrega e alocação de equipe multidisciplinar",
      ],
      cor: "from-rose-400 to-red-500",
      accent: "text-rose-400",
      tag: "Permuta & Cotas",
    },
  ];

  const current = capabilities[activeTab];

  return (
    <section
      id="diferenciais"
      className="relative py-24 sm:py-32 bg-[#090D16] border-t border-slate-800/80 overflow-hidden"
    >
      {/* Background Decorativo Cyber Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-cyan-500/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-10 left-10 size-80 bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            <Flame className="size-3 text-cyan-400" /> SUPER-PODERES COMERCIAIS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Tecnologias que colocam sua operação{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              anos à frente da concorrência
            </span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Funcionalidades exclusivas concebidas especialmente para resolver as maiores dores
            de veículos de comunicação, agências e representações de mídia.
          </p>
        </div>

        {/* Seletor de Abas com Efeito Glow */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 mb-12">
          {capabilities.map((c, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`flex flex-col items-center gap-2 p-3.5 rounded-xl transition-all cursor-pointer text-center relative ${
                  isActive
                    ? "bg-slate-800/90 text-white border border-cyan-500/40 shadow-[0_0_20px_rgba(0,242,254,0.15)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <c.icon
                  className={`size-5 transition-transform ${
                    isActive ? `${c.accent} scale-110` : "text-slate-400"
                  }`}
                />
                <span className="text-xs font-bold tracking-tight leading-snug line-clamp-1">
                  {c.tag}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Display do Recurso Ativo */}
        <div className="grid lg:grid-cols-12 gap-8 items-center midia-card p-8 sm:p-12 border-cyan-500/30 relative overflow-hidden">
          {/* Luz de fundo do card ativo */}
          <div
            className={`absolute -right-20 -bottom-20 size-96 bg-gradient-to-br ${current.cor} opacity-10 rounded-full blur-[100px] pointer-events-none`}
          />

          {/* Coluna de Texto e Explicação */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              <Award className="size-3 text-cyan-400" />
              <span>{current.badge}</span>
            </div>

            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {current.title}
              </h3>
              <p className={`mt-2 text-sm sm:text-base font-semibold ${current.accent}`}>
                {current.headline}
              </p>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">{current.desc}</p>
            </div>

            <div className="space-y-3 pt-2">
              {current.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-slate-200">
                  <div className="size-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="size-3.5 text-cyan-400" />
                  </div>
                  <span className="leading-snug text-xs sm:text-sm">{h}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <a
                href="https://wa.me/5561984746857"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] cursor-pointer"
              >
                <span>Ver Demonstração ao Vivo</span>
                <ArrowRight className="size-3.5" />
              </a>

              <Link
                to="/site/inventario"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                <span>Ver Mapa OOH ao Vivo</span>
                <ExternalLink className="size-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Coluna Visual: Mockup Interativo do Recurso */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-[#0A0E17] border border-slate-700/80 p-6 shadow-2xl relative space-y-5">
              {/* Top Bar do Mockup */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-500/60" />
                  <span className="size-2.5 rounded-full bg-amber-500/60" />
                  <span className="size-2.5 rounded-full bg-emerald-500/60" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  MidiaOS Intelligence Core
                </span>
              </div>

              {/* Conteúdo Dinâmico por Aba */}
              {activeTab === 0 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Deck Comercial Automático</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300">
                        PPTX 16:9
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Campanha: <strong>Verão 2026 — Grupo Alvorada</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">SLIDES GERADOS</div>
                      <div className="text-white font-bold font-mono">14 Slides Full HD</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">TEMPO DE GERAÇÃO</div>
                      <div className="text-emerald-400 font-bold font-mono">1.8 segundos</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-slate-300 text-[11px] space-y-1">
                    <div className="font-bold text-cyan-300">Conteúdo Incluído no PPTX:</div>
                    <div className="text-[10px] text-slate-400">
                      • Capa corporativa • Resumo da proposta • Tabela de pontos e formatos • Fotos
                      em alta • Mapa de localização • Valores e condições
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Parser IA — Gemini 2.5 Flash</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        PDF &rarr; DB
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Arquivo: <strong>MidiaKit_Rede_Exibicao_2026.pdf (48 páginas)</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">PONTOS EXTRAÍDOS</div>
                      <div className="text-cyan-400 font-bold font-mono">128 Pontos OOH</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">PRECISÃO DE LEITURA</div>
                      <div className="text-emerald-400 font-bold font-mono">99.8% Acurácia</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                    <div className="text-slate-400 text-[10px]">GOOGLE DRIVE SYNC</div>
                    <div className="text-slate-300 text-[11px]">
                      Varredura contínua de pastas de parceiros ativada
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Checking Fotográfico ao Vivo</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        TOKEN AUDITADO
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      PI #2026-089 • <strong>Banco de Brasília (BRB)</strong>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Exibições Comprovadas:</span>
                      <span className="text-white font-bold font-mono">100% de 24 pontos</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-full" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                    Fotos registradas com carimbo de tempo, IP e geolocalização por satélite.
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Centralizadores &amp; Radar 360°</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        CROSS-MEDIA
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Pacote: <strong>Impacto Metropolitano DF + Entorno</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">TV &amp; RÁDIO</div>
                      <div className="font-bold text-white mt-0.5">8 Emissoras</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">PAINÉIS LED</div>
                      <div className="font-bold text-white mt-0.5">32 Pontos</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">PORTAIS</div>
                      <div className="font-bold text-white mt-0.5">5 Veículos</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300">
                    Proposta combinada com desconto escalonado e alçadas de margem preservadas.
                  </div>
                </div>
              )}

              {activeTab === 4 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">BrasilAPI — Receita Federal</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        TEMPO REAL
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      CNPJ: 00.360.305/0001-04
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Razão Social:</span>
                      <span className="text-white font-bold">CAIXA ECONÔMICA FEDERAL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Situação:</span>
                      <span className="text-emerald-400 font-bold">ATIVA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Município / UF:</span>
                      <span className="text-slate-200">BRASÍLIA / DF</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 text-center">
                    Auto-completado em 0.4s sem digitação manual da equipe
                  </div>
                </div>
              )}

              {activeTab === 5 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Permuta &amp; Cotas Especiais</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        CONCILIAÇÃO
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Parceiro: <strong>Hotel Resort &amp; Convenções</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">SALDO DE CRÉDITO</div>
                      <div className="text-emerald-400 font-bold font-mono">R$ 48.500,00</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">MÍDIA CONSUMIDA</div>
                      <div className="text-cyan-400 font-bold font-mono">R$ 23.200,00</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                    Controle de saldo vinculado diretamente às inserções de TV e Rádio.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Banner Inferior: Vitrine Pública de Inventário OOH */}
        <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <MapPin className="size-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-white">
                  Vitrine &amp; Mapa Interativo OOH em Tempo Real
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  AO VIVO
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Seus clientes e agências podem navegar livremente pelo seu inventário de painéis e
                outdoors, filtrar por cidade ou tipo de mídia e solicitar orçamentos em 1 toque.
              </p>
            </div>
          </div>
          <Link
            to="/site/inventario"
            className="px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] cursor-pointer"
          >
            <span>Experimentar o Mapa de Inventário</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
