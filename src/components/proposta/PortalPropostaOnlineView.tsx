import { useState } from "react";
import {
  type PropostaOnlinePublica,
  enviarFeedbackPropostaOnline,
  aprovarPropostaOnline,
} from "@/lib/propostas-online.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ExternalLink,
  MessageSquare,
  Building2,
  Calendar,
  Share2,
  Download,
  ShieldCheck,
  Send,
  Loader2,
  HelpCircle,
  Eye,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  proposta: PropostaOnlinePublica;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

export function PortalPropostaOnlineView({ proposta: p }: Props) {
  const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
  const [modalAprovacaoOpen, setModalAprovacaoOpen] = useState(false);

  // Estados do Feedback
  const [feedbackTipo, setFeedbackTipo] = useState<
    "troca_ponto" | "ajuste_periodo" | "revisao_valores" | "outro"
  >("troca_ponto");
  const [feedbackMensagem, setFeedbackMensagem] = useState("");
  const [feedbackNome, setFeedbackNome] = useState("");
  const [feedbackContato, setFeedbackContato] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Estados da Aprovação
  const [aprovadorNome, setAprovadorNome] = useState("");
  const [aprovadorCargo, setAprovadorCargo] = useState("");
  const [aprovadorDocumento, setAprovadorDocumento] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [approving, setApproving] = useState(false);
  const [isAprovada, setIsAprovada] = useState(
    p.status === "aprovada" || p.status === "convertida" || !!p.aprovado_digitalmente_em,
  );
  const [dataAprovacao, setDataAprovacao] = useState(p.aprovado_digitalmente_em);

  const clienteNome =
    p.cliente?.nome_fantasia || p.cliente?.razao_social || "Prezado(a) Anunciante";
  const empresaNome = p.organizacao?.nome || "Mídia.OS";

  // Enviar Feedback
  const handleEnviarFeedback = async () => {
    if (!feedbackMensagem.trim()) {
      toast.error("Por favor, descreva sua sugestão ou ajuste desejado.");
      return;
    }
    setSendingFeedback(true);
    try {
      const res = await enviarFeedbackPropostaOnline({
        data: {
          token: p.public_token,
          tipo: feedbackTipo,
          mensagem: feedbackMensagem,
          autorNome: feedbackNome,
          autorContato: feedbackContato,
        },
      });
      toast.success(res.message);
      setFeedbackMensagem("");
      setModalFeedbackOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar sugestão.");
    } finally {
      setSendingFeedback(false);
    }
  };

  // Aprovar Proposta Formalmente
  const handleAprovarProposta = async () => {
    if (!aprovadorNome.trim() || !aprovadorCargo.trim()) {
      toast.error("Informe seu Nome e Cargo para registrar a aprovação.");
      return;
    }
    if (!aceiteTermos) {
      toast.error("Marque a confirmação de concordância com os termos do planejamento.");
      return;
    }
    setApproving(true);
    try {
      const res = await aprovarPropostaOnline({
        data: {
          token: p.public_token,
          nome: aprovadorNome,
          cargo: aprovadorCargo,
          documento: aprovadorDocumento,
        },
      });
      toast.success(res.message);
      setIsAprovada(true);
      setDataAprovacao(res.dataAprovacao);
      setModalAprovacaoOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar proposta.");
    } finally {
      setApproving(false);
    }
  };

  const handleCompartilharWhatsApp = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const msg = encodeURIComponent(
      `Olá! Preparamos com exclusividade o planejamento estratégico da campanha "${p.campanha}". Você pode conferir todos os detalhes, fotos e condições especiais no link interativo: ${url}`,
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleCopiarLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link da proposta copiado para a área de transferência!");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden font-sans">
      {/* =========================================================================
          MARCA D'ÁGUA CORPORATIVA TRANSVERSAL (WATERMARK DIAGONAL)
          ========================================================================= */}
      {p.organizacao?.logo_url && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none opacity-[0.04]"
        >
          <img
            src={p.organizacao.logo_url}
            alt="Marca d'água institucional"
            className="w-[120vw] max-w-[1200px] object-contain transform -rotate-[35deg] filter grayscale contrast-200"
          />
        </div>
      )}

      {/* Conteúdo Principal em Camada Superior Z-1 */}
      <div className="relative z-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Top Header com Logos e Status */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-4">
            {p.organizacao?.logo_url ? (
              <img
                src={p.organizacao.logo_url}
                alt={empresaNome}
                className="h-12 max-w-[180px] object-contain drop-shadow-md"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-xl shadow-lg">
                  M
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white">
                  {empresaNome}
                </span>
              </div>
            )}

            <div className="h-8 w-px bg-slate-800 hidden sm:block" />

            {p.cliente?.logo_url && (
              <img
                src={p.cliente.logo_url}
                alt={clienteNome}
                className="h-10 max-w-[140px] object-contain opacity-90 hidden sm:block"
              />
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {isAprovada ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 px-3 py-1.5 text-xs font-bold gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Proposta Aprovada Oficialmente
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 px-3 py-1.5 text-xs font-bold gap-1.5">
                <Clock className="size-4 text-amber-400" />
                Aguardando Validação & Aceite
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopiarLink}
              className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-xs gap-1.5"
            >
              <Share2 className="size-3.5" />
              Copiar Link
            </Button>
          </div>
        </header>

        {/* Hero Banner da Campanha */}
        <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="size-3.5" />
              Planejamento Estratégico Exclusivo
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {p.campanha}
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Apresentação comercial e técnica desenvolvida para <strong>{clienteNome}</strong>,
              garantindo dominância territorial, cerco contínuo da jornada e autoridade máxima de
              marca.
            </p>

            <div className="flex items-center gap-6 pt-2 text-xs text-slate-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-4 text-cyan-400" />
                <span>
                  Proposta Nº <strong>{p.numero}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 text-cyan-400" />
                <span>
                  Emitida em <strong>{fmtData(p.created_at)}</strong>
                </span>
              </div>
              {p.validade && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-amber-400" />
                  <span>
                    Válida até <strong>{fmtData(p.validade)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Alerta de Aprovação Concluída (quando já aprovado) */}
        {isAprovada && (
          <div className="p-4 sm:p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Aceite Formal Registrado</h4>
                <p className="text-xs text-emerald-300/80">
                  {p.aprovado_por_nome ? (
                    <>
                      Aprovado por <strong>{p.aprovado_por_nome}</strong> ({p.aprovado_por_cargo})
                      em {fmtData(dataAprovacao)}.
                    </>
                  ) : (
                    <>
                      Proposta validada digitalmente com autorização de veiculação em{" "}
                      {fmtData(dataAprovacao)}.
                    </>
                  )}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold">Autorizado OPEC / PI</Badge>
          </div>
        )}

        {/* Grade de Destaques de Investimento */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total de Inserções
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-white font-mono">
                {p.total_insercoes.toLocaleString("pt-BR")}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Exibições programadas</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Valor Bruto de Tabela
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-300 font-mono">
                {fmtBRL(p.valor_tabela)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Investimento integral de tabela</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Economia Concedida
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {fmtBRL(p.valor_desconto)}
              </div>
              <p className="text-[11px] text-emerald-500/80 mt-1">
                {p.valor_tabela > 0
                  ? `${((p.valor_desconto / p.valor_tabela) * 100).toFixed(1)}% de benefício comercial`
                  : "Bonificação especial"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border-cyan-500/40 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Investimento Final Líquido
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white font-mono">
                {fmtBRL(p.valor_negociado)}
              </div>
              <p className="text-[11px] text-cyan-300/80 mt-1">Condição final fechada</p>
            </CardContent>
          </Card>
        </section>

        {/* Tabela de Produtos / Itens de Mídia */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Espaços e Formatos do Plano de Mídia</h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {p.itens.length} {p.itens.length === 1 ? "meio programado" : "meios programados"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4">Meio & Formato</th>
                  <th className="py-4 px-4">Localização / Programa</th>
                  <th className="py-4 px-4 text-center">Inserções</th>
                  <th className="py-4 px-4 text-right">Valor Tabela</th>
                  <th className="py-4 px-4 text-right">Desconto</th>
                  <th className="py-4 px-4 text-right">Valor Negociado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {p.itens.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-800 border-slate-700 text-cyan-300 font-bold"
                        >
                          {it.tipo}
                        </Badge>
                        <span>{it.formato || it.tipo}</span>
                      </div>
                      {it.horario && (
                        <span className="text-xs text-slate-400 block mt-0.5">{it.horario}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-300 text-xs font-medium">
                        {it.programa || it.endereco_ponto || "Veiculação de Rede"}
                      </div>
                      {it.link_maps && (
                        <a
                          href={it.link_maps}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline mt-0.5"
                        >
                          <MapPin className="size-3" /> Ver no Google Maps
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-white">
                      {it.total_insercoes}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-slate-400">
                      {fmtBRL(it.valor_tabela)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-emerald-400">
                      {it.desconto > 0 ? (
                        <span>
                          {fmtBRL(it.valor_tabela - it.valor_negociado)} ({it.desconto.toFixed(0)}%)
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-cyan-300">
                      {fmtBRL(it.valor_negociado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Galeria de Fotos Reais dos Pontos e Especificações */}
        {p.itens.some((it) => it.fotos && it.fotos.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="size-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">
                Galeria Fotográfica dos Pontos de Exibição
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {p.itens
                .filter((it) => it.fotos && it.fotos.length > 0)
                .flatMap((it) =>
                  it.fotos.map((foto, fIdx) => (
                    <div
                      key={`${it.id}-${fIdx}`}
                      className="group rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md hover:border-cyan-500/50 transition-all"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-slate-950 relative">
                        <img
                          src={foto}
                          alt={it.programa || it.tipo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-slate-900/90 text-cyan-300 border-slate-700 text-[10px] font-bold">
                            {it.tipo}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3.5 space-y-1">
                        <h4 className="text-xs font-bold text-white truncate">
                          {it.programa || it.formato || it.tipo}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {it.endereco_ponto || it.ponto_referencia || "Ponto de alta visibilidade"}
                        </p>
                      </div>
                    </div>
                  )),
                )}
            </div>
          </section>
        )}

        {/* Seção de Defesa Comercial Estratégica (Motor Persuasivo) */}
        {p.defesaComercial && (
          <section className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <TrendingUp className="size-5 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">Defesa Estratégica & Retorno Esperado</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm leading-relaxed text-slate-300">
              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-cyan-400">
                  <MapPin className="size-3.5" /> Dominância Territorial & Cerco da Jornada
                </h4>
                <p className="text-xs">{p.defesaComercial.dominanciaTerritorial}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-cyan-400">
                  <ShieldCheck className="size-3.5" /> Mídia Física vs. Dispersão Digital
                </h4>
                <p className="text-xs">{p.defesaComercial.comparativoFisicoVsDigital}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-cyan-400">
                  <Layers className="size-3.5" /> Sinergia Cross-Media & Validação Cruzada
                </h4>
                <p className="text-xs">{p.defesaComercial.sinergiaCrossMedia}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-cyan-400">
                  <Clock className="size-3.5" /> Garantia de Reserva de Praça
                </h4>
                <p className="text-xs">{p.defesaComercial.escassezReservaPraca}</p>
              </div>
            </div>
          </section>
        )}

        {/* Barra Flutuante de Ação no Rodapé */}
        <div className="sticky bottom-4 z-40 p-4 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block">Total do Investimento</span>
              <span className="text-xl font-extrabold text-cyan-400 font-mono">
                {fmtBRL(p.valor_negociado)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setModalFeedbackOpen(true)}
              className="flex-1 sm:flex-none border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs gap-1.5 font-bold"
            >
              <MessageSquare className="size-3.5 text-amber-400" />
              Sugerir Alteração
            </Button>

            <Button
              variant="outline"
              onClick={handleCompartilharWhatsApp}
              className="flex-1 sm:flex-none border-emerald-600/50 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 text-xs gap-1.5 font-bold"
            >
              <Share2 className="size-3.5" />
              WhatsApp
            </Button>

            {!isAprovada ? (
              <Button
                onClick={() => setModalAprovacaoOpen(true)}
                className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs gap-1.5 font-extrabold shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="size-4" />
                Aprovar Proposta Oficial
              </Button>
            ) : (
              <Button
                disabled
                className="bg-emerald-800/50 text-emerald-200 text-xs gap-1.5 font-bold"
              >
                <CheckCircle2 className="size-4" />
                Proposta Já Aprovada
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: CANAL DE FEEDBACK E SUGESTÕES EM TEMPO REAL
          ========================================================================= */}
      <Dialog open={modalFeedbackOpen} onOpenChange={setModalFeedbackOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="size-5 text-amber-400" />
              Sugerir Ajustes na Proposta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Indique quais alterações ou sugestões você gostaria de avaliar com nossa equipe
              comercial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Ajuste</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "troca_ponto", label: "Troca de Ponto / Mídia" },
                  { id: "ajuste_periodo", label: "Ajuste de Período / Data" },
                  { id: "revisao_valores", label: "Revisão de Valores" },
                  { id: "outro", label: "Outro Ajuste" },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setFeedbackTipo(op.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      feedbackTipo === op.id
                        ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                        : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descreva sua sugestão</Label>
              <Textarea
                placeholder="Ex: Gostaria de trocar o ponto da Avenida Central por um ponto no Eixo Sul, ou avaliar extensão do período para 60 dias..."
                value={feedbackMensagem}
                onChange={(e) => setFeedbackMensagem(e.target.value)}
                className="bg-slate-950 border-slate-700 min-h-[90px] text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Seu Nome</Label>
                <Input
                  placeholder="Seu nome"
                  value={feedbackNome}
                  onChange={(e) => setFeedbackNome(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone / E-mail</Label>
                <Input
                  placeholder="Contato"
                  value={feedbackContato}
                  onChange={(e) => setFeedbackContato(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalFeedbackOpen(false)}
              className="border-slate-700 bg-slate-800 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleEnviarFeedback}
              disabled={sendingFeedback}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
            >
              {sendingFeedback ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Enviar Sugestão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: APROVAÇÃO DIGITAL FORMAL (ACEITE DA PROPOSTA)
          ========================================================================= */}
      <Dialog open={modalAprovacaoOpen} onOpenChange={setModalAprovacaoOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-emerald-400">
              <ShieldCheck className="size-6" />
              Aprovação Oficial da Proposta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Ao aprovar, você autoriza formalmente a reserva dos espaços de mídia e a emissão do
              Pedido de Inserção (PI) nas condições negociadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block">Investimento Consolidado</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">
                {fmtBRL(p.valor_negociado)}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Total de {p.total_insercoes} inserções em {p.itens.length} formato(s)
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo do Responsável *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={aprovadorNome}
                onChange={(e) => setAprovadorNome(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cargo / Função *</Label>
              <Input
                placeholder="Ex: Diretor de Marketing / Sócio"
                value={aprovadorCargo}
                onChange={(e) => setAprovadorCargo(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">CPF ou Telefone de Validação</Label>
              <Input
                placeholder="Ex: (61) 99999-9999 ou 000.000.000-00"
                value={aprovadorDocumento}
                onChange={(e) => setAprovadorDocumento(e.target.value)}
                className="bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={aceiteTermos}
                onChange={(e) => setAceiteTermos(e.target.checked)}
                className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 size-4 mt-0.5"
              />
              <span className="text-xs text-slate-300 leading-snug">
                Declaro que li e aprovo o planejamento comercial da campanha{" "}
                <strong>"{p.campanha}"</strong> com investimento líquido de{" "}
                <strong>{fmtBRL(p.valor_negociado)}</strong>.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAprovacaoOpen(false)}
              className="border-slate-700 bg-slate-800 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAprovarProposta}
              disabled={approving || !aceiteTermos}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs gap-1.5"
            >
              {approving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Confirmar Aprovação Oficial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
