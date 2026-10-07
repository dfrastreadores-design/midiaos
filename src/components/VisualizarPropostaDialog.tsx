import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  History,
  Clock,
  Paperclip,
  MapPin,
  ExternalLink,
  Navigation,
  Phone,
  Mail,
  Instagram,
  Globe,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Compass,
  TrendingUp,
  MonitorPlay,
  Zap,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { getProposta, listProposalHistory } from "@/lib/propostas.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  gerarPptxProposta,
  gerarPdfProposta,
  gerarPdfPropostaSimplificada,
  gerarPdfPropostaNexo,
} from "@/lib/proposta-presentation";
import type { PropostaApresentacao } from "@/lib/proposta-presentation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropostaAnexosSection } from "@/components/PropostaAnexosSection";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propostaId: string | null;
  onEmitirPis?: (proposta: any) => void;
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export function VisualizarPropostaDialog({ open, onOpenChange, propostaId, onEmitirPis }: Props) {
  const [p, setP] = useState<(PropostaApresentacao & { numero: string; status?: string }) | null>(
    null,
  );
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [layoutModelo, setLayoutModelo] = useState<"padrao" | "simplificado" | "nexo_slide">("nexo_slide");
  const [modoApresentacao, setModoApresentacao] = useState<"detalhado" | "pacote_midia">(
    "detalhado",
  );
  const [mostrarEndereco, setMostrarEndereco] = useState(true);
  const [mostrarFotos, setMostrarFotos] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const { org, isNexo, templateConfig } = useCurrentOrg();

  useEffect(() => {
    if (!open || !propostaId) {
      setP(null);
      setHistory([]);
      return;
    }

    setLoading(true);
    getProposta({ data: { id: propostaId } })
      .then(async (p: any) => {
        if (!p) throw new Error("Proposta não encontrada");
        setP(
          p as unknown as PropostaApresentacao & {
            numero: string;
            status?: string;
            tenant_id?: string;
          },
        );

        if (p.modo_apresentacao) setModoApresentacao(p.modo_apresentacao);
        if (typeof p.mostrar_endereco === "boolean") setMostrarEndereco(p.mostrar_endereco);
        if (typeof p.mostrar_fotos === "boolean") setMostrarFotos(p.mostrar_fotos);

        // Buscar o layout padrão do inquilino se disponível
        if (p.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("proposta_layout_padrao")
            .eq("id", p.tenant_id)
            .single();
          if (tenant?.proposta_layout_padrao) {
            setLayoutModelo(tenant.proposta_layout_padrao as "padrao" | "simplificado");
          }
        }
      })
      .catch((e: Error) => {
        console.error("Erro ao carregar proposta:", e);
        toast.error("Erro ao carregar os dados da proposta: " + e.message);
      })
      .finally(() => setLoading(false));

    setLoadingHistory(true);
    listProposalHistory({ data: { proposal_id: propostaId } })
      .then((h) => setHistory(h))
      .catch((e: Error) => console.error("Erro ao carregar histórico:", e.message))
      .finally(() => setLoadingHistory(false));
  }, [open, propostaId]);

  const cliente =
    p?.cliente?.nome_fantasia ||
    p?.cliente?.razao_social ||
    p?.agencia?.nome_fantasia ||
    p?.agencia?.razao_social ||
    p?.cliente_avulso ||
    "—";

  const totalRepresentados = useMemo(() => {
    return (p?.itens || []).reduce((acc: number, it: any) => {
      const isParceiro = !!(it.parceiro_id || it.parceiro_nome || it.parceiro_cnpj);
      return isParceiro ? acc + (Number(it.valor_negociado) || 0) : acc;
    }, 0);
  }, [p?.itens]);

  const totalInHouse = useMemo(() => {
    return (p?.itens || []).reduce((acc: number, it: any) => {
      const isParceiro = !!(it.parceiro_id || it.parceiro_nome || it.parceiro_cnpj);
      return !isParceiro ? acc + (Number(it.valor_negociado) || 0) : acc;
    }, 0);
  }, [p?.itens]);

  const slides = useMemo(() => {
    if (!p) return [];
    const list: Array<{
      id: string;
      tipo: "capa" | "essencia" | "como_atuamos" | "overview" | "ponto" | "fechamento";
      titulo: string;
      item?: any;
      itemIndex?: number;
    }> = [];

    const cfg = templateConfig || {
      incluir_capa: true,
      incluir_manifesto: true,
      incluir_como_atuamos: true,
      exibir_overview: true,
      incluir_laminas_pontos: true,
    };

    if (cfg.incluir_capa !== false) {
      list.push({ id: "capa", tipo: "capa", titulo: "Capa Institucional Executiva" });
    }
    if (cfg.incluir_manifesto !== false) {
      list.push({ id: "essencia", tipo: "essencia", titulo: "Nossa Essência & Manifesto" });
    }
    if (cfg.incluir_como_atuamos !== false) {
      list.push({ id: "como_atuamos", tipo: "como_atuamos", titulo: "Como Atuamos (Metodologia)" });
    }
    if (cfg.exibir_overview !== false) {
      list.push({ id: "overview", tipo: "overview", titulo: "Overview de Impacto & Praças" });
    }
    if (cfg.incluir_laminas_pontos !== false && p.itens?.length) {
      p.itens.forEach((it: any, idx: number) => {
        list.push({
          id: `ponto-${idx}`,
          tipo: "ponto",
          titulo: `Ponto ${idx + 1}: ${it.programa || "Mídia OOH"}`,
          item: it,
          itemIndex: idx,
        });
      });
    }
    list.push({ id: "fechamento", tipo: "fechamento", titulo: "Fechamento & Contatos" });
    return list;
  }, [p, templateConfig]);

  const currentSlide = slides[slideIndex] || slides[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1050px] max-h-[96vh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <span>Visualizar Proposta {p?.numero ? `· ${p.numero}` : ""}</span>
                <Badge variant="outline" className="border-[#ff6b00]/40 text-[#ff6b00] bg-[#ff6b00]/10 font-bold text-xs">
                  Layout Nexo 16:9
                </Badge>
              </DialogTitle>
              <DialogDescription>Apresentação executiva e detalhamento comercial da proposta.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading || !p ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Carregando proposta…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="slides_nexo">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="slides_nexo" className="flex items-center gap-2 font-semibold">
                  <Layers className="size-4 text-[#ff6b00]" /> Lâminas Nexo (16:9)
                </TabsTrigger>
                <TabsTrigger value="detalhes">Detalhes da Proposta</TabsTrigger>
                <TabsTrigger value="anexos" className="flex items-center gap-2">
                  <Paperclip className="size-4" /> Anexos e Arquivos
                </TabsTrigger>
                <TabsTrigger value="historico" className="flex items-center gap-2">
                  <History className="size-4" /> Histórico
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: VISUALIZADOR DE SLIDES 16:9 (PADRÃO NEXO / VOLVO) */}
              <TabsContent value="slides_nexo" className="space-y-3 pt-2">
                {/* Barra de Navegação do Slide */}
                <div className="flex items-center justify-between flex-wrap gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSlideIndex((prev) => Math.max(0, prev - 1))}
                      disabled={slideIndex === 0}
                      className="h-8 px-2.5"
                    >
                      <ChevronLeft className="size-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                      disabled={slideIndex >= slides.length - 1}
                      className="h-8 px-2.5"
                    >
                      Próxima <ChevronRight className="size-4 ml-1" />
                    </Button>
                    <span className="text-xs font-semibold text-foreground ml-2">
                      Lâmina {slideIndex + 1} de {slides.length}:{" "}
                      <span className="text-[#ff6b00]">{currentSlide?.titulo}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Seletor rápido de slide */}
                    <select
                      value={slideIndex}
                      onChange={(e) => setSlideIndex(Number(e.target.value))}
                      className="text-xs border rounded-md px-2 py-1.5 bg-background font-medium"
                    >
                      {slides.map((s, idx) => (
                        <option key={s.id} value={idx}>
                          {idx + 1}. {s.titulo}
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      className="h-8 bg-[#ff6b00] hover:bg-[#e05e00] text-white font-bold text-xs gap-1.5 shadow-sm"
                      onClick={async () => {
                        const toastId = toast.loading("Gerando PDF em lâminas 16:9...");
                        try {
                          const pComModo: PropostaApresentacao = {
                            ...p,
                            organizacao: (p as any).organizacao || org,
                            modo_apresentacao: modoApresentacao,
                            mostrar_endereco: mostrarEndereco,
                            mostrar_fotos: mostrarFotos,
                          };
                          await gerarPdfPropostaNexo(pComModo, "");
                          toast.success("Apresentação Nexo gerada com sucesso!", { id: toastId });
                        } catch (e: any) {
                          toast.error("Erro ao gerar PDF: " + e.message, { id: toastId });
                        }
                      }}
                    >
                      <FileDown className="size-3.5" /> Baixar PDF (16:9)
                    </Button>
                  </div>
                </div>

                {/* CANVAS DO SLIDE 16:9 (PREMIUM DARK EXECUTIVE) */}
                <div className="relative aspect-[16/9] w-full rounded-2xl bg-[#0b0c10] border border-neutral-800 text-white p-5 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl select-none">
                  {/* Linha de degradê superior institucional */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ff6b00] via-[#ff6b00] to-[#7928ca]" />

                  {/* Header comum do slide (exceto na capa) */}
                  {currentSlide?.tipo !== "capa" && (
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold tracking-wider text-xs text-white">
                          NEXO MÍDIA E REPRESENTAÇÃO
                        </span>
                        <span className="text-neutral-600">|</span>
                        <span className="text-[11px] text-[#ff6b00] font-semibold uppercase tracking-wider">
                          {currentSlide?.titulo}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {p.numero} • {cliente}
                      </div>
                    </div>
                  )}

                  {/* CORPO DO SLIDE POR TIPO */}
                  {currentSlide?.tipo === "capa" && (
                    <div className="flex-1 flex flex-col justify-between py-2">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/40 text-xs font-bold py-0.5 px-2.5">
                          APRESENTAÇÃO EXECUTIVA
                        </Badge>
                        <span className="text-xs text-neutral-400 font-mono tracking-widest">
                          HUB DE NEGÓCIOS & SOLUÇÕES 360°
                        </span>
                      </div>

                      <div className="text-center space-y-3 py-6">
                        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-[#ff6b00] to-[#7928ca] p-3 shadow-lg mx-auto">
                          <Sparkles className="size-10 text-white" />
                        </div>
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                            NEXO MÍDIA E REPRESENTAÇÃO
                          </h1>
                          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                            nexomidiaerepresentacao.com.br
                          </p>
                        </div>
                        <div className="inline-block px-4 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/80 text-xs tracking-widest uppercase font-semibold text-neutral-200">
                          Proposta Comercial de Mídia OOH & DOOH
                        </div>
                      </div>

                      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase font-bold block">Anunciante</span>
                          <span className="font-bold text-white text-sm truncate block">{cliente}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase font-bold block">Campanha</span>
                          <span className="font-semibold text-neutral-200 truncate block">{p.campanha || "Estratégica"}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase font-bold block">Emissão</span>
                          <span className="font-semibold text-neutral-200 block">{fmtData(p.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 text-[10px] uppercase font-bold block">Validade</span>
                          <span className="font-semibold text-[#ff6b00] block">{p.validade ? `${fmtData(p.validade)} (10 dias)` : "10 dias úteis"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentSlide?.tipo === "essencia" && (
                    <div className="flex-1 flex flex-col justify-between py-2 space-y-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white">
                          O Significado de <span className="text-[#ff6b00]">Nexo</span>
                        </h2>
                        <p className="text-xs text-neutral-400">
                          Muito além de um nome: nossa identidade, metodologia e compromisso com o seu resultado.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                          <div className="size-7 rounded-lg bg-[#ff6b00]/20 text-[#ff6b00] flex items-center justify-center font-bold text-xs">01</div>
                          <h3 className="font-bold text-xs text-white">CONEXÃO</h3>
                          <p className="text-[10px] text-neutral-400 leading-tight">Ligamos marcas e audiências nos pontos de maior fluxo.</p>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                          <div className="size-7 rounded-lg bg-[#7928ca]/20 text-[#7928ca] flex items-center justify-center font-bold text-xs">02</div>
                          <h3 className="font-bold text-xs text-white">ESTRATÉGIA</h3>
                          <p className="text-[10px] text-neutral-400 leading-tight">Planejamento geoespacial com inteligência regional.</p>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                          <div className="size-7 rounded-lg bg-[#ff6b00]/20 text-[#ff6b00] flex items-center justify-center font-bold text-xs">03</div>
                          <h3 className="font-bold text-xs text-white">REPRESENTAÇÃO</h3>
                          <p className="text-[10px] text-neutral-400 leading-tight">Acesso direto ao inventário homologado de parceiros.</p>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-1">
                          <div className="size-7 rounded-lg bg-[#7928ca]/20 text-[#7928ca] flex items-center justify-center font-bold text-xs">04</div>
                          <h3 className="font-bold text-xs text-white">RESULTADOS</h3>
                          <p className="text-[10px] text-neutral-400 leading-tight">Auditoria, checking fotográfico e ROI mensurável.</p>
                        </div>
                      </div>

                      <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-xl p-3 text-xs text-neutral-300 leading-relaxed italic">
                        &ldquo;No dicionário, nexo significa conexão, ligação, vínculo entre partes. Na prática, é a inteligência que transforma veiculação em negócio: selecionamos os ativos ideais, negociamos as melhores condições e garantimos que sua marca esteja onde a atenção acontece.&rdquo;
                      </div>
                    </div>
                  )}

                  {currentSlide?.tipo === "como_atuamos" && (
                    <div className="flex-1 flex flex-col justify-between py-2 space-y-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white">
                          Como <span className="text-[#ff6b00]">Atuamos</span>
                        </h2>
                        <p className="text-xs text-neutral-400">
                          Fluxo integrado desde o briefing estratégico até a comprovação e otimização da veiculação.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="bg-neutral-900/90 border-l-4 border-l-[#ff6b00] border-y border-r border-neutral-800 rounded-r-xl p-3 space-y-1.5">
                          <span className="text-xs font-black text-[#ff6b00]">01. ENTENDER</span>
                          <h3 className="text-xs font-bold text-white">Briefing & Objetivos</h3>
                          <p className="text-[10px] text-neutral-400">Compreensão do público-alvo, personas e praças prioritárias.</p>
                        </div>
                        <div className="bg-neutral-900/90 border-l-4 border-l-[#7928ca] border-y border-r border-neutral-800 rounded-r-xl p-3 space-y-1.5">
                          <span className="text-xs font-black text-[#7928ca]">02. IDENTIFICAR</span>
                          <h3 className="text-xs font-bold text-white">Mapeamento Geoespacial</h3>
                          <p className="text-[10px] text-neutral-400">Curadoria dos melhores pontos OOH e painéis LED de alto fluxo.</p>
                        </div>
                        <div className="bg-neutral-900/90 border-l-4 border-l-[#ff6b00] border-y border-r border-neutral-800 rounded-r-xl p-3 space-y-1.5">
                          <span className="text-xs font-black text-[#ff6b00]">03. NEGOCIAR</span>
                          <h3 className="text-xs font-bold text-white">Condição de Hub</h3>
                          <p className="text-[10px] text-neutral-400">Poder de barganha centralizado com máxima eficiência de custos.</p>
                        </div>
                        <div className="bg-neutral-900/90 border-l-4 border-l-[#7928ca] border-y border-r border-neutral-800 rounded-r-xl p-3 space-y-1.5">
                          <span className="text-xs font-black text-[#7928ca]">04. ACOMPANHAR</span>
                          <h3 className="text-xs font-bold text-white">Checking & Pós-Venda</h3>
                          <p className="text-[10px] text-neutral-400">Auditoria rigorosa de exibição e relatórios de veiculação.</p>
                        </div>
                      </div>

                      <div className="bg-[#ff6b00]/10 border border-[#ff6b00]/30 rounded-xl p-3 flex items-center justify-between text-xs text-neutral-300">
                        <span>✨ <strong>Diferencial Nexo:</strong> interlocução única com múltiplos veículos de mídia e representação comercial transparente.</span>
                      </div>
                    </div>
                  )}

                  {currentSlide?.tipo === "overview" && (
                    <div className="flex-1 flex flex-col justify-between py-2 space-y-3">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white">
                          Overview de <span className="text-[#ff6b00]">Impacto & Praças</span>
                        </h2>
                        <p className="text-xs text-neutral-400">
                          Presença dominante nos principais corredores viários e centros de consumo do Centro-Oeste.
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-0.5">
                          <span className="text-2xl sm:text-3xl font-black text-[#ff6b00] block">+5,5 MI</span>
                          <span className="text-xs font-bold text-white block">Habitantes</span>
                          <span className="text-[10px] text-neutral-400 block">População Impactada (DF + Entorno)</span>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-0.5">
                          <span className="text-2xl sm:text-3xl font-black text-[#7928ca] block">+18,5 MI</span>
                          <span className="text-xs font-bold text-white block">Impactos/Mês</span>
                          <span className="text-[10px] text-neutral-400 block">Audiência Potencial Estimada</span>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-0.5">
                          <span className="text-xl sm:text-2xl font-black text-white block">DF + GO</span>
                          <span className="text-xs font-bold text-[#ff6b00] block">Cobertura Integral</span>
                          <span className="text-[10px] text-neutral-400 block">Capitais, Entorno & Cidades Satélites</span>
                        </div>
                      </div>

                      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Praças & Polos Estratégicos</span>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {["Plano Piloto", "EPTG", "Águas Claras", "Taguatinga", "Ceilândia", "Samambaia", "Lago Sul/Norte", "Valparaíso", "Luziânia", "Cristalina", "Anápolis", "Goiânia"].map((pr) => (
                            <Badge key={pr} variant="outline" className="bg-neutral-800/80 text-neutral-300 border-neutral-700 text-[10px]">
                              {pr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentSlide?.tipo === "ponto" && currentSlide?.item && (
                    <div className="flex-1 flex flex-col justify-between py-1 space-y-2">
                      {/* DUPLO DISPLAY: FOTO/RENDER À ESQUERDA + MAPA SATÉLITE À DIREITA */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-[72%]">
                        {/* Lado Esquerdo: Foto Superior + Ficha Técnica Inferior */}
                        <div className="flex flex-col justify-between h-full space-y-2">
                          {/* Foto real ou mockup do ponto */}
                          <div className="h-[48%] rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-center overflow-hidden relative group">
                            {currentSlide.item.foto_url ? (
                              <img
                                src={currentSlide.item.foto_url}
                                alt="Ponto OOH"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-3 text-center text-neutral-400">
                                <MonitorPlay className="size-8 text-[#ff6b00] mb-1" />
                                <span className="font-bold text-xs text-white">{currentSlide.item.programa || "PAINEL LED DIGITAL"}</span>
                                <span className="text-[10px] text-neutral-400">{currentSlide.item.formato || "Full HD 1920x1080"}</span>
                              </div>
                            )}
                            <Badge className="absolute top-2 left-2 bg-[#ff6b00] text-white text-[9px] font-bold">
                              FOTO FRONTAL / STREET VIEW
                            </Badge>
                          </div>

                          {/* Ficha técnica completa */}
                          <div className="h-[48%] bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                            <div>
                              <span className="text-neutral-500 font-bold block">LOCALIZAÇÃO:</span>
                              <span className="text-white font-medium truncate block">{currentSlide.item.localizacao || currentSlide.item.endereco || "Ponto de Fluxo"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-bold block">PRAÇA / RA:</span>
                              <span className="text-white font-medium truncate block">{currentSlide.item.praca || "Brasília - DF"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-bold block">TMD VEÍCULOS:</span>
                              <span className="text-[#ff6b00] font-bold block">{currentSlide.item.tmd_veiculos || "+65.000 veíc/dia"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-bold block">INSERÇÕES:</span>
                              <span className="text-white font-medium block">{currentSlide.item.insercoes_dia ? `${currentSlide.item.insercoes_dia}/dia` : "1.440/dia"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-bold block">DIMENSÕES:</span>
                              <span className="text-white font-medium block">{currentSlide.item.dimensoes || currentSlide.item.metragem || "8 x 3 m (24 m²)"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-500 font-bold block">COORDENADAS:</span>
                              <span className="text-neutral-300 font-mono text-[9px] block">
                                {currentSlide.item.latitude && currentSlide.item.longitude
                                  ? `${Number(currentSlide.item.latitude).toFixed(4)}, ${Number(currentSlide.item.longitude).toFixed(4)}`
                                  : "-15.8267, -47.9218"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Lado Direito: Mapa Satélite / Radar e Link Google Maps */}
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between h-full relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <MapPin className="size-3.5 text-[#ff6b00]" /> MAPA DE LOCALIZAÇÃO SATÉLITE
                            </span>
                            <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[9px]">
                              Raio de 500m / 1km
                            </Badge>
                          </div>

                          {/* Visualização de radar satélite simulado */}
                          <div className="flex-1 my-2 rounded-lg bg-[#090b10] border border-neutral-800 relative flex items-center justify-center overflow-hidden">
                            {/* Círculos de radar concêntricos */}
                            <div className="absolute size-40 rounded-full border border-neutral-800" />
                            <div className="absolute size-28 rounded-full border border-[#7928ca]/40" />
                            <div className="absolute size-16 rounded-full border border-[#ff6b00]/40" />
                            
                            {/* Pin Central */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div className="size-4 rounded-full bg-[#ff6b00] border-2 border-white animate-pulse" />
                              <span className="text-[10px] font-bold text-white bg-neutral-950/80 px-2 py-0.5 rounded border border-[#ff6b00]/50 mt-1">
                                {currentSlide.item.programa || "Ponto Nexo"}
                              </span>
                            </div>
                          </div>

                          {/* Botão de abrir no Google Maps */}
                          <a
                            href={
                              currentSlide.item.link_maps ||
                              `https://www.google.com/maps?q=${encodeURIComponent(
                                currentSlide.item.latitude && currentSlide.item.longitude
                                  ? `${currentSlide.item.latitude},${currentSlide.item.longitude}`
                                  : currentSlide.item.localizacao || "Brasília"
                              )}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-[#ff6b00] hover:bg-[#e05e00] text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="size-3" /> VER NO GOOGLE MAPS & STREET VIEW
                          </a>
                        </div>
                      </div>

                      {/* BARRA DE NEGOCIAÇÃO INFERIOR DO SLIDE */}
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 grid grid-cols-6 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-bold block">Painel</span>
                          <span className="font-bold text-white text-[11px] truncate block">{currentSlide.item.programa || "Painel"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-bold block">Metragem</span>
                          <span className="font-semibold text-neutral-200 text-[11px] block">{currentSlide.item.dimensoes || "24 m²"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-bold block">Tempo</span>
                          <span className="font-semibold text-neutral-200 text-[11px] block">{currentSlide.item.duracao ? `${currentSlide.item.duracao}s` : "10s"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-bold block">Valor Bruto</span>
                          <span className="text-neutral-400 line-through text-[11px] block">{fmtBRL(currentSlide.item.valor_tabela)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-neutral-400 uppercase font-bold block">Desconto</span>
                          <span className="text-emerald-400 font-bold text-[11px] block">
                            {currentSlide.item.desconto_percentual ? `${currentSlide.item.desconto_percentual}%` : "Especial"}
                          </span>
                        </div>
                        <div className="bg-emerald-950/40 rounded border border-emerald-500/30">
                          <span className="text-[9px] text-emerald-400 uppercase font-black block">Investimento</span>
                          <span className="text-emerald-300 font-black text-[12px] block">{fmtBRL(currentSlide.item.valor_negociado)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentSlide?.tipo === "fechamento" && (
                    <div className="flex-1 flex flex-col justify-between py-4 text-center space-y-4">
                      <div className="space-y-2">
                        <Badge className="bg-[#ff6b00]/20 text-[#ff6b00] border-[#ff6b00]/40 text-xs font-bold py-0.5 px-3">
                          PRÓXIMOS PASSOS
                        </Badge>
                        <h2 className="text-2xl sm:text-3xl font-black text-white">
                          Vamos criar o próximo <span className="text-[#ff6b00]">nexo</span>?
                        </h2>
                        <p className="text-xs text-neutral-400 max-w-lg mx-auto">
                          Estamos prontos para reservar os pontos, apoiar na produção dos criativos e iniciar a veiculação da sua campanha.
                        </p>
                      </div>

                      {/* 4 Cards de Contato Institucional */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto w-full">
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-1">
                          <Phone className="size-4 text-[#ff6b00] mx-auto" />
                          <span className="text-[10px] text-neutral-400 block">Telefone</span>
                          <span className="text-xs font-bold text-white block">{templateConfig?.telefone_contato || "(61) 99125-7245"}</span>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-1">
                          <Mail className="size-4 text-[#7928ca] mx-auto" />
                          <span className="text-[10px] text-neutral-400 block">E-mail</span>
                          <span className="text-xs font-bold text-white truncate block">{templateConfig?.email_contato || "rafaelnexomidia@gmail.com"}</span>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-1">
                          <Instagram className="size-4 text-[#ff6b00] mx-auto" />
                          <span className="text-[10px] text-neutral-400 block">Instagram</span>
                          <span className="text-xs font-bold text-white block">@{templateConfig?.instagram_contato?.replace(/^@/, "") || "nexobrasilmidia"}</span>
                        </div>
                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 text-center space-y-1">
                          <Globe className="size-4 text-[#7928ca] mx-auto" />
                          <span className="text-[10px] text-neutral-400 block">Portal</span>
                          <span className="text-xs font-bold text-white truncate block">nexomidiaerepresentacao.com.br</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        Atendimento exclusivo: <strong className="text-white">{p.executivo?.nome || "Equipe Comercial Nexo"}</strong>
                      </div>
                    </div>
                  )}

                  {/* Footer comum do slide */}
                  <div className="border-t border-neutral-800/80 pt-2 flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Nexo Mídia e Representação (nexomidiaerepresentacao.com.br)</span>
                    <span className="font-mono">
                      Lâmina {slideIndex + 1} de {slides.length}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="detalhes" className="space-y-4 pt-4">
                {/* Cartão de Abertura Institucional com Template da Organização */}
                <div className="rounded-xl border border-sky-300 dark:border-sky-800 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent p-4 space-y-3 text-xs shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground tracking-tight flex items-center gap-1.5">
                        ⭐ {org.nome || "NEXO Mídia e Representação"}
                      </span>
                      <span className="text-muted-foreground/60 hidden sm:inline">|</span>
                      <span className="text-sky-700 dark:text-sky-300 font-semibold hidden sm:inline">
                        {org.tagline || "Hub de Negócios & Soluções Estratégicas em Mídia"}
                      </span>
                      <Badge variant="outline" className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40 text-[10px] py-0 font-bold">
                        DF & Entorno
                      </Badge>
                    </div>
                    {(templateConfig?.site_url || org.site_url) && (
                      <a
                        href={templateConfig?.site_url || org.site_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-bold text-xs"
                        title="Acessar portal institucional"
                      >
                        <Globe className="size-3" />
                        <span>{(templateConfig?.site_url || org.site_url || "").replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>

                  {/* Contatos do Template de Proposta */}
                  {(templateConfig?.telefone_contato || templateConfig?.email_contato || templateConfig?.instagram_contato) && (
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-sky-200/50 dark:border-sky-800/40">
                      {templateConfig.telefone_contato && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Phone className="size-3 text-sky-600 dark:text-sky-400" />
                          {templateConfig.telefone_contato}
                        </span>
                      )}
                      {templateConfig.email_contato && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Mail className="size-3 text-sky-600 dark:text-sky-400" />
                          {templateConfig.email_contato}
                        </span>
                      )}
                      {templateConfig.instagram_contato && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Instagram className="size-3 text-sky-600 dark:text-sky-400" />
                          @{templateConfig.instagram_contato.replace(/^@/, "")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="border-t border-sky-200/70 dark:border-sky-800/70 pt-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 mb-1">
                      {templateConfig?.manifesto_titulo || "Apresentação Institucional & Posicionamento Estratégico"}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                      "{templateConfig?.manifesto_texto || "A Nexo Mídia e Representação atua como um Hub de Negócios especializado em conectar marcas a oportunidades de alto impacto no Distrito Federal e entorno. Combinamos veículos de mídia consolidados, inteligência geográfica regional e soluções estratégicas personalizadas para garantir máxima lembrança e retorno para o seu investimento."}"
                    </p>
                  </div>
                </div>

                {/* Resumo Financeiro Estruturado em 3 Pilares */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/20 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <span>📍</span>
                      <span>Veiculação de Mídia / Espaços de Impacto</span>
                    </div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-200">
                      {fmtBRL(totalRepresentados)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Rede Homologada de Painéis LED, OOH & Mídia Exterior
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/50 dark:bg-sky-950/20 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <span>⭐</span>
                      <span>Estratégia, Produção & Ativação Nexo</span>
                    </div>
                    <div className="text-lg font-bold text-sky-900 dark:text-sky-200">
                      {fmtBRL(totalInHouse)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Planejamento 360°, Criativos, Tráfego & Inteligência Regional
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span>Total com Condição Comercial Exclusiva</span>
                      <Badge className="bg-emerald-600 text-white text-[9px] py-0">Hub Nexo</Badge>
                    </div>
                    <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
                      {fmtBRL(p.valor_negociado)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.valor_desconto > 0 ? `Economia aplicada de ${fmtBRL(p.valor_desconto)}` : "Condição comercial direta"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Info label="Cliente" value={cliente} />
                  <Info label="Campanha" value={p.campanha} />
                  <Info
                    label="Status"
                    value={<Badge variant="secondary">{p.status ?? "—"}</Badge>}
                  />
                  <Info label="Validade" value={fmtData(p.validade)} />
                  <Info label="Criado em" value={fmtData(p.created_at)} />
                  <Info label="Total de inserções" value={String(p.total_insercoes)} />
                  <Info label="Valor de tabela" value={fmtBRL(p.valor_tabela)} />
                  <Info
                    label="Desconto do Hub"
                    value={
                      p.valor_tabela > 0
                        ? `${fmtBRL(p.valor_desconto)} (${((p.valor_desconto / p.valor_tabela) * 100).toFixed(0)}%)`
                        : fmtBRL(p.valor_desconto)
                    }
                  />
                </div>

                {p.observacao && (
                  <div className="rounded-md border p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1 font-semibold">Observações & Racional Comercial</div>
                    <div className="text-sm whitespace-pre-wrap">{p.observacao}</div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-2">Itens da proposta</h3>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Programa</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Formato</TableHead>
                          <TableHead className="text-right">Ins/dia</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Vlr Unit.</TableHead>
                          <TableHead className="text-right">Total Tabela</TableHead>
                          <TableHead className="text-right">Desconto</TableHead>
                          <TableHead className="text-right">Negociado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(p.itens ?? []).length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="text-center text-muted-foreground py-6"
                            >
                              Sem itens.
                            </TableCell>
                          </TableRow>
                        )}
                        {(p.itens ?? []).map((it, i) => (
                          <TableRow key={i}>
                            <TableCell>{it.tipo}</TableCell>
                            <TableCell>
                              <div className="font-medium">{it.programa || "—"}</div>
                              {/* Dados de Geolocalização / Mídia Exterior */}
                              {((it as any).link_maps ||
                                (it as any).latitude ||
                                (it as any).sentido_via ||
                                (it as any).ponto_referencia ||
                                (it as any).fluxo_veiculos_dia) && (
                                <div className="mt-1.5 p-2 rounded-md bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/50 space-y-1">
                                  {((it as any).sentido_via || (it as any).fluxo_veiculos_dia) && (
                                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                      {(it as any).sentido_via && (
                                        <span className="font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-1">
                                          <Navigation className="size-3 text-sky-600 dark:text-sky-400 rotate-45" />
                                          {(it as any).sentido_via}
                                        </span>
                                      )}
                                      {(it as any).fluxo_veiculos_dia && (
                                        <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 border-sky-300 dark:border-sky-700 bg-sky-100/50 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 font-medium">
                                          🚗 {Number((it as any).fluxo_veiculos_dia).toLocaleString("pt-BR")} veíc/dia
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {(it as any).ponto_referencia && (
                                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                                      <span className="font-medium text-foreground/80">Ref:</span> {(it as any).ponto_referencia}
                                    </div>
                                  )}
                                  {((it as any).link_maps || ((it as any).latitude && (it as any).longitude)) && (
                                    <div className="pt-0.5">
                                      <a
                                        href={
                                          (it as any).link_maps ||
                                          `https://www.google.com/maps?q=${(it as any).latitude},${(it as any).longitude}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 hover:underline bg-white/70 dark:bg-sky-900/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800"
                                      >
                                        <MapPin className="size-3 text-red-500" />
                                        <span>Google Maps / Street View</span>
                                        <ExternalLink className="size-2.5 opacity-70" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{(it as any).horario || "—"}</TableCell>
                            <TableCell>{it.formato || "—"}</TableCell>
                            <TableCell className="text-right">{it.insercoes_dia}</TableCell>
                            <TableCell className="text-right">{it.total_insercoes}</TableCell>
                            <TableCell className="text-right">{fmtBRL(it.valor_unit)}</TableCell>
                            <TableCell className="text-right">{fmtBRL(it.valor_tabela)}</TableCell>
                            <TableCell className="text-right">
                              {it.desconto > 0 ? `${it.desconto.toFixed(0)}%` : "0%"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {it.valor_negociado > 0 ? fmtBRL(it.valor_negociado) : "Bonificação"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Assinatura Institucional Nexo */}
                  <div className="mt-4 p-4 rounded-xl border border-sky-200/80 dark:border-sky-800/80 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <div className="font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                        <span>NEXO Mídia e Representação</span>
                        <Badge variant="outline" className="text-[9px] py-0 text-sky-700 dark:text-sky-300 border-sky-400">Hub 360°</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Hub de Negócios & Soluções Estratégicas em Mídia • Brasília - DF & Entorno
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href="https://nexomidiaerepresentacao.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>nexomidiaerepresentacao.com.br</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="pt-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum histórico encontrado para esta proposta.
                      </p>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                        {history.map((h) => (
                          <div key={h.id} className="relative">
                            <div className="absolute -left-[24px] top-1 size-[12px] rounded-full border-2 border-primary bg-background" />
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm capitalize">
                                  {h.action_type === "create"
                                    ? "Proposta Criada"
                                    : h.action_type === "status_change"
                                      ? "Alteração de Status"
                                      : "Modificação"}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  <Clock className="size-3 mr-1" />
                                  {new Date(h.created_at).toLocaleString("pt-BR")}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Por: {h.profiles?.nome || h.profiles?.email || "Sistema"}
                              </div>
                              {h.changes && (
                                <div className="mt-2 text-xs bg-muted/50 rounded p-2 border">
                                  {h.action_type === "create" ? (
                                    <p>Proposta inicial gerada.</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {Object.entries(h.changes).map(
                                        ([field, val]: [string, any]) => (
                                          <li key={field} className="flex flex-wrap gap-x-2">
                                            <span className="font-medium uppercase text-[10px] text-muted-foreground">
                                              {field}:
                                            </span>
                                            <span className="line-through text-red-500">
                                              {String(val.old)}
                                            </span>
                                            <span className="text-green-600 font-medium">
                                              → {String(val.new)}
                                            </span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="anexos" className="pt-4">
                <PropostaAnexosSection propostaId={propostaId} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Modelo:</span>
              <select
                value={layoutModelo}
                onChange={(e) => setLayoutModelo(e.target.value as any)}
                className="text-xs border rounded-md px-2 py-1 bg-background font-medium"
              >
                <option value="nexo_slide">🌟 Lâminas Nexo (Slides 16:9 • Volvo Standard)</option>
                <option value="padrao">Padrão Mídia.OS (Executivo)</option>
                <option value="simplificado">Simplificado (Estratégico DOOH)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Formato:</span>
              <select
                value={modoApresentacao}
                onChange={(e) => setModoApresentacao(e.target.value as any)}
                className="text-xs border rounded-md px-2 py-1 bg-background font-medium"
              >
                <option value="detalhado">📋 Detalhado (Total Proposta)</option>
                <option value="pacote_midia">📦 Pacote de Mídia (Valor Final)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {p?.status === "aprovada" && onEmitirPis && (
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 font-semibold gap-1.5 shadow-xs"
                onClick={() => onEmitirPis(p)}
              >
                <Zap className="size-4 fill-current" />
                Gerar PIs Imediatamente
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium rounded-full px-4"
              onClick={() => {
                if (!p) return;
                const msg = [
                  `📊 *PROPOSTA COMERCIAL — ${p.numero || "OOH"}*`,
                  `🎯 *Campanha:* ${p.campanha || "Veiculação de Mídia"}`,
                  `👤 *Cliente:* ${p.cliente?.nome || "Cliente"}`,
                  `💰 *Investimento Total:* ${fmtBRL(p.valor_total || 0)}`,
                  `📍 *Total de Pontos:* ${p.itens?.length || 0} ativo(s)`,
                  `\nAcesse os detalhes pelo Mídia.OS (midiaos.online)`,
                ].join("\n");
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
              }}
            >
              <Share2 className="size-4" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="default"
              className="bg-primary hover:bg-primary/90 rounded-full px-6 font-semibold"
              onClick={async () => {
                if (!p) return;
                const toastId = toast.loading("Gerando proposta...");
                try {
                  const pComModo: PropostaApresentacao = {
                    ...p,
                    organizacao: (p as any).organizacao || org,
                    modo_apresentacao: modoApresentacao,
                    mostrar_endereco: mostrarEndereco,
                    mostrar_fotos: mostrarFotos,
                  };
                  if (layoutModelo === "nexo_slide") {
                    await gerarPdfPropostaNexo(pComModo, "");
                  } else if (layoutModelo === "simplificado") {
                    await gerarPdfPropostaSimplificada(pComModo, "");
                  } else {
                    await gerarPdfProposta(pComModo, "");
                  }
                  toast.success("Proposta gerada com sucesso!", { id: toastId });
                } catch (e: any) {
                  console.error(e);
                  toast.error("Erro ao gerar PDF: " + (e?.message || "falha desconhecida"), { id: toastId });
                }
              }}
            >
              Gerar PDF
            </Button>
          </div>
        </DialogFooter>

        <div className="text-[11px] text-muted-foreground text-center border-t border-border/40 pt-3 pb-1">
          Desenvolvido e operado por{" "}
          <a
            href="https://nexomidiaerepresentacao.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Nexo Mídia e Representação (nexomidiaerepresentacao.com.br)
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2.5 bg-card">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}
