import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Tv,
  Radio,
  Monitor,
  Check,
  Loader2,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Building2,
  UserCheck,
  CheckSquare,
  FileText,
  Clock,
  Briefcase,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  sugerirPropostaIA,
  SOLUCOES_PORTFOLIO_NEXO,
  SEGMENTOS_PRESETS,
  MOMENTOS_DOR_PRESETS,
  MODELOS_PRECIFICACAO_PRESETS,
  type SugestaoPropostaIa,
} from "@/lib/proposta-ia.functions";
import { formatBRL } from "@/lib/mock-data";

type Props = {
  clienteNome?: string | null;
  onApplySuggestion: (sugestao: SugestaoPropostaIa) => void;
};

export function PropostaIaAssistant({ clienteNome, onApplySuggestion }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoPropostaIa | null>(null);

  // Bloco 1: Dados do Cliente e Alinhamento Inicial
  const [empresaCliente, setEmpresaCliente] = useState(clienteNome || "");
  const [contatoDecisor, setContatoDecisor] = useState("");
  const [segmentoAtuacao, setSegmentoAtuacao] = useState("");
  const [dorOuMomento, setDorOuMomento] = useState("");

  // Bloco 2: Seleção de Soluções (O Portfólio Nexo)
  const [solucoesSelecionadas, setSolucoesSelecionadas] = useState<string[]>([]);
  const [midias, setMidias] = useState<("TV" | "Radio" | "DOOH")[]>(["TV", "Radio", "DOOH"]);

  // Bloco 3: Especificações Técnicas e Escopo
  const [entregaveisVolumes, setEntregaveisVolumes] = useState("");
  const [prazosCronograma, setPrazosCronograma] = useState("");
  const [periodoDias, setPeriodoDias] = useState<number>(30);

  // Bloco 4: Condições Comerciais e Investimento
  const [modeloPrecificacao, setModeloPrecificacao] = useState("");
  const [orcamento, setOrcamento] = useState<string>("");
  const [condicoesPagamento, setCondicoesPagamento] = useState("");
  const [condicoesEspeciais, setCondicoesEspeciais] = useState("");

  // Outros opcionais
  const [focoHorario, setFocoHorario] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Atualiza empresa caso o cliente selecionado na proposta mude
  useEffect(() => {
    if (clienteNome && !empresaCliente) {
      setEmpresaCliente(clienteNome);
    }
  }, [clienteNome]);

  const sugerirFn = useServerFn(sugerirPropostaIA);

  const toggleSolucao = (id: string) => {
    setSolucoesSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleMidia = (m: "TV" | "Radio" | "DOOH") => {
    setMidias((prev) =>
      prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
    );
  };

  const selecionarTodasSolucoes = () => {
    if (solucoesSelecionadas.length === SOLUCOES_PORTFOLIO_NEXO.length) {
      setSolucoesSelecionadas([]);
    } else {
      setSolucoesSelecionadas(SOLUCOES_PORTFOLIO_NEXO.map((s) => s.id));
    }
  };

  const handleGerar = async () => {
    try {
      setLoading(true);
      const orcNum = orcamento ? Number(orcamento.replace(/\D/g, "")) / 100 : null;
      
      const res = await sugerirFn({
        data: {
          // Bloco 1
          cliente_nome: empresaCliente.trim() || clienteNome || null,
          contato_decisor: contatoDecisor.trim() || null,
          segmento_atuacao: segmentoAtuacao.trim() || null,
          dor_ou_momento: dorOuMomento.trim() || null,

          // Bloco 2
          solucoes: solucoesSelecionadas.length > 0 ? solucoesSelecionadas : undefined,
          midias: midias.length > 0 ? midias : undefined,

          // Bloco 3
          entregaveis_volumes: entregaveisVolumes.trim() || null,
          prazos_cronograma: prazosCronograma.trim() || null,
          periodo_dias: periodoDias > 0 ? periodoDias : 30,

          // Bloco 4
          modelo_precificacao: modeloPrecificacao.trim() || null,
          orcamento_estimado: orcNum && orcNum > 0 ? orcNum : null,
          condicoes_pagamento: condicoesPagamento.trim() || null,
          condicoes_especiais: condicoesEspeciais.trim() || null,

          // Adicionais
          foco_horario: focoHorario.trim() || null,
          observacoes: observacoes.trim() || null,
        },
      });

      setSugestao(res);
      toast.success("Sugestão de proposta elaborada com sucesso pela IA!", {
        description: `${res.itens.length} produto(s) estratégico(s) selecionado(s) do catálogo.`,
      });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar proposta com IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleAplicar = () => {
    if (!sugestao) return;
    onApplySuggestion(sugestao);
    toast.success("Briefing e sugestão da IA aplicados à proposta!", {
      description: "Itens, valores, estratégia e escopo técnico foram preenchidos.",
    });
    setExpanded(false);
  };

  const handleLimparBriefing = () => {
    setContatoDecisor("");
    setSegmentoAtuacao("");
    setDorOuMomento("");
    setSolucoesSelecionadas([]);
    setEntregaveisVolumes("");
    setPrazosCronograma("");
    setModeloPrecificacao("");
    setOrcamento("");
    setCondicoesPagamento("");
    setCondicoesEspeciais("");
    setFocoHorario("");
    setObservacoes("");
    setSugestao(null);
    toast.info("Briefing limpo com sucesso.");
  };

  return (
    <Card className="border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/70 via-background to-indigo-50/50 dark:from-purple-950/25 dark:via-background dark:to-indigo-950/25 shadow-sm overflow-hidden transition-all">
      {/* Barra de Título / Gatilho do Accordion */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none border-b border-purple-100 dark:border-purple-900/40 hover:bg-purple-100/30 dark:hover:bg-purple-900/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="size-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Assistente IA & Briefing de Proposta Comercial
              </span>
              <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-950/60 text-[10px] py-0 font-medium">
                Nexo Mídia e Representação
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Preenchimento Opcional
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              Preencha os blocos que desejar para a IA gerar uma proposta personalizada com estratégia, produtos do catálogo e escopo.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 shrink-0 text-purple-700 dark:text-purple-300"
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {expanded && (
        <CardContent className="p-4 space-y-5">
          {!sugestao ? (
            <>
              {/* BLOCO 1: DADOS DO CLIENTE E ALINHAMENTO INICIAL */}
              <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 p-3.5 bg-background/60 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center size-5 rounded-full bg-purple-600 text-white text-[11px] font-bold">1</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">
                      Dados do Cliente e Alinhamento Inicial
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Opcional</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-medium">Nome da Empresa do Cliente</Label>
                    <Input
                      placeholder="Ex: Farmácias Vida, Construtora Aliança..."
                      value={empresaCliente}
                      onChange={(e) => setEmpresaCliente(e.target.value)}
                      className="h-8 text-xs mt-1 bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Nome e Cargo do Contato / Decisor</Label>
                    <Input
                      placeholder="Ex: Carlos Silva — Diretor de Marketing"
                      value={contatoDecisor}
                      onChange={(e) => setContatoDecisor(e.target.value)}
                      className="h-8 text-xs mt-1 bg-background"
                    />
                  </div>

                  {/* Segmento de Atuação */}
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">Segmento de Atuação</Label>
                    <div className="flex flex-wrap gap-1">
                      {SEGMENTOS_PRESETS.map((seg) => (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => setSegmentoAtuacao(seg)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                            segmentoAtuacao === seg
                              ? "bg-purple-600 text-white border-purple-600 font-medium"
                              : "bg-background/80 text-muted-foreground hover:border-purple-300 hover:text-foreground"
                          }`}
                        >
                          {seg}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Ou digite o segmento de atuação específico..."
                      value={segmentoAtuacao}
                      onChange={(e) => setSegmentoAtuacao(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  {/* Momento ou Dor Principal */}
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">Momento ou Dor Principal do Cliente</Label>
                    <div className="flex flex-wrap gap-1">
                      {MOMENTOS_DOR_PRESETS.map((dor) => (
                        <button
                          key={dor}
                          type="button"
                          onClick={() => setDorOuMomento(dor)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                            dorOuMomento === dor
                              ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                              : "bg-background/80 text-muted-foreground hover:border-indigo-300 hover:text-foreground"
                          }`}
                        >
                          {dor}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Ex: O cliente está inaugurando duas novas filiais e precisa atrair tráfego rápido para o PDV com impacto visual imediato..."
                      value={dorOuMomento}
                      onChange={(e) => setDorOuMomento(e.target.value)}
                      className="text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: SELEÇÃO DE SOLUÇÕES (O PORTFÓLIO NEXO) */}
              <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 p-3.5 bg-background/60 space-y-3">
                <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center size-5 rounded-full bg-purple-600 text-white text-[11px] font-bold">2</span>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">
                        Seleção de Soluções — O Portfólio Nexo
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Marque as soluções que entram nesta proposta ({solucoesSelecionadas.length} selecionada(s))
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-purple-700 dark:text-purple-300"
                    onClick={selecionarTodasSolucoes}
                  >
                    {solucoesSelecionadas.length === SOLUCOES_PORTFOLIO_NEXO.length ? "Desmarcar todas" : "Selecionar todas"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {SOLUCOES_PORTFOLIO_NEXO.map((sol) => {
                    const isChecked = solucoesSelecionadas.includes(sol.id);
                    return (
                      <div
                        key={sol.id}
                        onClick={() => toggleSolucao(sol.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-xs"
                            : "bg-background/80 hover:bg-muted/40 border-border/70"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSolucao(sol.id)}
                          className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-tight text-foreground">
                            {sol.numero}. {sol.titulo}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {sol.exemplos}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Canais de Mídia do Catálogo */}
                <div className="pt-2 border-t mt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="size-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-foreground">Mídias do Catálogo para Vinculação:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleMidia("DOOH")}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                        midias.includes("DOOH")
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-background text-muted-foreground hover:border-purple-300"
                      }`}
                    >
                      <Monitor className="size-3" />
                      DOOH / Telas
                      {midias.includes("DOOH") && <Check className="size-3 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMidia("TV")}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                        midias.includes("TV")
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-background text-muted-foreground hover:border-purple-300"
                      }`}
                    >
                      <Tv className="size-3" />
                      TV
                      {midias.includes("TV") && <Check className="size-3 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMidia("Radio")}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                        midias.includes("Radio")
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-background text-muted-foreground hover:border-purple-300"
                      }`}
                    >
                      <Radio className="size-3" />
                      Rádio
                      {midias.includes("Radio") && <Check className="size-3 ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* BLOCO 3: ESPECIFICAÇÕES TÉCNICAS E ESCOPO */}
              <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 p-3.5 bg-background/60 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center size-5 rounded-full bg-purple-600 text-white text-[11px] font-bold">3</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">
                      Especificações Técnicas e Escopo
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Preencha o que se aplica</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label className="text-xs font-medium">Volumes, Veiculação ou Entregáveis</Label>
                    <Textarea
                      rows={2}
                      placeholder="Ex: 15 telas de DOOH em shoppings, 3 meses de gestão de tráfego, 12 posts/mês, 1 comercial de 30s..."
                      value={entregaveisVolumes}
                      onChange={(e) => setEntregaveisVolumes(e.target.value)}
                      className="text-xs mt-1 bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Prazos e Cronograma de Execução</Label>
                    <div className="flex gap-1 mb-1.5 mt-1">
                      {[15, 30, 90].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setPeriodoDias(d);
                            setPrazosCronograma(`Campanha de ${d === 30 ? "1 mês" : d === 90 ? "3 meses" : `${d} dias`}`);
                          }}
                          className={`text-[11px] flex-1 py-0.5 rounded border transition-all ${
                            periodoDias === d
                              ? "bg-purple-600 text-white border-purple-600 font-medium"
                              : "bg-background text-muted-foreground hover:border-purple-300"
                          }`}
                        >
                          {d === 30 ? "1 mês" : d === 90 ? "3 meses" : `${d} dias`}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Ex: Campanha de 3 meses, entrega do site em 30 dias..."
                      value={prazosCronograma}
                      onChange={(e) => setPrazosCronograma(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 4: CONDIÇÕES COMERCIAIS E INVESTIMENTO */}
              <div className="rounded-xl border border-purple-100 dark:border-purple-900/40 p-3.5 bg-background/60 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center size-5 rounded-full bg-purple-600 text-white text-[11px] font-bold">4</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-200">
                      Condições Comerciais e Investimento
                    </h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Opcional</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Modelo de Precificação */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Modelo de Precificação</Label>
                    <div className="flex flex-wrap gap-1">
                      {MODELOS_PRECIFICACAO_PRESETS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModeloPrecificacao(m)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                            modeloPrecificacao === m
                              ? "bg-purple-600 text-white border-purple-600 font-medium"
                              : "bg-background text-muted-foreground hover:border-purple-300 hover:text-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Ou digite o modelo (Ex: Fee mensal + bônus de performance)..."
                      value={modeloPrecificacao}
                      onChange={(e) => setModeloPrecificacao(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  {/* Valor do Investimento */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <DollarSign className="size-3.5 text-emerald-600" />
                      Valor do Investimento / Budget Estimado
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {["R$ 5.000", "R$ 15.000", "R$ 30.000", "R$ 50.000", "R$ 100.000"].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setOrcamento(b + ",00")}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                            orcamento.includes(b)
                              ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                              : "bg-background text-muted-foreground hover:border-emerald-300"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Ex: R$ 25.000,00 (deixe em branco se for flexível)"
                      value={orcamento}
                      onChange={(e) => setOrcamento(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  {/* Condições de Pagamento */}
                  <div>
                    <Label className="text-xs font-medium">Condições de Pagamento</Label>
                    <Input
                      placeholder="Ex: 50% entrada e 50% na aprovação, ou 30/60 dias no boleto..."
                      value={condicoesPagamento}
                      onChange={(e) => setCondicoesPagamento(e.target.value)}
                      className="h-8 text-xs mt-1 bg-background"
                    />
                  </div>

                  {/* Condições Especiais / Bônus */}
                  <div>
                    <Label className="text-xs font-medium">Condições Especiais / Bônus</Label>
                    <Input
                      placeholder="Ex: Desconto de lançamento 15%, inclusão de 50 inserções bônus..."
                      value={condicoesEspeciais}
                      onChange={(e) => setCondicoesEspeciais(e.target.value)}
                      className="h-8 text-xs mt-1 bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Ações de Geração */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLimparBriefing}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Limpar Briefing
                </Button>

                <Button
                  type="button"
                  onClick={handleGerar}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm font-semibold gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analisando Briefing & Catálogo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Gerar Proposta com IA
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* PREVIEW DA SUGESTÃO GERADA */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Proposta Comercial Estruturada com Sucesso
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Revise o racional estratégico, escopo detalhado e produtos selecionados.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSugestao(null)}
                  className="text-xs"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Editar Briefing
                </Button>
              </div>

              {/* Nome da Campanha */}
              <div className="p-3 rounded-lg bg-background border space-y-1">
                <Label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                  Campanha / Proposta
                </Label>
                <p className="text-sm font-semibold text-foreground">{sugestao.campanha}</p>
              </div>

              {/* Racional Estratégico */}
              <div className="p-3.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-1.5">
                <Label className="text-[11px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="size-3.5 text-purple-600" />
                  Racional Estratégico (Nexo Mídia & Representação)
                </Label>
                <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                  {sugestao.estrategia}
                </p>
              </div>

              {/* Escopo & Entregáveis se houver */}
              {sugestao.escopo_detalhado && (
                <div className="p-3.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                  <Label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="size-3.5 text-indigo-600" />
                    Escopo & Especificações Técnicas
                  </Label>
                  <p className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed font-mono">
                    {sugestao.escopo_detalhado}
                  </p>
                </div>
              )}

              {/* Produtos do Catálogo Selecionados */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Itens Selecionados do Catálogo ({sugestao.itens.length})</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {sugestao.totais.total_insercoes} inserções totais
                  </span>
                </Label>
                <div className="border rounded-lg overflow-hidden bg-background divide-y">
                  {sugestao.itens.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] py-0">
                            {it.tipo}
                          </Badge>
                          <span className="font-semibold truncate">{it.programa}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {[it.horario, it.formato, `${it.dias_veiculacao} dias de veiculação`].filter(Boolean).join(" • ")}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm text-foreground">
                          {it.valor_negociado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        {it.desconto > 0 && (
                          <span className="block text-[10px] text-emerald-600 font-medium">
                            {it.desconto}% desc. (de {it.valor_tabela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Justificativa & Condições Comerciais */}
              <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground">Condições Comerciais & Investimento:</span>
                <p>{sugestao.justificativa_comercial}</p>
              </div>

              {/* Totalizadores e Ação Aplicar */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-xs opacity-90 block">Investimento Total Proposto</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold">
                      {sugestao.totais.valor_negociado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    {sugestao.totais.desconto_pct > 0 && (
                      <span className="text-xs line-through opacity-75">
                        {sugestao.totais.valor_tabela.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                    onClick={() => setSugestao(null)}
                  >
                    Ajustar
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    className="bg-white text-purple-900 hover:bg-white/90 font-bold text-xs gap-1.5 shadow-sm"
                    onClick={handleAplicar}
                  >
                    <Check className="size-4 text-purple-600" />
                    Aplicar à Proposta
                    <ArrowRight className="size-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
